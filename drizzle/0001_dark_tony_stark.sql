CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`recipient_name` text NOT NULL,
	`recipient_room` text,
	`team_name` text,
	`award` text,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	`published_at` text,
	`published_by` text
);
--> statement-breakpoint
CREATE INDEX `certificates_activity_id_idx` ON `certificates` (`activity_id`);--> statement-breakpoint
CREATE INDEX `certificates_recipient_name_idx` ON `certificates` (`recipient_name`);--> statement-breakpoint
CREATE INDEX `certificates_status_idx` ON `certificates` (`status`);