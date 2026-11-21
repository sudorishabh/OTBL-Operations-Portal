-- Offices are no longer marked active or inactive; every office is simply
-- an office.
ALTER TABLE `offices` DROP COLUMN `status`;
