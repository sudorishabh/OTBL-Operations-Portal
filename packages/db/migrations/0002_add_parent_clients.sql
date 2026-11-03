CREATE TABLE `parent_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parent_clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_clients_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `parent_client_id` int;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_parent_client_id_parent_clients_id_fk` FOREIGN KEY (`parent_client_id`) REFERENCES `parent_clients`(`id`) ON DELETE set null ON UPDATE no action;