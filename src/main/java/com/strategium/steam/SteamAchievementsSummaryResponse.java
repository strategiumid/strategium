package com.strategium.steam;

import java.util.List;

public record SteamAchievementsSummaryResponse(
    String steamId,
    List<SteamGameAchievementsResponse> games
) {
}
