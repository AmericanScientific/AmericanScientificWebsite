-- Order requests submitted from the cart ("Add To Order" → Submit order request).
--
-- Apply locally:  wrangler d1 execute amsci-catalog --local  --file=db/migrations/0003_orders.sql
-- Apply to prod:  wrangler d1 execute amsci-catalog --remote --file=db/migrations/0003_orders.sql
--
-- Quote-style: no payment, no NetSuite write-back yet. On submit we store the
-- order (self-contained snapshot of customer + priced lines) and email Sales +
-- the customer. Sales writes the PO from that email, as they do today.
-- Remote D1 rejects BEGIN/COMMIT in --file scripts, so none here.

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,  -- the order number
  user_id          INTEGER NOT NULL,
  -- Customer snapshot at order time (from their account; may be partial for
  -- migrated accounts that never filled in company/phone/address).
  customer_name    TEXT NOT NULL DEFAULT '',
  customer_email   TEXT NOT NULL DEFAULT '',
  customer_company TEXT,
  customer_phone   TEXT,
  customer_address TEXT,
  price_level      INTEGER,                            -- tier used to price the lines
  items            TEXT NOT NULL,                      -- JSON: [{sku,title,qty,unitPrice,lineTotal}]
  subtotal         REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL DEFAULT 0,
  has_unpriced     INTEGER NOT NULL DEFAULT 0,         -- 1 if any line is "call for pricing"
  status           TEXT NOT NULL DEFAULT 'requested',
  created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
