package com.strategium.steam;

import java.util.List;

public record SteamLeaderboardResponse(
    String scope,
    String sort,
    List<SteamLeaderboardEntryResponse> entries
) {
}
