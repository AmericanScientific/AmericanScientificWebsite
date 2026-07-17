-- Adds an optional customer-entered PO number to order requests.
--
-- Apply locally:  wrangler d1 execute amsci-catalog --local  --file=db/migrations/0004_order_po.sql
-- Apply to prod:  wrangler d1 execute amsci-catalog --remote --file=db/migrations/0004_order_po.sql

ALTER TABLE orders ADD COLUMN po_number TEXT;
