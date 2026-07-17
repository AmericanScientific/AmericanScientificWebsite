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

-- Order requests submitted from the cart (quote-style; no payment / no NetSuite
-- write-back yet). Self-contained snapshot so the record stands alone.
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,  -- the order number
  user_id          INTEGER NOT NULL,
  customer_name    TEXT NOT NULL DEFAULT '',
  customer_email   TEXT NOT NULL DEFAULT '',
  customer_company TEXT,
  customer_phone   TEXT,
  customer_address TEXT,
  price_level      INTEGER,
  items            TEXT NOT NULL,                      -- JSON: [{sku,title,qty,unitPrice,lineTotal}]
  subtotal         REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL DEFAULT 0,
  has_unpriced     INTEGER NOT NULL DEFAULT 0,
  po_number        TEXT,                               -- optional customer-entered PO number
  status           TEXT NOT NULL DEFAULT 'requested',
  created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);

-- Single-row table tracking the last sync run (observability + incremental cursor).
CREATE TABLE IF NOT EXISTS sync_meta (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  last_run    TEXT,     -- ISO timestamp the run finished
  item_count  INTEGER,  -- rows in the catalog after the run
  status      TEXT,     -- 'ok' | 'error'
  message     TEXT,     -- error detail or summary
  duration_ms INTEGER
);

-- ---------------------------------------------------------------------------
-- Auth / identity (NOT part of the catalog cache; the sync Worker never
-- touches these tables). Customer logins migrated from the old WordPress site;
-- NetSuite remains the system of record for the customer's real price level.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  email                TEXT NOT NULL,                 -- login identity (lowercased)
  wp_user_id           INTEGER,                       -- source WordPress ID (migration provenance)
  display_name         TEXT NOT NULL DEFAULT '',
  -- Modern hash (PBKDF2 via WebCrypto). NULL until the user logs in once and we
  -- lazily upgrade them off the legacy WordPress hash.
  password_hash        TEXT,
  -- Original WordPress hash ($P$ phpass or $wp$ bcrypt). Cleared once upgraded.
  wp_password_hash     TEXT,
  -- 'approved' can log in; 'pending'/'denied' are blocked (new-user-approve gate).
  -- NULL = legacy account with no status meta → treated as approved.
  status               TEXT,
  role                 TEXT NOT NULL DEFAULT 'customer', -- WP role (customer/administrator/...)
  is_admin             INTEGER NOT NULL DEFAULT 0,
  -- Price level resolved from NetSuite by email (deferred; everyone base=1 for now).
  price_level          INTEGER NOT NULL DEFAULT 1,
  netsuite_customer_id TEXT,                          -- set when linked to a NetSuite customer
  -- 1 = user must set a new password before they can log in (all MIGRATED accounts
  -- start at 1: old WordPress passwords are NOT honored on the new site). Flips to 0
  -- permanently the first time they set a password. New signups start at 0.
  must_change_password INTEGER NOT NULL DEFAULT 0,
  -- Self-service signup lead details (from the public /register form). Informational
  -- for the admin who approves the account; account_type = 'Educator' | 'Distributor'.
  company              TEXT,
  phone                TEXT,
  address              TEXT,
  account_type         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

-- Case-insensitive unique email (all emails stored pre-lowercased).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,      -- SHA-256 of the opaque cookie token (never store the raw token)
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,         -- ISO timestamp
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- One-time tokens for password setup (migrated first-login) and password reset.
-- id = SHA-256 of the raw token in the emailed link (raw token never stored).
CREATE TABLE IF NOT EXISTS password_tokens (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,          -- 'setup' | 'reset'
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT                     -- non-null once redeemed (single-use)
);

CREATE INDEX IF NOT EXISTS idx_password_tokens_user ON password_tokens (user_id);
