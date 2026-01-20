import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../packages/backend/.env') });

const supabaseUrl = process.env.MASTER_SUPABASE_URL;
const supabaseKey = process.env.MASTER_SUPABASE_KEY;

console.log('🔍 Testando conexão Master Database...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Credenciais não encontradas no .env');
  console.error('   Verifique MASTER_SUPABASE_URL e MASTER_SUPABASE_KEY');
  process.exit(1);
}

console.log('📋 Configurações:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Verificar conexão
    console.log('1️⃣ Testando conexão básica...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('master_users')
      .select('count')
      .limit(0);
    
    if (healthError) {
      console.error('❌ Erro na conexão:', healthError.message);
      return false;
    }
    console.log('✅ Conexão estabelecida!\n');

    // Test 2: Verificar tabelas
    console.log('2️⃣ Verificando tabelas...');
    
    const { data: masters, error: mastersError } = await supabase
      .from('master_users')
      .select('*');
    
    if (mastersError) {
      console.error('❌ Erro ao buscar master_users:', mastersError.message);
      console.error('   Provavelmente você não executou o script SQL ainda.');
      return false;
    }
    
    console.log(`✅ Tabela master_users: ${masters?.length || 0} registros`);
    
    const { data: owners, error: ownersError } = await supabase
      .from('owners')
      .select('*');
    
    if (ownersError) {
      console.error('❌ Erro ao buscar owners:', ownersError.message);
      return false;
    }
    
    console.log(`✅ Tabela owners: ${owners?.length || 0} registros`);
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');
    
    if (companiesError) {
      console.error('❌ Erro ao buscar companies:', companiesError.message);
      return false;
    }
    
    console.log(`✅ Tabela companies: ${companies?.length || 0} registros\n`);

    // Test 3: Verificar dados seed
    console.log('3️⃣ Verificando dados iniciais...');
    
    if (masters && masters.length > 0) {
      console.log('✅ Master user encontrado:');
      masters.forEach(master => {
        console.log(`   - ${master.email} (${master.role})`);
      });
    } else {
      console.warn('⚠️  Nenhum master user encontrado. Execute o script 02_seed.sql');
    }
    
    if (owners && owners.length > 0) {
      console.log('✅ Owners encontrados:');
      owners.forEach(owner => {
        console.log(`   - ${owner.name} (${owner.email}) - Plano: ${owner.plan}`);
      });
    } else {
      console.warn('⚠️  Nenhum owner encontrado. Execute o script 02_seed.sql');
    }
    
    console.log('\n✨ Teste concluído com sucesso!\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Se não viu os usuários acima, execute: supabase/master/02_seed.sql');
    console.log('   2. Crie o banco Company');
    console.log('   3. Inicie os serviços com: npm run dev\n');
    
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  }
}

testConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
