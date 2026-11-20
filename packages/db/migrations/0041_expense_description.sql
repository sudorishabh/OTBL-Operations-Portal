-- An expense's title becomes its description, which is optional. Existing
-- titles are kept as descriptions.
ALTER TABLE `wo_site_expenses` RENAME COLUMN `title` TO `description`;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` MODIFY COLUMN `description` varchar(500);
