package com.strategium.steam;

import com.strategium.auth.CurrentUserService;
import com.strategium.user.UserAccount;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/steam")
public class SteamAchievementController {

  private final CurrentUserService currentUserService;
  private final SteamAchievementService steamAchievementService;

  public SteamAchievementController(
      CurrentUserService currentUserService,
      SteamAchievementService steamAchievementService
  ) {
    this.currentUserService = currentUserService;
    this.steamAchievementService = steamAchievementService;
  }

  @GetMapping("/games")
  public List<SteamGameResponse> supportedGames() {
    return steamAchievementService.supportedGames();
  }

  @GetMapping("/achievements")
  public SteamAchievementsSummaryResponse achievements(@RequestParam(required = false) String game) {
    if (game != null && !game.isBlank() && SupportedSteamGame.findBySlug(game).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown Steam game slug");
    }

    UserAccount user = currentUserService.requireUser();
    if (user.getSteamId() == null || user.getSteamId().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Steam account is not linked");
    }
    return steamAchievementService.achievements(user.getSteamId(), game);
  }

  @PostMapping("/stats/refresh")
  public SteamStatsRefreshResponse refreshStats() {
    UserAccount user = requireSteamUser();
    return steamAchievementService.refreshStats(user);
  }

  @GetMapping("/leaderboard")
  public SteamLeaderboardResponse leaderboard(
      @RequestParam(defaultValue = "pdx") String scope,
      @RequestParam(defaultValue = "achievements") String sort
  ) {
    return steamAchievementService.leaderboard(scope, sort);
  }

  private UserAccount requireSteamUser() {
    UserAccount user = currentUserService.requireUser();
    if (user.getSteamId() == null || user.getSteamId().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Steam account is not linked");
    }
    return user;
  }
}
