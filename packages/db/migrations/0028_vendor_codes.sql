-- Every vendor gets its own code, such as VEN-0012, so vendors with similar
-- names can be told apart and found. Existing vendors are numbered in the
-- order they were added.
ALTER TABLE `contractors` ADD `code` varchar(20);--> statement-breakpoint
UPDATE `contractors` AS `c`
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS `serial`
  FROM `contractors`
) AS `numbered` ON `numbered`.`id` = `c`.`id`
SET `c`.`code` = CONCAT('VEN-', LPAD(`numbered`.`serial`, 4, '0'));--> statement-breakpoint
ALTER TABLE `contractors` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `contractors` ADD CONSTRAINT `contractors_code_unique` UNIQUE(`code`);
