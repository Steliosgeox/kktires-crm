-- Migration: 0008_performance_optimization.sql
-- Purpose: Add performance indexes and optimization for common queries
-- Created: 2026-02-15
-- Reversible: Yes (see rollback section at end)

-- ============================================
-- SECTION 1: Customer Table Performance Indexes
-- ============================================

-- Composite index for common customer queries (org + active status)
CREATE INDEX IF NOT EXISTS idx_customers_org_active ON customers(org_id, is_active);
--> statement-breakpoint

-- Partial index for unsubscribed customers (common filter in campaign recipient selection)
CREATE INDEX IF NOT EXISTS idx_customers_org_unsubscribed ON customers(org_id, unsubscribed) 
  WHERE unsubscribed = 1;
--> statement-breakpoint

-- Partial index for VIP customers (common filter for special treatment)
CREATE INDEX IF NOT EXISTS idx_customers_org_vip ON customers(org_id, is_vip) 
  WHERE is_vip = 1;
--> statement-breakpoint

-- Index for geolocation queries (map view)
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(org_id, latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
--> statement-breakpoint

-- Index for name-based searches
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers(org_id, first_name, last_name);
--> statement-breakpoint

-- Partial index for customers with companies (B2B filtering)
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(org_id, company) 
  WHERE company IS NOT NULL AND company != '';
--> statement-breakpoint

-- Index for lifecycle stage filtering
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle ON customers(org_id, lifecycle_stage);
--> statement-breakpoint

-- Index for lead source analytics
CREATE INDEX IF NOT EXISTS idx_customers_lead_source ON customers(org_id, lead_source)
  WHERE lead_source IS NOT NULL;
--> statement-breakpoint

-- Index for follow-up date queries (task management)
CREATE INDEX IF NOT EXISTS idx_customers_follow_up ON customers(org_id, next_follow_up_date)
  WHERE next_follow_up_date IS NOT NULL;
--> statement-breakpoint

-- ============================================
-- SECTION 2: Campaign Recipients Performance Indexes
-- ============================================

-- Partial index for pending recipients (most common query during sending)
CREATE INDEX IF NOT EXISTS idx_recipients_pending ON campaign_recipients(campaign_id) 
  WHERE status = 'pending';
--> statement-breakpoint

-- Partial index for failed recipients (retry logic)
CREATE INDEX IF NOT EXISTS idx_recipients_failed ON campaign_recipients(campaign_id, failure_reason_detailed) 
  WHERE status = 'failed';
--> statement-breakpoint

-- Index for customer-based recipient lookup
CREATE INDEX IF NOT EXISTS idx_recipients_customer ON campaign_recipients(customer_id);
--> statement-breakpoint

-- ============================================
-- SECTION 3: Email Jobs Performance Indexes
-- ============================================

-- Index for job processing queue
CREATE INDEX IF NOT EXISTS idx_email_jobs_status_run ON email_jobs(status, run_at);
--> statement-breakpoint

-- Partial index for locked jobs (monitoring stuck jobs)
CREATE INDEX IF NOT EXISTS idx_email_jobs_locked ON email_jobs(locked_at) 
  WHERE locked_at IS NOT NULL;
--> statement-breakpoint

-- Index for campaign job lookup
CREATE INDEX IF NOT EXISTS idx_email_jobs_campaign_status ON email_jobs(campaign_id, status);
--> statement-breakpoint

-- ============================================
-- SECTION 4: Email Tracking Performance Indexes
-- ============================================

-- Time-based analytics (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_tracking_time ON email_tracking(created_at);
--> statement-breakpoint

-- Campaign analytics with time ordering
CREATE INDEX IF NOT EXISTS idx_tracking_campaign_analytics ON email_tracking(campaign_id, type, created_at);
--> statement-breakpoint

-- Recipient-based tracking lookup
CREATE INDEX IF NOT EXISTS idx_tracking_recipient ON email_tracking(recipient_id);
--> statement-breakpoint

-- ============================================
-- SECTION 5: Tasks Performance Indexes
-- ============================================

-- Partial index for overdue tasks (dashboard widget)
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(org_id, due_date, status) 
  WHERE status != 'done' AND due_date IS NOT NULL;
--> statement-breakpoint

-- Partial index for user's active tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_active ON tasks(assigned_to, status) 
  WHERE assigned_to IS NOT NULL AND status != 'done';
--> statement-breakpoint

-- Index for customer-related tasks
CREATE INDEX IF NOT EXISTS idx_tasks_customer ON tasks(customer_id)
  WHERE customer_id IS NOT NULL;
--> statement-breakpoint

-- ============================================
-- SECTION 6: Notifications Performance Indexes
-- ============================================

-- Partial index for unread notifications (notification badge)
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) 
  WHERE is_read = 0;
--> statement-breakpoint

-- Index for notification cleanup (old read notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup ON notifications(is_read, created_at)
  WHERE is_read = 1;
--> statement-breakpoint

-- ============================================
-- SECTION 7: Tags Performance Indexes
-- ============================================

-- Index for tag lookup by organization
CREATE INDEX IF NOT EXISTS idx_tags_org ON tags(org_id);
--> statement-breakpoint

-- ============================================
-- SECTION 8: Customer Tags Performance Indexes
-- ============================================

-- Index for tag-based customer filtering
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(tag_id);
--> statement-breakpoint

-- ============================================
-- SECTION 9: Leads Performance Indexes
-- ============================================

-- Index for assigned leads
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(org_id, assigned_to)
  WHERE assigned_to IS NOT NULL;
--> statement-breakpoint

-- Index for lead conversion analytics
CREATE INDEX IF NOT EXISTS idx_leads_conversion ON leads(org_id, converted_to_customer_id)
  WHERE converted_to_customer_id IS NOT NULL;
--> statement-breakpoint

-- ============================================
-- SECTION 10: Analytics Views
-- ============================================

-- Campaign statistics view (pre-computed for dashboard)
CREATE VIEW IF NOT EXISTS v_campaign_statistics AS
SELECT 
  ec.id as campaign_id,
  ec.org_id,
  ec.name,
  ec.status,
  ec.total_recipients,
  ec.sent_count,
  ec.open_count,
  ec.click_count,
  ec.bounce_count,
  ec.unsubscribe_count,
  ec.created_at,
  ec.sent_at,
  CASE 
    WHEN ec.sent_count > 0 THEN ROUND(CAST(ec.open_count AS REAL) / ec.sent_count * 100, 2)
    ELSE 0 
  END as open_rate,
  CASE 
    WHEN ec.sent_count > 0 THEN ROUND(CAST(ec.click_count AS REAL) / ec.sent_count * 100, 2)
    ELSE 0 
  END as click_rate,
  CASE 
    WHEN ec.sent_count > 0 THEN ROUND(CAST(ec.bounce_count AS REAL) / ec.sent_count * 100, 2)
    ELSE 0 
  END as bounce_rate
FROM email_campaigns ec;
--> statement-breakpoint

-- Customer engagement summary view
CREATE VIEW IF NOT EXISTS v_customer_engagement AS
SELECT 
  c.id as customer_id,
  c.org_id,
  c.first_name,
  c.last_name,
  c.email,
  c.company,
  c.category,
  c.is_vip,
  c.is_active,
  c.unsubscribed,
  COUNT(DISTINCT cr.campaign_id) as campaigns_received,
  SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
  COUNT(DISTINCT CASE WHEN et.type = 'open' THEN et.id END) as opens,
  COUNT(DISTINCT CASE WHEN et.type = 'click' THEN et.id END) as clicks,
  MAX(et.created_at) as last_engagement_at
FROM customers c
LEFT JOIN campaign_recipients cr ON cr.customer_id = c.id
LEFT JOIN email_tracking et ON et.recipient_id = cr.id
GROUP BY c.id;
--> statement-breakpoint

-- Organization health dashboard view
CREATE VIEW IF NOT EXISTS v_org_health AS
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.subscription_tier,
  (SELECT COUNT(*) FROM customers WHERE org_id = o.id) as total_customers,
  (SELECT COUNT(*) FROM customers WHERE org_id = o.id AND is_active = 1) as active_customers,
  (SELECT COUNT(*) FROM customers WHERE org_id = o.id AND is_vip = 1) as vip_customers,
  (SELECT COUNT(*) FROM customers WHERE org_id = o.id AND unsubscribed = 1) as unsubscribed_customers,
  (SELECT COUNT(*) FROM email_campaigns WHERE org_id = o.id) as total_campaigns,
  (SELECT COUNT(*) FROM email_campaigns WHERE org_id = o.id AND status = 'sent') as sent_campaigns,
  (SELECT COALESCE(SUM(sent_count), 0) FROM email_campaigns WHERE org_id = o.id) as total_emails_sent,
  (SELECT COALESCE(SUM(open_count), 0) FROM email_campaigns WHERE org_id = o.id) as total_opens,
  (SELECT COALESCE(SUM(click_count), 0) FROM email_campaigns WHERE org_id = o.id) as total_clicks,
  (SELECT COUNT(*) FROM leads WHERE org_id = o.id) as total_leads,
  (SELECT COUNT(*) FROM leads WHERE org_id = o.id AND status = 'won') as won_leads,
  (SELECT COUNT(*) FROM tasks WHERE org_id = o.id AND status != 'done') as pending_tasks
FROM organizations o;
--> statement-breakpoint

-- ============================================
-- SECTION 11: Utility Functions (as Views)
-- ============================================

-- View for recent activity timeline
CREATE VIEW IF NOT EXISTS v_recent_activity AS
SELECT 
  ca.id,
  ca.org_id,
  ca.customer_id,
  ca.type,
  ca.title,
  ca.description,
  ca.created_at,
  c.first_name,
  c.last_name,
  c.company,
  u.name as user_name
FROM customer_activities ca
JOIN customers c ON c.id = ca.customer_id
LEFT JOIN users u ON u.id = ca.created_by
ORDER BY ca.created_at DESC
LIMIT 100;

-- ============================================
-- ROLLBACK SECTION
-- To rollback this migration, run the following statements:
-- ============================================
-- DROP VIEW IF EXISTS v_recent_activity;
-- DROP VIEW IF EXISTS v_org_health;
-- DROP VIEW IF EXISTS v_customer_engagement;
-- DROP VIEW IF EXISTS v_campaign_statistics;
-- DROP INDEX IF EXISTS idx_leads_conversion;
-- DROP INDEX IF EXISTS idx_leads_assigned;
-- DROP INDEX IF EXISTS idx_customer_tags_tag;
-- DROP INDEX IF EXISTS idx_tags_org;
-- DROP INDEX IF EXISTS idx_notifications_cleanup;
-- DROP INDEX IF EXISTS idx_notifications_unread;
-- DROP INDEX IF EXISTS idx_tasks_customer;
-- DROP INDEX IF EXISTS idx_tasks_user_active;
-- DROP INDEX IF EXISTS idx_tasks_overdue;
-- DROP INDEX IF EXISTS idx_tracking_recipient;
-- DROP INDEX IF EXISTS idx_tracking_campaign_analytics;
-- DROP INDEX IF EXISTS idx_tracking_time;
-- DROP INDEX IF EXISTS idx_email_jobs_campaign_status;
-- DROP INDEX IF EXISTS idx_email_jobs_locked;
-- DROP INDEX IF EXISTS idx_email_jobs_status_run;
-- DROP INDEX IF EXISTS idx_recipients_customer;
-- DROP INDEX IF EXISTS idx_recipients_failed;
-- DROP INDEX IF EXISTS idx_recipients_pending;
-- DROP INDEX IF EXISTS idx_customers_follow_up;
-- DROP INDEX IF EXISTS idx_customers_lead_source;
-- DROP INDEX IF EXISTS idx_customers_lifecycle;
-- DROP INDEX IF EXISTS idx_customers_company;
-- DROP INDEX IF EXISTS idx_customers_name_search;
-- DROP INDEX IF EXISTS idx_customers_location;
-- DROP INDEX IF EXISTS idx_customers_org_vip;
-- DROP INDEX IF EXISTS idx_customers_org_unsubscribed;
-- DROP INDEX IF EXISTS idx_customers_org_active;
