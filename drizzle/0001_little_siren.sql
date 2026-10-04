ALTER TABLE `interests` ADD `pair_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interests_unordered_pair` ON `interests` (`pair_key`);