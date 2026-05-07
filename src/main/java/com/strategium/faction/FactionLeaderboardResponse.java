package com.strategium.faction;

import java.util.List;

public record FactionLeaderboardResponse(String scope, String sort, List<FactionLeaderboardEntryResponse> entries) {
}
