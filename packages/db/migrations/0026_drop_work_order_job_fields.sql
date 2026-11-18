-- Work orders no longer record a job number, joint estimate number,
-- installation type or land owner.
ALTER TABLE `work_orders` DROP COLUMN `job_number`;--> statement-breakpoint
ALTER TABLE `work_orders` DROP COLUMN `installation`;--> statement-breakpoint
ALTER TABLE `work_orders` DROP COLUMN `joint_estimate_number`;--> statement-breakpoint
ALTER TABLE `work_orders` DROP COLUMN `land_owner_name`;