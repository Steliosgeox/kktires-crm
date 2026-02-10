CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_uidx` ON `accounts` (`provider`,`providerAccountId`);--> statement-breakpoint
CREATE TABLE `automation_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`automation_id` text NOT NULL,
	`type` text NOT NULL,
	`config` text,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `email_automations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `campaign_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`error_message` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recipients_campaign_idx` ON `campaign_recipients` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `custom_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`options` text,
	`required` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customer_activities` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activities_customer_idx` ON `customer_activities` (`customer_id`);--> statement-breakpoint
CREATE INDEX `activities_type_idx` ON `customer_activities` (`type`);--> statement-breakpoint
CREATE TABLE `customer_custom_values` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `custom_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `custom_values_idx` ON `customer_custom_values` (`customer_id`,`field_id`);--> statement-breakpoint
CREATE TABLE `customer_images` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customer_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`content` text NOT NULL,
	`is_pinned` integer DEFAULT false,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notes_customer_idx` ON `customer_notes` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customer_tag_idx` ON `customer_tags` (`customer_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `customers` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customers_org_idx` ON `customers` (`org_id`);--> statement-breakpoint
CREATE INDEX `customers_email_idx` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `customers_city_idx` ON `customers` (`city`);--> statement-breakpoint
CREATE INDEX `customers_category_idx` ON `customers` (`category`);--> statement-breakpoint
CREATE INDEX `customers_afm_idx` ON `customers` (`afm`);--> statement-breakpoint
CREATE TABLE `email_automations` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_campaigns` (
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
	FOREIGN KEY (`template_id`) REFERENCES `email_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`signature_id`) REFERENCES `email_signatures`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gmail_credential_id`) REFERENCES `gmail_credentials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `campaigns_org_status_idx` ON `email_campaigns` (`org_id`,`status`);--> statement-breakpoint
CREATE TABLE `email_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`is_default` integer DEFAULT false,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `templates_org_category_idx` ON `email_templates` (`org_id`,`category`);--> statement-breakpoint
CREATE TABLE `email_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`type` text NOT NULL,
	`link_url` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `campaign_recipients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tracking_campaign_type_idx` ON `email_tracking` (`campaign_id`,`type`);--> statement-breakpoint
CREATE TABLE `geocode_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`formatted_address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `geocode_cache_address_unique` ON `geocode_cache` (`address`);--> statement-breakpoint
CREATE TABLE `gmail_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_calendar_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`calendar_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
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
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_to_customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leads_org_idx` ON `leads` (`org_id`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`org_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text,
	`link` text,
	`is_read` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `organization_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`org_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_invitations_token_unique` ON `organization_invitations` (`token`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`org_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`invited_at` integer,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_members_user_org_uidx` ON `organization_members` (`user_id`,`org_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`settings` text,
	`subscription_tier` text DEFAULT 'free',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `saved_locations` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `segments` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`table_name` text NOT NULL,
	`last_sync_at` integer NOT NULL,
	`sync_version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#3B82F6' NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tags_org_name_idx` ON `tags` (`org_id`,`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
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
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_org_status_idx` ON `tasks` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_assigned_idx` ON `tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE TABLE `territories` (
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
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `unsubscribes` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`reason` text,
	`campaign_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `unsubscribes_org_email_idx` ON `unsubscribes` (`org_id`,`email`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer,
	`image` text,
	`avatar` text,
	`password_hash` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_unique` ON `verification_tokens` (`token`);