package com.strategium.division;

import java.util.List;

public record DivisionUnitCatalogResponse(
    List<DivisionUnitResponse> lineBattalions,
    List<DivisionUnitResponse> supportCompanies
) {
}
