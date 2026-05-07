package com.strategium.faction;

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
@Table(name = "factions")
public class Faction {

  @Id
  @UuidGenerator
  private UUID id;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false, length = 12, unique = true)
  private String tag;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private FactionTheme theme = FactionTheme.hoi4;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  protected Faction() {
  }

  public Faction(String name, String tag, FactionTheme theme) {
    this.name = name;
    this.tag = tag;
    this.theme = theme;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getTag() {
    return tag;
  }

  public FactionTheme getTheme() {
    return theme;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setName(String name) {
    this.name = name;
  }

  public void setTheme(FactionTheme theme) {
    this.theme = theme;
  }
}
