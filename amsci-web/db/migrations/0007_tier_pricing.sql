-- Migration 0007: per-tier pricing.
--
-- Apply:  npx wrangler d1 execute amsci-catalog --local  --file=db/migrations/0007_tier_pricing.sql
--         npx wrangler d1 execute amsci-catalog --remote --file=db/migrations/0007_tier_pricing.sql
--
-- Remote D1 rejects raw BEGIN/COMMIT in --file scripts, so none here.
--
-- Until now `products.price` (NetSuite price level 1, qty 1) was the only price
-- the site knew, so every signed-in customer saw list price regardless of the
-- tier negotiated in NetSuite. Per CLAUDE.md §2 roughly half of the customers who
-- actually place orders sit on a negotiated level (3 most common, then base,
-- then 2), so base-for-everyone was wrong for the accounts that matter most.
--
-- One row per (item, price level) at quantity 1. Quantity is deliberately NOT a
-- dimension here: NetSuite's catalog has only qty-1 and qty-2 rows, no volume
-- schedules, and the qty-2 values are dirty (frequently HIGHER than qty-1). A
-- quantity-break table built from that data would show customers garbage. The
-- storefront keeps the qty stepper with a live line total instead.
--
-- `products.price` stays as-is and remains the fallback for any item with no row
-- at the customer's level, so this table only ever needs to hold real overrides.

CREATE TABLE IF NOT EXISTS product_prices (
  internal_id TEXT    NOT NULL,          -- NetSuite item id; matches products.internal_id
  price_level INTEGER NOT NULL,          -- NetSuite price level (1 = base; 2,3,4,7,8 = tiers)
  unit_price  REAL    NOT NULL,          -- unit price at quantity 1
  synced_at   TEXT    NOT NULL,          -- stamp of the sync run that wrote this row (drives pruning)
  PRIMARY KEY (internal_id, price_level)
);

-- The read path joins products → product_prices on internal_id for one level at
-- a time, so this is the index that matters.
CREATE INDEX IF NOT EXISTS idx_product_prices_lookup
  ON product_prices (internal_id, price_level);

-- Pruning after a full sync deletes by stamp.
CREATE INDEX IF NOT EXISTS idx_product_prices_synced
  ON product_prices (synced_at);
