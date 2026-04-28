package com.strategium.division;

import com.strategium.user.UserAccount;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DivisionTemplateService {

  private static final Map<String, LineUnit> LINE_UNITS = Map.of(
      "infantry", new LineUnit(2, 25, 60, 12, 1),
      "artillery", new LineUnit(3, 12, 20, 36, 2),
      "motorized", new LineUnit(2, 24, 58, 14, 2),
      "mechanized", new LineUnit(2, 30, 52, 18, 6),
      "medium_tank", new LineUnit(2, 18, 30, 26, 24),
      "aa_line", new LineUnit(1, 10, 20, 3, 12),
      "at_line", new LineUnit(1, 10, 20, 2, 20)
  );

  private static final Map<String, SupportUnit> SUPPORT_UNITS = Map.of(
      "eng", new SupportUnit(2, 2, 0),
      "recon", new SupportUnit(1, 1, 0),
      "sup_art", new SupportUnit(0, 12, 1),
      "log", new SupportUnit(0, 0, 0),
      "signal", new SupportUnit(0, 0, 0),
      "maintenance", new SupportUnit(0, 0, 0),
      "aa", new SupportUnit(0, 4, 8)
  );

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
      LineUnit unit = LINE_UNITS.get(unitId);
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
      SupportUnit unit = SUPPORT_UNITS.get(unitId);
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

  private record LineUnit(int width, int hp, int org, int soft, int hard) {
  }

  private record SupportUnit(int org, int soft, int hard) {
  }
}
