package com.strategium.division;

public record DivisionUnitResponse(
    String id,
    String name,
    String icon,
    int width,
    int hp,
    int organization,
    int softAttack,
    int hardAttack
) {
}
