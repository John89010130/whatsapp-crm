const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aosxuumweevuupjehcst.supabase.co',
  'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk'
);

async function check() {
  console.log('=== VERIFICAR DUPLICATAS ===');
  
  // Buscar conversas duplicadas por phone
  const { data: allConvs } = await supabase
    .from('conversations')
    .select('contact_phone, instance_id')
    .eq('instance_id', '870a8e29-d5e9-43aa-a777-8aee560f6295');
  
  const counts = {};
  allConvs?.forEach(c => {
    const key = `${c.instance_id}:${c.contact_phone}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  
  // Mostrar apenas duplicatas
  const duplicates = Object.entries(counts).filter(([k, v]) => v > 1);
  console.log('Duplicatas encontradas:', duplicates.length);
  duplicates.slice(0, 10).forEach(([phone, count]) => {
    console.log(`  - ${phone}: ${count}x`);
  });
  
  // Total
  console.log('\nTotal conversas:', allConvs?.length || 0);
  console.log('Únicas:', Object.keys(counts).length);
  
  // Verificar mensagens por conversa
  console.log('\n=== MENSAGENS POR CONVERSA (sample) ===');
  const { data: sampleConvs } = await supabase
    .from('conversations')
    .select('id, contact_phone')
    .eq('instance_id', '870a8e29-d5e9-43aa-a777-8aee560f6295')
    .limit(10);
  
  for (const conv of sampleConvs || []) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id);
    console.log(`  - ${conv.contact_phone}: ${count} msgs`);
  }
}

check().catch(console.error);
