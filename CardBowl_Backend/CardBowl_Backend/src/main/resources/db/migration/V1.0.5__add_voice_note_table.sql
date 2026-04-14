-- ===== Add Voice Note Table =====
-- Version: 1.0.5

CREATE TABLE IF NOT EXISTS voice_note (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    business_card_id BIGINT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    duration_seconds DECIMAL(10,2),
    label VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_vnote_card FOREIGN KEY (business_card_id) REFERENCES business_card(id)
);

CREATE INDEX idx_vnote_card ON voice_note(business_card_id);
CREATE INDEX idx_vnote_active ON voice_note(is_active);
