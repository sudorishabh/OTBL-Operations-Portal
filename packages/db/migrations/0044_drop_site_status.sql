-- Sites are no longer marked active or inactive; every site is simply a
-- site.
ALTER TABLE `sites` DROP COLUMN `status`;
