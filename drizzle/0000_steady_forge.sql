CREATE TABLE `interests` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`sender`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interests_pair` ON `interests` (`sender`,`recipient`);--> statement-breakpoint
CREATE INDEX `idx_interests_recipient` ON `interests` (`recipient`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`gender` text NOT NULL,
	`community` text NOT NULL,
	`city` text NOT NULL,
	`occupation` text NOT NULL,
	`education` text NOT NULL,
	`marital` text NOT NULL,
	`bio` text NOT NULL,
	`photo` text,
	`published` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_id_unique` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_profiles_published` ON `profiles` (`published`);--> statement-breakpoint
CREATE TABLE `shortlists` (
	`owner` text NOT NULL,
	`target` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shortlists_pair` ON `shortlists` (`owner`,`target`);