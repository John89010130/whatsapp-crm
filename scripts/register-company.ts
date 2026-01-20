import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../packages/backend/.env') });

const masterUrl = process.env.MASTER_SUPABASE_URL!;
const masterKey = process.env.MASTER_SUPABASE_KEY!;

const companyUrl = 'https://aosxuumweevuupjehcst.supabase.co';
const companyKey = 'sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk';
const companyName = 'Empresa Teste';

console.log('📝 Registrando Company no Master Database...\n');

const masterSupabase = createClient(masterUrl, masterKey);

async function registerCompany() {
  try {
    // Get owner ID
    console.log('1️⃣ Buscando Owner...');
    const { data: owners } = await masterSupabase
      .from('owners')
      .select('*')
      .eq('email', 'owner@example.com')
      .limit(1);
    
    if (!owners || owners.length === 0) {
      console.error('❌ Owner não encontrado!');
      return false;
    }
    
    const owner = owners[0];
    console.log(`✅ Owner encontrado: ${owner.name} (${owner.email})\n`);

    // Check if company already exists
    console.log('2️⃣ Verificando se company já existe...');
    const { data: existing } = await masterSupabase
      .from('companies')
      .select('*')
      .eq('name', companyName)
      .eq('owner_id', owner.id);
    
    if (existing && existing.length > 0) {
      console.log('⚠️  Company já existe!');
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Nome: ${existing[0].name}`);
      console.log(`   Status: ${existing[0].is_active ? 'Ativa' : 'Inativa'}\n`);
      return true;
    }

    // Insert company
    console.log('3️⃣ Cadastrando company...');
    const { data: company, error } = await masterSupabase
      .from('companies')
      .insert({
        owner_id: owner.id,
        name: companyName,
        supabase_url: companyUrl,
        supabase_key: companyKey,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao cadastrar:', error.message);
      return false;
    }
    
    console.log('✅ Company cadastrada com sucesso!');
    console.log(`   ID: ${company.id}`);
    console.log(`   Nome: ${company.name}`);
    console.log(`   Owner: ${owner.name}\n`);

    // List all companies
    console.log('4️⃣ Empresas do Owner:');
    const { data: allCompanies } = await masterSupabase
      .from('companies')
      .select('*')
      .eq('owner_id', owner.id);
    
    allCompanies?.forEach(c => {
      console.log(`   - ${c.name} (${c.is_active ? 'Ativa' : 'Inativa'})`);
    });

    console.log('\n✨ Cadastro concluído!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

registerCompany()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
