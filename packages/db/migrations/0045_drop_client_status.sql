-- Clients and main clients are no longer marked active or inactive.
ALTER TABLE `clients` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `parent_clients` DROP COLUMN `status`;
