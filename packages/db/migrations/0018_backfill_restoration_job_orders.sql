-- Restoration work is now given out through job orders. Each restoration that
-- has vendors gets one job order, JO-1, holding those vendors and the expenses
-- recorded under them, so they stay in view. Miscellaneous expenses stay at the
-- restoration level.
INSERT INTO `job_orders` (`work_order_site_id`, `jo_number`, `title`, `start_date`, `end_date`)
SELECT s.`id`, 'JO-1', 'Existing restoration work', s.`date`, s.`end_date`
FROM `work_order_sites` s
WHERE s.`process_type` = 'restoration'
  AND s.`site_id` IS NULL
  AND (
    EXISTS (
      SELECT 1 FROM `wo_site_contractors` c
      WHERE c.`work_order_site_id` = s.`id`
    )
    OR EXISTS (
      SELECT 1 FROM `wo_site_expenses` e
      WHERE e.`work_order_site_id` = s.`id` AND e.`contractor_id` IS NOT NULL
    )
  );--> statement-breakpoint
INSERT INTO `job_order_contractors` (`job_order_id`, `contractor_id`)
SELECT j.`id`, v.`contractor_id`
FROM `job_orders` j
INNER JOIN (
  SELECT `work_order_site_id`, `contractor_id` FROM `wo_site_contractors`
  UNION
  SELECT `work_order_site_id`, `contractor_id` FROM `wo_site_expenses`
  WHERE `contractor_id` IS NOT NULL
) v ON v.`work_order_site_id` = j.`work_order_site_id`;--> statement-breakpoint
UPDATE `wo_site_expenses` e
INNER JOIN `job_orders` j ON j.`work_order_site_id` = e.`work_order_site_id`
SET e.`job_order_id` = j.`id`
WHERE e.`contractor_id` IS NOT NULL;
