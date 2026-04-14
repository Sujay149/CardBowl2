-- ===== Add User Profile Table =====
-- Version: 1.0.3

CREATE TABLE IF NOT EXISTS user_profile (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    user_id BIGINT NOT NULL,
    name VARCHAR(100),
    title VARCHAR(100),
    company VARCHAR(255),
    company_logo_url VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    linkedin VARCHAR(500),
    twitter VARCHAR(500),
    address VARCHAR(500),
    bio TEXT,
    products TEXT,
    services TEXT,
    card_image_front_url VARCHAR(500),
    card_image_back_url VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES user_info(id),
    CONSTRAINT uq_profile_user UNIQUE (user_id)
);

CREATE INDEX idx_profile_user ON user_profile(user_id);
CREATE INDEX idx_profile_active ON user_profile(is_active);

-- Child table: profile_keyword
CREATE TABLE IF NOT EXISTS profile_keyword (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_profile_id BIGINT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_pkw_profile FOREIGN KEY (user_profile_id) REFERENCES user_profile(id)
);

CREATE INDEX idx_pkw_profile ON profile_keyword(user_profile_id);
