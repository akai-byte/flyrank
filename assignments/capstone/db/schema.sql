CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS widgets (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('signup','cta','popover')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  fields JSONB NOT NULL DEFAULT '[]',
  button_text TEXT NOT NULL DEFAULT 'Submit',
  display_options JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY,
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  ip INET,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widgets_tenant ON widgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_time ON submissions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_widget_time ON submissions(widget_id, created_at DESC);

INSERT INTO tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Tenant A')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, email, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'owner@example.com',
  'demo-password'
)
ON CONFLICT DO NOTHING;

INSERT INTO widgets (id, tenant_id, type, title, description, fields, button_text)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'signup',
  'Get updates',
  'Join our mailing list.',
  '[{"name":"name","label":"Name","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true}]',
  'Sign up'
)
ON CONFLICT DO NOTHING;
