-- A sub-contract requirement sets a rate per unit rather than a quantity; the
-- quantity is recorded with each expense at the site. A sub-contract can take
-- one expense per requirement, with its total quantity. Existing quantities
-- are kept.
ALTER TABLE `contract_order_items` MODIFY COLUMN `quantity` decimal(20,2);--> statement-breakpoint
ALTER TABLE `contract_order_items` ADD `unit_rate` decimal(20,2);--> statement-breakpoint
ALTER TABLE `contract_orders` ADD `single_expense` tinyint DEFAULT 0 NOT NULL;
