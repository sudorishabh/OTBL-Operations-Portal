ALTER TABLE `job_orders` ADD `issued_by` varchar(255);--> statement-breakpoint
ALTER TABLE `job_orders` ADD `rc_noa_number` varchar(255);--> statement-breakpoint
ALTER TABLE `job_orders` ADD `rc_noa_date` timestamp;--> statement-breakpoint
ALTER TABLE `job_orders` ADD `ola_number` varchar(255);--> statement-breakpoint
ALTER TABLE `job_orders` ADD `po_number` varchar(255);--> statement-breakpoint
ALTER TABLE `job_orders` ADD `installation_name` varchar(255);--> statement-breakpoint
ALTER TABLE `job_orders` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `job_orders` ADD `mobilization_date` timestamp;--> statement-breakpoint
ALTER TABLE `job_orders` ADD `activities` json;