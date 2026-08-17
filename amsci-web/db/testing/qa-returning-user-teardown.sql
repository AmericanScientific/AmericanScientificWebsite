-- QA fixture: remove the returning-customer test accounts entirely.
--
-- Run this before the public launch so the fixtures never appear in the admin
-- accounts directory or any customer count.
--
-- Apply:
--   npx wrangler d1 execute amsci-catalog --remote --file=db/testing/qa-returning-user-teardown.sql
--
-- Scoped to `email LIKE '%+qa%@%'` — see qa-returning-user-seed.sql for why that
-- predicate cannot match a migrated WordPress account.

DELETE FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%+qa%@%');

DELETE FROM password_tokens
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%+qa%@%');

-- Orders placed by a fixture while testing the cart, so teardown doesn't leave
-- orphan rows pointing at deleted users.
DELETE FROM orders
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%+qa%@%');

DELETE FROM users WHERE email LIKE '%+qa%@%';

SELECT COUNT(*) AS remaining_qa_accounts FROM users WHERE email LIKE '%+qa%@%';
