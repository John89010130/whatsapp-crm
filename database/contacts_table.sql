-- Tabela de contatos do WhatsApp
-- Execute este SQL no Supabase da empresa (aosxuumweevuupjehcst)

-- Criar tabela de contatos
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

-- Adicionar campo is_group na tabela conversations se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'is_group'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_group BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Política para select
CREATE POLICY "Allow select for authenticated users" ON contacts
  FOR SELECT USING (true);

-- Política para insert
CREATE POLICY "Allow insert for authenticated users" ON contacts
  FOR INSERT WITH CHECK (true);

-- Política para update
CREATE POLICY "Allow update for authenticated users" ON contacts
  FOR UPDATE USING (true);

-- Política para delete
CREATE POLICY "Allow delete for authenticated users" ON contacts
  FOR DELETE USING (true);

-- Comentários
COMMENT ON TABLE contacts IS 'Contatos do WhatsApp sincronizados';
COMMENT ON COLUMN contacts.phone IS 'Número do telefone (sem @s.whatsapp.net)';
COMMENT ON COLUMN contacts.name IS 'Nome salvo na agenda do dispositivo';
COMMENT ON COLUMN contacts.whatsapp_name IS 'Nome definido pelo usuário no WhatsApp (notify/pushName)';
COMMENT ON COLUMN contacts.verified_name IS 'Nome verificado (para contas business)';
