-- Migration: 0007_email_deliverability_tracking.sql
-- Purpose: Add email deliverability tracking infrastructure
-- Created: 2026-02-15
-- Reversible: Yes (see rollback section at end)

-- ============================================
-- SECTION 1: Email Delivery Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_delivery_events (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  
  -- Event Classification
  event_type TEXT NOT NULL,  -- sent, delivered, bounce, complaint, unsubscribe, deferred
  event_category TEXT NOT NULL,  -- success, failure, complaint, optout
  failure_reason TEXT,  -- invalid_syntax, dns_failure, hard_bounce, soft_bounce, spam_complaint, rate_limited
  
  -- Event Details
  smtp_code INTEGER,
  smtp_message TEXT,
  diagnostic_code TEXT,
  bounce_type TEXT,  -- hard, soft
  bounce_subtype TEXT,  -- general, noemail, suppressed, etc.
  
  -- Retry Information
  attempt_number INTEGER DEFAULT 1,
  next_retry_at INTEGER,  -- timestamp for scheduled retry
  retry_eligible INTEGER DEFAULT 0,  -- boolean
  
  -- Metadata
  email_address TEXT NOT NULL,
  domain TEXT,  -- extracted domain for DNS tracking
  mx_valid INTEGER,  -- boolean - MX record exists
  dns_checked_at INTEGER,  -- timestamp of DNS check
  
  -- Timestamps
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE
);

-- Indexes for email_delivery_events
CREATE INDEX IF NOT EXISTS idx_delivery_events_campaign ON email_delivery_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_recipient ON email_delivery_events(recipient_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_type ON email_delivery_events(event_type);
CREATE INDEX IF NOT EXISTS idx_delivery_events_failure_reason ON email_delivery_events(failure_reason);
CREATE INDEX IF NOT EXISTS idx_delivery_events_domain ON email_delivery_events(domain);
CREATE INDEX IF NOT EXISTS idx_delivery_events_occurred_at ON email_delivery_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_delivery_events_org_created ON email_delivery_events(org_id, created_at);

-- ============================================
-- SECTION 2: Email Suppressions Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_suppressions (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Suppression Type
  suppression_type TEXT NOT NULL,  -- hard_bounce, complaint, unsubscribe, manual
  suppression_reason TEXT,
  
  -- Source Information
  source_campaign_id TEXT,
  source_event_id TEXT,
  
  -- Metadata
  bounce_count INTEGER DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  
  -- Timestamps
  suppressed_at INTEGER NOT NULL,
  expires_at INTEGER,  -- NULL for permanent, timestamp for temporary suppressions
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (source_campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppressions_org_email ON email_suppressions(org_id, email);
CREATE INDEX IF NOT EXISTS idx_suppressions_type ON email_suppressions(suppression_type);
CREATE INDEX IF NOT EXISTS idx_suppressions_expires ON email_suppressions(expires_at);
CREATE INDEX IF NOT EXISTS idx_suppressions_org_type ON email_suppressions(org_id, suppression_type);

-- ============================================
-- SECTION 3: Email Validation Cache Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_validation_cache (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  
  -- Validation Results
  syntax_valid INTEGER NOT NULL,
  mx_valid INTEGER,
  mx_records TEXT,  -- JSON array of MX servers
  smtp_valid INTEGER,  -- SMTP connection test result
  
  -- Metadata
  validation_source TEXT,  -- pre_send, dns_check, smtp_verify
  error_message TEXT,
  
  -- Timestamps
  validated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,  -- Cache expiration
  
  -- Statistics
  check_count INTEGER DEFAULT 1,
  last_used_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_validation_cache_domain ON email_validation_cache(domain);
CREATE INDEX IF NOT EXISTS idx_validation_cache_expires ON email_validation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_validation_cache_valid ON email_validation_cache(syntax_valid, mx_valid);

-- ============================================
-- SECTION 4: Email Retry Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS email_retry_config (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT,  -- NULL for global defaults
  
  failure_reason TEXT NOT NULL,
  max_retries INTEGER NOT NULL DEFAULT 3,
  initial_delay_seconds INTEGER NOT NULL DEFAULT 300,
  backoff_multiplier REAL NOT NULL DEFAULT 2.0,
  max_delay_seconds INTEGER NOT NULL DEFAULT 86400,
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Default retry configurations (global defaults, org_id is NULL)
INSERT OR IGNORE INTO email_retry_config (id, org_id, failure_reason, max_retries, initial_delay_seconds, backoff_multiplier, max_delay_seconds, created_at, updated_at) VALUES
  ('rcfg_soft_bounce', NULL, 'soft_bounce', 3, 3600, 2.0, 86400, strftime('%s', 'now'), strftime('%s', 'now')),
  ('rcfg_dns_failure', NULL, 'dns_failure', 2, 86400, 1.0, 86400, strftime('%s', 'now'), strftime('%s', 'now')),
  ('rcfg_rate_limited', NULL, 'rate_limited', 5, 900, 2.0, 3600, strftime('%s', 'now'), strftime('%s', 'now')),
  ('rcfg_connection_failed', NULL, 'connection_failed', 3, 300, 2.0, 3600, strftime('%s', 'now'), strftime('%s', 'now')),
  ('rcfg_deferred', NULL, 'deferred', 3, 1800, 1.5, 14400, strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- SECTION 5: Enhance Campaign Recipients Table
-- ============================================
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- These statements may fail if columns already exist - that's expected behavior

-- Add failure tracking columns to campaign_recipients
ALTER TABLE campaign_recipients ADD COLUMN failure_category TEXT;
ALTER TABLE campaign_recipients ADD COLUMN failure_reason_detailed TEXT;
ALTER TABLE campaign_recipients ADD COLUMN bounce_type TEXT;
ALTER TABLE campaign_recipients ADD COLUMN attempt_count INTEGER DEFAULT 0;
ALTER TABLE campaign_recipients ADD COLUMN last_attempt_at INTEGER;
ALTER TABLE campaign_recipients ADD COLUMN next_retry_at INTEGER;
ALTER TABLE campaign_recipients ADD COLUMN mx_valid INTEGER;
ALTER TABLE campaign_recipients ADD COLUMN dns_checked_at INTEGER;
ALTER TABLE campaign_recipients ADD COLUMN email_normalized TEXT;
ALTER TABLE campaign_recipients ADD COLUMN domain TEXT;

-- ============================================
-- SECTION 6: New Indexes for Campaign Recipients
-- ============================================

CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status ON campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_recipients_status_retry ON campaign_recipients(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_recipients_domain ON campaign_recipients(domain);
CREATE INDEX IF NOT EXISTS idx_recipients_bounce_type ON campaign_recipients(bounce_type);

-- ============================================
-- SECTION 7: Utility Views
-- ============================================

-- View for getting retry-eligible recipients
CREATE VIEW IF NOT EXISTS v_recipients_retry_eligible AS
SELECT 
  cr.id,
  cr.campaign_id,
  cr.customer_id,
  cr.email,
  cr.status,
  cr.failure_reason_detailed,
  cr.bounce_type,
  cr.attempt_count,
  cr.next_retry_at,
  c.firstName,
  c.lastName,
  c.company,
  ec.name as campaign_name,
  ec.subject as campaign_subject
FROM campaign_recipients cr
JOIN customers c ON c.id = cr.customer_id
JOIN email_campaigns ec ON ec.id = cr.campaign_id
WHERE cr.status = 'failed'
  AND cr.next_retry_at IS NOT NULL
  AND cr.next_retry_at <= strftime('%s', 'now')
  AND cr.attempt_count < 5;

-- View for active suppression check
CREATE VIEW IF NOT EXISTS v_suppressed_emails AS
SELECT 
  id,
  org_id,
  email,
  suppression_type,
  suppression_reason,
  suppressed_at,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 1
    WHEN expires_at > strftime('%s', 'now') THEN 1
    ELSE 0
  END as is_active
FROM email_suppressions;

-- View for email validation status
CREATE VIEW IF NOT EXISTS v_email_validation_status AS
SELECT 
  evc.id,
  evc.email,
  evc.domain,
  evc.syntax_valid,
  evc.mx_valid,
  evc.smtp_valid,
  evc.validation_source,
  evc.error_message,
  evc.validated_at,
  evc.expires_at,
  evc.check_count,
  CASE 
    WHEN evc.expires_at > strftime('%s', 'now') THEN 1
    ELSE 0
  END as is_cache_valid
FROM email_validation_cache evc;

-- View for delivery statistics by campaign
CREATE VIEW IF NOT EXISTS v_campaign_delivery_stats AS
SELECT 
  ec.id as campaign_id,
  ec.name as campaign_name,
  ec.status as campaign_status,
  ec.total_recipients,
  ec.sent_count,
  ec.open_count,
  ec.click_count,
  ec.bounce_count,
  ec.unsubscribe_count,
  COUNT(DISTINCT CASE WHEN ede.event_type = 'bounce' AND ede.bounce_type = 'hard' THEN ede.recipient_id END) as hard_bounce_count,
  COUNT(DISTINCT CASE WHEN ede.event_type = 'bounce' AND ede.bounce_type = 'soft' THEN ede.recipient_id END) as soft_bounce_count,
  COUNT(DISTINCT CASE WHEN ede.event_type = 'complaint' THEN ede.recipient_id END) as complaint_count,
  COUNT(DISTINCT CASE WHEN ede.failure_reason = 'dns_failure' THEN ede.recipient_id END) as dns_failure_count,
  COUNT(DISTINCT CASE WHEN ede.failure_reason = 'invalid_syntax' THEN ede.recipient_id END) as syntax_error_count
FROM email_campaigns ec
LEFT JOIN email_delivery_events ede ON ede.campaign_id = ec.id
GROUP BY ec.id;

-- View for domain health analysis
CREATE VIEW IF NOT EXISTS v_domain_health AS
SELECT 
  domain,
  COUNT(*) as total_recipients,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN bounce_type = 'hard' THEN 1 ELSE 0 END) as hard_bounce_count,
  SUM(CASE WHEN bounce_type = 'soft' THEN 1 ELSE 0 END) as soft_bounce_count,
  SUM(CASE WHEN mx_valid = 0 THEN 1 ELSE 0 END) as invalid_mx_count,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
      ELSE 0 
    END, 
    2
  ) as delivery_rate
FROM campaign_recipients
WHERE domain IS NOT NULL
GROUP BY domain
HAVING COUNT(*) >= 3;

-- ============================================
-- ROLLBACK SECTION
-- To rollback this migration, run the following statements:
-- ============================================
-- DROP VIEW IF EXISTS v_domain_health;
-- DROP VIEW IF EXISTS v_campaign_delivery_stats;
-- DROP VIEW IF EXISTS v_email_validation_status;
-- DROP VIEW IF EXISTS v_suppressed_emails;
-- DROP VIEW IF EXISTS v_recipients_retry_eligible;
-- DROP INDEX IF EXISTS idx_recipients_bounce_type;
-- DROP INDEX IF EXISTS idx_recipients_domain;
-- DROP INDEX IF EXISTS idx_recipients_status_retry;
-- DROP INDEX IF EXISTS idx_recipients_campaign_status;
-- DROP INDEX IF EXISTS idx_suppressions_org_type;
-- DROP INDEX IF EXISTS idx_suppressions_expires;
-- DROP INDEX IF EXISTS idx_suppressions_type;
-- DROP INDEX IF EXISTS idx_suppressions_org_email;
-- DROP INDEX IF EXISTS idx_validation_cache_valid;
-- DROP INDEX IF EXISTS idx_validation_cache_expires;
-- DROP INDEX IF EXISTS idx_validation_cache_domain;
-- DROP INDEX IF EXISTS idx_delivery_events_org_created;
-- DROP INDEX IF EXISTS idx_delivery_events_occurred_at;
-- DROP INDEX IF EXISTS idx_delivery_events_domain;
-- DROP INDEX IF EXISTS idx_delivery_events_failure_reason;
-- DROP INDEX IF EXISTS idx_delivery_events_type;
-- DROP INDEX IF EXISTS idx_delivery_events_recipient;
-- DROP INDEX IF EXISTS idx_delivery_events_campaign;
-- DROP TABLE IF EXISTS email_retry_config;
-- DROP TABLE IF EXISTS email_validation_cache;
-- DROP TABLE IF EXISTS email_suppressions;
-- DROP TABLE IF EXISTS email_delivery_events;
-- Note: Columns added to campaign_recipients cannot be easily removed in SQLite
-- To fully rollback, you would need to recreate the table without those columns
