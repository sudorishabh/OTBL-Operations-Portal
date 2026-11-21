-- Work orders are only pending or completed now; cancelling one is gone.
-- Work orders already cancelled are deleted, and with them, through their
-- cascading keys, their sites, schedule of rates, expenses, contract orders
-- and job orders. Files uploaded to SharePoint for them are left there.
DELETE FROM `work_orders` WHERE `status` = 'cancelled';--> statement-breakpoint
ALTER TABLE `work_orders` DROP COLUMN `cancellation_reason`;
