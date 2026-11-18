-- Work order codes now read like 2025-26(10)OTBL163: the financial year the
-- work order starts in, its serial number within that year, and its serial
-- number across all work orders. The parts are kept in their own columns.
ALTER TABLE `work_orders` ADD `financial_year` varchar(7);--> statement-breakpoint
ALTER TABLE `work_orders` ADD `fy_serial` int;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `serial` int;--> statement-breakpoint
-- Number the existing work orders in the order they were entered, so new ones
-- carry on from them. Their codes stay as they are. The financial year runs
-- April to March, read in India time (UTC+05:30).
UPDATE `work_orders` AS `wo`
JOIN (
  SELECT
    `id`,
    `fy`,
    ROW_NUMBER() OVER (PARTITION BY `fy` ORDER BY `id`) AS `fy_serial`,
    ROW_NUMBER() OVER (ORDER BY `id`) AS `serial`
  FROM (
    SELECT
      `id`,
      CONCAT(`start_year`, '-', LPAD(MOD(`start_year` + 1, 100), 2, '0')) AS `fy`
    FROM (
      SELECT
        `id`,
        IF(MONTH(`ist`) >= 4, YEAR(`ist`), YEAR(`ist`) - 1) AS `start_year`
      FROM (
        SELECT
          `id`,
          DATE_ADD('1970-01-01 00:00:00', INTERVAL UNIX_TIMESTAMP(`start_date`) + 19800 SECOND) AS `ist`
        FROM `work_orders`
      ) AS `in_india`
    ) AS `by_year`
  ) AS `with_fy`
) AS `numbered` ON `numbered`.`id` = `wo`.`id`
SET
  `wo`.`financial_year` = `numbered`.`fy`,
  `wo`.`fy_serial` = `numbered`.`fy_serial`,
  `wo`.`serial` = `numbered`.`serial`;--> statement-breakpoint
ALTER TABLE `work_orders` MODIFY COLUMN `financial_year` varchar(7) NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` MODIFY COLUMN `fy_serial` int NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` MODIFY COLUMN `serial` int NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_serial_unique` UNIQUE(`serial`);--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `wo_fy_serial_idx` UNIQUE(`financial_year`,`fy_serial`);
