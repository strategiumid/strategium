package com.strategium.division;

import com.strategium.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "division_templates")
public class DivisionTemplate {

  @Id
  @UuidGenerator
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private UserAccount owner;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false, columnDefinition = "text")
  private String lineSlots;

  @Column(nullable = false, columnDefinition = "text")
  private String supportSlots;

  @Column(nullable = false)
  private int combatWidth;

  @Column(nullable = false)
  private int hp;

  @Column(nullable = false)
  private int organization;

  @Column(nullable = false)
  private int softAttack;

  @Column(nullable = false)
  private int hardAttack;

  @Column(nullable = false)
  private int battalionCount;

  @Column(nullable = false)
  private int supportCount;

  @Column(nullable = false)
  private int xpCost;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  @Column(nullable = false)
  private Instant updatedAt = Instant.now();

  protected DivisionTemplate() {
  }

  public DivisionTemplate(UserAccount owner, String name, String lineSlots, String supportSlots, DivisionStats stats) {
    this.owner = owner;
    update(name, lineSlots, supportSlots, stats);
    this.createdAt = Instant.now();
  }

  public void update(String name, String lineSlots, String supportSlots, DivisionStats stats) {
    this.name = name;
    this.lineSlots = lineSlots;
    this.supportSlots = supportSlots;
    this.combatWidth = stats.combatWidth();
    this.hp = stats.hp();
    this.organization = stats.organization();
    this.softAttack = stats.softAttack();
    this.hardAttack = stats.hardAttack();
    this.battalionCount = stats.battalionCount();
    this.supportCount = stats.supportCount();
    this.xpCost = stats.xpCost();
    this.updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public UserAccount getOwner() {
    return owner;
  }

  public String getName() {
    return name;
  }

  public String getLineSlots() {
    return lineSlots;
  }

  public String getSupportSlots() {
    return supportSlots;
  }

  public DivisionStats getStats() {
    return new DivisionStats(combatWidth, hp, organization, softAttack, hardAttack, battalionCount, supportCount, xpCost);
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
