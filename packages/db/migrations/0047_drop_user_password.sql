-- Passwords now live in each user's Better Auth `credential` account, moved
-- there by the previous migration.
ALTER TABLE `users` DROP COLUMN `password`;
