-- QA fixture: disposable "returning WordPress customer" accounts.
--
-- Purpose
--   The returning-customer flow (old site → 409 mustSetup → emailed link →
--   /set-password → logged in) is one-way: setting a password clears
--   must_change_password PERMANENTLY, so an account can only walk the flow once.
--   These rows exist purely to be walked and re-armed, so the flow can be
--   re-tested as many times as needed without touching a real customer.
--
-- Apply:
--   npx wrangler d1 execute amsci-catalog --remote --file=db/testing/qa-returning-user-seed.sql
--
-- Safety
--   Every QA address carries a `+qa` tag. No migrated WordPress address contains
--   one, so the re-arm and teardown scripts can scope themselves to
--   `email LIKE '%+qa%@%'` and be structurally incapable of hitting a real
--   account. Do not remove the tag from these addresses.
--
-- Before running: replace the addresses below with mailboxes you actually
-- receive. Plus-addressing (you+qa1@domain) delivers to the base mailbox on
-- Microsoft 365 and Google Workspace, so one inbox covers all five.

-- State reproduced here is exactly what migration 0001 left every migrated
-- WordPress account in:
--   password_hash        NULL  -- no usable password on the new site
--   wp_password_hash     NULL  -- old WP hash dropped, not honored
--   must_change_password 1     -- login returns 409 {mustSetup:true}
--   status               'approved'  -- past the moderation gate
-- `wp_user_id` is set to a sentinel 999xxx so these are distinguishable from
-- genuine migration provenance in the admin directory.

INSERT OR IGNORE INTO users
  (email, wp_user_id, display_name, password_hash, wp_password_hash,
   status, role, is_admin, price_level, must_change_password,
   company, account_type, created_at, updated_at)
VALUES
  ('marketing+qa1@american-scientific.com', 999001, 'QA Returning One',   NULL, NULL, 'approved', 'customer', 0, 1, 1, 'QA Fixture', 'Distributor', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('marketing+qa2@american-scientific.com', 999002, 'QA Returning Two',   NULL, NULL, 'approved', 'customer', 0, 1, 1, 'QA Fixture', 'Distributor', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('marketing+qa3@american-scientific.com', 999003, 'QA Returning Three', NULL, NULL, 'approved', 'customer', 0, 1, 1, 'QA Fixture', 'Distributor', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('marketing+qa4@american-scientific.com', 999004, 'QA Returning Four',  NULL, NULL, 'approved', 'customer', 0, 1, 1, 'QA Fixture', 'Distributor', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('marketing+qa5@american-scientific.com', 999005, 'QA Returning Five',  NULL, NULL, 'approved', 'customer', 0, 1, 1, 'QA Fixture', 'Distributor', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- Two edge-case fixtures the happy path never exercises. Both are states real
-- accounts are genuinely in, and both have a specific correct behavior:
--
--   +qapending  status='pending'  → set-password must store the password but
--                                   grant NO session (403 at login afterwards).
--                                   Admin "resend setup" must refuse with 409.
--   +qadenied   status='denied'   → request-setup must return the generic
--                                   response and send NOTHING; login 403.
INSERT OR IGNORE INTO users
  (email, wp_user_id, display_name, password_hash, wp_password_hash,
   status, role, is_admin, price_level, must_change_password,
   company, account_type, created_at, updated_at)
VALUES
  ('marketing+qapending@american-scientific.com', 999006, 'QA Pending', NULL, NULL, 'pending', 'customer', 0, 1, 1, 'QA Fixture', 'Educator', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('marketing+qadenied@american-scientific.com',  999007, 'QA Denied',  NULL, NULL, 'denied',  'customer', 0, 1, 1, 'QA Fixture', 'Educator', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

SELECT id, email, status, must_change_password,
       CASE WHEN password_hash IS NULL THEN 'null' ELSE 'set' END AS password_hash
FROM users
WHERE email LIKE '%+qa%@%'
ORDER BY id;
