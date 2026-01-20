const { createClient } = require('@supabase/supabase-js');

// Usando a chave do arquivo .env
const supabase = createClient(
  'https://aosxuumweevuupjehcst.supabase.co',
  'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk'
);

async function check() {
  console.log('=== VERIFICANDO TABELAS ===');
  
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .limit(5);
  console.log('Conversations error:', convErr);
  console.log('Conversations:', convs?.length || 0, 'registros');
  if (convs?.length) {
    console.log(JSON.stringify(convs[0], null, 2));
  }

  const { data: msgs, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .limit(10);
  console.log('\nMessages error:', msgErr);
  console.log('Messages:', msgs?.length || 0, 'registros');
  if (msgs?.length) {
    msgs.forEach((m, i) => {
      console.log(`\n[${i+1}] Type: ${m.type}, Direction: ${m.direction}`);
      console.log(`    Content: ${m.content?.substring(0, 100) || 'empty'}`);
    });
  }
  
  // Contagem por tipo
  console.log('\n=== CONTAGEM POR TIPO ===');
  const { data: allMsgs } = await supabase
    .from('messages')
    .select('type, direction');
  
  const counts = {};
  allMsgs?.forEach(m => {
    counts[m.type] = (counts[m.type] || 0) + 1;
  });
  console.log(counts);
  console.log('Total:', allMsgs?.length || 0);
}

check().catch(console.error);
