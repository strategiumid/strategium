package com.strategium.faction;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FactionRepository extends JpaRepository<Faction, UUID> {

  boolean existsByTag(String tag);

  Optional<Faction> findByTag(String tag);
}
