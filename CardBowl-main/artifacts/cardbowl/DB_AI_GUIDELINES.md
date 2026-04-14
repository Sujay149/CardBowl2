# Database AI Coding Guidelines — Kapiva Backend

> **CRITICAL SYSTEM DIRECTIVE:** When generating new code, schemas, migrations, or features for this project, you **must** strictly adhere to the following architectural guidelines and standards without deviation. Any generated SQL or schema change that violates these rules must be corrected before delivery.

---

## How to Use This Document

This document is the single source of truth for all database and schema decisions. Copy-paste any of the prompts below when working with an AI coding assistant:

**Prompt 1 — New Table:**
> Read `DB_AI_GUIDELINES.md`. Create a Flyway migration script to add a new `{table_name}` table with the following columns: `{column_list}`. Ensure the script follows all naming conventions, includes the mandatory `unique_key` column, all audit columns, proper foreign key constraints with named constraints, and appropriate indexes.

**Prompt 2 — Alter Existing Table:**
> Read `DB_AI_GUIDELINES.md`. Create a Flyway migration script to add columns `{column_list}` to the `{table_name}` table. Include appropriate foreign key constraints (with `fk_` naming), indexes, and default values as per our standards.

**Prompt 3 — New Database View:**
> Read `DB_AI_GUIDELINES.md`. Create a Flyway migration script for a `CREATE OR REPLACE VIEW {view_name}` that joins `{table_list}`. Follow the view naming and aliasing conventions documented here.

---

## 1. Flyway Migration Standards

### 1.1 File Naming Convention

All schema changes **must** be managed through Flyway versioned migrations. No manual DDL is allowed against any environment.

```
V{major}.{minor}.{patch}__{description}.sql
```

| Component      | Rule                                                           | Example                          |
|----------------|----------------------------------------------------------------|----------------------------------|
| Prefix         | Always `V` (uppercase)                                         | `V`                              |
| Version        | Semantic: `major.minor.patch` separated by dots                | `1.0.31`                         |
| Separator      | Double underscore `__`                                         | `__`                             |
| Description    | `snake_case`, short, imperative verb + noun                    | `add_campaign_module`            |
| Extension      | `.sql`                                                         | `.sql`                           |

**Examples of correct names:**
```
V1.0.31__add_campaign_module.sql
V1.0.32__add_incentive_plan_module.sql
V1.0.40__add_leave_approval_columns.sql
V1.0.45__drop_legacy_incentive_tables.sql
```

**Rules:**
- Version numbers **must** increment sequentially within the minor series. Never re-use a version number.
- Descriptions must start with an action verb: `add_`, `update_`, `drop_`, `seed_`, `fix_`, `rename_`.
- Each migration file must begin with a comment header:

```sql
-- =====================================================
-- {BRIEF DESCRIPTION IN UPPERCASE}
-- Version: {version}
-- =====================================================
```

### 1.2 Migration Content Rules

- **One logical change per migration.** Do not mix unrelated DDL in a single file.
- `CREATE TABLE`, `ALTER TABLE`, `CREATE OR REPLACE VIEW`, `INSERT` (seed data), and `DROP` are all valid migration contents.
- Always use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency where MySQL syntax allows.
- Seed data migrations should be in their own file with a `seed_` prefix description (e.g., `V1.0.38__seed_expense_type_lookups.sql`).

---

## 2. Naming Conventions

### 2.1 Table Names

| Rule                                | Example                        |
|-------------------------------------|--------------------------------|
| Always `snake_case`                 | `sales_order`, `employee_attendance` |
| Singular noun                       | `employee` (not `employees`)   |
| Join/association tables use both entity names | `module_platform`, `beat_rep_assignment` |
| Status history tables: `{entity}_status` | `sales_order_status`, `delivery_status` |
| Sequence tables: `{entity}_sequence`     | `sales_order_sequence`, `emp_sequence` |
| View tables: `{entity}_view`             | `employee_view`, `outlet_view` |

### 2.2 Column Names

| Rule                                | Example                        |
|-------------------------------------|--------------------------------|
| Always `snake_case`                 | `order_date`, `is_active`      |
| Boolean columns: prefix `is_`      | `is_active`, `is_advance`, `is_deleted`, `is_allowed` |
| Date columns: suffix `_date`       | `order_date`, `attendance_date`, `deactivated_date` |
| DateTime columns: suffix `_time` or `_on` | `check_in_time`, `created_on` |
| URL columns: suffix `_url`         | `picture1_url`, `bill_image_url` |
| Foreign keys: `{referenced_entity}_id`  | `employee_id`, `region_id`, `outlet_id` |
| Compound FKs: `{role}_{entity}_id` | `order_taken_by_id`, `approved_by_id`, `delivered_by_id` |

### 2.3 Primary Key

Every table **must** have:
```sql
id BIGINT AUTO_INCREMENT PRIMARY KEY
```
- Column name is always `id`.
- Type is always `BIGINT`.
- Strategy is always `AUTO_INCREMENT`.
- Declared inline with `PRIMARY KEY` — no separate constraint.

### 2.4 Foreign Key Constraints

All foreign keys **must** have explicitly named constraints using the pattern:

```
CONSTRAINT fk_{source_table_abbreviation}_{descriptive_name} FOREIGN KEY ({column}) REFERENCES {target_table}(id)
```

**Examples:**
```sql
CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES user_info(id)
CONSTRAINT fk_employee_manager FOREIGN KEY (reporting_manager_id) REFERENCES employee(id)
CONSTRAINT fk_order_outlet FOREIGN KEY (outlet_id) REFERENCES outlet(id)
CONSTRAINT fk_rsp_ratesheet FOREIGN KEY (rate_sheet_id) REFERENCES rate_sheet(id)
CONSTRAINT fk_ditem_product FOREIGN KEY (product_id) REFERENCES product(id)
CONSTRAINT fk_bill_invoice FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoice(id)
```

**Abbreviation rules for long table names:**
- `rate_sheet_product` → `rsp`
- `delivery_item` → `ditem`
- `delivery_status` → `dstatus`
- `sales_order_hierarchy` → `soh`
- `invoice_item` → `invitem`
- `role_module_permission` → `rmp`
- `workflow_action` → `wfaction`

### 2.5 Unique Constraints

Named unique constraints use the `uq_` prefix:
```sql
CONSTRAINT uq_rate_sheet_product UNIQUE (rate_sheet_id, product_id)
CONSTRAINT uq_soh UNIQUE (sales_order_id, level_no)
UNIQUE KEY uk_beat_day_employee (beat_id, day_of_week_id, employee_id)
```

### 2.6 Indexes

Named indexes use the `idx_` prefix:
```sql
CREATE INDEX idx_beat_code ON beat(beat_code);
CREATE INDEX idx_beat_region ON beat(region_id);
CREATE INDEX idx_beat_active ON beat(is_active);
```

---

## 3. Mandatory `unique_key` Column

**Every domain/master table** must include:

```sql
unique_key VARCHAR(15) UNIQUE
```

- This is the **public-facing business identifier** exposed via APIs.
- The internal `id` (auto-increment) is **never** exposed to clients.
- Unique keys are generated by the application layer (`CommonUtil.generateUniqueKey()`) after the first save: a random alphanumeric string + the ID suffix, totaling 15 characters.
- **Exceptions:** Child/detail tables that are never referenced directly by API (e.g., `sales_order_item`, `delivery_item`, `payment_item`, `module_platform`) may omit `unique_key` if they are always accessed through their parent.

---

## 4. Audit Columns

**Every table** must include these six audit columns, in this exact order, at the end of the column list:

```sql
created_by  BIGINT,
updated_by  BIGINT,
created_on  DATETIME,
updated_on  DATETIME,
created_at  VARCHAR(100),
updated_at  VARCHAR(100)
```

| Column       | Type           | Purpose                                              |
|-------------|----------------|------------------------------------------------------|
| `created_by` | `BIGINT`       | `user_info.id` of the user who created the record    |
| `updated_by` | `BIGINT`       | `user_info.id` of the user who last updated          |
| `created_on` | `DATETIME`     | Timestamp of creation (IST timezone via application)  |
| `updated_on` | `DATETIME`     | Timestamp of last update (IST timezone via application) |
| `created_at` | `VARCHAR(100)` | GPS coordinates of the user at creation time          |
| `updated_at` | `VARCHAR(100)` | GPS coordinates of the user at last update time       |

**Rules:**
- These columns are populated **exclusively** by the application's `AuditService`, not by database triggers or defaults.
- On **INSERT**: all six columns are set (`created_by`, `updated_by`, `created_on`, `updated_on`, `created_at`, `updated_at`).
- On **UPDATE**: only `updated_by`, `updated_on`, and `updated_at` are modified.
- No `DEFAULT CURRENT_TIMESTAMP` or `ON UPDATE` triggers — the application controls all timestamps in IST.

---

## 5. Soft Delete Pattern

Tables with activatable/deactivatable records must include:

```sql
is_active        TINYINT(1) DEFAULT 1,
deactivated_date DATETIME
```

- `is_active` defaults to `1` (true).
- `deactivated_date` is set by the application when the record is deactivated.
- Records are **never** physically deleted. All "delete" operations are soft deletes via `is_active = 0`.

---

## 6. Common Data Types

| Use Case               | Data Type            | Example                  |
|------------------------|----------------------|--------------------------|
| Primary key            | `BIGINT`             | `id`                     |
| Monetary amounts       | `DECIMAL(12,2)`      | `net_amount`, `total_amount` |
| Tax percentages        | `DECIMAL(5,2)`       | `tax_percent`            |
| Points / units         | `DECIMAL(10,2)`      | `points_per_unit`, `unit_value` |
| Quantities             | `DECIMAL(12,2)`      | `quantity`, `delivered_quantity` |
| Short strings          | `VARCHAR(20-100)`    | `order_no`, `role_name`  |
| Medium strings         | `VARCHAR(255)`       | `description`, `remarks` |
| Long strings           | `VARCHAR(500)`       | `address`, `file_url`    |
| Text/JSON              | `TEXT` / `JSON`      | `description` (long), `conditions` |
| Boolean flags          | `TINYINT(1)`         | `is_active`, `is_advance` |
| Dates (no time)        | `DATE`               | `order_date`, `holiday_date` |
| Dates with time        | `DATETIME`           | `created_on`, `check_in_time` |
| Status/enum strings    | `VARCHAR(50)`        | `order_status`, `approval_status` |
| Unique key             | `VARCHAR(15) UNIQUE` | `unique_key`             |
| Coordinates            | `VARCHAR(100)`       | `check_in_coordinates`   |
| URLs                   | `VARCHAR(500)`       | `picture1_url`           |

---

## 7. Database Views

Views follow the `{entity}_view` naming convention and are created using `CREATE OR REPLACE VIEW`.

**Rules:**
- Alias the `unique_key` column to `{entity}_key` (e.g., `e.unique_key AS employee_key`).
- Use `LEFT JOIN` for optional relationships, `JOIN` for required ones.
- Include a `search_text` computed column for full-text search by concatenating searchable fields:
  ```sql
  CONCAT(e.emp_no, ' ', u.first_name, ' ', COALESCE(u.last_name, ''), ' ', u.mobile_no) AS search_text
  ```
- Views are read-only projections — they should denormalize data for list/grid display.
- Always handle NULL last names with `COALESCE(u.last_name, '')`.

---

## 8. Lookup Table Pattern

The `lookup` table is the central reference/dropdown data store:

```sql
CREATE TABLE lookup (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    category VARCHAR(100) NOT NULL,    -- e.g., 'DAY_OF_WEEK', 'EXPENSE_TYPE', 'UOM'
    lookup_value VARCHAR(100) NOT NULL, -- e.g., 'MONDAY', 'Fuel', 'KG'
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    -- audit columns...
);
```

- All dropdown/enum-like values that may expand over time should reference `lookup` via a FK.
- Category values must be `UPPER_SNAKE_CASE` (e.g., `DAY_OF_WEEK`, `EXPENSE_TYPE`).
- Lookup values should be `UPPER_CASE` or `Title Case` depending on display needs.

---

## 9. Summary Tables (Dashboard / Reporting)

For dashboard reports, leaderboards, and performance tracking, we use **denormalized summary tables** that are populated and refreshed asynchronously via **Kafka events** — never by direct user API calls.

### 9.1 Design Pattern

- Summary tables aggregate metrics from multiple source tables into a single flat, query-friendly structure.
- They are keyed by a **composite unique constraint** (e.g., `employee_id + summary_date`) rather than relying solely on `unique_key` for lookups.
- All metric columns default to `0` or `0.00` so rows are never NULL for aggregation queries.
- Denormalized FK columns (e.g., `functional_role_id`, `state_id`, `territory_id`) are included for fast filtering/grouping without joins.

### 9.2 Naming Convention

```
{entity}_summary              -- e.g., employee_performance_summary
{entity}_activity_summary     -- e.g., employee_activity_summary
```

### 9.3 How They Are Populated

1. A domain event occurs (order placed, visit completed, attendance checked in, etc.).
2. The service publishes a **Kafka event** to a refresh topic (e.g., `refresh-summary-data`).
3. A **Kafka consumer** (`SummaryDataConsumerServiceImpl`) listens on that topic.
4. The consumer queries the source-of-truth tables, re-aggregates the metrics, and **upserts** (find-or-create + update) the summary row.

This ensures dashboards read from pre-computed data while the source tables remain the authority.

### 9.4 Reference Structure

```sql
CREATE TABLE {entity}_performance_summary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- Business key (composite unique)
    employee_id BIGINT NOT NULL,
    summary_date DATE NOT NULL,

    -- Denormalized dimensions for fast filtering
    functional_role_id BIGINT,
    state_id BIGINT,
    division_id BIGINT,
    territory_id BIGINT,

    -- Aggregated metrics (always default to 0)
    total_sales_value DECIMAL(15,2) DEFAULT 0,
    total_orders_count INT DEFAULT 0,
    total_visits_planned INT DEFAULT 0,
    total_visits_completed INT DEFAULT 0,
    total_collections DECIMAL(15,2) DEFAULT 0,
    new_outlets_added INT DEFAULT 0,
    first_check_in TIME,
    last_check_out TIME,
    total_field_time_minutes INT DEFAULT 0,

    -- Standard columns
    is_active TINYINT(1) DEFAULT 1,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),

    UNIQUE KEY uk_employee_date (employee_id, summary_date)
);
```

---

## 10. Reference Example — Idealized CREATE TABLE Migration

```sql
-- =====================================================
-- ADD CUSTOMER FEEDBACK MODULE
-- Version: 1.0.61
-- =====================================================

-- Customer feedback for outlet visits
CREATE TABLE customer_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    unique_key VARCHAR(15) UNIQUE,
    visit_id BIGINT NOT NULL,
    outlet_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    feedback_date DATE NOT NULL,
    rating INT NOT NULL,
    feedback_type_id BIGINT,
    comments VARCHAR(500),
    image_url VARCHAR(500),
    is_resolved TINYINT(1) DEFAULT 0,
    resolved_by_id BIGINT,
    resolved_date DATETIME,
    resolution_remarks VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    deactivated_date DATETIME,
    created_by BIGINT,
    updated_by BIGINT,
    created_on DATETIME,
    updated_on DATETIME,
    created_at VARCHAR(100),
    updated_at VARCHAR(100),
    CONSTRAINT fk_feedback_visit FOREIGN KEY (visit_id) REFERENCES visit(id),
    CONSTRAINT fk_feedback_outlet FOREIGN KEY (outlet_id) REFERENCES outlet(id),
    CONSTRAINT fk_feedback_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT fk_feedback_type FOREIGN KEY (feedback_type_id) REFERENCES lookup(id),
    CONSTRAINT fk_feedback_resolved_by FOREIGN KEY (resolved_by_id) REFERENCES employee(id)
);

CREATE INDEX idx_feedback_visit ON customer_feedback(visit_id);
CREATE INDEX idx_feedback_outlet ON customer_feedback(outlet_id);
CREATE INDEX idx_feedback_employee ON customer_feedback(employee_id);
CREATE INDEX idx_feedback_date ON customer_feedback(feedback_date);
CREATE INDEX idx_feedback_active ON customer_feedback(is_active);

-- Customer feedback view
CREATE OR REPLACE VIEW customer_feedback_view AS
SELECT
    cf.id,
    cf.unique_key AS feedback_key,
    cf.feedback_date,
    cf.rating,
    cf.comments,
    cf.image_url,
    cf.is_resolved,
    cf.resolved_date,
    cf.resolution_remarks,
    l.lookup_value AS feedback_type,
    cf.visit_id,
    v.unique_key AS visit_key,
    cf.outlet_id,
    o.unique_key AS outlet_key,
    o.outlet_name,
    cf.employee_id,
    e.unique_key AS employee_key,
    CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS employee_name,
    cf.resolved_by_id AS resolved_by_employee_id,
    rb.unique_key AS resolved_by_employee_key,
    CONCAT(rbu.first_name, ' ', COALESCE(rbu.last_name, '')) AS resolved_by_employee_name,
    CONCAT(o.outlet_name, ' ', u.first_name, ' ', COALESCE(u.last_name, '')) AS search_text
FROM customer_feedback cf
JOIN visit v ON cf.visit_id = v.id
JOIN outlet o ON cf.outlet_id = o.id
JOIN employee e ON cf.employee_id = e.id
JOIN user_info u ON e.user_id = u.id
LEFT JOIN lookup l ON cf.feedback_type_id = l.id
LEFT JOIN employee rb ON cf.resolved_by_id = rb.id
LEFT JOIN user_info rbu ON rb.user_id = rbu.id;
```

---

## Quick Checklist for Every Migration

- [ ] File name follows `V{x}.{y}.{z}__{verb_noun}.sql` format
- [ ] Comment header with description and version
- [ ] Table name is `snake_case`, singular
- [ ] `id BIGINT AUTO_INCREMENT PRIMARY KEY` as first column
- [ ] `unique_key VARCHAR(15) UNIQUE` included (for domain tables)
- [ ] All six audit columns present at the end: `created_by`, `updated_by`, `created_on`, `updated_on`, `created_at`, `updated_at`
- [ ] `is_active TINYINT(1) DEFAULT 1` and `deactivated_date DATETIME` for activatable entities
- [ ] All foreign keys have named constraints: `CONSTRAINT fk_{abbr}_{name}`
- [ ] Appropriate indexes created on FK columns and frequently filtered columns
- [ ] No `DEFAULT CURRENT_TIMESTAMP` or `ON UPDATE` triggers
- [ ] Monetary values use `DECIMAL(12,2)`, not `FLOAT` or `DOUBLE`
