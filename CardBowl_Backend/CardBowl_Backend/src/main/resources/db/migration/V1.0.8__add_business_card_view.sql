-- ===== Add Business Card View =====
-- Version: 1.0.8

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
JOIN user_info u ON bc.user_id = u.id;
