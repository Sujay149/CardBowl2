-- ===== Add User Connection Table =====
-- Version: 1.0.7

CREATE TABLE IF NOT EXISTS user_connection (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    user_id BIGINT NOT NULL,
    peer_user_id BIGINT NOT NULL,
    peer_name VARCHAR(100),
    connected_date DATETIME,
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_conn_user FOREIGN KEY (user_id) REFERENCES user_info(id),
    CONSTRAINT fk_conn_peer FOREIGN KEY (peer_user_id) REFERENCES user_info(id),
    UNIQUE KEY uk_conn_user_peer (user_id, peer_user_id)
);

CREATE INDEX idx_conn_user ON user_connection(user_id);
CREATE INDEX idx_conn_peer ON user_connection(peer_user_id);
CREATE INDEX idx_conn_active ON user_connection(is_active);
