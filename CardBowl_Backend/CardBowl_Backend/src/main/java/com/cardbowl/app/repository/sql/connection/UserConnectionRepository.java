package com.cardbowl.app.repository.sql.connection;

import com.cardbowl.app.model.sql.connection.UserConnection;
import com.cardbowl.app.repository.sql.BaseUniqueKeyRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserConnectionRepository extends BaseUniqueKeyRepository<UserConnection>, JpaSpecificationExecutor<UserConnection> {

    List<UserConnection> findByUserIdAndIsActive(Long userId, Boolean isActive);

    Optional<UserConnection> findByUserIdAndPeerUserIdAndIsActive(Long userId, Long peerUserId, Boolean isActive);

    boolean existsByUserIdAndPeerUserId(Long userId, Long peerUserId);
}
