-- SMS Credits + Referral System (PRODUCT_BLUEPRINT.md)
-- NOTE: blueprint me "shops" table likha hai, par actual table "users" hai.
-- Supabase SQL Editor me ye run karo (Vercel deploy par drizzle-kit push bhi ye khud laga dega):

ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_credits INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Optional: existing users ko default credits
UPDATE users SET sms_credits = 50 WHERE sms_credits IS NULL;
