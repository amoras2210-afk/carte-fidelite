-- Onboarding funnel tracking (sessions + events)
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  last_step INT NOT NULL DEFAULT 1 CHECK (last_step >= 1 AND last_step <= 4),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  step INT NOT NULL CHECK (step >= 1 AND step <= 4),
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_session ON onboarding_events(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_merchant ON onboarding_sessions(merchant_id);

-- Simulated SaaS metrics per merchant (MRR placeholder until billing module)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS plan_mrr_eur NUMERIC(10, 2) NOT NULL DEFAULT 49;
