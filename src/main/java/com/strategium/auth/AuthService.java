package com.strategium.auth;

import com.strategium.user.UserAccount;
import com.strategium.user.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final UserAccountRepository userAccountRepository;

  public AuthService(UserAccountRepository userAccountRepository) {
    this.userAccountRepository = userAccountRepository;
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
    UserAccount user = userAccountRepository.findBySteamId(steamId)
        .orElseGet(() -> userAccountRepository.save(new UserAccount("steam:" + steamId, "Steam " + steamId, steamId)));
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
