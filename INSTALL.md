# WhatsApp CRM - Guia de Instalação

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase
- Chrome (para extensão)

## 🚀 Instalação

### 1. Clone e instale dependências

```bash
cd c:\Users\TID-ERIC\Desktop\VisualCode\WhatsApp
npm install
```

### 2. Configure o Supabase

#### Banco Master (Central)
1. Crie um projeto Supabase para o Master
2. Execute os scripts em `supabase/master/`
3. Copie a URL e chave anon

#### Banco por Empresa
1. Para cada empresa, crie um novo projeto Supabase
2. Execute os scripts em `supabase/company/`
3. Guarde as credenciais

### 3. Configure as variáveis de ambiente

Copie os arquivos `.env.example` para `.env` em cada package:

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env

# WhatsApp Service
cp packages/whatsapp-service/.env.example packages/whatsapp-service/.env
```

Edite cada `.env` com suas credenciais.

### 4. Build dos packages shared

```bash
cd packages/shared
npm run build
cd ../..
```

### 5. Inicie os serviços

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

Terminal 3 - WhatsApp Service:
```bash
npm run dev:whatsapp
```

Ou todos de uma vez:
```bash
npm run dev
```

### 6. Extensão Chrome

```bash
cd packages/extension
npm run build
```

1. Abra Chrome em `chrome://extensions`
2. Ative "Modo desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `packages/extension/dist`

## 🔑 Credenciais Padrão

**Master:**
- Email: `master@whatsappcrm.com`
- Senha: `admin123`

**Owner (exemplo):**
- Email: `owner@example.com`
- Senha: `admin123`

**Admin (por empresa):**
- Email: `admin@example.com`
- Senha: `admin123`

⚠️ **IMPORTANTE**: Altere todas as senhas após o primeiro login!

## 🌐 URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WhatsApp Service: http://localhost:3001

## 📦 Estrutura de Portas

- 3000: Backend API
- 3001: WhatsApp Service
- 5173: Frontend (Vite)

## 🔍 Verificação

Teste se tudo está funcionando:

```bash
# Backend
curl http://localhost:3000/health

# WhatsApp Service
curl http://localhost:3001/health
```

## 🐛 Problemas Comuns

### Erro de conexão Supabase
- Verifique se as URLs e chaves estão corretas no `.env`
- Confirme que executou os scripts SQL

### Porta já em uso
- Altere as portas nos arquivos `.env`
- Feche outros serviços usando as mesmas portas

### Erro ao instalar dependências
```bash
# Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

## 📚 Próximos Passos

1. Configure seu primeiro Owner no Master
2. Crie uma empresa e configure o Supabase dela
3. Conecte uma instância WhatsApp
4. Configure os Kanbans e automações

## 🤝 Suporte

Para dúvidas ou problemas, consulte a documentação completa ou entre em contato.
