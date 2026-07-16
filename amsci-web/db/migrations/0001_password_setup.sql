-- Migration 0001: force password setup on first login; stop honoring WP passwords.
--
-- Apply:  wrangler d1 execute amsci-catalog --local  --file=db/migrations/0001_password_setup.sql
--         wrangler d1 execute amsci-catalog --remote --file=db/migrations/0001_password_setup.sql
--
-- Safe to run once on a DB already seeded with migrated users (no BEGIN/COMMIT —
-- remote D1 rejects raw transaction statements).

-- 1. Add the flag. Every row currently in `users` is a migrated account.
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
UPDATE users SET must_change_password = 1;

-- 2. Old WordPress passwords are no longer accepted on the new site — drop the
--    unused hash material. First login now goes through an emailed setup link.
UPDATE users SET wp_password_hash = NULL, password_hash = NULL;

-- 3. One-time password setup/reset tokens.
CREATE TABLE IF NOT EXISTS password_tokens (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_password_tokens_user ON password_tokens (user_id);
