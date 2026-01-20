const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aosxuumweevuupjehcst.supabase.co',
  'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk'
);

const INSTANCE_ID = '870a8e29-d5e9-43aa-a777-8aee560f6295';

async function cleanDuplicates() {
  console.log('=== LIMPANDO DUPLICATAS E REORGANIZANDO ===');
  
  // 1. Buscar todas as conversas desta instância
  const { data: allConvs, error: convErr } = await supabase
    .from('conversations')
    .select('id, contact_phone, created_at')
    .eq('instance_id', INSTANCE_ID)
    .order('created_at', { ascending: true });
  
  if (convErr) {
    console.error('Erro ao buscar conversas:', convErr);
    return;
  }
  
  console.log(`Total de conversas: ${allConvs.length}`);
  
  // 2. Agrupar por telefone e identificar a primeira (para manter)
  const phoneToConvs = {};
  allConvs.forEach(c => {
    if (!phoneToConvs[c.contact_phone]) {
      phoneToConvs[c.contact_phone] = [];
    }
    phoneToConvs[c.contact_phone].push(c);
  });
  
  // 3. Para cada telefone, manter a primeira e deletar as demais
  let kept = 0;
  let deleted = 0;
  let movedMessages = 0;
  
  for (const [phone, convs] of Object.entries(phoneToConvs)) {
    const mainConv = convs[0]; // A mais antiga
    const duplicates = convs.slice(1);
    
    if (duplicates.length > 0) {
      // Mover mensagens das duplicatas para a principal
      for (const dup of duplicates) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', dup.id);
        
        if (msgs && msgs.length > 0) {
          const { error: moveErr } = await supabase
            .from('messages')
            .update({ conversation_id: mainConv.id })
            .eq('conversation_id', dup.id);
          
          if (moveErr) {
            console.error(`Erro ao mover mensagens de ${dup.id}:`, moveErr);
          } else {
            movedMessages += msgs.length;
          }
        }
        
        // Deletar conversa duplicada
        const { error: delErr } = await supabase
          .from('conversations')
          .delete()
          .eq('id', dup.id);
        
        if (delErr) {
          console.error(`Erro ao deletar conversa ${dup.id}:`, delErr);
        } else {
          deleted++;
        }
      }
    }
    kept++;
  }
  
  console.log(`\n✅ Resultados:`);
  console.log(`  - Conversas mantidas: ${kept}`);
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
