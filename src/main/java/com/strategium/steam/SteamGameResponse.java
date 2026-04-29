package com.strategium.steam;

public record SteamGameResponse(
    int appId,
    String slug,
    String title,
    String series,
    boolean pdx
) {

  public static SteamGameResponse from(SupportedSteamGame game) {
    return new SteamGameResponse(game.appId(), game.slug(), game.title(), game.series(), game.pdx());
  }
}
