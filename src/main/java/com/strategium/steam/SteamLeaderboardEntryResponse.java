package com.strategium.steam;

import java.time.Instant;
import java.util.UUID;

public record SteamLeaderboardEntryResponse(
    int rank,
    UUID userId,
    String displayName,
    String steamId,
    int totalUnlocked,
    int totalAchievements,
    int progressPercent,
    int totalPlaytimeMinutes,
    double totalPlaytimeHours,
    int gamesCount,
    Instant updatedAt
) {
}
