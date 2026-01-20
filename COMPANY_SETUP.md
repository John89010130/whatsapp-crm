# 🏢 Company Database - Setup Instructions

## ✅ Credenciais Recebidas

**URL:** https://aosxuumweevuupjehcst.supabase.co
**Key:** sb_publishable_Z5H7qLSyjy1APmSUlRI3Bg_M7tVGzSk

---

## 📝 PRÓXIMOS PASSOS:

### 1. Executar Scripts SQL no Supabase

**No projeto Company Database:**

1. Vá em **SQL Editor** → **New Query**
2. Abra: `supabase/company/01_schema.sql`
3. **Copie TODO o conteúdo** e cole
4. **RUN** (F5)
5. Deve criar ~12 tabelas ✅

Depois:

6. **New Query** novamente
7. Abra: `supabase/company/02_seed.sql`
8. Copie e cole
9. **RUN**
10. Cria admin, kanban, tags e templates ✅

### 2. Desabilitar RLS (Row Level Security)

**SQL Editor** → Execute:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE automations DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
```

---

## 🧪 DEPOIS DE EXECUTAR:

### Testar Company Database:
```bash
npm run test:company-db
```

### Registrar Company no Master:
```bash
npm run register:company
```

### Iniciar todos os serviços:
```bash
npm run dev
```

---

**Me avise quando executar os scripts SQL!** 🚀
