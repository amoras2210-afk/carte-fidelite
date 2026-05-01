ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_stripe_customer_id
  ON merchants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_stripe_subscription_id
  ON merchants(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
