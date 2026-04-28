package com.strategium.steam;

import java.util.List;
import java.util.Optional;

public record ParadoxSteamGame(
    int appId,
    String slug,
    String title,
    String series
) {

  public static final List<ParadoxSteamGame> SUPPORTED_GAMES = List.of(
      new ParadoxSteamGame(394360, "hearts-of-iron-iv", "Hearts of Iron IV", "Hearts of Iron"),
      new ParadoxSteamGame(1158310, "crusader-kings-iii", "Crusader Kings III", "Crusader Kings"),
      new ParadoxSteamGame(203770, "crusader-kings-ii", "Crusader Kings II", "Crusader Kings"),
      new ParadoxSteamGame(281990, "stellaris", "Stellaris", "Stellaris"),
      new ParadoxSteamGame(236850, "europa-universalis-iv", "Europa Universalis IV", "Europa Universalis"),
      new ParadoxSteamGame(529340, "victoria-3", "Victoria 3", "Victoria"),
      new ParadoxSteamGame(859580, "imperator-rome", "Imperator: Rome", "Imperator"),
      new ParadoxSteamGame(255710, "cities-skylines", "Cities: Skylines", "Cities: Skylines"),
      new ParadoxSteamGame(949230, "cities-skylines-ii", "Cities: Skylines II", "Cities: Skylines")
  );

  public static Optional<ParadoxSteamGame> findBySlug(String slug) {
    return SUPPORTED_GAMES.stream()
        .filter(game -> game.slug().equals(slug))
        .findFirst();
  }

  public static Optional<ParadoxSteamGame> findByAppId(int appId) {
    return SUPPORTED_GAMES.stream()
        .filter(game -> game.appId() == appId)
        .findFirst();
  }
}
