package com.strategium.faction;

import com.strategium.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
    name = "faction_members",
    uniqueConstraints = @UniqueConstraint(name = "ux_faction_members_user", columnNames = "user_id")
)
public class FactionMember {

  @Id
  @UuidGenerator
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "faction_id", nullable = false)
  private Faction faction;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 24)
  private FactionMemberRole role = FactionMemberRole.MEMBER;

  @Column(nullable = false)
  private Instant joinedAt = Instant.now();

  protected FactionMember() {
  }

  public FactionMember(Faction faction, UserAccount user, FactionMemberRole role) {
    this.faction = faction;
    this.user = user;
    this.role = role;
  }

  public UUID getId() {
    return id;
  }

  public Faction getFaction() {
    return faction;
  }

  public UserAccount getUser() {
    return user;
  }

  public FactionMemberRole getRole() {
    return role;
  }

  public Instant getJoinedAt() {
    return joinedAt;
  }

  public void setRole(FactionMemberRole role) {
    this.role = role;
  }
}
