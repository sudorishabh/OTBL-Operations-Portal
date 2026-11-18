-- Users, offices, sites, clients and main clients each get their own code,
-- like vendors and work orders have, so records with similar names can be
-- told apart and found: USR-0007, OFF-0003, SITE-0042, CLT-0014, MCL-0002.
-- Existing records are numbered in the order they were added.
ALTER TABLE `users` ADD `code` varchar(20);--> statement-breakpoint
UPDATE `users` AS `t`
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS `serial` FROM `users`
) AS `numbered` ON `numbered`.`id` = `t`.`id`
SET `t`.`code` = CONCAT('USR-', LPAD(`numbered`.`serial`, 4, '0'));--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_code_unique` UNIQUE(`code`);--> statement-breakpoint
ALTER TABLE `offices` ADD `code` varchar(20);--> statement-breakpoint
UPDATE `offices` AS `t`
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS `serial` FROM `offices`
) AS `numbered` ON `numbered`.`id` = `t`.`id`
SET `t`.`code` = CONCAT('OFF-', LPAD(`numbered`.`serial`, 4, '0'));--> statement-breakpoint
ALTER TABLE `offices` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `offices` ADD CONSTRAINT `offices_code_unique` UNIQUE(`code`);--> statement-breakpoint
ALTER TABLE `sites` ADD `code` varchar(20);--> statement-breakpoint
UPDATE `sites` AS `t`
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS `serial` FROM `sites`
) AS `numbered` ON `numbered`.`id` = `t`.`id`
SET `t`.`code` = CONCAT('SITE-', LPAD(`numbered`.`serial`, 4, '0'));--> statement-breakpoint
ALTER TABLE `sites` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_code_unique` UNIQUE(`code`);--> statement-breakpoint
ALTER TABLE `clients` ADD `code` varchar(20);--> statement-breakpoint
UPDATE `clients` AS `t`
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS `serial` FROM `clients`
) AS `numbered` ON `numbered`.`id` = `t`.`id`
SET `t`.`code` = CONCAT('CLT-', LPAD(`numbered`.`serial`, 4, '0'));--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_code_unique` UNIQUE(`code`);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `code` varchar(20);--> statement-breakpoint
UPDATE `parent_clients` AS `t`
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS `serial` FROM `parent_clients`
) AS `numbered` ON `numbered`.`id` = `t`.`id`
SET `t`.`code` = CONCAT('MCL-', LPAD(`numbered`.`serial`, 4, '0'));--> statement-breakpoint
ALTER TABLE `parent_clients` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `parent_clients` ADD CONSTRAINT `parent_clients_code_unique` UNIQUE(`code`);
