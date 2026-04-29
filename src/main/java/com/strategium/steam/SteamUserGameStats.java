package com.strategium.steam;

import com.strategium.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(
    name = "steam_user_game_stats",
    uniqueConstraints = @UniqueConstraint(name = "idx_steam_user_game_stats_user_app", columnNames = {"user_id", "app_id"})
)
public class SteamUserGameStats {

  @Id
  @UuidGenerator
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @Column(nullable = false, length = 64)
  private String steamId;

  @Column(nullable = false)
  private int appId;

  @Column(nullable = false)
  private int playtimeMinutes;

  @Column(nullable = false)
  private int unlockedCount;

  @Column(nullable = false)
  private int totalCount;

  @Column(nullable = false)
  private int progressPercent;

  @Column(nullable = false)
  private boolean available;

  @Column(nullable = false)
  private Instant updatedAt;

  protected SteamUserGameStats() {
  }

  public SteamUserGameStats(UserAccount user, String steamId, int appId) {
    this.user = user;
    this.steamId = steamId;
    this.appId = appId;
  }

  public UserAccount getUser() {
    return user;
  }

  public String getSteamId() {
    return steamId;
  }

  public int getAppId() {
    return appId;
  }

  public int getPlaytimeMinutes() {
    return playtimeMinutes;
  }

  public int getUnlockedCount() {
    return unlockedCount;
  }

  public int getTotalCount() {
    return totalCount;
  }

  public int getProgressPercent() {
    return progressPercent;
  }

  public boolean isAvailable() {
    return available;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void updateFrom(SteamGameAchievementsResponse game, int playtimeMinutes, Instant updatedAt) {
    this.playtimeMinutes = playtimeMinutes;
    this.unlockedCount = game.unlockedCount();
    this.totalCount = game.totalCount();
    this.progressPercent = game.progressPercent();
    this.available = game.available();
    this.updatedAt = updatedAt;
  }
}
