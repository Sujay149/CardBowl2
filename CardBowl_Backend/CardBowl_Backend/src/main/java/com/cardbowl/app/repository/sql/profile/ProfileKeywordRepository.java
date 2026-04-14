package com.cardbowl.app.repository.sql.profile;

import com.cardbowl.app.model.sql.profile.ProfileKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProfileKeywordRepository extends JpaRepository<ProfileKeyword, Long> {

    List<ProfileKeyword> findByUserProfileId(Long userProfileId);

    void deleteByUserProfileId(Long userProfileId);
}
