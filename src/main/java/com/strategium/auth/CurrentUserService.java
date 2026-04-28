package com.strategium.auth;

import com.strategium.user.UserAccount;
import com.strategium.user.UserAccountRepository;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentUserService {

  private final UserAccountRepository userAccountRepository;

  public CurrentUserService(UserAccountRepository userAccountRepository) {
    this.userAccountRepository = userAccountRepository;
  }

  public Optional<UserAccount> currentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
      return Optional.empty();
    }
    return userAccountRepository.findById(principal.id());
  }

  public UserAccount requireUser() {
    return currentUser().orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));
  }
}
