// Script para garantir que as tabelas necessárias existem
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './packages/backend/.env' });

const supabaseUrl = process.env.COMPANY_SUPABASE_URL;
const supabaseKey = process.env.COMPANY_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('🔧 Verificando schema do banco...\n');

  // 1. Verificar se tabela contacts existe
  console.log('1. Verificando tabela contacts...');
  const { data: contactsCheck, error: contactsErr } = await supabase
    .from('contacts')
    .select('id')
    .limit(1);
  
  if (contactsErr) {
    console.log('   ❌ Tabela contacts não existe ou erro:', contactsErr.message);
    console.log('   ⚠️  Por favor, execute o SQL em database/contacts_table.sql no Supabase');
  } else {
    console.log('   ✅ Tabela contacts OK');
  }

  // 2. Verificar se coluna is_group existe em conversations
  console.log('\n2. Verificando coluna is_group em conversations...');
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('is_group')
    .limit(1);
  
  if (convErr && convErr.message.includes('is_group')) {
    console.log('   ❌ Coluna is_group não existe');
    console.log('   ⚠️  Execute: ALTER TABLE conversations ADD COLUMN is_group BOOLEAN DEFAULT false;');
  } else {
    console.log('   ✅ Coluna is_group OK');
  }

  // 3. Verificar se coluna sender_phone existe em messages
  console.log('\n3. Verificando coluna sender_phone em messages...');
  const { data: msgs, error: msgErr } = await supabase
    .from('messages')
    .select('sender_phone')
    .limit(1);
  
  if (msgErr && msgErr.message.includes('sender_phone')) {
    console.log('   ❌ Coluna sender_phone não existe');
    console.log('   ⚠️  Execute: ALTER TABLE messages ADD COLUMN sender_phone VARCHAR(20);');
  } else {
    console.log('   ✅ Coluna sender_phone OK');
  }

  console.log('\n✅ Verificação concluída!');
}

runMigrations().catch(console.error);
