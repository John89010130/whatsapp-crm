const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aosxuumweevuupjehcst.supabase.co',
  'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk'
);

const INSTANCE_ID = '870a8e29-d5e9-43aa-a777-8aee560f6295';

async function fetchAllConversations() {
  const all = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, contact_phone, created_at')
      .eq('instance_id', INSTANCE_ID)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Erro:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    all.push(...data);
    
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return all;
}

async function cleanDuplicates() {
  console.log('=== LIMPANDO TODAS AS DUPLICATAS (v3) ===\n');
  
  // 1. Buscar todas as conversas desta instância
  const allConvs = await fetchAllConversations();
  console.log(`Total de conversas: ${allConvs.length}`);
  
  // 2. Agrupar por telefone
  const phoneToConvs = {};
  allConvs.forEach(c => {
    if (!phoneToConvs[c.contact_phone]) {
      phoneToConvs[c.contact_phone] = [];
    }
    phoneToConvs[c.contact_phone].push(c);
  });
  
  console.log(`Telefones únicos: ${Object.keys(phoneToConvs).length}`);
  
  // Contar duplicatas
  let totalDups = 0;
  for (const convs of Object.values(phoneToConvs)) {
    if (convs.length > 1) {
      totalDups += convs.length - 1;
    }
  }
  console.log(`Duplicatas a remover: ${totalDups}`);
  
  if (totalDups === 0) {
    console.log('\n✅ Nenhuma duplicata encontrada!');
    return;
  }
  
  // 3. Deletar uma por uma
  let deleted = 0;
  let movedMessages = 0;
  
  for (const [phone, convs] of Object.entries(phoneToConvs)) {
    if (convs.length <= 1) continue;
    
    const mainConv = convs[0]; // A mais antiga
    const duplicates = convs.slice(1);
    
    for (const dup of duplicates) {
      // Mover mensagens
      const { data: msgs } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', dup.id);
      
      if (msgs && msgs.length > 0) {
        await supabase
          .from('messages')
          .update({ conversation_id: mainConv.id })
          .eq('conversation_id', dup.id);
        
        movedMessages += msgs.length;
      }
      
      // Deletar conversa
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', dup.id);
      
      if (!error) {
        deleted++;
        if (deleted % 500 === 0) {
          console.log(`  Deletadas: ${deleted}...`);
        }
      } else {
        console.error(`Erro ao deletar ${dup.id}:`, error.message);
      }
    }
  }
  
  console.log(`\n✅ Resultados:`);
  console.log(`  - Conversas deletadas: ${deleted}`);
  console.log(`  - Mensagens movidas: ${movedMessages}`);
  
  // Verificar resultado
  const { count: finalConvs } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', INSTANCE_ID);
  
  const { count: finalMsgs } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Estado final:`);
  console.log(`  - Conversas: ${finalConvs}`);
  console.log(`  - Mensagens: ${finalMsgs}`);
}

cleanDuplicates().catch(console.error);
