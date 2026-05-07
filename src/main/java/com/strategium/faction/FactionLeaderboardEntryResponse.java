package com.strategium.faction;

import java.util.UUID;

public record FactionLeaderboardEntryResponse(
    UUID id,
    int rank,
    String tag,
    String name,
    FactionTheme theme,
    int totalAchievements,
    int avgCompletion,
    int uniqueGames,
    int memberCount,
    int totalPlaytimeMinutes
) {
}
