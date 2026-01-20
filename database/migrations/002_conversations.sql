-- Migração: Criar tabelas de conversas e mensagens
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Tabela de Contatos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  push_name VARCHAR(255),
  profile_picture TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, phone)
);

-- Tabela de Conversas
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED')),
  assigned_to UUID REFERENCES users(id),
  kanban_stage_id UUID,
  priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  tags TEXT[] DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, contact_id)
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL,
  from_me BOOLEAN NOT NULL,
  sender_phone VARCHAR(20),
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(20),
  media_mimetype VARCHAR(100),
  quoted_message_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'SENT' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, message_id)
);

-- Tabela de Etapas do Kanban
CREATE TABLE IF NOT EXISTS kanban_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  position INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Automações
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('NEW_CONVERSATION', 'KEYWORD', 'NO_RESPONSE', 'SCHEDULE')),
  trigger_config JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Quick Replies (Respostas Rápidas)
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  shortcut VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, shortcut)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_instance ON conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);

-- Inserir etapas padrão do Kanban
INSERT INTO kanban_stages (company_id, name, color, position, is_default) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Novos', '#3B82F6', 1, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Em Atendimento', '#F59E0B', 2, FALSE),
  ('00000000-0000-0000-0000-000000000001', 'Aguardando', '#8B5CF6', 3, FALSE),
  ('00000000-0000-0000-0000-000000000001', 'Resolvidos', '#10B981', 4, FALSE)
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para desenvolvimento
CREATE POLICY "Allow all contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all kanban_stages" ON kanban_stages FOR ALL USING (true);
CREATE POLICY "Allow all automations" ON automations FOR ALL USING (true);
CREATE POLICY "Allow all quick_replies" ON quick_replies FOR ALL USING (true);
