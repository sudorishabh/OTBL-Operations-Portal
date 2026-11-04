ALTER TABLE `contract_orders` ADD `unit_rate` decimal(20,2);--> statement-breakpoint
ALTER TABLE `contract_orders` ADD `gst_percentage` decimal(10,2);--> statement-breakpoint
ALTER TABLE `contract_orders` ADD `invoice_number` varchar(100);--> statement-breakpoint
ALTER TABLE `contract_orders` ADD `completion_documents` json;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD `from_order` tinyint DEFAULT 0 NOT NULL;