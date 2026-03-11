-- Migration: 0011_restore_performance_indexes.sql
-- Purpose: Restore performance indexes that were dropped when 0010 rebuilt tables.

CREATE INDEX IF NOT EXISTS `idx_customers_org_active` ON `customers` (`org_id`, `is_active`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_org_unsubscribed` ON `customers` (`org_id`, `unsubscribed`)
  WHERE `unsubscribed` = 1;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_org_vip` ON `customers` (`org_id`, `is_vip`)
  WHERE `is_vip` = 1;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_location` ON `customers` (`org_id`, `latitude`, `longitude`)
  WHERE `latitude` IS NOT NULL AND `longitude` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_name_search` ON `customers` (`org_id`, `first_name`, `last_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_company` ON `customers` (`org_id`, `company`)
  WHERE `company` IS NOT NULL AND `company` != '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_lifecycle` ON `customers` (`org_id`, `lifecycle_stage`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_lead_source` ON `customers` (`org_id`, `lead_source`)
  WHERE `lead_source` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customers_follow_up` ON `customers` (`org_id`, `next_follow_up_date`)
  WHERE `next_follow_up_date` IS NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_leads_assigned` ON `leads` (`org_id`, `assigned_to`)
  WHERE `assigned_to` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_leads_conversion` ON `leads` (`org_id`, `converted_to_customer_id`)
  WHERE `converted_to_customer_id` IS NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_email_jobs_locked` ON `email_jobs` (`locked_at`)
  WHERE `locked_at` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_email_jobs_campaign_status` ON `email_jobs` (`campaign_id`, `status`);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_tasks_overdue` ON `tasks` (`org_id`, `due_date`, `status`)
  WHERE `status` != 'done' AND `due_date` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tasks_user_active` ON `tasks` (`assigned_to`, `status`)
  WHERE `assigned_to` IS NOT NULL AND `status` != 'done';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tasks_customer` ON `tasks` (`customer_id`)
  WHERE `customer_id` IS NOT NULL;
