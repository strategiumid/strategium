package com.strategium.auth;

import com.strategium.faction.UserFactionBrief;
import com.strategium.user.UserAccount;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String username,
    String displayName,
    String steamId,
    String steamAvatarUrl,
    boolean vkLinked,
    String vkDisplayName,
    UserFactionBrief faction,
    boolean authenticated
) {

  public static UserResponse guest() {
    return new UserResponse(null, "guest", "Гость", null, null, false, null, null, false);
  }

  /**
   * Снимок профиля без данных о фракции (ответы авторизации там, где кратко нужен профиль без JOIN).
   */
  public static UserResponse from(UserAccount user) {
    return from(user, null);
  }

  public static UserResponse from(UserAccount user, UserFactionBrief factionBrief) {
    return new UserResponse(
        user.getId(),
        user.getUsername(),
        user.getDisplayName(),
        user.getSteamId(),
        user.getSteamAvatarUrl(),
        user.getVkId() != null && !user.getVkId().isBlank(),
        user.getVkDisplayName(),
        factionBrief,
        true
    );
  }
}
