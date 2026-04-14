-- ===== Add User Info Table =====
-- Version: 1.0.2

CREATE TABLE IF NOT EXISTS user_info (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    mobile_no VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT uq_user_email UNIQUE (email)
);

CREATE INDEX idx_user_email ON user_info(email);
CREATE INDEX idx_user_active ON user_info(is_active);
CREATE INDEX idx_user_mobile ON user_info(mobile_no);
