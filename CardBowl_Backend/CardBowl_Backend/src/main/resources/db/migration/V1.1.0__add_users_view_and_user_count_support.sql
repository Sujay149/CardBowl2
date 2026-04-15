-- ===== Add users view for signup stats =====
-- Version: 1.1.0

DROP VIEW IF EXISTS users;

CREATE VIEW users AS
SELECT
    id,
    unique_key,
    email,
    mobile_no,
    first_name,
    last_name,
    is_active,
    deactivated_date,
    created_by,
    updated_by,
    created_on,
    updated_on,
    created_at,
    updated_at
FROM user_info;
