import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const companyUrl = 'https://aosxuumweevuupjehcst.supabase.co';
const companyKey = 'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk';

const supabase = createClient(companyUrl, companyKey);

async function fixPassword() {
  console.log('🔧 Corrigindo senha do admin...\n');

  // Generate correct hash
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log(`Senha: ${password}`);
  console.log(`Novo hash: ${hash}\n`);

  // Update user
  const { data, error } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('email', 'admin@example.com')
    .select();

  if (error) {
    console.error('❌ Erro ao atualizar:', error);
    return;
  }

  console.log('✅ Senha atualizada com sucesso!');
  console.log(`   Usuário: ${data[0].name}`);
  console.log(`   Email: ${data[0].email}\n`);

  // Test login
  const match = await bcrypt.compare(password, hash);
  console.log(`🔐 Verificação: ${match ? '✅ OK' : '❌ ERRO'}`);
  console.log('\n✨ Tente fazer login novamente!');
}

fixPassword();
