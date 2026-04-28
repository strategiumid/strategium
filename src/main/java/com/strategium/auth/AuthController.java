package com.strategium.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.io.IOException;
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
  private final String frontendUrl;

  public AuthController(
      CurrentUserService currentUserService,
      AuthService authService,
      SteamOpenIdService steamOpenIdService,
      @Value("${strategium.frontend-url}") String frontendUrl
  ) {
    this.currentUserService = currentUserService;
    this.authService = authService;
    this.steamOpenIdService = steamOpenIdService;
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
    authService.loginSteamUser(steamId, request);
    response.sendRedirect(frontendUrl);
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
