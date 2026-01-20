const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aosxuumweevuupjehcst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc3h1dW13ZWV2dXVwamVoY3N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTcwNjgxMSwiZXhwIjoyMDYxMjgyODExfQ.gfhv_6kvolMurdvMsuxRmFhps9SzXwwIcEOcuS_7Tp8'
);

async function alterTable() {
  console.log('🔧 Atualizando schema do banco...\n');

  // Verificar se coluna is_group existe
  const { data: cols } = await supabase.rpc('run_sql', {
    sql: `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'is_group';
    `
  });
  
  if (!cols || cols.length === 0) {
    console.log('Adicionando coluna is_group...');
    await supabase.rpc('run_sql', {
      sql: `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;`
    });
    console.log('✅ Coluna is_group adicionada');
  } else {
    console.log('✅ Coluna is_group já existe');
  }

  // Criar índice único para evitar duplicatas
  console.log('\nCriando índice único para instance_id + contact_phone...');
  try {
    await supabase.rpc('run_sql', {
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS conversations_instance_phone_idx 
        ON conversations(instance_id, contact_phone);
      `
    });
    console.log('✅ Índice criado');
  } catch (e) {
    console.log('Índice pode já existir:', e.message);
  }

  console.log('\n✅ Schema atualizado!');
}

alterTable().catch(console.error);
