package com.strategium.steam;

import java.util.List;

public record SteamGameAchievementsResponse(
    int appId,
    String slug,
    String title,
    String series,
    int unlockedCount,
    int totalCount,
    int progressPercent,
    boolean available,
    String message,
    List<SteamAchievementResponse> achievements
) {
}
