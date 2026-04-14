package com.cardbowl.app.repository.sql;

import com.cardbowl.app.common.util.CommonUtil;
import com.cardbowl.app.model.sql.BaseEntityWithUniqueKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@NoRepositoryBean
public interface BaseUniqueKeyRepository<T extends BaseEntityWithUniqueKey> extends JpaRepository<T, Long> {

    Optional<T> findByUniqueKey(String uniqueKey);

    @Transactional
    default T saveWithUniqueKey(T entity) {
        T saved = save(entity);
        if (saved.getUniqueKey() == null) {
            saved.setUniqueKey(CommonUtil.generateUniqueKey(saved.getId()));
            saved = save(saved);
        }
        return saved;
    }
}
