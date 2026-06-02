-- Rename the "manager" role to "office_manager".
--
-- The role value changed from "manager" to "office_manager" for both the global
-- user role (`users.role`) and the office membership role (`office_users.role`).
-- `role` is a plain varchar(50) (no DB-level enum), so no DDL change is needed --
-- only this data backfill to migrate existing rows to the new value.
--
-- Idempotent: once migrated, re-runs match nothing.
UPDATE `users` SET `role` = 'office_manager' WHERE `role` = 'manager';
--> statement-breakpoint
UPDATE `office_users` SET `role` = 'office_manager' WHERE `role` = 'manager';
