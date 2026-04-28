package com.strategium.division;

import com.strategium.user.UserAccount;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DivisionTemplateRepository extends JpaRepository<DivisionTemplate, UUID> {

  List<DivisionTemplate> findAllByOwnerOrderByUpdatedAtDesc(UserAccount owner);

  Optional<DivisionTemplate> findByIdAndOwner(UUID id, UserAccount owner);
}
