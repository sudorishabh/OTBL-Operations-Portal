ALTER TABLE `bio_oil_zapping` ADD `documents` json;--> statement-breakpoint
ALTER TABLE `bio_samples` ADD `documents` json;--> statement-breakpoint
ALTER TABLE `proposals` ADD `documents` json;--> statement-breakpoint
ALTER TABLE `wo_site_expenses` ADD `documents` json;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `documents` json;--> statement-breakpoint
-- Backfill: each record's single document becomes a one-item list.
UPDATE `proposals` SET `documents` = IF(`document_key` = '' OR `document_key` LIKE 'pending:%', JSON_ARRAY(), JSON_ARRAY(JSON_OBJECT('url', `document_key`)));
--> statement-breakpoint
UPDATE `work_orders` SET `documents` = IF(`document_key` = '' OR `document_key` LIKE 'pending:%', JSON_ARRAY(), JSON_ARRAY(JSON_OBJECT('url', `document_key`)));
--> statement-breakpoint
UPDATE `bio_samples` SET `documents` = IF(`tph_document_url` = '', JSON_ARRAY(), JSON_ARRAY(JSON_OBJECT('url', `tph_document_url`)));
--> statement-breakpoint
UPDATE `bio_oil_zapping` SET `documents` = IF(`document_url` IS NULL OR `document_url` = '', JSON_ARRAY(), JSON_ARRAY(JSON_OBJECT('url', `document_url`)));
--> statement-breakpoint
UPDATE `wo_site_expenses` SET `documents` = IF(`document_url` IS NULL OR `document_url` = '', JSON_ARRAY(), JSON_ARRAY(JSON_OBJECT('url', `document_url`, 'id', `document_id`)));
