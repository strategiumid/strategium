package com.strategium.division;

import com.strategium.user.UserAccount;
import java.util.Arrays;
import java.util.function.Function;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DivisionTemplateService {

  private static final List<LineUnit> LINE_UNITS = List.of(
      new LineUnit("infantry", "Пехота", "INF", 2, 25, 60, 12, 1),
      new LineUnit("artillery", "Артиллерия", "ART", 3, 12, 20, 36, 2),
      new LineUnit("motorized", "Мотопехота", "MOT", 2, 24, 58, 14, 2),
      new LineUnit("mechanized", "Мех. пехота", "MECH", 2, 30, 52, 18, 6),
      new LineUnit("medium_tank", "Средние танки", "MT", 2, 18, 30, 26, 24),
      new LineUnit("aa_line", "Линейное ПВО", "AA", 1, 10, 20, 3, 12),
      new LineUnit("at_line", "Линейное ПТО", "AT", 1, 10, 20, 2, 20)
  );

  private static final List<SupportUnit> SUPPORT_UNITS = List.of(
      new SupportUnit("eng", "Инженеры", "ENG", 2, 2, 0),
      new SupportUnit("recon", "Разведка", "REC", 1, 1, 0),
      new SupportUnit("sup_art", "Поддержка арт.", "S-ART", 0, 12, 1),
      new SupportUnit("log", "Логистика", "LOG", 0, 0, 0),
      new SupportUnit("signal", "Связь", "SIG", 0, 0, 0),
      new SupportUnit("maintenance", "Ремрота", "MAIN", 0, 0, 0),
      new SupportUnit("aa", "Поддержка ПВО", "S-AA", 0, 4, 8)
  );

  private static final Map<String, LineUnit> LINE_UNITS_BY_ID = LINE_UNITS.stream()
      .collect(Collectors.toUnmodifiableMap(LineUnit::id, Function.identity()));

  private static final Map<String, SupportUnit> SUPPORT_UNITS_BY_ID = SUPPORT_UNITS.stream()
      .collect(Collectors.toUnmodifiableMap(SupportUnit::id, Function.identity()));

  private final DivisionTemplateRepository divisionTemplateRepository;

  public DivisionTemplateService(DivisionTemplateRepository divisionTemplateRepository) {
    this.divisionTemplateRepository = divisionTemplateRepository;
  }

  @Transactional(readOnly = true)
  public List<DivisionTemplateResponse> findAll(UserAccount owner) {
    return divisionTemplateRepository.findAllByOwnerOrderByUpdatedAtDesc(owner)
        .stream()
        .map(this::toResponse)
        .toList();
  }

  public DivisionUnitCatalogResponse unitCatalog() {
    return new DivisionUnitCatalogResponse(
        LINE_UNITS.stream().map(LineUnit::toResponse).toList(),
        SUPPORT_UNITS.stream().map(SupportUnit::toResponse).toList()
    );
  }

  public DivisionStats calculateStats(DivisionTemplateRequest request) {
    return calculate(request.lineSlots(), request.supportSlots());
  }

  @Transactional
  public DivisionTemplateResponse create(UserAccount owner, DivisionTemplateRequest request) {
    DivisionStats stats = calculate(request.lineSlots(), request.supportSlots());
    DivisionTemplate template = new DivisionTemplate(
        owner,
        request.name().trim(),
        serializeSlots(request.lineSlots()),
        serializeSlots(request.supportSlots()),
        stats
    );
    return toResponse(divisionTemplateRepository.save(template));
  }

  @Transactional
  public DivisionTemplateResponse update(UserAccount owner, UUID id, DivisionTemplateRequest request) {
    DivisionTemplate template = divisionTemplateRepository.findByIdAndOwner(id, owner)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Division template not found"));
    DivisionStats stats = calculate(request.lineSlots(), request.supportSlots());
    template.update(request.name().trim(), serializeSlots(request.lineSlots()), serializeSlots(request.supportSlots()), stats);
    return toResponse(template);
  }

  @Transactional
  public void delete(UserAccount owner, UUID id) {
    DivisionTemplate template = divisionTemplateRepository.findByIdAndOwner(id, owner)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Division template not found"));
    divisionTemplateRepository.delete(template);
  }

  private DivisionStats calculate(List<String> lineSlots, List<String> supportSlots) {
    int width = 0;
    int hp = 0;
    int orgSum = 0;
    int soft = 0;
    int hard = 0;
    int battalionCount = 0;

    for (String unitId : lineSlots) {
      if (unitId == null || unitId.isBlank()) {
        continue;
      }
      LineUnit unit = LINE_UNITS_BY_ID.get(unitId);
      if (unit == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown line unit: " + unitId);
      }
      battalionCount++;
      width += unit.width();
      hp += unit.hp();
      orgSum += unit.org();
      soft += unit.soft();
      hard += unit.hard();
    }

    int supportCount = 0;
    int supportOrg = 0;
    for (String unitId : supportSlots) {
      if (unitId == null || unitId.isBlank()) {
        continue;
      }
      SupportUnit unit = SUPPORT_UNITS_BY_ID.get(unitId);
      if (unit == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown support unit: " + unitId);
      }
      supportCount++;
      supportOrg += unit.org();
      soft += unit.soft();
      hard += unit.hard();
    }

    int organization = battalionCount == 0 ? supportOrg : Math.round((float) orgSum / battalionCount) + supportOrg;
    int xpCost = battalionCount * 5 + supportCount * 10;
    return new DivisionStats(width, hp, organization, soft, hard, battalionCount, supportCount, xpCost);
  }

  private DivisionTemplateResponse toResponse(DivisionTemplate template) {
    return new DivisionTemplateResponse(
        template.getId(),
        template.getName(),
        deserializeSlots(template.getLineSlots()),
        deserializeSlots(template.getSupportSlots()),
        template.getStats(),
        template.getCreatedAt(),
        template.getUpdatedAt()
    );
  }

  private static String serializeSlots(List<String> slots) {
    return slots.stream()
        .map(value -> value == null ? "" : value)
        .reduce((left, right) -> left + "," + right)
        .orElse("");
  }

  private static List<String> deserializeSlots(String slots) {
    return Arrays.stream(slots.split(",", -1))
        .map(value -> value.isBlank() ? null : value)
        .toList();
  }

  private record LineUnit(String id, String name, String icon, int width, int hp, int org, int soft, int hard) {

    private DivisionUnitResponse toResponse() {
      return new DivisionUnitResponse(id, name, icon, width, hp, org, soft, hard);
    }
  }

  private record SupportUnit(String id, String name, String icon, int org, int soft, int hard) {

    private DivisionUnitResponse toResponse() {
      return new DivisionUnitResponse(id, name, icon, 0, 0, org, soft, hard);
    }
  }
}
