const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './packages/backend/.env' });

const supabase = createClient(process.env.COMPANY_SUPABASE_URL, process.env.COMPANY_SUPABASE_KEY);

async function clean() {
  console.log('🗑️ Limpando mensagens, conversas e contatos...\n');
  
  // 1. Deletar mensagens
  const { error: msgErr, count: msgCount } = await supabase
    .from('messages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (msgErr) console.log('❌ Erro messages:', msgErr.message);
  else console.log('✅ Mensagens deletadas');
  
  // 2. Deletar conversas
  const { error: convErr } = await supabase
    .from('conversations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (convErr) console.log('❌ Erro conversations:', convErr.message);
  else console.log('✅ Conversas deletadas');
  
  // 3. Deletar contatos
  const { error: contErr } = await supabase
    .from('contacts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (contErr) console.log('❌ Erro contacts:', contErr.message);
  else console.log('✅ Contatos deletados');
  
  console.log('\n✅ Limpeza concluída! Pronto para novo teste.');
}

clean().catch(console.error);
