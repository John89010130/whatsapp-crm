-- ============================================
-- MIGRAÇÃO COMPLETA PARA SISTEMA DE MENSAGENS
-- Execute este SQL no Supabase: https://supabase.com/dashboard
-- Database: aosxuumweevuupjehcst
-- ============================================

-- 1. CRIAR TABELA DE CONTATOS
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  phone VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  whatsapp_name VARCHAR(255),
  verified_name VARCHAR(255),
  profile_picture_url TEXT,
  email VARCHAR(255),
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índice único para evitar duplicatas
  UNIQUE(instance_id, phone)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contacts_instance_id ON contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);

-- Habilitar RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Políticas para contacts
DROP POLICY IF EXISTS "Allow select for authenticated users" ON contacts;
CREATE POLICY "Allow select for authenticated users" ON contacts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON contacts;
CREATE POLICY "Allow insert for authenticated users" ON contacts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON contacts;
CREATE POLICY "Allow update for authenticated users" ON contacts
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON contacts;
CREATE POLICY "Allow delete for authenticated users" ON contacts
  FOR DELETE USING (true);

-- 2. ADICIONAR COLUNA is_group EM CONVERSATIONS
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'is_group'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_group BOOLEAN DEFAULT false;
    RAISE NOTICE 'Coluna is_group adicionada em conversations';
  ELSE
    RAISE NOTICE 'Coluna is_group já existe em conversations';
  END IF;
END $$;

-- 3. ADICIONAR COLUNA sender_phone EM MESSAGES
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'sender_phone'
  ) THEN
    ALTER TABLE messages ADD COLUMN sender_phone VARCHAR(50);
    RAISE NOTICE 'Coluna sender_phone adicionada em messages';
  ELSE
    RAISE NOTICE 'Coluna sender_phone já existe em messages';
  END IF;
END $$;

-- 4. ADICIONAR ÍNDICE PARA sender_phone
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_sender_phone ON messages(sender_phone);

-- 5. ATUALIZAR is_group PARA CONVERSAS DE GRUPO EXISTENTES
-- ============================================
UPDATE conversations 
SET is_group = true 
WHERE contact_phone LIKE '%@g.us' 
  AND (is_group IS NULL OR is_group = false);

-- 6. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE contacts IS 'Contatos do WhatsApp sincronizados';
COMMENT ON COLUMN contacts.phone IS 'Número do telefone (sem @s.whatsapp.net)';
COMMENT ON COLUMN contacts.whatsapp_name IS 'Nome definido pelo usuário no WhatsApp (pushName)';
COMMENT ON COLUMN conversations.is_group IS 'Indica se é uma conversa de grupo';
COMMENT ON COLUMN messages.sender_phone IS 'Telefone do remetente (útil em grupos)';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
SELECT 'Migração concluída com sucesso!' as status;
