# 🎯 CONFIGURAÇÃO SUPABASE - GUIA RÁPIDO

## ✅ Master Database Configurado

**URL:** https://yflnoiecbrsfsbqvgpiy.supabase.co

---

## 📋 PRÓXIMO PASSO: Criar Company Database

### 1. Criar novo projeto Supabase

1. Volte para https://supabase.com
2. Clique em **"New project"**
3. Configurações:
   - **Name**: `whatsapp-crm-company-teste`
   - **Database Password**: (pode ser a mesma ou outra)
   - **Region**: South America (mesma do Master)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos

---

### 2. Executar Scripts SQL (Company)

Quando pronto:

1. **SQL Editor** → **New Query**
2. Abra: `supabase/company/01_schema.sql`
3. Copie TODO o conteúdo
4. Cole e **RUN**
5. Deve criar todas as tabelas ✅

Depois:

6. **New Query** novamente
7. Abra: `supabase/company/02_seed.sql`
8. Copie e cole
9. **RUN**
10. Cria usuário admin padrão ✅

---

### 3. Pegar Credenciais da Company

1. **Settings** → **API**
2. Copie:
   - **Project URL**
   - **anon/public key**

---

### 4. Cadastrar no Master

Depois vamos cadastrar essa company no banco Master para vincular ao Owner.

---

## 🚀 Quando estiver pronto

Me envie as credenciais da Company:
```
COMPANY_SUPABASE_URL=https://xxxxx.supabase.co
COMPANY_SUPABASE_KEY=eyJhbGci...
```

Aí vamos:
- Cadastrar no Master
- Testar login
- Iniciar os serviços
- Conectar primeira instância WhatsApp! 📱
