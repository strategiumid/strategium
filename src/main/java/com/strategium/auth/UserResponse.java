package com.strategium.auth;

import com.strategium.user.UserAccount;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String username,
    String displayName,
    String steamId,
    boolean authenticated
) {

  public static UserResponse guest() {
    return new UserResponse(null, "guest", "Гость", null, false);
  }

  public static UserResponse from(UserAccount user) {
    return new UserResponse(user.getId(), user.getUsername(), user.getDisplayName(), user.getSteamId(), true);
  }
}
