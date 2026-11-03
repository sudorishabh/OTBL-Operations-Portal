ALTER TABLE `work_order_sites` MODIFY COLUMN `site_id` int;--> statement-breakpoint
ALTER TABLE `work_order_sites` ADD `contractor_id` int;--> statement-breakpoint
ALTER TABLE `work_order_sites` ADD CONSTRAINT `work_order_sites_contractor_id_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `contractors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wo_site_contractor_idx` ON `work_order_sites` (`contractor_id`);