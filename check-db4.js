const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aosxuumweevuupjehcst.supabase.co',
  'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk'
);

async function check() {
  // Mensagens sem conteúdo
  console.log('=== MENSAGENS COM CONTENT VAZIO ===');
  const { data: emptyMsgs } = await supabase
    .from('messages')
    .select('id, type, content, media_url, metadata')
    .or('content.is.null,content.eq.')
    .limit(20);
  
  console.log('Encontradas:', emptyMsgs?.length || 0);
  emptyMsgs?.forEach(m => {
    console.log(`- Type: ${m.type}, MediaURL: ${m.media_url || 'none'}`);
  });

  // Conversas
  console.log('\n=== TOTAL CONVERSAS ===');
  const { count: totalConvs } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });
  console.log('Total:', totalConvs);

  // Mensagens por conversa (amostra)
  console.log('\n=== MENSAGENS POR CONVERSA (top 5) ===');
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, contact_phone, contact_name')
    .limit(5);
  
  for (const conv of convs || []) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id);
    console.log(`- ${conv.contact_phone} (${conv.contact_name || 'sem nome'}): ${count} msgs`);
  }
  
  // Verificar se tem mensagens com datas estranhas
  console.log('\n=== VERIFICAR DATAS ===');
  const { data: recentMsgs } = await supabase
    .from('messages')
    .select('created_at, type, content')
    .order('created_at', { ascending: false })
    .limit(5);
    
  recentMsgs?.forEach(m => {
    console.log(`- ${m.created_at}: [${m.type}] ${(m.content || '').substring(0, 50)}`);
  });
  
  const { data: oldMsgs } = await supabase
    .from('messages')
    .select('created_at, type, content')
    .order('created_at', { ascending: true })
    .limit(5);
  
  console.log('\nMais antigas:');
  oldMsgs?.forEach(m => {
    console.log(`- ${m.created_at}: [${m.type}] ${(m.content || '').substring(0, 50)}`);
  });
}

check().catch(console.error);
