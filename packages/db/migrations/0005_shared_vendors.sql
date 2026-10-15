ALTER TABLE `contractors` DROP FOREIGN KEY `contractors_office_id_offices_id_fk`;
--> statement-breakpoint
DROP INDEX `contractor_office_idx` ON `contractors`;--> statement-breakpoint
ALTER TABLE `contractors` DROP COLUMN `office_id`;