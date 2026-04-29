package com.strategium.auth;

import com.strategium.user.UserAccount;
import com.strategium.user.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

  private final UserAccountRepository userAccountRepository;
  private final SteamProfileService steamProfileService;

  public AuthService(UserAccountRepository userAccountRepository, SteamProfileService steamProfileService) {
    this.userAccountRepository = userAccountRepository;
    this.steamProfileService = steamProfileService;
  }

  @Transactional
  public UserAccount loginDevUser(String displayName, HttpServletRequest request) {
    String cleanName = displayName.trim();
    String username = "dev:" + cleanName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9а-яё_-]+", "-");
    UserAccount user = userAccountRepository.findByUsername(username)
        .orElseGet(() -> userAccountRepository.save(new UserAccount(username, cleanName, null)));
    user.setDisplayName(cleanName);
    authenticate(user, request);
    return user;
  }

  @Transactional
  public UserAccount loginSteamUser(String steamId, HttpServletRequest request) {
    SteamProfileService.SteamProfile steamProfile = steamProfileService.profile(steamId)
        .orElse(new SteamProfileService.SteamProfile("Steam " + steamId, ""));
    String steamDisplayName = steamProfile.displayName();
    UserAccount user = userAccountRepository.findBySteamId(steamId)
        .orElseGet(() -> userAccountRepository.save(new UserAccount("steam:" + steamId, steamDisplayName, steamId)));
    if (shouldSyncSteamDisplayName(user, steamId, steamDisplayName)) {
      user.setDisplayName(steamDisplayName);
    }
    if (!steamProfile.avatarUrl().isBlank()) {
      user.setSteamAvatarUrl(steamProfile.avatarUrl());
    }
    authenticate(user, request);
    return user;
  }

  private static boolean shouldSyncSteamDisplayName(UserAccount user, String steamId, String steamDisplayName) {
    String currentName = user.getDisplayName();
    return currentName == null
        || currentName.isBlank()
        || currentName.equals("Steam " + steamId)
        || currentName.equals("steam:" + steamId)
        || currentName.equals(steamId)
        || currentName.equals(user.getUsername());
  }

  @Transactional
  public UserAccount updateDisplayName(UUID userId, String displayName, HttpServletRequest request) {
    UserAccount user = userAccountRepository.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));
    user.setDisplayName(displayName.trim());
    authenticate(user, request);
    return user;
  }

  @Transactional
  public UserAccount linkVkUser(UUID userId, VkOAuthService.VkOAuthAccount vkAccount, HttpServletRequest request) {
    UserAccount user = userAccountRepository.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));
    userAccountRepository.findByVkId(vkAccount.vkId())
        .filter(existingUser -> !existingUser.getId().equals(userId))
        .ifPresent(existingUser -> {
          throw new ResponseStatusException(HttpStatus.CONFLICT, "VK account is already linked to another user");
        });
    user.linkVk(vkAccount.vkId(), vkAccount.displayName(), vkAccount.accessToken(), vkAccount.expiresAt());
    authenticate(user, request);
    return user;
  }

  @Transactional
  public UserAccount unlinkVkUser(UUID userId, HttpServletRequest request) {
    UserAccount user = userAccountRepository.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));
    user.unlinkVk();
    authenticate(user, request);
    return user;
  }

  public void authenticate(UserAccount user, HttpServletRequest request) {
    AuthenticatedUser principal = new AuthenticatedUser(user);
    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
        principal,
        null,
        principal.getAuthorities()
    );

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
  }
}
