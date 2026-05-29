ALTER TABLE `work_orders` ADD `approved_at` timestamp;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `approved_by` int;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wo_approved_at_idx` ON `work_orders` (`approved_at`);