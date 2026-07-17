-- Daily usage counter for the AI assistant — a cost circuit-breaker. Bounds
-- worst-case Anthropic spend even under distributed abuse (many IPs dodging the
-- per-IP rate limiter). One row per UTC day; the /api/chat route increments it
-- per LLM call and refuses once a daily cap is hit. See src/lib/chat/guard.ts.
--
-- Apply locally:  wrangler d1 execute amsci-catalog --local  --file=db/migrations/0005_chat_usage.sql
-- Apply to prod:  wrangler d1 execute amsci-catalog --remote --file=db/migrations/0005_chat_usage.sql

CREATE TABLE IF NOT EXISTS chat_usage (
  day    TEXT PRIMARY KEY,   -- UTC date, YYYY-MM-DD
  count  INTEGER NOT NULL DEFAULT 0
);
