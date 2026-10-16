ALTER TABLE `wo_site_expenses` RENAME COLUMN `expense_date` TO `start_date`;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` RENAME INDEX `expense_date_idx` TO `expense_start_date_idx`;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD `end_date` timestamp;--> statement-breakpoint
-- Existing expenses covered a single day.
UPDATE `wo_site_expenses` SET `end_date` = `start_date`;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` MODIFY COLUMN `end_date` timestamp NOT NULL;
