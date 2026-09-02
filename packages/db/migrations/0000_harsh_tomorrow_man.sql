CREATE TABLE `bio_oil_zapping` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`bio_sample_id` int,
	`document_url` varchar(255),
	`estimated_quantity` decimal(20,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bio_oil_zapping_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bio_samples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`biorem_cont_soil_id` int,
	`tph_document_url` varchar(255) NOT NULL,
	`tph_value` decimal(10,2) NOT NULL,
	`application_month` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bio_samples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `biorem_cont_soil` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`estimated_quantity` decimal(20,2) NOT NULL,
	`amount` decimal(20,2),
	`transportation_km` decimal(10,2),
	`type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `biorem_cont_soil_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clean_soil_area` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`estimated_quantity` decimal(20,2) NOT NULL,
	`amount` decimal(20,2),
	`transportation_km` decimal(10,2),
	`type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clean_soil_area_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`designation` varchar(255),
	`contact_number` varchar(15) NOT NULL,
	`email` varchar(320) NOT NULL,
	`contact_type` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(255) NOT NULL,
	`state` varchar(255) NOT NULL,
	`city` varchar(255) NOT NULL,
	`pincode` varchar(10) NOT NULL,
	`gst_number` varchar(15) NOT NULL,
	`contact_number` varchar(15),
	`email` varchar(320),
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`office_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact_number` varchar(15),
	`email` varchar(320),
	`address` varchar(500),
	`gst_number` varchar(15),
	`pan_number` varchar(10),
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contractors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `excav_cont_soil` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`estimated_quantity` decimal(20,2) NOT NULL,
	`amount` decimal(20,2),
	`transportation_km` decimal(10,2),
	`type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `excav_cont_soil_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lifting_oil_slush` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`estimated_quantity` decimal(20,2) NOT NULL,
	`amount` decimal(20,2),
	`transportation_km` decimal(10,2),
	`type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lifting_oil_slush_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(255) NOT NULL,
	`state` varchar(255) NOT NULL,
	`city` varchar(255) NOT NULL,
	`gst_number` varchar(15) NOT NULL,
	`pincode` varchar(10) NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `office_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`office_id` int NOT NULL,
	`assigned_by` int,
	`role` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `office_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `office_user_unique_idx` UNIQUE(`office_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`office_id` int NOT NULL,
	`code` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`document_key` varchar(255) NOT NULL,
	`description` text,
	`proposal_submission_date` timestamp NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposals_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `refill_excav_soil` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`estimated_quantity` decimal(20,2) NOT NULL,
	`amount` decimal(20,2),
	`transportation_km` decimal(10,2),
	`type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refill_excav_soil_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_of_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_id` int NOT NULL,
	`activity` varchar(255) NOT NULL,
	`unit` varchar(10) NOT NULL,
	`estimated_quantity` decimal(20,2) NOT NULL,
	`rc_unit_rate` decimal(20,2) NOT NULL,
	`gst_percentage` decimal(10,2) NOT NULL DEFAULT '18',
	`unit_rate_inc_gst` decimal(20,2) NOT NULL,
	`total_cost` decimal(20,2) NOT NULL,
	`transportation_km` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_of_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_activity_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_site_id` int NOT NULL,
	`schedule_of_rates_id` int NOT NULL,
	`activity` varchar(255) NOT NULL,
	`unit` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_activity_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(255) NOT NULL,
	`state` varchar(255) NOT NULL,
	`city` varchar(255) NOT NULL,
	`pincode` varchar(10) NOT NULL,
	`office_id` int NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trans_cont_soil` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_activity_id` int,
	`work_order_site_id` int NOT NULL,
	`estimated_quantity` decimal(20,2) NOT NULL,
	`amount` decimal(20,2),
	`transportation_km` decimal(10,2),
	`type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trans_cont_soil_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`password` varchar(255) NOT NULL,
	`contact_number` varchar(15),
	`role` varchar(50) NOT NULL DEFAULT 'office_operator',
	`created_by` int,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `work_order_site_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_site_id` int NOT NULL,
	`document_url` varchar(255) NOT NULL,
	`document_id` varchar(255),
	`type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_order_site_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wo_site_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_site_id` int NOT NULL,
	`expense_type` varchar(50) NOT NULL,
	`contractor_id` int,
	`description` varchar(500) NOT NULL,
	`amount` decimal(20,2) NOT NULL,
	`expense_date` timestamp NOT NULL,
	`invoice_number` varchar(100),
	`notes` text,
	`activity_key` varchar(100),
	`quantity` decimal(20,4),
	`is_exceeded` tinyint NOT NULL DEFAULT 0,
	`document_url` varchar(500),
	`document_id` varchar(255),
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wo_site_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wo_site_oprtr_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_site_id` int NOT NULL,
	`uploaded_by_user_id` int NOT NULL,
	`description` text NOT NULL,
	`file_name` varchar(512),
	`document_url` text NOT NULL,
	`document_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wo_site_oprtr_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_order_sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_id` int NOT NULL,
	`client_id` int NOT NULL,
	`site_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`process_type` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`isCompleted` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_order_sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `wo_site_unique_idx` UNIQUE(`work_order_id`,`site_id`)
);
--> statement-breakpoint
CREATE TABLE `work_order_site_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_order_site_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_order_site_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `wosu_wo_site_user_idx` UNIQUE(`work_order_site_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(255) NOT NULL,
	`agreement_number` varchar(255) NOT NULL,
	`rate_contract_number` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`proposal_id` int NOT NULL,
	`client_id` int NOT NULL,
	`office_id` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`handing_over_date` timestamp NOT NULL,
	`document_key` varchar(255) NOT NULL,
	`process_type` varchar(50) NOT NULL,
	`description` text,
	`job_number` varchar(255) NOT NULL,
	`area` varchar(255) NOT NULL,
	`installation` varchar(255) NOT NULL,
	`joint_estimate_number` varchar(255) NOT NULL,
	`land_owner_name` varchar(255) NOT NULL,
	`remarks` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`cancellation_reason` text,
	`approved_at` timestamp,
	`approved_by` int,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `work_orders_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `bio_oil_zapping` ADD CONSTRAINT `bio_oil_zapping_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bio_oil_zapping` ADD CONSTRAINT `bio_oil_zapping_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bio_oil_zapping` ADD CONSTRAINT `bio_oil_zapping_bio_sample_id_bio_samples_id_fk` FOREIGN KEY (`bio_sample_id`) REFERENCES `bio_samples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bio_samples` ADD CONSTRAINT `bio_samples_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bio_samples` ADD CONSTRAINT `bio_samples_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bio_samples` ADD CONSTRAINT `bio_samples_biorem_cont_soil_id_biorem_cont_soil_id_fk` FOREIGN KEY (`biorem_cont_soil_id`) REFERENCES `biorem_cont_soil`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biorem_cont_soil` ADD CONSTRAINT `biorem_cont_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biorem_cont_soil` ADD CONSTRAINT `biorem_cont_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clean_soil_area` ADD CONSTRAINT `clean_soil_area_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clean_soil_area` ADD CONSTRAINT `clean_soil_area_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contractors` ADD CONSTRAINT `contractors_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excav_cont_soil` ADD CONSTRAINT `excav_cont_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excav_cont_soil` ADD CONSTRAINT `excav_cont_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lifting_oil_slush` ADD CONSTRAINT `lifting_oil_slush_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lifting_oil_slush` ADD CONSTRAINT `lifting_oil_slush_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `office_users` ADD CONSTRAINT `office_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `office_users` ADD CONSTRAINT `office_users_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `office_users` ADD CONSTRAINT `office_users_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refill_excav_soil` ADD CONSTRAINT `refill_excav_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refill_excav_soil` ADD CONSTRAINT `refill_excav_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedule_of_rates` ADD CONSTRAINT `schedule_of_rates_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_activity_items` ADD CONSTRAINT `site_activity_items_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_activity_items` ADD CONSTRAINT `site_activity_items_schedule_of_rates_id_schedule_of_rates_id_fk` FOREIGN KEY (`schedule_of_rates_id`) REFERENCES `schedule_of_rates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trans_cont_soil` ADD CONSTRAINT `trans_cont_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trans_cont_soil` ADD CONSTRAINT `trans_cont_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_site_docs` ADD CONSTRAINT `work_order_site_docs_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD CONSTRAINT `wo_site_expenses_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD CONSTRAINT `wo_site_expenses_contractor_id_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `contractors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD CONSTRAINT `wo_site_expenses_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wo_site_oprtr_docs` ADD CONSTRAINT `wo_site_oprtr_docs_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wo_site_oprtr_docs` ADD CONSTRAINT `wo_site_oprtr_docs_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_sites` ADD CONSTRAINT `work_order_sites_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_sites` ADD CONSTRAINT `work_order_sites_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_sites` ADD CONSTRAINT `work_order_sites_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_site_users` ADD CONSTRAINT `work_order_site_users_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_site_users` ADD CONSTRAINT `work_order_site_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_proposal_id_proposals_id_fk` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contractor_office_idx` ON `contractors` (`office_id`);--> statement-breakpoint
CREATE INDEX `contractor_name_idx` ON `contractors` (`name`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `offices` (`name`);--> statement-breakpoint
CREATE INDEX `city_idx` ON `offices` (`city`);--> statement-breakpoint
CREATE INDEX `state_idx` ON `offices` (`state`);--> statement-breakpoint
CREATE INDEX `office_user_office_idx` ON `office_users` (`office_id`);--> statement-breakpoint
CREATE INDEX `office_user_user_idx` ON `office_users` (`user_id`);--> statement-breakpoint
CREATE INDEX `proposal_client_idx` ON `proposals` (`client_id`);--> statement-breakpoint
CREATE INDEX `proposal_status_idx` ON `proposals` (`status`);--> statement-breakpoint
CREATE INDEX `site_name_idx` ON `sites` (`name`);--> statement-breakpoint
CREATE INDEX `site_city_idx` ON `sites` (`city`);--> statement-breakpoint
CREATE INDEX `site_state_idx` ON `sites` (`state`);--> statement-breakpoint
CREATE INDEX `site_office_idx` ON `sites` (`office_id`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `users` (`name`);--> statement-breakpoint
CREATE INDEX `expense_wo_site_idx` ON `wo_site_expenses` (`work_order_site_id`);--> statement-breakpoint
CREATE INDEX `expense_contractor_idx` ON `wo_site_expenses` (`contractor_id`);--> statement-breakpoint
CREATE INDEX `expense_type_idx` ON `wo_site_expenses` (`expense_type`);--> statement-breakpoint
CREATE INDEX `expense_date_idx` ON `wo_site_expenses` (`expense_date`);--> statement-breakpoint
CREATE INDEX `wosou_wo_site_idx` ON `wo_site_oprtr_docs` (`work_order_site_id`);--> statement-breakpoint
CREATE INDEX `wosou_user_idx` ON `wo_site_oprtr_docs` (`uploaded_by_user_id`);--> statement-breakpoint
CREATE INDEX `wo_site_work_order_idx` ON `work_order_sites` (`work_order_id`);--> statement-breakpoint
CREATE INDEX `wo_site_site_idx` ON `work_order_sites` (`site_id`);--> statement-breakpoint
CREATE INDEX `wo_site_status_idx` ON `work_order_sites` (`status`);--> statement-breakpoint
CREATE INDEX `wosu_user_idx` ON `work_order_site_users` (`user_id`);--> statement-breakpoint
CREATE INDEX `wo_client_idx` ON `work_orders` (`client_id`);--> statement-breakpoint
CREATE INDEX `wo_office_idx` ON `work_orders` (`office_id`);--> statement-breakpoint
CREATE INDEX `wo_status_idx` ON `work_orders` (`status`);--> statement-breakpoint
CREATE INDEX `wo_dates_idx` ON `work_orders` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `wo_approved_at_idx` ON `work_orders` (`approved_at`);