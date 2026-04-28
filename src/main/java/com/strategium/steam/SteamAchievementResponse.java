package com.strategium.steam;

import java.time.Instant;

public record SteamAchievementResponse(
    String apiName,
    String name,
    String description,
    boolean achieved,
    Instant unlockTime,
    String iconUrl,
    String iconGrayUrl
) {
}
