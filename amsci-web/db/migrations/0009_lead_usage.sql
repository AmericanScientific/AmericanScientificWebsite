-- Daily volume cap for the public PHYWE lead form (/api/phywe-lead).
--
-- Added after a bot pushed 200+ inquiries through the form in a single run,
-- each one a real Resend send into sales@american-scientific.com. Per-IP rate
-- limiting (the LEAD_RL_* bindings) stops one host hammering the endpoint; this
-- table is the backstop for the distributed case, where many IPs each stay
-- under the per-IP limit. See src/lib/leads/guard.ts.
CREATE TABLE IF NOT EXISTS lead_usage (
  day    TEXT PRIMARY KEY,   -- UTC date, YYYY-MM-DD
  count  INTEGER NOT NULL DEFAULT 0
);
