ALTER TABLE `contractors` ADD `type` varchar(50) DEFAULT 'vendor' NOT NULL;--> statement-breakpoint
CREATE INDEX `contractor_type_idx` ON `contractors` (`type`);