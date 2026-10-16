-- Bioremediation sites now keep their own vendors, as restoration does. Each
-- vendor a site's expenses were recorded under becomes one of its vendors, in
-- the order first used, so those expenses stay under it.
INSERT INTO `wo_site_contractors` (`work_order_site_id`, `contractor_id`)
SELECT e.`work_order_site_id`, e.`contractor_id`
FROM `wo_site_expenses` e
INNER JOIN `work_order_sites` s ON s.`id` = e.`work_order_site_id`
WHERE s.`process_type` = 'bioremediation'
  AND e.`contractor_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `wo_site_contractors` c
    WHERE c.`work_order_site_id` = e.`work_order_site_id`
      AND c.`contractor_id` = e.`contractor_id`
  )
GROUP BY e.`work_order_site_id`, e.`contractor_id`
ORDER BY MIN(e.`id`);
