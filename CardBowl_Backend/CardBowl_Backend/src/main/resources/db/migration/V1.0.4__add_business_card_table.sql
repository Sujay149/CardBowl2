-- ===== Add Business Card Table =====
-- Version: 1.0.4

CREATE TABLE IF NOT EXISTS business_card (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    user_id BIGINT NOT NULL,
    name VARCHAR(100),
    title VARCHAR(100),
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    address VARCHAR(500),
    linkedin VARCHAR(500),
    twitter VARCHAR(500),
    instagram VARCHAR(500),
    facebook VARCHAR(500),
    image_front_url VARCHAR(500),
    image_back_url VARCHAR(500),
    category VARCHAR(100),
    org_description TEXT,
    org_location VARCHAR(500),
    web_context TEXT,
    notes TEXT,
    scan_latitude VARCHAR(50),
    scan_longitude VARCHAR(50),
    scan_address VARCHAR(500),
    saved_date DATETIME,
    is_connected_card TINYINT(1) DEFAULT 0,
    connected_user_id BIGINT,
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_card_user FOREIGN KEY (user_id) REFERENCES user_info(id),
    CONSTRAINT fk_card_connected_user FOREIGN KEY (connected_user_id) REFERENCES user_info(id)
);

CREATE INDEX idx_card_user ON business_card(user_id);
CREATE INDEX idx_card_active ON business_card(is_active);
CREATE INDEX idx_card_company ON business_card(company);
CREATE INDEX idx_card_category ON business_card(category);
CREATE INDEX idx_card_connected_user ON business_card(connected_user_id);

-- Child table: card_keyword
CREATE TABLE IF NOT EXISTS card_keyword (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_card_id BIGINT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_ckw_card FOREIGN KEY (business_card_id) REFERENCES business_card(id)
);

CREATE INDEX idx_ckw_card ON card_keyword(business_card_id);

-- Child table: card_decision_maker
CREATE TABLE IF NOT EXISTS card_decision_maker (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_card_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_cdm_card FOREIGN KEY (business_card_id) REFERENCES business_card(id)
);

CREATE INDEX idx_cdm_card ON card_decision_maker(business_card_id);
