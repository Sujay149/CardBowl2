package com.cardbowl.app.repository.sql.core;

import com.cardbowl.app.model.sql.core.Lookup;
import com.cardbowl.app.repository.sql.BaseUniqueKeyRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LookupRepository extends BaseUniqueKeyRepository<Lookup>, JpaSpecificationExecutor<Lookup> {

    List<Lookup> findByCategoryAndIsActive(String category, Boolean isActive);
}
