ALTER TABLE `work_orders` ADD `job_number` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `area` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `installation` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `joint_estimate_number` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `land_owner_name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `remarks` varchar(255) NOT NULL;--> statement-breakpoint
UPDATE `work_orders` `wo`
JOIN `work_order_sites` `wos`
  ON `wos`.`id` = (
    SELECT MIN(`s`.`id`)
    FROM `work_order_sites` `s`
    WHERE `s`.`work_order_id` = `wo`.`id`
  )
SET
  `wo`.`job_number` = `wos`.`job_number`,
  `wo`.`area` = `wos`.`area`,
  `wo`.`installation` = `wos`.`installation`,
  `wo`.`joint_estimate_number` = `wos`.`joint_estimate_number`,
  `wo`.`land_owner_name` = `wos`.`land_owner_name`,
  `wo`.`remarks` = `wos`.`remarks`;--> statement-breakpoint
ALTER TABLE `work_order_sites` DROP COLUMN `job_number`;--> statement-breakpoint
ALTER TABLE `work_order_sites` DROP COLUMN `area`;--> statement-breakpoint
ALTER TABLE `work_order_sites` DROP COLUMN `installation`;--> statement-breakpoint
ALTER TABLE `work_order_sites` DROP COLUMN `joint_estimate_number`;--> statement-breakpoint
ALTER TABLE `work_order_sites` DROP COLUMN `land_owner_name`;--> statement-breakpoint
ALTER TABLE `work_order_sites` DROP COLUMN `remarks`;
