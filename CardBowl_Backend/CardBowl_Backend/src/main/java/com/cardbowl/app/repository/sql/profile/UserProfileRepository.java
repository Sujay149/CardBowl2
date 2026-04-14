package com.cardbowl.app.repository.sql.profile;

import com.cardbowl.app.model.sql.profile.UserProfile;
import com.cardbowl.app.repository.sql.BaseUniqueKeyRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfileRepository extends BaseUniqueKeyRepository<UserProfile>, JpaSpecificationExecutor<UserProfile> {

    Optional<UserProfile> findByUserIdAndIsActive(Long userId, Boolean isActive);

    Optional<UserProfile> findByUserUniqueKey(String userKey);
}
