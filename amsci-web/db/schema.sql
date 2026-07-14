-- D1 schema for the AmSci catalog cache (NetSuite → D1 sync).
--
-- Apply locally:   wrangler d1 execute amsci-catalog --local  --file=db/schema.sql
-- Apply to prod:   wrangler d1 execute amsci-catalog --remote --file=db/schema.sql
--
-- One row per online NetSuite item (isonline='T' AND isinactive='F'). This is a
-- disposable cache rebuilt from NetSuite; NetSuite remains the system of record.
-- Per-account tiered price/stock is NOT stored here (resolved live per request).

CREATE TABLE IF NOT EXISTS products (
  internal_id     TEXT PRIMARY KEY,          -- NetSuite id (canonical key)
  sku             TEXT NOT NULL DEFAULT '',
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  price           REAL,                       -- base price (level 1, qty 1); null if none
  image           TEXT,                       -- absolute File Cabinet URL; null → placeholder
  gallery         TEXT NOT NULL DEFAULT '[]', -- JSON array of absolute URLs
  grades          TEXT NOT NULL DEFAULT '[]', -- JSON array
  category_name   TEXT,                       -- BUILTIN.DF(class) display name
  item_type       TEXT,
  size            TEXT,
  search_keywords TEXT,
  last_modified   TEXT,                       -- NetSuite lastmodifieddate (incremental cursor)
  synced_at       TEXT NOT NULL               -- ISO timestamp of the sync run that wrote this row
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);

-- Single-row table tracking the last sync run (observability + incremental cursor).
CREATE TABLE IF NOT EXISTS sync_meta (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  last_run    TEXT,     -- ISO timestamp the run finished
  item_count  INTEGER,  -- rows in the catalog after the run
  status      TEXT,     -- 'ok' | 'error'
  message     TEXT,     -- error detail or summary
  duration_ms INTEGER
);
