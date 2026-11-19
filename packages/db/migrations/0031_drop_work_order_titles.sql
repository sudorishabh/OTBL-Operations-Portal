-- Work orders no longer have titles: they are known by their codes and
-- purchase order codes. Each title is kept at the start of the work order's
-- description first, so nothing written in it is lost.
UPDATE `work_orders`
SET `description` = IF(
  `description` IS NULL OR TRIM(`description`) = '',
  `title`,
  CONCAT(`title`, CHAR(10), CHAR(10), `description`)
)
WHERE TRIM(`title`) <> '';--> statement-breakpoint
ALTER TABLE `work_orders` DROP COLUMN `title`;
