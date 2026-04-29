package com.strategium.steam;

import com.strategium.user.UserAccount;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SteamUserGameStatsRepository extends JpaRepository<SteamUserGameStats, UUID> {

  List<SteamUserGameStats> findByUser(UserAccount user);

  Optional<SteamUserGameStats> findByUserAndAppId(UserAccount user, int appId);
}
