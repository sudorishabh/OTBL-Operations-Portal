CREATE TABLE `wo_site_contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_site_id` int NOT NULL,
	`contractor_id` int NOT NULL,
	`assigned_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wo_site_contractors_id` PRIMARY KEY(`id`),
	CONSTRAINT `wosc_wo_site_contractor_idx` UNIQUE(`work_order_site_id`,`contractor_id`)
);
--> statement-breakpoint
ALTER TABLE `wo_site_contractors` ADD CONSTRAINT `wo_site_contractors_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wo_site_contractors` ADD CONSTRAINT `wo_site_contractors_contractor_id_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `contractors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wo_site_contractors` ADD CONSTRAINT `wo_site_contractors_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wosc_contractor_idx` ON `wo_site_contractors` (`contractor_id`);--> statement-breakpoint
-- Carry over each restoration's existing contractor.
INSERT INTO `wo_site_contractors` (`work_order_site_id`, `contractor_id`) SELECT `id`, `contractor_id` FROM `work_order_sites` WHERE `contractor_id` IS NOT NULL;