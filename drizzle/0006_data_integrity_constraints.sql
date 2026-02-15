-- Migration: 0006_data_integrity_constraints.sql
-- Purpose: Add data validation triggers and constraints for data integrity
-- Created: 2026-02-15
-- Reversible: Yes (see rollback section at end)

-- ============================================
-- SECTION 1: Email Validation Views
-- ============================================

-- Create a view for identifying invalid emails
CREATE VIEW IF NOT EXISTS v_valid_emails AS
SELECT 
  id,
  email,
  CASE 
    WHEN email IS NULL OR email = '' THEN 0
    WHEN email GLOB '*@*.*' 
         AND email NOT GLOB '@*'
         AND email NOT GLOB '*@.*'
         AND email NOT GLOB '*.@*'
         AND length(email) >= 5
         AND length(email) <= 254
         AND instr(email, '@') > 1
         AND substr(email, -1) != '.'
    THEN 1 
    ELSE 0 
  END as is_valid
FROM customers
WHERE email IS NOT NULL AND email != '';

-- ============================================
-- SECTION 2: AFM Validation View
-- ============================================

CREATE VIEW IF NOT EXISTS v_valid_afm AS
SELECT 
  id,
  afm,
  CASE 
    WHEN afm IS NULL OR afm = '' THEN 1  -- NULL is valid (optional field)
    WHEN length(afm) != 9 THEN 0
    WHEN afm NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN 0
    ELSE 1
  END as is_valid
FROM customers
WHERE afm IS NOT NULL AND afm != '';

-- ============================================
-- SECTION 3: Validation Triggers for Customers
-- ============================================

-- Email validation trigger for customers - INSERT
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_email_insert
BEFORE INSERT ON customers
FOR EACH ROW
WHEN NEW.email IS NOT NULL AND NEW.email != ''
BEGIN
  SELECT CASE 
    WHEN NOT (NEW.email GLOB '*@*.*' 
              AND NEW.email NOT GLOB '@*'
              AND NEW.email NOT GLOB '*@.*'
              AND length(NEW.email) >= 5
              AND length(NEW.email) <= 254) THEN
      RAISE(ABORT, 'Invalid email format: ' || NEW.email)
    ELSE 1
  END;
END;

-- Email validation trigger for customers - UPDATE
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_email_update
BEFORE UPDATE OF email ON customers
FOR EACH ROW
WHEN NEW.email IS NOT NULL AND NEW.email != '' AND NEW.email != OLD.email
BEGIN
  SELECT CASE 
    WHEN NOT (NEW.email GLOB '*@*.*' 
              AND NEW.email NOT GLOB '@*'
              AND NEW.email NOT GLOB '*@.*'
              AND length(NEW.email) >= 5
              AND length(NEW.email) <= 254) THEN
      RAISE(ABORT, 'Invalid email format: ' || NEW.email)
    ELSE 1
  END;
END;

-- Secondary email validation trigger for customers - INSERT
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_email_secondary_insert
BEFORE INSERT ON customers
FOR EACH ROW
WHEN NEW.email_secondary IS NOT NULL AND NEW.email_secondary != ''
BEGIN
  SELECT CASE 
    WHEN NOT (NEW.email_secondary GLOB '*@*.*' 
              AND NEW.email_secondary NOT GLOB '@*'
              AND NEW.email_secondary NOT GLOB '*@.*'
              AND length(NEW.email_secondary) >= 5
              AND length(NEW.email_secondary) <= 254) THEN
      RAISE(ABORT, 'Invalid secondary email format: ' || NEW.email_secondary)
    ELSE 1
  END;
END;

-- Secondary email validation trigger for customers - UPDATE
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_email_secondary_update
BEFORE UPDATE OF email_secondary ON customers
FOR EACH ROW
WHEN NEW.email_secondary IS NOT NULL AND NEW.email_secondary != '' AND NEW.email_secondary != OLD.email_secondary
BEGIN
  SELECT CASE 
    WHEN NOT (NEW.email_secondary GLOB '*@*.*' 
              AND NEW.email_secondary NOT GLOB '@*'
              AND NEW.email_secondary NOT GLOB '*@.*'
              AND length(NEW.email_secondary) >= 5
              AND length(NEW.email_secondary) <= 254) THEN
      RAISE(ABORT, 'Invalid secondary email format: ' || NEW.email_secondary)
    ELSE 1
  END;
END;

-- AFM validation trigger for customers - INSERT
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_afm_insert
BEFORE INSERT ON customers
FOR EACH ROW
WHEN NEW.afm IS NOT NULL AND NEW.afm != ''
BEGIN
  SELECT CASE 
    WHEN length(NEW.afm) != 9 THEN
      RAISE(ABORT, 'AFM must be exactly 9 digits')
    WHEN NEW.afm NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN
      RAISE(ABORT, 'AFM must contain only digits')
    ELSE 1
  END;
END;

-- AFM validation trigger for customers - UPDATE
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_afm_update
BEFORE UPDATE OF afm ON customers
FOR EACH ROW
WHEN NEW.afm IS NOT NULL AND NEW.afm != '' AND NEW.afm != OLD.afm
BEGIN
  SELECT CASE 
    WHEN length(NEW.afm) != 9 THEN
      RAISE(ABORT, 'AFM must be exactly 9 digits')
    WHEN NEW.afm NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN
      RAISE(ABORT, 'AFM must contain only digits')
    ELSE 1
  END;
END;

-- Postal code validation trigger for customers - INSERT
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_postal_insert
BEFORE INSERT ON customers
FOR EACH ROW
WHEN NEW.postal_code IS NOT NULL AND NEW.postal_code != ''
BEGIN
  SELECT CASE 
    WHEN length(NEW.postal_code) != 5 THEN
      RAISE(ABORT, 'Greek postal code must be exactly 5 digits')
    WHEN NEW.postal_code NOT GLOB '[0-9][0-9][0-9][0-9][0-9]' THEN
      RAISE(ABORT, 'Postal code must contain only digits')
    ELSE 1
  END;
END;

-- Postal code validation trigger for customers - UPDATE
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_postal_update
BEFORE UPDATE OF postal_code ON customers
FOR EACH ROW
WHEN NEW.postal_code IS NOT NULL AND NEW.postal_code != '' AND NEW.postal_code != OLD.postal_code
BEGIN
  SELECT CASE 
    WHEN length(NEW.postal_code) != 5 THEN
      RAISE(ABORT, 'Greek postal code must be exactly 5 digits')
    WHEN NEW.postal_code NOT GLOB '[0-9][0-9][0-9][0-9][0-9]' THEN
      RAISE(ABORT, 'Postal code must contain only digits')
    ELSE 1
  END;
END;

-- Website URL validation trigger for customers - INSERT
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_website_insert
BEFORE INSERT ON customers
FOR EACH ROW
WHEN NEW.website IS NOT NULL AND NEW.website != ''
BEGIN
  SELECT CASE 
    WHEN NOT ((NEW.website LIKE 'http://%' OR NEW.website LIKE 'https://%')
              AND length(NEW.website) >= 10
              AND NEW.website NOT LIKE '%..%') THEN
      RAISE(ABORT, 'Website must be a valid URL starting with http:// or https://')
    ELSE 1
  END;
END;

-- Website URL validation trigger for customers - UPDATE
CREATE TRIGGER IF NOT EXISTS trg_validate_customer_website_update
BEFORE UPDATE OF website ON customers
FOR EACH ROW
WHEN NEW.website IS NOT NULL AND NEW.website != '' AND NEW.website != OLD.website
BEGIN
  SELECT CASE 
    WHEN NOT ((NEW.website LIKE 'http://%' OR NEW.website LIKE 'https://%')
              AND length(NEW.website) >= 10
              AND NEW.website NOT LIKE '%..%') THEN
      RAISE(ABORT, 'Website must be a valid URL starting with http:// or https://')
    ELSE 1
  END;
END;

-- ============================================
-- SECTION 4: Validation Triggers for Leads
-- ============================================

-- Email validation trigger for leads - INSERT
CREATE TRIGGER IF NOT EXISTS trg_validate_lead_email_insert
BEFORE INSERT ON leads
FOR EACH ROW
WHEN NEW.email IS NOT NULL AND NEW.email != ''
BEGIN
  SELECT CASE 
    WHEN NOT (NEW.email GLOB '*@*.*' 
              AND NEW.email NOT GLOB '@*'
              AND NEW.email NOT GLOB '*@.*'
              AND length(NEW.email) >= 5
              AND length(NEW.email) <= 254) THEN
      RAISE(ABORT, 'Invalid email format: ' || NEW.email)
    ELSE 1
  END;
END;

-- Email validation trigger for leads - UPDATE
CREATE TRIGGER IF NOT EXISTS trg_validate_lead_email_update
BEFORE UPDATE OF email ON leads
FOR EACH ROW
WHEN NEW.email IS NOT NULL AND NEW.email != '' AND NEW.email != OLD.email
BEGIN
  SELECT CASE 
    WHEN NOT (NEW.email GLOB '*@*.*' 
              AND NEW.email NOT GLOB '@*'
              AND NEW.email NOT GLOB '*@.*'
              AND length(NEW.email) >= 5
              AND length(NEW.email) <= 254) THEN
      RAISE(ABORT, 'Invalid email format: ' || NEW.email)
    ELSE 1
  END;
END;

-- ============================================
-- SECTION 5: Validation Triggers for Campaign Recipients
-- ============================================

-- Email validation trigger for campaign_recipients - INSERT
CREATE TRIGGER IF NOT EXISTS trg_validate_recipient_email_insert
BEFORE INSERT ON campaign_recipients
FOR EACH ROW
BEGIN
  SELECT CASE 
    WHEN NOT (NEW.email GLOB '*@*.*' 
              AND NEW.email NOT GLOB '@*'
              AND NEW.email NOT GLOB '*@.*'
              AND length(NEW.email) >= 5
              AND length(NEW.email) <= 254) THEN
      RAISE(ABORT, 'Invalid email format for recipient: ' || NEW.email)
    ELSE 1
  END;
END;

-- ============================================
-- SECTION 6: Data Quality Views
-- ============================================

-- View for identifying data quality issues across all tables
CREATE VIEW IF NOT EXISTS v_data_quality_issues AS
SELECT 
  'customers' as table_name,
  id as record_id,
  'email' as field_name,
  email as field_value,
  'Invalid email format' as issue_description
FROM customers
WHERE email IS NOT NULL 
  AND email != ''
  AND NOT (email GLOB '*@*.*' 
           AND email NOT GLOB '@*'
           AND email NOT GLOB '*@.*'
           AND length(email) >= 5
           AND length(email) <= 254)

UNION ALL

SELECT 
  'customers' as table_name,
  id as record_id,
  'email_secondary' as field_name,
  email_secondary as field_value,
  'Invalid secondary email format' as issue_description
FROM customers
WHERE email_secondary IS NOT NULL 
  AND email_secondary != ''
  AND NOT (email_secondary GLOB '*@*.*' 
           AND email_secondary NOT GLOB '@*'
           AND email_secondary NOT GLOB '*@.*'
           AND length(email_secondary) >= 5
           AND length(email_secondary) <= 254)

UNION ALL

SELECT 
  'customers' as table_name,
  id as record_id,
  'afm' as field_name,
  afm as field_value,
  'Invalid AFM format - must be 9 digits' as issue_description
FROM customers
WHERE afm IS NOT NULL 
  AND afm != ''
  AND (length(afm) != 9 OR afm NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')

UNION ALL

SELECT 
  'customers' as table_name,
  id as record_id,
  'postal_code' as field_name,
  postal_code as field_value,
  'Invalid postal code - must be 5 digits' as issue_description
FROM customers
WHERE postal_code IS NOT NULL 
  AND postal_code != ''
  AND (length(postal_code) != 5 OR postal_code NOT GLOB '[0-9][0-9][0-9][0-9][0-9]')

UNION ALL

SELECT 
  'customers' as table_name,
  id as record_id,
  'website' as field_name,
  website as field_value,
  'Invalid website URL - must start with http:// or https://' as issue_description
FROM customers
WHERE website IS NOT NULL 
  AND website != ''
  AND NOT ((website LIKE 'http://%' OR website LIKE 'https://%')
           AND length(website) >= 10
           AND website NOT LIKE '%..%')

UNION ALL

SELECT 
  'leads' as table_name,
  id as record_id,
  'email' as field_name,
  email as field_value,
  'Invalid email format' as issue_description
FROM leads
WHERE email IS NOT NULL 
  AND email != ''
  AND NOT (email GLOB '*@*.*' 
           AND email NOT GLOB '@*'
           AND email NOT GLOB '*@.*'
           AND length(email) >= 5
           AND length(email) <= 254)

UNION ALL

SELECT 
  'campaign_recipients' as table_name,
  id as record_id,
  'email' as field_name,
  email as field_value,
  'Invalid email format' as issue_description
FROM campaign_recipients
WHERE email IS NOT NULL 
  AND email != ''
  AND NOT (email GLOB '*@*.*' 
           AND email NOT GLOB '@*'
           AND email NOT GLOB '*@.*'
           AND length(email) >= 5
           AND length(email) <= 254);

-- ============================================
-- SECTION 7: Statistics View
-- ============================================

-- View for data quality statistics
CREATE VIEW IF NOT EXISTS v_data_quality_stats AS
SELECT 
  (SELECT COUNT(*) FROM customers) as total_customers,
  (SELECT COUNT(*) FROM customers WHERE email IS NOT NULL AND email != '') as customers_with_email,
  (SELECT COUNT(*) FROM v_data_quality_issues WHERE table_name = 'customers' AND field_name = 'email') as invalid_customer_emails,
  (SELECT COUNT(*) FROM customers WHERE afm IS NOT NULL AND afm != '') as customers_with_afm,
  (SELECT COUNT(*) FROM v_data_quality_issues WHERE table_name = 'customers' AND field_name = 'afm') as invalid_customer_afms,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(*) FROM v_data_quality_issues WHERE table_name = 'leads') as invalid_leads,
  (SELECT COUNT(*) FROM campaign_recipients) as total_recipients,
  (SELECT COUNT(*) FROM v_data_quality_issues WHERE table_name = 'campaign_recipients') as invalid_recipient_emails;

-- ============================================
-- ROLLBACK SECTION
-- To rollback this migration, run the following statements:
-- ============================================
-- DROP VIEW IF EXISTS v_data_quality_stats;
-- DROP VIEW IF EXISTS v_data_quality_issues;
-- DROP VIEW IF EXISTS v_valid_afm;
-- DROP VIEW IF EXISTS v_valid_emails;
-- DROP TRIGGER IF EXISTS trg_validate_recipient_email_insert;
-- DROP TRIGGER IF EXISTS trg_validate_lead_email_update;
-- DROP TRIGGER IF EXISTS trg_validate_lead_email_insert;
-- DROP TRIGGER IF EXISTS trg_validate_customer_website_update;
-- DROP TRIGGER IF EXISTS trg_validate_customer_website_insert;
-- DROP TRIGGER IF EXISTS trg_validate_customer_postal_update;
-- DROP TRIGGER IF EXISTS trg_validate_customer_postal_insert;
-- DROP TRIGGER IF EXISTS trg_validate_customer_afm_update;
-- DROP TRIGGER IF EXISTS trg_validate_customer_afm_insert;
-- DROP TRIGGER IF EXISTS trg_validate_customer_email_secondary_update;
-- DROP TRIGGER IF EXISTS trg_validate_customer_email_secondary_insert;
-- DROP TRIGGER IF EXISTS trg_validate_customer_email_update;
-- DROP TRIGGER IF EXISTS trg_validate_customer_email_insert;
