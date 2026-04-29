package com.strategium.steam;

import java.util.List;

public record SteamGameAchievementsResponse(
    int appId,
    String slug,
    String title,
    String series,
    boolean pdx,
    int playtimeMinutes,
    double playtimeHours,
    int unlockedCount,
    int totalCount,
    int progressPercent,
    boolean available,
    String message,
    List<SteamAchievementResponse> achievements
) {
}
