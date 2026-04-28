package com.strategium.steam;

public record SteamGameResponse(
    int appId,
    String slug,
    String title,
    String series
) {

  public static SteamGameResponse from(ParadoxSteamGame game) {
    return new SteamGameResponse(game.appId(), game.slug(), game.title(), game.series());
  }
}
