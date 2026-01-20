import { createClient } from '@supabase/supabase-js';

const companyUrl = 'https://aosxuumweevuupjehcst.supabase.co';
const companyKey = 'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk';

const supabase = createClient(companyUrl, companyKey);

console.log('🔍 Verificando usuário no banco...\n');

async function checkUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@example.com');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Usuário não encontrado!');
    console.log('Execute: npm run test:company-db');
    return;
  }

  const user = data[0];
  console.log('✅ Usuário encontrado:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Nome: ${user.name}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Ativo: ${user.is_active}`);
  console.log(`   Password Hash: ${user.password_hash}\n`);

  // Test bcrypt
  const bcrypt = await import('bcrypt');
  const match = await bcrypt.compare('admin123', user.password_hash);
  console.log(`🔐 Senha 'admin123' match: ${match ? '✅ SIM' : '❌ NÃO'}`);
}

checkUser();
