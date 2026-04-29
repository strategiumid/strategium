package com.strategium.steam;

import java.util.List;
import java.util.Optional;

public record SupportedSteamGame(
    int appId,
    String slug,
    String title,
    String series,
    boolean pdx
) {

  public static final List<SupportedSteamGame> SUPPORTED_GAMES = List.of(
      new SupportedSteamGame(394360, "hearts-of-iron-iv", "Hearts of Iron IV", "Hearts of Iron", true),
      new SupportedSteamGame(1158310, "crusader-kings-iii", "Crusader Kings III", "Crusader Kings", true),
      new SupportedSteamGame(203770, "crusader-kings-ii", "Crusader Kings II", "Crusader Kings", true),
      new SupportedSteamGame(281990, "stellaris", "Stellaris", "Stellaris", true),
      new SupportedSteamGame(236850, "europa-universalis-iv", "Europa Universalis IV", "Europa Universalis", true),
      new SupportedSteamGame(529340, "victoria-3", "Victoria 3", "Victoria", true),
      new SupportedSteamGame(859580, "imperator-rome", "Imperator: Rome", "Imperator", true),
      new SupportedSteamGame(255710, "cities-skylines", "Cities: Skylines", "Cities: Skylines", true),
      new SupportedSteamGame(949230, "cities-skylines-ii", "Cities: Skylines II", "Cities: Skylines", true),
      new SupportedSteamGame(331470, "everlasting-summer", "Бесконечное лето", "Бесконечное лето", false)
  );

  public static Optional<SupportedSteamGame> findBySlug(String slug) {
    return SUPPORTED_GAMES.stream()
        .filter(game -> game.slug().equals(slug))
        .findFirst();
  }

  public static Optional<SupportedSteamGame> findByAppId(int appId) {
    return SUPPORTED_GAMES.stream()
        .filter(game -> game.appId() == appId)
        .findFirst();
  }
}
