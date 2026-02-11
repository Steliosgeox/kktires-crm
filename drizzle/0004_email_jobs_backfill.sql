CREATE TABLE IF NOT EXISTS `email_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `campaign_id` text NOT NULL,
  `sender_user_id` text NOT NULL,
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
  FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `email_jobs_status_run_idx` ON `email_jobs` (`status`, `run_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_jobs_campaign_idx` ON `email_jobs` (`campaign_id`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `email_job_items` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `campaign_id` text NOT NULL,
  `recipient_id` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `sent_at` integer,
  `error_message` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `email_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`recipient_id`) REFERENCES `campaign_recipients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `email_job_items_job_idx` ON `email_job_items` (`job_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_job_items_campaign_idx` ON `email_job_items` (`campaign_id`);
