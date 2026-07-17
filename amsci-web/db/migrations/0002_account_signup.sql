-- Adds self-service signup fields to the users table.
--
-- Apply locally:  wrangler d1 execute amsci-catalog --local  --file=db/migrations/0002_account_signup.sql
-- Apply to prod:  wrangler d1 execute amsci-catalog --remote --file=db/migrations/0002_account_signup.sql
--
-- These capture the lead details the old Gravity Forms signup emailed to Sales
-- (company, phone, address, Educator/Distributor). They're informational for the
-- human who approves the account and sets the real NetSuite price tier.
-- Remote D1 rejects BEGIN/COMMIT in --file scripts, so none here.

ALTER TABLE users ADD COLUMN company TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN account_type TEXT;
