-- Migration: 0009_manual_recipients_and_segment_members.sql
-- Purpose:
-- 1) Support campaign-only manual emails by allowing nullable customer_id
--    in campaign_recipients and adding source metadata.
-- 2) Support static segment members with a segment_customers join table.

PRAGMA foreign_keys=OFF;
--> statement-breakpoint

CREATE TABLE `__new_campaign_recipients` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `customer_id` text,
  `email` text NOT NULL,
  `recipient_source` text NOT NULL DEFAULT 'customer',
  `display_name` text,
  `status` text NOT NULL DEFAULT 'pending',
  `sent_at` integer,
  `error_message` text,
  `failure_category` text,
  `failure_reason_detailed` text,
  `bounce_type` text,
  `attempt_count` integer DEFAULT 0,
  `last_attempt_at` integer,
  `next_retry_at` integer,
  `mx_valid` integer,
  `dns_checked_at` integer,
  `email_normalized` text,
  `domain` text,
  FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

INSERT INTO `__new_campaign_recipients` (
  `id`,
  `campaign_id`,
  `customer_id`,
  `email`,
  `recipient_source`,
  `display_name`,
  `status`,
  `sent_at`,
  `error_message`,
  `failure_category`,
  `failure_reason_detailed`,
  `bounce_type`,
  `attempt_count`,
  `last_attempt_at`,
  `next_retry_at`,
  `mx_valid`,
  `dns_checked_at`,
  `email_normalized`,
  `domain`
)
SELECT
  `id`,
  `campaign_id`,
  `customer_id`,
  `email`,
  'customer' AS `recipient_source`,
  NULL AS `display_name`,
  `status`,
  `sent_at`,
  `error_message`,
  `failure_category`,
  `failure_reason_detailed`,
  `bounce_type`,
  `attempt_count`,
  `last_attempt_at`,
  `next_retry_at`,
  `mx_valid`,
  `dns_checked_at`,
  `email_normalized`,
  `domain`
FROM `campaign_recipients`;
--> statement-breakpoint

PRAGMA legacy_alter_table=ON;
--> statement-breakpoint

ALTER TABLE `campaign_recipients` RENAME TO `__old_campaign_recipients`;
--> statement-breakpoint

ALTER TABLE `__new_campaign_recipients` RENAME TO `campaign_recipients`;
--> statement-breakpoint

DROP TABLE `__old_campaign_recipients`;
--> statement-breakpoint

PRAGMA legacy_alter_table=OFF;
--> statement-breakpoint

CREATE INDEX `recipients_campaign_idx` ON `campaign_recipients` (`campaign_id`);
--> statement-breakpoint
CREATE INDEX `idx_recipients_campaign_status` ON `campaign_recipients` (`campaign_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_recipients_status_retry` ON `campaign_recipients` (`status`,`next_retry_at`);
--> statement-breakpoint
CREATE INDEX `idx_recipients_source` ON `campaign_recipients` (`recipient_source`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `segment_customers` (
  `id` text PRIMARY KEY NOT NULL,
  `segment_id` text NOT NULL,
  `customer_id` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `segment_customers_segment_customer_uidx`
  ON `segment_customers` (`segment_id`, `customer_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `segment_customers_segment_idx` ON `segment_customers` (`segment_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `segment_customers_customer_idx` ON `segment_customers` (`customer_id`);
--> statement-breakpoint

PRAGMA foreign_keys=ON;
