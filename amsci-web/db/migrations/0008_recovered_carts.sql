-- Carts recovered from the old WooCommerce site after the headless cutover.
--
-- WooCommerce kept a logged-in customer's cart in wp_usermeta under
-- _woocommerce_persistent_cart_1. The new storefront keeps the cart in the
-- browser (localStorage "amsci-cart-v1"), so there was nowhere server-side to
-- put the recovered data. This table is that landing spot: one row per
-- recovered cart, redeemed through an emailed link at /cart/restore?token=.
--
-- `id` is the SHA-256 of the raw token, never the token itself, mirroring
-- password_tokens -- a database read cannot mint a working link.
--
-- Deliberately NOT single-use, unlike password_tokens. Corporate mail gateways
-- routinely pre-fetch links to scan them, which would silently redeem a
-- single-use token before the customer ever clicked, and their cart would be
-- gone for good. The link carries no authentication and restoring is
-- idempotent, so reuse until expiry is the safer trade.
--
-- No BEGIN/COMMIT: remote D1 rejects transaction statements in --file SQL.

CREATE TABLE IF NOT EXISTS recovered_carts (
  id            TEXT PRIMARY KEY,            -- SHA-256 of the raw token
  user_id       INTEGER,                     -- NULL when no new-site account matched
  email         TEXT NOT NULL,
  items         TEXT NOT NULL,               -- JSON: CartItem[] ({sku,title,imageUrl,qty})
  unavailable   TEXT NOT NULL DEFAULT '[]',  -- JSON: [{sku,title,qty}] no longer in the catalog
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  first_used_at TEXT,                        -- stamped on first successful redemption
  use_count     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recovered_carts_email ON recovered_carts (email);
CREATE INDEX IF NOT EXISTS idx_recovered_carts_user ON recovered_carts (user_id);
