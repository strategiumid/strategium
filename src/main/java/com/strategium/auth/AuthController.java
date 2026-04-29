package com.strategium.auth;

import com.strategium.steam.SteamAchievementService;
import com.strategium.user.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api")
public class AuthController {

  private final CurrentUserService currentUserService;
  private final AuthService authService;
  private final SteamOpenIdService steamOpenIdService;
  private final VkOAuthService vkOAuthService;
  private final SteamAchievementService steamAchievementService;
  private final String frontendUrl;

  public AuthController(
      CurrentUserService currentUserService,
      AuthService authService,
      SteamOpenIdService steamOpenIdService,
      VkOAuthService vkOAuthService,
      SteamAchievementService steamAchievementService,
      @Value("${strategium.frontend-url}") String frontendUrl
  ) {
    this.currentUserService = currentUserService;
    this.authService = authService;
    this.steamOpenIdService = steamOpenIdService;
    this.vkOAuthService = vkOAuthService;
    this.steamAchievementService = steamAchievementService;
    this.frontendUrl = frontendUrl;
  }

  @GetMapping("/me")
  public UserResponse me() {
    return currentUserService.currentUser()
        .map(UserResponse::from)
        .orElseGet(UserResponse::guest);
  }

  @PutMapping("/me")
  public UserResponse updateMe(@Valid @RequestBody UpdateProfileRequest request, HttpServletRequest servletRequest) {
    return UserResponse.from(authService.updateDisplayName(
        currentUserService.requireUser().getId(),
        request.displayName(),
        servletRequest
    ));
  }

  @PostMapping("/auth/dev-login")
  public UserResponse devLogin(@Valid @RequestBody DevLoginRequest request, HttpServletRequest servletRequest) {
    return UserResponse.from(authService.loginDevUser(request.displayName(), servletRequest));
  }

  @GetMapping("/auth/steam/start")
  @ResponseStatus(HttpStatus.FOUND)
  public void steamStart(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws IOException {
    response.sendRedirect(steamOpenIdService.authenticationUrl(requestBaseUrl(request)));
  }

  @GetMapping("/auth/steam/callback")
  @ResponseStatus(HttpStatus.FOUND)
  public void steamCallback(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws IOException {
    String steamId = steamOpenIdService.validateAndExtractSteamId(request.getParameterMap())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Steam authentication failed"));
    UserAccount user = authService.loginSteamUser(steamId, request);
    try {
      steamAchievementService.refreshStats(user);
    } catch (Exception ignored) {
      // Steam privacy/API issues must not block authentication.
    }
    response.sendRedirect(frontendUrl);
  }

  @GetMapping("/auth/vk/start")
  @ResponseStatus(HttpStatus.FOUND)
  public void vkStart(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws IOException {
    currentUserService.requireUser();
    String state = UUID.randomUUID().toString();
    request.getSession(true).setAttribute("VK_OAUTH_STATE", state);
    response.sendRedirect(vkOAuthService.authorizationUrl(requestBaseUrl(request), state));
  }

  @GetMapping("/auth/vk/callback")
  @ResponseStatus(HttpStatus.FOUND)
  public void vkCallback(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws IOException {
    String expectedState = (String) request.getSession(true).getAttribute("VK_OAUTH_STATE");
    String actualState = request.getParameter("state");
    request.getSession(true).removeAttribute("VK_OAUTH_STATE");
    if (expectedState == null || actualState == null || !expectedState.equals(actualState)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "VK OAuth state mismatch");
    }

    VkOAuthService.VkOAuthAccount vkAccount = vkOAuthService.exchangeCode(request.getParameter("code"), requestBaseUrl(request));
    authService.linkVkUser(currentUserService.requireUser().getId(), vkAccount, request);
    response.sendRedirect(frontendUrl);
  }

  @PostMapping("/auth/vk/unlink")
  public UserResponse unlinkVk(HttpServletRequest request) {
    return UserResponse.from(authService.unlinkVkUser(currentUserService.requireUser().getId(), request));
  }

  @PostMapping("/auth/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session != null) {
      session.invalidate();
    }
    SecurityContextHolder.clearContext();
  }

  private static String requestBaseUrl(HttpServletRequest request) {
    return ServletUriComponentsBuilder.fromRequestUri(request)
        .replacePath(null)
        .replaceQuery(null)
        .build()
        .toUriString();
  }
}
