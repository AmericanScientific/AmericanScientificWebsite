-- Per-user daily usage counter for the AI assistant. The assistant is now
-- signed-in-only, so we cap each user's messages per UTC day (in addition to the
-- global chat_usage circuit-breaker). See src/lib/chat/guard.ts.
--
-- Apply locally:  wrangler d1 execute amsci-catalog --local  --file=db/migrations/0006_chat_usage_user.sql
-- Apply to prod:  wrangler d1 execute amsci-catalog --remote --file=db/migrations/0006_chat_usage_user.sql

CREATE TABLE IF NOT EXISTS chat_usage_user (
  day     TEXT NOT NULL,      -- UTC date, YYYY-MM-DD
  user_id INTEGER NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id)
);
