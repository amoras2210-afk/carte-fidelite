ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS google_mail_address TEXT;

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS google_mail_refresh_token TEXT;

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS google_mail_connected_at TIMESTAMPTZ;
