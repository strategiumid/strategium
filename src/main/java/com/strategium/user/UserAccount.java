package com.strategium.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "app_users")
public class UserAccount {

  @Id
  @UuidGenerator
  private UUID id;

  @Column(nullable = false, unique = true, length = 120)
  private String username;

  @Column(nullable = false, length = 120)
  private String displayName;

  @Column(unique = true, length = 64)
  private String steamId;

  @Column(unique = true, length = 64)
  private String vkId;

  @Column(length = 120)
  private String vkDisplayName;

  @Column(length = 1024)
  private String vkAccessToken;

  private Instant vkTokenExpiresAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private UserRole role = UserRole.USER;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  protected UserAccount() {
  }

  public UserAccount(String username, String displayName, String steamId) {
    this.username = username;
    this.displayName = displayName;
    this.steamId = steamId;
  }

  public UUID getId() {
    return id;
  }

  public String getUsername() {
    return username;
  }

  public String getDisplayName() {
    return displayName;
  }

  public String getSteamId() {
    return steamId;
  }

  public String getVkId() {
    return vkId;
  }

  public String getVkDisplayName() {
    return vkDisplayName;
  }

  public String getVkAccessToken() {
    return vkAccessToken;
  }

  public Instant getVkTokenExpiresAt() {
    return vkTokenExpiresAt;
  }

  public UserRole getRole() {
    return role;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
  }

  public void setRole(UserRole role) {
    this.role = role;
  }

  public void linkVk(String vkId, String vkDisplayName, String vkAccessToken, Instant vkTokenExpiresAt) {
    this.vkId = vkId;
    this.vkDisplayName = vkDisplayName;
    this.vkAccessToken = vkAccessToken;
    this.vkTokenExpiresAt = vkTokenExpiresAt;
  }

  public void unlinkVk() {
    this.vkId = null;
    this.vkDisplayName = null;
    this.vkAccessToken = null;
    this.vkTokenExpiresAt = null;
  }
}
