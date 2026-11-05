-- Vendors and sub-contractors are the same: everyone material and work are
-- ordered from is a vendor, so contractors no longer have a type.
DROP INDEX `contractor_type_idx` ON `contractors`;--> statement-breakpoint
ALTER TABLE `contractors` DROP COLUMN `type`;