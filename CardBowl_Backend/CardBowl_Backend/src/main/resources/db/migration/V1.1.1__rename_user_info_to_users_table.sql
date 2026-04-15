-- ===== Rename user_info to users table =====
-- Version: 1.1.1

-- users was previously introduced as a view for reporting.
DROP VIEW IF EXISTS users;

RENAME TABLE user_info TO users;

-- Rebuild dependent view to reference the renamed users table.
CREATE OR REPLACE VIEW business_card_view AS
SELECT
    bc.id,
    bc.unique_key AS card_key,
    bc.name,
    bc.title,
    bc.company,
    bc.email,
    bc.phone,
    bc.website,
    bc.category,
    bc.org_location,
    bc.scan_address,
    bc.saved_date,
    bc.is_connected_card,
    bc.is_active,
    bc.user_id,
    u.unique_key AS user_key,
    CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS owner_name,
    bc.created_on,
    CONCAT(bc.name, ' ', COALESCE(bc.title, ''), ' ', COALESCE(bc.company, ''), ' ', COALESCE(bc.email, ''), ' ', COALESCE(bc.phone, '')) AS search_text
FROM business_card bc
JOIN users u ON bc.user_id = u.id;
