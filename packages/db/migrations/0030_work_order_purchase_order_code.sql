-- Work orders now have the client's purchase order code, typed in, beside
-- their own code, which is always numbered like 2025-26(10)OTBL163.
ALTER TABLE `work_orders` ADD `purchase_order_code` varchar(255);--> statement-breakpoint
-- Codes typed in before codes were numbered were the purchase order codes the
-- form asks for now, so they move there, and those work orders take the code
-- their numbers make. MySQL sets the columns left to right, so the purchase
-- order code takes the code before it is replaced.
UPDATE `work_orders`
SET
  `purchase_order_code` = `code`,
  `code` = CONCAT(`financial_year`, '(', `fy_serial`, ')OTBL', `serial`)
WHERE NOT REGEXP_LIKE(`code`, '^[0-9]{4}-[0-9]{2}[(][0-9]+[)]OTBL[0-9]+$', 'c');--> statement-breakpoint
CREATE INDEX `wo_po_code_idx` ON `work_orders` (`purchase_order_code`);
