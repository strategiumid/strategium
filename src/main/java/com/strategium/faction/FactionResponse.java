package com.strategium.faction;

import java.util.UUID;

public record FactionResponse(UUID id, String name, String tag, FactionTheme theme) {
}
