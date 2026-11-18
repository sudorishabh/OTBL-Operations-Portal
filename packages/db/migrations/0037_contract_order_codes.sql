-- Purchase orders and sub-contracts get codes, numbered apart by type, as
-- PO-0003 and SC-0003, in place of a typed order number. Existing orders are
-- numbered in the order they were added and keep their typed number.
ALTER TABLE `contract_orders` MODIFY COLUMN `order_number` varchar(255);--> statement-breakpoint
ALTER TABLE `contract_orders` ADD `code` varchar(20);--> statement-breakpoint
UPDATE `contract_orders` AS `t`
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `type` ORDER BY `id`) AS `serial`
  FROM `contract_orders`
) AS `numbered` ON `numbered`.`id` = `t`.`id`
SET `t`.`code` = CONCAT(
  IF(`t`.`type` = 'purchase_order', 'PO-', 'SC-'),
  IF(`numbered`.`serial` < 10000, LPAD(`numbered`.`serial`, 4, '0'), `numbered`.`serial`)
);--> statement-breakpoint
ALTER TABLE `contract_orders` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_orders` ADD CONSTRAINT `contract_orders_code_unique` UNIQUE(`code`);
