-- There are no office managers any more. Each one becomes an office operator
-- and keeps their office seats; with operators the only people seated at an
-- office, a seat no longer needs a role.
UPDATE `users` SET `role` = 'office_operator' WHERE `role` = 'office_manager';--> statement-breakpoint
ALTER TABLE `office_users` DROP COLUMN `role`;
