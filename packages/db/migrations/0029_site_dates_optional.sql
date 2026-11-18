-- A site can be added to a work order before its dates are known.
ALTER TABLE `work_order_sites` MODIFY COLUMN `date` timestamp NULL;--> statement-breakpoint
ALTER TABLE `work_order_sites` MODIFY COLUMN `end_date` timestamp NULL;
