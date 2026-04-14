package com.cardbowl.app.repository.sql.auth;

import com.cardbowl.app.model.sql.auth.UserInfo;
import com.cardbowl.app.repository.sql.BaseUniqueKeyRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserInfoRepository extends BaseUniqueKeyRepository<UserInfo>, JpaSpecificationExecutor<UserInfo> {

    Optional<UserInfo> findByEmail(String email);

    boolean existsByEmail(String email);
}
