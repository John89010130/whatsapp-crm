# WhatsApp CRM - Sistema de Atendimento Multicanal

[![Deploy](https://github.com/john89010130/whatsapp-crm/actions/workflows/deploy.yml/badge.svg)](https://github.com/john89010130/whatsapp-crm/actions/workflows/deploy.yml)
[![CI](https://github.com/john89010130/whatsapp-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/john89010130/whatsapp-crm/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)](https://www.typescriptlang.org)

Sistema completo de CRM para WhatsApp com interface moderna estilo WhatsApp Web, suporte a múltiplas instâncias e recursos avançados de atendimento.

🔗 **Demo**: https://john89010130.github.io/whatsapp-crm/

## 🚀 Features Principais

### Mensagens e Mídia
- ✅ **Interface estilo WhatsApp Web** - Design moderno e familiar
- ✅ **Envio de mídia completo** - Imagens, vídeos, documentos (PDF, DOC, etc)
- ✅ **Gravação de áudio** - Mensagens de voz com indicador de gravação
- ✅ **Ctrl+V para colar imagens** - Cole screenshots diretamente
- ✅ **Preview antes de enviar** - Visualize mídia antes de enviar
- ✅ **Emoji picker** - 72 emojis populares integrados
- ✅ **Upload de arquivos grandes** - Suporte até 50MB com progress feedback

### Conversas e Organização
- ✅ **Múltiplas instâncias** - Várias contas WhatsApp isoladas
- ✅ **Auto-scroll inteligente** - Detecta quando usuário está navegando no histórico
- ✅ **Botão scroll-to-bottom** - Volte ao final com um clique
- ✅ **Sincronização completa** - Histórico, contatos e grupos
- ✅ **Nomes de grupos corretos** - Import com metadados via Baileys
- ✅ **Ícones de grupo** - Diferenciação visual entre individual e grupo
- ✅ **Ordenação por última mensagem** - Conversas mais recentes no topo

### Sistema
- ✅ **Multi-instance** - Cada empresa pode ter múltiplas contas
- ✅ **WebSocket real-time** - Atualizações instantâneas
- ✅ **Base64 media storage** - Armazenamento eficiente de mídia
- ✅ **Baileys WhatsApp API** - Conexão estável e confiável
- ✅ **TypeScript full-stack** - Código tipado e seguro

## 🏗️ Arquitetura

```
📦 WhatsApp CRM
├── 📁 packages
│   ├── 📁 backend         # API REST + WebSocket (Port 3000)
│   ├── 📁 frontend        # React + Vite + Tailwind (Port 5173)
│   └── 📁 whatsapp-service # Baileys Integration (Port 3001)
└── 📁 supabase            # PostgreSQL Database
```

## � Tecnologias

### Backend
- Node.js + TypeScript
- Express.js
- WebSocket (ws)
- Baileys (WhatsApp Web API)
- Supabase Client

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons
- MediaRecorder API

### Database
- Supabase (PostgreSQL)
- Schema: conversations, messages, contacts, instances

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- Conta Supabase (gratuita)
- Git

### 1. Clone o repositório
```bash
git clone https://github.com/john89010130/whatsapp-crm.git
cd whatsapp-crm
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente

**Backend** (`packages/backend/.env`):
```env
PORT=3000
COMPANY_SUPABASE_URL=sua_url_supabase
COMPANY_SUPABASE_KEY=sua_chave_supabase
```

**Frontend** (`packages/frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

**WhatsApp Service** (`packages/whatsapp-service/.env`):
```env
PORT=3001
COMPANY_SUPABASE_URL=sua_url_supabase
COMPANY_SUPABASE_KEY=sua_chave_supabase
```

### 4. Configure o banco de dados Supabase

Execute os scripts SQL em `supabase/migrations/` na ordem numérica:
1. `001_initial_schema.sql` - Tabelas básicas
2. `002_add_features.sql` - Features adicionais

### 5. Inicie os serviços

**Terminal 1 - Backend:**
```bash
cd packages/backend
npm run dev
```

**Terminal 2 - WhatsApp Service:**
```bash
cd packages/whatsapp-service
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd packages/frontend
npm run dev
```

### 6. Acesse o sistema

Abra `http://localhost:5173` no navegador.

## 📱 Conectando uma Instância WhatsApp

1. Acesse a página de **Instâncias**
2. Clique em **Nova Instância**
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a sincronização (contatos, grupos, mensagens)

## 📖 Documentos de Referência

- [MULTIPLAS_INSTANCIAS.md](./MULTIPLAS_INSTANCIAS.md) - Como funcionam múltiplas instâncias
- [INSTALL.md](./INSTALL.md) - Guia de instalação detalhado
- [COMPANY_SETUP.md](./COMPANY_SETUP.md) - Configuração de empresas

## 🐛 Troubleshooting

### Erro "Unexpected token '<', DOCTYPE..."
- **Causa**: Body parser limit muito baixo
- **Solução**: Já configurado para 50MB em ambos serviços

### Áudio não disponível
- **Causa**: Formato webm não suportado pelo WhatsApp
- **Solução**: Use `type: 'ptt'` e mimetype `audio/ogg; codecs=opus`

### Grupos sem nome
- **Causa**: Metadados não carregados
- **Solução**: Usa `groupMetadata()` do Baileys para buscar nomes

### Upload timeout
- **Causa**: Arquivo muito grande
- **Solução**: Timeout aumentado para 120s com AbortController

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para o branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

## 👨‍💻 Autor

**Eric** - [john89010130](https://github.com/john89010130)

---

⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!
