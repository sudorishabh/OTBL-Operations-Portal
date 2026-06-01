-- Backfill: split the global `operator` role into `office_operator` / `site_operator`.
--
-- Rule (decided 2026-06-01): an operator currently assigned to >= 1 site becomes a
-- Site Operator; every other operator becomes an Office Operator.
--
-- Non-destructive: existing office_users / site_users rows are left untouched.
-- Run ONCE after deploying the role split. Idempotent — only rows still holding
-- the legacy 'operator' value are touched, so re-running is a no-op.

-- 1) Operators with at least one site assignment -> site_operator
UPDATE users u
SET u.role = 'site_operator'
WHERE u.role = 'operator'
  AND EXISTS (
    SELECT 1 FROM site_users su WHERE su.user_id = u.id
  );

-- 2) Remaining legacy operators (no site assignment) -> office_operator
UPDATE users
SET role = 'office_operator'
WHERE role = 'operator';

-- 3) Switch the column default off the now-removed legacy value. Optional (the
-- app always sets role explicitly on insert) but keeps the DB in sync with the
-- schema's new default. Run with the cleanup deploy. Idempotent.
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'office_operator';
