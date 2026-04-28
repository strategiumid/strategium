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
}
