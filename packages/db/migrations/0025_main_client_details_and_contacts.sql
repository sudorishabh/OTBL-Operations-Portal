ALTER TABLE `client_contacts` MODIFY COLUMN `client_id` int;--> statement-breakpoint
ALTER TABLE `client_contacts` ADD `parent_client_id` int;--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `address` varchar(255);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `state` varchar(255);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `city` varchar(255);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `pincode` varchar(10);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `gst_number` varchar(15);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `contact_number` varchar(15);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `parent_clients` ADD `status` varchar(50) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_parent_client_id_parent_clients_id_fk` FOREIGN KEY (`parent_client_id`) REFERENCES `parent_clients`(`id`) ON DELETE cascade ON UPDATE no action;