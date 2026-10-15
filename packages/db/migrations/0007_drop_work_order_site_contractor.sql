ALTER TABLE `work_order_sites` DROP FOREIGN KEY `work_order_sites_contractor_id_contractors_id_fk`;
--> statement-breakpoint
DROP INDEX `wo_site_contractor_idx` ON `work_order_sites`;--> statement-breakpoint
ALTER TABLE `work_order_sites` DROP COLUMN `contractor_id`;