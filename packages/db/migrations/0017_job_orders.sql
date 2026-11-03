CREATE TABLE `job_order_contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_order_id` int NOT NULL,
	`contractor_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_order_contractors_id` PRIMARY KEY(`id`),
	CONSTRAINT `joc_job_order_contractor_idx` UNIQUE(`job_order_id`,`contractor_id`)
);
--> statement-breakpoint
CREATE TABLE `job_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_site_id` int NOT NULL,
	`jo_number` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`description` text,
	`documents` json,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `jo_wo_site_number_idx` UNIQUE(`work_order_site_id`,`jo_number`)
);
--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD `job_order_id` int;--> statement-breakpoint
ALTER TABLE `job_order_contractors` ADD CONSTRAINT `job_order_contractors_job_order_id_job_orders_id_fk` FOREIGN KEY (`job_order_id`) REFERENCES `job_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_order_contractors` ADD CONSTRAINT `job_order_contractors_contractor_id_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `contractors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_orders` ADD CONSTRAINT `job_orders_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_orders` ADD CONSTRAINT `job_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `joc_contractor_idx` ON `job_order_contractors` (`contractor_id`);--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD CONSTRAINT `wo_site_expenses_job_order_id_job_orders_id_fk` FOREIGN KEY (`job_order_id`) REFERENCES `job_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `expense_job_order_idx` ON `wo_site_expenses` (`job_order_id`);