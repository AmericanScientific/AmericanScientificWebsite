-- QA fixture: re-arm the returning-customer accounts for another run.
--
-- Purpose
--   Walking the returning-customer flow is destructive to the fixture: setting a
--   password clears must_change_password permanently, burns the token, and opens
--   a 30-day session. This script rewinds all three so the SAME accounts can be
--   tested again, indefinitely. Run it between every test pass.
--
-- Apply:
--   npx wrangler d1 execute amsci-catalog --remote --file=db/testing/qa-returning-user-rearm.sql
--
-- Safety
--   Every statement is scoped to `email LIKE '%+qa%@%'`. No migrated WordPress
--   address contains a `+qa` tag, so this cannot rewind a real customer's
--   password or sign them out. Keep that predicate on any statement you add.

-- 1. Sessions first. A live session cookie would keep the browser signed in and
--    mask the 409 the flow is supposed to start with — the single most common
--    way this test silently passes when it should not.
DELETE FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%+qa%@%');

-- 2. Outstanding tokens. Tokens are single-use but NOT invalidated when a newer
--    one is issued (see createPasswordToken), so a stale unused link from a
--    previous pass would still redeem. Clear them so each pass starts clean and
--    the link under test is the only one that works.
DELETE FROM password_tokens
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%+qa%@%');

-- 3. Back to the migrated state migration 0001 produced.
UPDATE users
SET password_hash        = NULL,
    wp_password_hash     = NULL,
    must_change_password = 1,
    updated_at           = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE email LIKE '%+qa%@%';

-- 4. Restore the two edge-case fixtures' statuses, in case a test approved or
--    denied them through the admin UI.
UPDATE users SET status = 'approved' WHERE email LIKE '%+qa1@%' OR email LIKE '%+qa2@%'
                                        OR email LIKE '%+qa3@%' OR email LIKE '%+qa4@%'
                                        OR email LIKE '%+qa5@%';
UPDATE users SET status = 'pending'  WHERE email LIKE '%+qapending@%';
UPDATE users SET status = 'denied'   WHERE email LIKE '%+qadenied@%';

SELECT id, email, status, must_change_password,
       CASE WHEN password_hash IS NULL THEN 'null' ELSE 'set' END AS password_hash,
       (SELECT COUNT(*) FROM password_tokens t WHERE t.user_id = users.id) AS live_tokens,
       (SELECT COUNT(*) FROM sessions s WHERE s.user_id = users.id)        AS live_sessions
FROM users
WHERE email LIKE '%+qa%@%'
ORDER BY id;
