package com.strategium.faction;

import com.strategium.auth.CurrentUserService;
import com.strategium.user.UserAccount;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/factions")
public class FactionController {

  private final FactionService factionService;
  private final CurrentUserService currentUserService;

  public FactionController(FactionService factionService, CurrentUserService currentUserService) {
    this.factionService = factionService;
    this.currentUserService = currentUserService;
  }

  @GetMapping
  public FactionLeaderboardResponse list(@RequestParam(name = "scope", defaultValue = "all") String scope,
                                         @RequestParam(name = "sort", defaultValue = "achievements") String sort) {
    return factionService.listLeaderboard(scope, sort);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public FactionResponse create(@Valid @RequestBody CreateFactionRequest body) {
    UserAccount leader = currentUserService.requireUser();
    return factionService.create(leader, body);
  }

  @PostMapping("/{id}/join")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void join(@PathVariable UUID id) {
    factionService.join(id, currentUserService.requireUser());
  }

  @PostMapping("/{id}/leave")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void leave(@PathVariable UUID id) {
    factionService.leave(id, currentUserService.requireUser());
  }
}
