-- Drop the deprecated site_users table.
--
-- The master-site operator roster was removed: Site Operators are now assigned
-- per work-order-site (work_order_site_users), not to master sites. No code
-- reads or writes site_users anymore.
--
-- Run AFTER deploying the code that no longer references site_users.
-- Destructive and irreversible — the table's rows are discarded.
DROP TABLE IF EXISTS site_users;
