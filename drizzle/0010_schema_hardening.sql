-- Migration: 0010_schema_hardening.sql
-- Purpose: Harden multi-tenant integrity, preserve historical records on deletes,
-- and add database-level uniqueness guarantees for org-scoped resources.

PRAGMA foreign_keys=OFF;
--> statement-breakpoint

DROP INDEX IF EXISTS `idx_suppressions_org_email`;
--> statement-breakpoint
DROP INDEX IF EXISTS `tags_org_name_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `customer_tag_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `custom_values_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `unsubscribes_org_email_idx`;
--> statement-breakpoint

UPDATE `customers` SET `email` = NULL WHERE `email` IS NOT NULL AND trim(`email`) = '';
--> statement-breakpoint
UPDATE `leads` SET `email` = NULL WHERE `email` IS NOT NULL AND trim(`email`) = '';
--> statement-breakpoint
DELETE FROM `unsubscribes` WHERE `email` IS NOT NULL AND trim(`email`) = '';
--> statement-breakpoint
DELETE FROM `email_suppressions` WHERE `email` IS NOT NULL AND trim(`email`) = '';
--> statement-breakpoint

CREATE TEMP TABLE `__blank_gmail_credentials` AS
SELECT `id`
FROM `gmail_credentials`
WHERE trim(`email`) = '';
--> statement-breakpoint

UPDATE `email_campaigns`
SET `gmail_credential_id` = NULL
WHERE `gmail_credential_id` IN (SELECT `id` FROM `__blank_gmail_credentials`);
--> statement-breakpoint

DELETE FROM `gmail_credentials`
WHERE `id` IN (SELECT `id` FROM `__blank_gmail_credentials`);
--> statement-breakpoint

DROP TABLE `__blank_gmail_credentials`;
--> statement-breakpoint

UPDATE `customers` SET `email` = lower(trim(`email`)) WHERE `email` IS NOT NULL;
--> statement-breakpoint
UPDATE `leads` SET `email` = lower(trim(`email`)) WHERE `email` IS NOT NULL;
--> statement-breakpoint
UPDATE `gmail_credentials` SET `email` = lower(trim(`email`));
--> statement-breakpoint
UPDATE `unsubscribes` SET `email` = lower(trim(`email`)) WHERE `email` IS NOT NULL;
--> statement-breakpoint
UPDATE `email_suppressions` SET `email` = lower(trim(`email`)) WHERE `email` IS NOT NULL;
--> statement-breakpoint

UPDATE `tags` SET `name` = trim(`name`);
--> statement-breakpoint
UPDATE `custom_fields` SET `name` = trim(`name`);
--> statement-breakpoint
UPDATE `segments` SET `name` = trim(`name`);
--> statement-breakpoint
UPDATE `email_templates` SET `name` = trim(`name`);
--> statement-breakpoint
UPDATE `email_signatures` SET `name` = trim(`name`);
--> statement-breakpoint

WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`email`))
      ORDER BY `created_at` ASC, `id` ASC
    ) AS `rn`
  FROM `customers`
  WHERE `email` IS NOT NULL
)
UPDATE `customers`
SET
  `email_secondary` = COALESCE(NULLIF(trim(`email_secondary`), ''), `email`),
  `email` = NULL
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);
--> statement-breakpoint

WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`email`))
      ORDER BY `created_at` ASC, `id` ASC
    ) AS `rn`
  FROM `leads`
  WHERE `email` IS NOT NULL
)
UPDATE `leads`
SET
  `notes` = CASE
    WHEN `notes` IS NULL OR `notes` = '' THEN '[migration] duplicate email preserved: ' || `email`
    ELSE `notes` || char(10) || '[migration] duplicate email preserved: ' || `email`
  END,
  `email` = NULL
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);
--> statement-breakpoint

WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`name`))
      ORDER BY `created_at` ASC, `id` ASC
    ) AS `rn`
  FROM `tags`
)
UPDATE `tags`
SET `name` = trim(`name`) || ' [' || substr(`id`, 1, 8) || ']'
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);
--> statement-breakpoint

WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`name`))
      ORDER BY `created_at` ASC, `id` ASC
    ) AS `rn`
  FROM `custom_fields`
)
UPDATE `custom_fields`
SET `name` = trim(`name`) || '_' || substr(`id`, 1, 8)
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);
--> statement-breakpoint

WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`name`))
      ORDER BY `created_at` ASC, `id` ASC
    ) AS `rn`
  FROM `segments`
)
UPDATE `segments`
SET `name` = trim(`name`) || ' [' || substr(`id`, 1, 8) || ']'
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);
--> statement-breakpoint

WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`name`))
      ORDER BY `created_at` ASC, `id` ASC
    ) AS `rn`
  FROM `email_templates`
)
UPDATE `email_templates`
SET `name` = trim(`name`) || ' [' || substr(`id`, 1, 8) || ']'
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);
--> statement-breakpoint

WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`name`))
      ORDER BY `created_at` ASC, `id` ASC
    ) AS `rn`
  FROM `email_signatures`
)
UPDATE `email_signatures`
SET `name` = trim(`name`) || ' [' || substr(`id`, 1, 8) || ']'
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);
--> statement-breakpoint

CREATE TEMP TABLE `__gmail_credential_dupes` AS
WITH ranked AS (
  SELECT
    `id`,
    FIRST_VALUE(`id`) OVER (
      PARTITION BY `org_id`, lower(trim(`email`))
      ORDER BY `is_default` DESC, `updated_at` DESC, `created_at` DESC, `id` DESC
    ) AS `canonical_id`,
    ROW_NUMBER() OVER (
      PARTITION BY `org_id`, lower(trim(`email`))
      ORDER BY `is_default` DESC, `updated_at` DESC, `created_at` DESC, `id` DESC
    ) AS `rn`
  FROM `gmail_credentials`
)
SELECT `id` AS `duplicate_id`, `canonical_id`
FROM ranked
WHERE `rn` > 1;
--> statement-breakpoint

UPDATE `email_campaigns`
SET `gmail_credential_id` = (
  SELECT `canonical_id`
  FROM `__gmail_credential_dupes`
  WHERE `duplicate_id` = `email_campaigns`.`gmail_credential_id`
)
WHERE `gmail_credential_id` IN (SELECT `duplicate_id` FROM `__gmail_credential_dupes`);
--> statement-breakpoint

DELETE FROM `gmail_credentials`
WHERE `id` IN (SELECT `duplicate_id` FROM `__gmail_credential_dupes`);
--> statement-breakpoint

DROP TABLE `__gmail_credential_dupes`;
--> statement-breakpoint

DELETE FROM `customer_tags`
WHERE `id` IN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `customer_id`, `tag_id`
        ORDER BY `created_at` ASC, `id` ASC
      ) AS `rn`
    FROM `customer_tags`
  )
  WHERE `rn` > 1
);
--> statement-breakpoint

DELETE FROM `customer_custom_values`
WHERE `id` IN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `customer_id`, `field_id`
        ORDER BY `updated_at` DESC, `created_at` DESC, `id` DESC
      ) AS `rn`
    FROM `customer_custom_values`
  )
  WHERE `rn` > 1
);
--> statement-breakpoint

DELETE FROM `unsubscribes`
WHERE `id` IN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `org_id`, lower(trim(`email`))
        ORDER BY `created_at` DESC, `id` DESC
      ) AS `rn`
    FROM `unsubscribes`
    WHERE `email` IS NOT NULL
  )
  WHERE `rn` > 1
);
--> statement-breakpoint

DELETE FROM `email_suppressions`
WHERE `id` IN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `org_id`, lower(trim(`email`))
        ORDER BY `suppressed_at` DESC, `id` DESC
      ) AS `rn`
    FROM `email_suppressions`
    WHERE `email` IS NOT NULL
  )
  WHERE `rn` > 1
);
--> statement-breakpoint

PRAGMA legacy_alter_table=ON;
--> statement-breakpoint

CREATE TABLE `__new_customers` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text,
  `company` text,
  `title` text,
  `avatar` text,
  `email` text,
  `email_secondary` text,
  `phone` text,
  `phone_secondary` text,
  `mobile` text,
  `fax` text,
  `website` text,
  `street` text,
  `city` text,
  `state` text,
  `postal_code` text,
  `country` text DEFAULT 'Ελλάδα',
  `afm` text,
  `doy` text,
  `gemh` text,
  `activity_code` text,
  `legal_form` text,
  `category` text DEFAULT 'retail',
  `lifecycle_stage` text DEFAULT 'customer',
  `lead_source` text,
  `lead_score` integer DEFAULT 0,
  `revenue` real DEFAULT 0,
  `currency` text DEFAULT 'EUR',
  `payment_terms` text,
  `credit_limit` real,
  `birthday` text,
  `last_contact_date` integer,
  `next_follow_up_date` integer,
  `latitude` real,
  `longitude` real,
  `geocoded_at` integer,
  `notes` text,
  `is_vip` integer DEFAULT false,
  `is_active` integer DEFAULT true,
  `unsubscribed` integer DEFAULT false,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_customers` (
  `id`, `org_id`, `first_name`, `last_name`, `company`, `title`, `avatar`, `email`,
  `email_secondary`, `phone`, `phone_secondary`, `mobile`, `fax`, `website`, `street`,
  `city`, `state`, `postal_code`, `country`, `afm`, `doy`, `gemh`, `activity_code`,
  `legal_form`, `category`, `lifecycle_stage`, `lead_source`, `lead_score`, `revenue`,
  `currency`, `payment_terms`, `credit_limit`, `birthday`, `last_contact_date`,
  `next_follow_up_date`, `latitude`, `longitude`, `geocoded_at`, `notes`, `is_vip`,
  `is_active`, `unsubscribed`, `created_at`, `updated_at`, `created_by`
)
SELECT
  `id`, `org_id`, `first_name`, `last_name`, `company`, `title`, `avatar`, `email`,
  `email_secondary`, `phone`, `phone_secondary`, `mobile`, `fax`, `website`, `street`,
  `city`, `state`, `postal_code`, `country`, `afm`, `doy`, `gemh`, `activity_code`,
  `legal_form`, `category`, `lifecycle_stage`, `lead_source`, `lead_score`, `revenue`,
  `currency`, `payment_terms`, `credit_limit`, `birthday`, `last_contact_date`,
  `next_follow_up_date`, `latitude`, `longitude`, `geocoded_at`, `notes`, `is_vip`,
  `is_active`, `unsubscribed`, `created_at`, `updated_at`, `created_by`
FROM `customers`;
--> statement-breakpoint
ALTER TABLE `customers` RENAME TO `__old_customers`;
--> statement-breakpoint
ALTER TABLE `__new_customers` RENAME TO `customers`;
--> statement-breakpoint
DROP TABLE `__old_customers`;
--> statement-breakpoint
CREATE INDEX `customers_org_idx` ON `customers` (`org_id`);
--> statement-breakpoint
CREATE INDEX `customers_email_idx` ON `customers` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_org_email_uidx` ON `customers` (`org_id`, lower(trim(`email`)));
--> statement-breakpoint
CREATE INDEX `customers_city_idx` ON `customers` (`city`);
--> statement-breakpoint
CREATE INDEX `customers_category_idx` ON `customers` (`category`);
--> statement-breakpoint
CREATE INDEX `customers_afm_idx` ON `customers` (`afm`);
--> statement-breakpoint

CREATE TABLE `__new_customer_notes` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `customer_id` text NOT NULL,
  `content` text NOT NULL,
  `is_pinned` integer DEFAULT false,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_customer_notes` (`id`, `org_id`, `customer_id`, `content`, `is_pinned`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `customer_id`, `content`, `is_pinned`, `created_by`, `created_at`, `updated_at`
FROM `customer_notes`;
--> statement-breakpoint
ALTER TABLE `customer_notes` RENAME TO `__old_customer_notes`;
--> statement-breakpoint
ALTER TABLE `__new_customer_notes` RENAME TO `customer_notes`;
--> statement-breakpoint
DROP TABLE `__old_customer_notes`;
--> statement-breakpoint
CREATE INDEX `notes_customer_idx` ON `customer_notes` (`customer_id`);
--> statement-breakpoint

CREATE TABLE `__new_customer_activities` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `customer_id` text NOT NULL,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `metadata` text,
  `created_by` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_customer_activities` (`id`, `org_id`, `customer_id`, `type`, `title`, `description`, `metadata`, `created_by`, `created_at`)
SELECT `id`, `org_id`, `customer_id`, `type`, `title`, `description`, `metadata`, `created_by`, `created_at`
FROM `customer_activities`;
--> statement-breakpoint
ALTER TABLE `customer_activities` RENAME TO `__old_customer_activities`;
--> statement-breakpoint
ALTER TABLE `__new_customer_activities` RENAME TO `customer_activities`;
--> statement-breakpoint
DROP TABLE `__old_customer_activities`;
--> statement-breakpoint
CREATE INDEX `activities_customer_idx` ON `customer_activities` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `activities_type_idx` ON `customer_activities` (`type`);
--> statement-breakpoint

CREATE TABLE `__new_leads` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text,
  `company` text,
  `email` text,
  `phone` text,
  `source` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `score` integer DEFAULT 0,
  `assigned_to` text,
  `converted_to_customer_id` text,
  `converted_at` integer,
  `notes` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`converted_to_customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_leads` (`id`, `org_id`, `first_name`, `last_name`, `company`, `email`, `phone`, `source`, `status`, `score`, `assigned_to`, `converted_to_customer_id`, `converted_at`, `notes`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `first_name`, `last_name`, `company`, `email`, `phone`, `source`, `status`, `score`, `assigned_to`, `converted_to_customer_id`, `converted_at`, `notes`, `created_at`, `updated_at`
FROM `leads`;
--> statement-breakpoint
ALTER TABLE `leads` RENAME TO `__old_leads`;
--> statement-breakpoint
ALTER TABLE `__new_leads` RENAME TO `leads`;
--> statement-breakpoint
DROP TABLE `__old_leads`;
--> statement-breakpoint
CREATE INDEX `leads_org_idx` ON `leads` (`org_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_org_email_uidx` ON `leads` (`org_id`, lower(trim(`email`)));
--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);
--> statement-breakpoint

CREATE TABLE `__new_email_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `name` text NOT NULL,
  `subject` text NOT NULL,
  `content` text NOT NULL,
  `category` text,
  `is_default` integer DEFAULT false,
  `thumbnail` text,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_email_templates` (`id`, `org_id`, `name`, `subject`, `content`, `category`, `is_default`, `thumbnail`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `name`, `subject`, `content`, `category`, `is_default`, `thumbnail`, `created_by`, `created_at`, `updated_at`
FROM `email_templates`;
--> statement-breakpoint
ALTER TABLE `email_templates` RENAME TO `__old_email_templates`;
--> statement-breakpoint
ALTER TABLE `__new_email_templates` RENAME TO `email_templates`;
--> statement-breakpoint
DROP TABLE `__old_email_templates`;
--> statement-breakpoint
CREATE UNIQUE INDEX `templates_org_name_uidx` ON `email_templates` (`org_id`, lower(trim(`name`)));
--> statement-breakpoint
CREATE INDEX `templates_org_category_idx` ON `email_templates` (`org_id`, `category`);
--> statement-breakpoint

CREATE TABLE `__new_email_signatures` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `name` text NOT NULL,
  `content` text NOT NULL,
  `is_default` integer DEFAULT false,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_email_signatures` (`id`, `org_id`, `name`, `content`, `is_default`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `name`, `content`, `is_default`, `created_by`, `created_at`, `updated_at`
FROM `email_signatures`;
--> statement-breakpoint
ALTER TABLE `email_signatures` RENAME TO `__old_email_signatures`;
--> statement-breakpoint
ALTER TABLE `__new_email_signatures` RENAME TO `email_signatures`;
--> statement-breakpoint
DROP TABLE `__old_email_signatures`;
--> statement-breakpoint
CREATE UNIQUE INDEX `signatures_org_name_uidx` ON `email_signatures` (`org_id`, lower(trim(`name`)));
--> statement-breakpoint

CREATE TABLE `__new_email_campaigns` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `name` text NOT NULL,
  `subject` text NOT NULL,
  `content` text NOT NULL,
  `template_id` text,
  `signature_id` text,
  `status` text DEFAULT 'draft' NOT NULL,
  `from_email` text,
  `gmail_credential_id` text,
  `recipient_filters` text,
  `scheduled_at` integer,
  `sent_at` integer,
  `total_recipients` integer DEFAULT 0,
  `sent_count` integer DEFAULT 0,
  `open_count` integer DEFAULT 0,
  `click_count` integer DEFAULT 0,
  `bounce_count` integer DEFAULT 0,
  `unsubscribe_count` integer DEFAULT 0,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`template_id`) REFERENCES `email_templates`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`signature_id`) REFERENCES `email_signatures`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`gmail_credential_id`) REFERENCES `gmail_credentials`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_email_campaigns` (`id`, `org_id`, `name`, `subject`, `content`, `template_id`, `signature_id`, `status`, `from_email`, `gmail_credential_id`, `recipient_filters`, `scheduled_at`, `sent_at`, `total_recipients`, `sent_count`, `open_count`, `click_count`, `bounce_count`, `unsubscribe_count`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `name`, `subject`, `content`, `template_id`, `signature_id`, `status`, `from_email`, `gmail_credential_id`, `recipient_filters`, `scheduled_at`, `sent_at`, `total_recipients`, `sent_count`, `open_count`, `click_count`, `bounce_count`, `unsubscribe_count`, `created_by`, `created_at`, `updated_at`
FROM `email_campaigns`;
--> statement-breakpoint
ALTER TABLE `email_campaigns` RENAME TO `__old_email_campaigns`;
--> statement-breakpoint
ALTER TABLE `__new_email_campaigns` RENAME TO `email_campaigns`;
--> statement-breakpoint
DROP TABLE `__old_email_campaigns`;
--> statement-breakpoint
CREATE INDEX `campaigns_org_status_idx` ON `email_campaigns` (`org_id`, `status`);
--> statement-breakpoint

CREATE TABLE `__new_email_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `uploader_user_id` text,
  `blob_url` text NOT NULL,
  `blob_path` text NOT NULL,
  `file_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `kind` text NOT NULL,
  `width` integer,
  `height` integer,
  `sha256` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`uploader_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_email_assets` (`id`, `org_id`, `uploader_user_id`, `blob_url`, `blob_path`, `file_name`, `mime_type`, `size_bytes`, `kind`, `width`, `height`, `sha256`, `created_at`, `updated_at`, `deleted_at`)
SELECT `id`, `org_id`, `uploader_user_id`, `blob_url`, `blob_path`, `file_name`, `mime_type`, `size_bytes`, `kind`, `width`, `height`, `sha256`, `created_at`, `updated_at`, `deleted_at`
FROM `email_assets`;
--> statement-breakpoint
ALTER TABLE `email_assets` RENAME TO `__old_email_assets`;
--> statement-breakpoint
ALTER TABLE `__new_email_assets` RENAME TO `email_assets`;
--> statement-breakpoint
DROP TABLE `__old_email_assets`;
--> statement-breakpoint
CREATE INDEX `email_assets_org_created_idx` ON `email_assets` (`org_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `email_assets_org_kind_idx` ON `email_assets` (`org_id`, `kind`);
--> statement-breakpoint
CREATE INDEX `email_assets_sha_idx` ON `email_assets` (`sha256`);
--> statement-breakpoint

CREATE TABLE `__new_email_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `campaign_id` text NOT NULL,
  `sender_user_id` text,
  `status` text DEFAULT 'queued' NOT NULL,
  `run_at` integer NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `max_attempts` integer DEFAULT 3 NOT NULL,
  `locked_at` integer,
  `locked_by` text,
  `started_at` integer,
  `completed_at` integer,
  `last_error` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_email_jobs` (`id`, `org_id`, `campaign_id`, `sender_user_id`, `status`, `run_at`, `attempts`, `max_attempts`, `locked_at`, `locked_by`, `started_at`, `completed_at`, `last_error`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `campaign_id`, `sender_user_id`, `status`, `run_at`, `attempts`, `max_attempts`, `locked_at`, `locked_by`, `started_at`, `completed_at`, `last_error`, `created_at`, `updated_at`
FROM `email_jobs`;
--> statement-breakpoint
ALTER TABLE `email_jobs` RENAME TO `__old_email_jobs`;
--> statement-breakpoint
ALTER TABLE `__new_email_jobs` RENAME TO `email_jobs`;
--> statement-breakpoint
DROP TABLE `__old_email_jobs`;
--> statement-breakpoint
CREATE INDEX `email_jobs_status_run_idx` ON `email_jobs` (`status`, `run_at`);
--> statement-breakpoint
CREATE INDEX `email_jobs_campaign_idx` ON `email_jobs` (`campaign_id`);
--> statement-breakpoint

CREATE TABLE `__new_email_automations` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `trigger` text NOT NULL,
  `trigger_config` text,
  `is_active` integer DEFAULT false,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_email_automations` (`id`, `org_id`, `name`, `description`, `trigger`, `trigger_config`, `is_active`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `name`, `description`, `trigger`, `trigger_config`, `is_active`, `created_by`, `created_at`, `updated_at`
FROM `email_automations`;
--> statement-breakpoint
ALTER TABLE `email_automations` RENAME TO `__old_email_automations`;
--> statement-breakpoint
ALTER TABLE `__new_email_automations` RENAME TO `email_automations`;
--> statement-breakpoint
DROP TABLE `__old_email_automations`;
--> statement-breakpoint

CREATE TABLE `__new_unsubscribes` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `email` text NOT NULL,
  `reason` text,
  `campaign_id` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_unsubscribes` (`id`, `org_id`, `email`, `reason`, `campaign_id`, `created_at`)
SELECT `id`, `org_id`, `email`, `reason`, `campaign_id`, `created_at`
FROM `unsubscribes`
WHERE `email` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `unsubscribes` RENAME TO `__old_unsubscribes`;
--> statement-breakpoint
ALTER TABLE `__new_unsubscribes` RENAME TO `unsubscribes`;
--> statement-breakpoint
DROP TABLE `__old_unsubscribes`;
--> statement-breakpoint
CREATE UNIQUE INDEX `unsubscribes_org_email_uidx` ON `unsubscribes` (`org_id`, lower(trim(`email`)));
--> statement-breakpoint

CREATE TABLE `__new_saved_locations` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `name` text NOT NULL,
  `address` text,
  `latitude` real NOT NULL,
  `longitude` real NOT NULL,
  `category` text,
  `notes` text,
  `created_by` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_saved_locations` (`id`, `org_id`, `name`, `address`, `latitude`, `longitude`, `category`, `notes`, `created_by`, `created_at`)
SELECT `id`, `org_id`, `name`, `address`, `latitude`, `longitude`, `category`, `notes`, `created_by`, `created_at`
FROM `saved_locations`;
--> statement-breakpoint
ALTER TABLE `saved_locations` RENAME TO `__old_saved_locations`;
--> statement-breakpoint
ALTER TABLE `__new_saved_locations` RENAME TO `saved_locations`;
--> statement-breakpoint
DROP TABLE `__old_saved_locations`;
--> statement-breakpoint

CREATE TABLE `__new_territories` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `name` text NOT NULL,
  `color` text DEFAULT '#3B82F6' NOT NULL,
  `geometry` text,
  `assigned_to` text,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_territories` (`id`, `org_id`, `name`, `color`, `geometry`, `assigned_to`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `name`, `color`, `geometry`, `assigned_to`, `created_by`, `created_at`, `updated_at`
FROM `territories`;
--> statement-breakpoint
ALTER TABLE `territories` RENAME TO `__old_territories`;
--> statement-breakpoint
ALTER TABLE `__new_territories` RENAME TO `territories`;
--> statement-breakpoint
DROP TABLE `__old_territories`;
--> statement-breakpoint

CREATE TABLE `__new_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `customer_id` text,
  `assigned_to` text,
  `status` text DEFAULT 'todo' NOT NULL,
  `priority` text DEFAULT 'medium' NOT NULL,
  `due_date` integer,
  `completed_at` integer,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_tasks` (`id`, `org_id`, `title`, `description`, `customer_id`, `assigned_to`, `status`, `priority`, `due_date`, `completed_at`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `title`, `description`, `customer_id`, `assigned_to`, `status`, `priority`, `due_date`, `completed_at`, `created_by`, `created_at`, `updated_at`
FROM `tasks`;
--> statement-breakpoint
ALTER TABLE `tasks` RENAME TO `__old_tasks`;
--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;
--> statement-breakpoint
DROP TABLE `__old_tasks`;
--> statement-breakpoint
CREATE INDEX `tasks_org_status_idx` ON `tasks` (`org_id`, `status`);
--> statement-breakpoint
CREATE INDEX `tasks_assigned_idx` ON `tasks` (`assigned_to`);
--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);
--> statement-breakpoint

CREATE TABLE `__new_customer_images` (
  `id` text PRIMARY KEY NOT NULL,
  `customer_id` text NOT NULL,
  `url` text NOT NULL,
  `filename` text NOT NULL,
  `mime_type` text NOT NULL,
  `size` integer NOT NULL,
  `created_by` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_customer_images` (`id`, `customer_id`, `url`, `filename`, `mime_type`, `size`, `created_by`, `created_at`)
SELECT `id`, `customer_id`, `url`, `filename`, `mime_type`, `size`, `created_by`, `created_at`
FROM `customer_images`;
--> statement-breakpoint
ALTER TABLE `customer_images` RENAME TO `__old_customer_images`;
--> statement-breakpoint
ALTER TABLE `__new_customer_images` RENAME TO `customer_images`;
--> statement-breakpoint
DROP TABLE `__old_customer_images`;
--> statement-breakpoint

CREATE TABLE `__new_segments` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `filters` text,
  `customer_count` integer DEFAULT 0,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_segments` (`id`, `org_id`, `name`, `description`, `filters`, `customer_count`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `org_id`, `name`, `description`, `filters`, `customer_count`, `created_by`, `created_at`, `updated_at`
FROM `segments`;
--> statement-breakpoint
ALTER TABLE `segments` RENAME TO `__old_segments`;
--> statement-breakpoint
ALTER TABLE `__new_segments` RENAME TO `segments`;
--> statement-breakpoint
DROP TABLE `__old_segments`;
--> statement-breakpoint
CREATE UNIQUE INDEX `segments_org_name_uidx` ON `segments` (`org_id`, lower(trim(`name`)));
--> statement-breakpoint

PRAGMA legacy_alter_table=OFF;
--> statement-breakpoint

CREATE UNIQUE INDEX `tags_org_name_uidx` ON `tags` (`org_id`, lower(trim(`name`)));
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_tag_uidx` ON `customer_tags` (`customer_id`, `tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_fields_org_name_uidx` ON `custom_fields` (`org_id`, lower(trim(`name`)));
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_values_customer_field_uidx` ON `customer_custom_values` (`customer_id`, `field_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `gmail_credentials_org_email_uidx` ON `gmail_credentials` (`org_id`, lower(trim(`email`)));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_suppressions_org_email` ON `email_suppressions` (`org_id`, lower(trim(`email`)));
--> statement-breakpoint

PRAGMA foreign_keys=ON;
