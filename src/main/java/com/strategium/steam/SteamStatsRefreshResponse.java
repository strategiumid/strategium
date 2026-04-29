package com.strategium.steam;

import java.time.Instant;

public record SteamStatsRefreshResponse(
    String steamId,
    int refreshedGames,
    Instant updatedAt
) {
}
