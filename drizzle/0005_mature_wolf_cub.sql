CREATE TABLE `campaign_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`role` text NOT NULL,
	`embed_inline` integer DEFAULT false NOT NULL,
	`display_width_px` integer,
	`align` text,
	`alt_text` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `email_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `campaign_assets_campaign_role_idx` ON `campaign_assets` (`campaign_id`,`role`);--> statement-breakpoint
CREATE INDEX `campaign_assets_asset_idx` ON `campaign_assets` (`asset_id`);--> statement-breakpoint
CREATE TABLE `email_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`uploader_user_id` text NOT NULL,
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
	FOREIGN KEY (`uploader_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_assets_org_created_idx` ON `email_assets` (`org_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `email_assets_org_kind_idx` ON `email_assets` (`org_id`,`kind`);--> statement-breakpoint
CREATE INDEX `email_assets_sha_idx` ON `email_assets` (`sha256`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`org_id` text NOT NULL,
	`notifications` text NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_preferences_user_org_uidx` ON `user_preferences` (`user_id`,`org_id`);
