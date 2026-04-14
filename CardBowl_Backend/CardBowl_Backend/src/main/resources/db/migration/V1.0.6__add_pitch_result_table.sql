-- ===== Add Pitch Result Table =====
-- Version: 1.0.6

CREATE TABLE IF NOT EXISTS pitch_result (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    business_card_id BIGINT NOT NULL,
    pitch_type VARCHAR(50) NOT NULL,
    pitch_text TEXT NOT NULL,
    brief_explanation TEXT,
    grade DECIMAL(5,2),
    grade_label VARCHAR(20),
    reasoning TEXT,
    web_info TEXT,
    generated_date DATETIME,
    source VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_pitch_card FOREIGN KEY (business_card_id) REFERENCES business_card(id)
);

CREATE INDEX idx_pitch_card ON pitch_result(business_card_id);
CREATE INDEX idx_pitch_type ON pitch_result(pitch_type);
CREATE INDEX idx_pitch_active ON pitch_result(is_active);

-- Child table: pitch_web_source
CREATE TABLE IF NOT EXISTS pitch_web_source (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pitch_result_id BIGINT NOT NULL,
    title VARCHAR(255),
    source_url VARCHAR(500),
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_pws_pitch FOREIGN KEY (pitch_result_id) REFERENCES pitch_result(id)
);

CREATE INDEX idx_pws_pitch ON pitch_web_source(pitch_result_id);
