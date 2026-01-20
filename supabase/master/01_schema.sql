-- ==============================================
-- MASTER DATABASE SCHEMA
-- ==============================================

-- Master Users (MASTER role)
CREATE TABLE master_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'MASTER' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owners (OWNER role)
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'OWNER' NOT NULL,
  master_id UUID REFERENCES master_users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'FREE' NOT NULL,
  plan_limits JSONB DEFAULT '{
    "max_companies": 1,
    "max_instances_per_company": 1,
    "max_attendants_per_company": 2,
    "max_conversations_per_month": 100,
    "has_automations": false,
    "has_analytics": false,
    "has_webhooks": false
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies (cada empresa tem seu próprio Supabase)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  supabase_url VARCHAR(500) NOT NULL,
  supabase_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_owners_master_id ON owners(master_id);
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_owners_email ON owners(email);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_master_users_updated_at
  BEFORE UPDATE ON master_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at
  BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE master_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies (configurar conforme necessário)
CREATE POLICY "Masters can view all" ON master_users FOR SELECT USING (true);
CREATE POLICY "Owners can view own data" ON owners FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owners can view own companies" ON companies FOR SELECT USING (owner_id = auth.uid());
