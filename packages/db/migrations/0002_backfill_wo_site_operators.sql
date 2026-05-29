-- Backfill per-work-order-site operator assignments from master-site assignments.
--
-- Access to upload documents is now scoped to `work_order_site_users` (the
-- per-WO-site assignment table) instead of being derived from `site_users`
-- (master-site assignment). Without this backfill, operators currently assigned
-- only at the master-site level would immediately lose access to every WO-site.
--
-- For each operator on a master site, create a WO-site assignment for every
-- work_order_site that uses that master site — preserving today's access.
-- Managers then prune the over-broad assignments via the WO-site detail dialog.
--
-- Idempotent: the NOT EXISTS guard (and the unique index on
-- (work_order_site_id, user_id)) makes re-runs a no-op. DISTINCT collapses
-- duplicate source pairs (site_users has no unique (site_id, user_id) index, so
-- the same operator can appear twice) which would otherwise collide in-statement.
INSERT INTO `work_order_site_users` (`work_order_site_id`, `user_id`)
SELECT DISTINCT `wos`.`id`, `su`.`user_id`
FROM `site_users` `su`
JOIN `work_order_sites` `wos` ON `wos`.`site_id` = `su`.`site_id`
WHERE NOT EXISTS (
  SELECT 1
  FROM `work_order_site_users` `existing`
  WHERE `existing`.`work_order_site_id` = `wos`.`id`
    AND `existing`.`user_id` = `su`.`user_id`
);
