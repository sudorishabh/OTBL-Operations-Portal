CREATE TABLE `contract_order_contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contract_order_id` int NOT NULL,
	`contractor_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_order_contractors_id` PRIMARY KEY(`id`),
	CONSTRAINT `coc_order_contractor_idx` UNIQUE(`contract_order_id`,`contractor_id`)
);
--> statement-breakpoint
CREATE TABLE `contract_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contract_order_id` int NOT NULL,
	`work_order_site_id` int NOT NULL,
	`item` varchar(100) NOT NULL,
	`description` varchar(255),
	`quantity` decimal(20,2) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_id` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`order_number` varchar(255) NOT NULL,
	`order_date` timestamp NOT NULL,
	`description` text,
	`documents` json,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `co_wo_type_number_idx` UNIQUE(`work_order_id`,`type`,`order_number`)
);
--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD `contract_order_item_id` int;--> statement-breakpoint
ALTER TABLE `contract_order_contractors` ADD CONSTRAINT `contract_order_contractors_contractor_id_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `contractors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_order_contractors` ADD CONSTRAINT `coc_contract_order_fk` FOREIGN KEY (`contract_order_id`) REFERENCES `contract_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_order_items` ADD CONSTRAINT `contract_order_items_contract_order_id_contract_orders_id_fk` FOREIGN KEY (`contract_order_id`) REFERENCES `contract_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_order_items` ADD CONSTRAINT `contract_order_items_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_orders` ADD CONSTRAINT `contract_orders_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_orders` ADD CONSTRAINT `contract_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `coc_contractor_idx` ON `contract_order_contractors` (`contractor_id`);--> statement-breakpoint
CREATE INDEX `coi_contract_order_idx` ON `contract_order_items` (`contract_order_id`);--> statement-breakpoint
CREATE INDEX `coi_wo_site_idx` ON `contract_order_items` (`work_order_site_id`);--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD CONSTRAINT `expense_contract_order_item_fk` FOREIGN KEY (`contract_order_item_id`) REFERENCES `contract_order_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `expense_contract_order_item_idx` ON `wo_site_expenses` (`contract_order_item_id`);