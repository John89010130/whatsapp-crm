const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aosxuumweevuupjehcst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc3h1dW13ZWV2dXVwamVoY3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MDY4MTEsImV4cCI6MjA2MTI4MjgxMX0.bwMx14fKHT_lnWGptnGE_MBvAZhHnCIiO3lT-VEaIfU'
);

async function check() {
  // Pegar com o service key se necessário
  console.log('=== VERIFICANDO TABELAS ===');
  
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .limit(5);
  console.log('Conversations error:', convErr);
  console.log('Conversations data:', JSON.stringify(convs, null, 2));

  const { data: msgs, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .limit(5);
  console.log('Messages error:', msgErr);
  console.log('Messages data:', JSON.stringify(msgs, null, 2));
  
  const { data: insts, error: instErr } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .limit(5);
  console.log('Instances error:', instErr);
  console.log('Instances:', JSON.stringify(insts, null, 2));
}

check().catch(console.error);
