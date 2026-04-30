ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS auto_email_inactive_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS auto_email_inactive_days INT NOT NULL DEFAULT 30 CHECK (auto_email_inactive_days BETWEEN 1 AND 365);

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS auto_email_birthday_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS auto_email_reward_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS automation_email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  automation_type TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_email_logs_client_sent
  ON automation_email_logs(merchant_id, client_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_email_logs_type_created
  ON automation_email_logs(merchant_id, automation_type, created_at DESC);
