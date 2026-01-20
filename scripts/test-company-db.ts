import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../packages/backend/.env') });

const companyUrl = 'https://aosxuumweevuupjehcst.supabase.co';
const companyKey = 'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk';

console.log('🔧 Configurando Company Database...\n');

const supabase = createClient(companyUrl, companyKey);

async function setupCompanyDB() {
  try {
    console.log('📋 Company Database URL:', companyUrl);
    console.log('📋 Key:', companyKey.substring(0, 20) + '...\n');

    // Test 1: Verificar se as tabelas existem
    console.log('1️⃣ Verificando tabelas...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(0);
    
    if (usersError) {
      console.error('❌ Tabelas não encontradas!');
      console.error('   Execute os scripts SQL no Supabase:');
      console.error('   1. supabase/company/01_schema.sql');
      console.error('   2. supabase/company/02_seed.sql\n');
      return false;
    }
    
    console.log('✅ Tabelas existem!\n');

    // Test 2: Contar registros
    console.log('2️⃣ Verificando dados...');
    
    const tables = [
      'users',
      'instances',
      'conversations',
      'kanban_boards',
      'kanban_columns',
      'templates',
      'tags'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: ${count || 0} registros`);
      }
    }
    
    console.log('\n3️⃣ Verificando usuário admin...');
    const { data: adminUsers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'ADMIN');
    
    if (adminUsers && adminUsers.length > 0) {
      console.log('✅ Admin encontrado:');
      adminUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    } else {
      console.warn('⚠️  Nenhum admin encontrado. Execute 02_seed.sql');
    }

    console.log('\n✨ Company Database configurado!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

setupCompanyDB()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
