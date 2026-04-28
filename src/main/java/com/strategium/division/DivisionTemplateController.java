package com.strategium.division;

import com.strategium.auth.CurrentUserService;
import com.strategium.user.UserAccount;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/division-templates")
public class DivisionTemplateController {

  private final CurrentUserService currentUserService;
  private final DivisionTemplateService divisionTemplateService;

  public DivisionTemplateController(CurrentUserService currentUserService, DivisionTemplateService divisionTemplateService) {
    this.currentUserService = currentUserService;
    this.divisionTemplateService = divisionTemplateService;
  }

  @GetMapping
  public List<DivisionTemplateResponse> findAll() {
    return divisionTemplateService.findAll(currentUserService.requireUser());
  }

  @GetMapping("/units")
  public DivisionUnitCatalogResponse unitCatalog() {
    return divisionTemplateService.unitCatalog();
  }

  @PostMapping("/calculate")
  public DivisionStats calculate(@Valid @RequestBody DivisionTemplateRequest request) {
    return divisionTemplateService.calculateStats(request);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DivisionTemplateResponse create(@Valid @RequestBody DivisionTemplateRequest request) {
    UserAccount owner = currentUserService.requireUser();
    return divisionTemplateService.create(owner, request);
  }

  @PutMapping("/{id}")
  public DivisionTemplateResponse update(@PathVariable UUID id, @Valid @RequestBody DivisionTemplateRequest request) {
    UserAccount owner = currentUserService.requireUser();
    return divisionTemplateService.update(owner, id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    divisionTemplateService.delete(currentUserService.requireUser(), id);
  }
}
