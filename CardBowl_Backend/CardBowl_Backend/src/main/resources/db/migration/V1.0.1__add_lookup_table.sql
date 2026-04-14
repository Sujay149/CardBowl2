-- ===== Add Lookup Table =====
-- Version: 1.0.1

CREATE TABLE IF NOT EXISTS lookup (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    category VARCHAR(100) NOT NULL,
    lookup_value VARCHAR(100) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100)
);

CREATE INDEX idx_lookup_category ON lookup(category);
CREATE INDEX idx_lookup_active ON lookup(is_active);
