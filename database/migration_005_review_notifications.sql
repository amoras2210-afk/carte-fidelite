CREATE TABLE IF NOT EXISTS delayed_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  send_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE (client_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_delayed_notifications_due
  ON delayed_notifications(status, send_at);

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS review_url TEXT;

