package com.strategium.faction;

import com.strategium.user.UserAccount;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FactionMemberRepository extends JpaRepository<FactionMember, UUID> {

  Optional<FactionMember> findByUserId(UUID userId);

  Optional<FactionMember> findByUser(UserAccount user);

  List<FactionMember> findAllByFactionIdOrderByJoinedAtAsc(UUID factionId);

  long countByFactionId(UUID factionId);

  List<FactionMember> findAllByFaction_IdIn(Collection<UUID> factionIds);
