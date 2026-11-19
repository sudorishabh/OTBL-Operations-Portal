-- Job orders no longer have titles: they are known by their job order numbers,
-- with their installation and location from the client's form. Each title is
-- kept at the start of the job order's description first, so nothing written
-- in it is lost.
UPDATE `job_orders`
SET `description` = IF(
  `description` IS NULL OR TRIM(`description`) = '',
  `title`,
  CONCAT(`title`, CHAR(10), CHAR(10), `description`)
)
WHERE TRIM(`title`) <> '';--> statement-breakpoint
ALTER TABLE `job_orders` DROP COLUMN `title`;
