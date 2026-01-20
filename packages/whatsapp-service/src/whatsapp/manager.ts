import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  WAMessage,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  proto,
  downloadMediaMessage,
  getContentType
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { createClient } from '@supabase/supabase-js';

const companySupabase = createClient(
  process.env.COMPANY_SUPABASE_URL!,
  process.env.COMPANY_SUPABASE_KEY!
);

export interface WhatsAppInstance {
  id: string;
  socket: WASocket | null;
  qrCode: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  phoneNumber?: string;
  pairingCode?: string;
  retryCount: number;
}

export interface SyncProgress {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  totalMessages: number;
  processedMessages: number;
  totalConversations: number;
  processedConversations: number;
  currentConversation?: string;
  startedAt?: Date;
  completedAt?: Date;
  mediaDownloaded: number;
  mediaFailed: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class WhatsAppManager {
  private instances: Map<string, WhatsAppInstance> = new Map();
  private syncProgress: Map<string, SyncProgress> = new Map();
  private logger = P({ level: 'silent' });

  async createInstance(instanceId: string, phoneNumber?: string): Promise<WhatsAppInstance> {
    if (this.instances.has(instanceId)) {
      const existing = this.instances.get(instanceId)!;
      if (existing.socket) {
        try {
          existing.socket.end(undefined);
        } catch (e) {
          // ignore
        }
      }
      this.instances.delete(instanceId);
    }

    // Inicializar progresso
    this.syncProgress.set(instanceId, {
      status: 'idle',
      totalMessages: 0,
      processedMessages: 0,
      totalConversations: 0,
      processedConversations: 0,
      mediaDownloaded: 0,
      mediaFailed: 0
    });

    const instance: WhatsAppInstance = {
      id: instanceId,
      socket: null,
      qrCode: null,
      status: 'disconnected',
      retryCount: 0
    };

    this.instances.set(instanceId, instance);
    await this.connectInstance(instanceId, phoneNumber);

    return instance;
  }

  async connectInstance(instanceId: string, phoneNumber?: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const sessionPath = path.join(config.sessionsPath, instanceId);
    
    // NÃO deletar a sessão se já existe - isso permite reconexão
    // Só deletar se for uma nova conexão (sem creds)
    const credsPath = path.join(sessionPath, 'creds.json');
    if (!fs.existsSync(credsPath)) {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      console.log('[' + instanceId + '] Nova sessao');
    } else {
      console.log('[' + instanceId + '] Sessao existente encontrada');
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    instance.status = 'connecting';
    
    await companySupabase
      .from('instances')
      .update({ status: 'CONNECTING', qr_code: null })
      .eq('id', instanceId);

    console.log('[' + instanceId + '] Iniciando conexao...');

    // Buscar versão mais recente do WhatsApp Web
    const { version } = await fetchLatestBaileysVersion();
    console.log('[' + instanceId + '] Versao WhatsApp:', version.join('.'));

    // Store simples para mensagens (necessário para getMessage)
    const messageStore: { [key: string]: proto.IWebMessageInfo } = {};

    const socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger)
      },
      version,
      logger: this.logger,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: true, // Habilita sincronização de histórico completo
      fireInitQueries: true, // Dispara queries iniciais
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      qrTimeout: 60000,
      defaultQueryTimeoutMs: 60000,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        // Retorna mensagem do store se existir
        if (key.id && messageStore[key.id]) {
          return messageStore[key.id].message || undefined;
        }
        return proto.Message.fromObject({});
      }
    });

    instance.socket = socket;

    // Se foi fornecido número de telefone, usar pairing code
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      console.log('[' + instanceId + '] Solicitando pairing code para:', cleanPhone);
      
      setTimeout(async () => {
        try {
          const code = await socket.requestPairingCode(cleanPhone);
          instance.pairingCode = code;
          console.log('[' + instanceId + '] PAIRING CODE:', code);
          
          await companySupabase
            .from('instances')
            .update({ 
              status: 'CONNECTING',
              qr_code: 'PAIRING:' + code
            })
            .eq('id', instanceId);
        } catch (err) {
          console.error('[' + instanceId + '] Erro ao solicitar pairing code:', err);
        }
      }, 3000);
    }

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log('[' + instanceId + '] connection.update: connection=' + connection + ', hasQR=' + !!qr);

      if (qr) {
        console.log('[' + instanceId + '] QR CODE RECEBIDO!');
        try {
          instance.qrCode = await QRCode.toDataURL(qr);
          instance.status = 'qr';
          
          const result = await companySupabase
            .from('instances')
            .update({ 
              status: 'CONNECTING',
              qr_code: instance.qrCode 
            })
            .eq('id', instanceId);
            
          if (result.error) {
            console.error('[' + instanceId + '] Erro ao salvar QR:', result.error.message);
          } else {
            console.log('[' + instanceId + '] QR salvo no banco!');
          }
        } catch (err) {
          console.error('[' + instanceId + '] Erro ao processar QR:', err);
        }
      }

      if (connection === 'close') {
        const boom = lastDisconnect?.error as Boom;
        const statusCode = boom?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;
        
        console.log('[' + instanceId + '] Conexao fechada (codigo: ' + statusCode + ', reconectar: ' + shouldReconnect + ')');
        
        // Se foi erro 401 (sessão inválida), limpar sessão
        if (statusCode === 401) {
          console.log('[' + instanceId + '] Sessao invalida (401), limpando...');
          const sessionPath = path.join(config.sessionsPath, instanceId);
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('[' + instanceId + '] Sessao corrompida removida');
          }
        }
        
        // Se foi logout ou erro grave, marcar como desconectado
        if (!shouldReconnect || instance.retryCount >= 3) {
          instance.status = 'disconnected';
          instance.qrCode = null;
          instance.retryCount = 0;
          
          await companySupabase
            .from('instances')
            .update({ 
              status: 'DISCONNECTED',
              qr_code: null
            })
            .eq('id', instanceId);
        } else {
          // Tentar reconectar automaticamente após 5 segundos
          instance.retryCount++;
          console.log('[' + instanceId + '] Tentando reconectar em 5s... (tentativa ' + instance.retryCount + ')');
          
          await delay(5000);
          
          if (instance.retryCount <= 3) {
            try {
              await this.connectInstance(instanceId);
            } catch (err) {
              console.error('[' + instanceId + '] Erro na reconexao:', err);
            }
          }
        }
          
      } else if (connection === 'open') {
        console.log('[' + instanceId + '] ✅ CONECTADO COM SUCESSO!');
        instance.status = 'connected';
        instance.qrCode = null;
        instance.retryCount = 0;
        
        const userId = socket.user?.id;
        instance.phoneNumber = userId ? userId.split(':')[0] : undefined;
        
        console.log('[' + instanceId + '] Telefone:', instance.phoneNumber);
        
        await companySupabase
          .from('instances')
          .update({ 
            status: 'CONNECTED',
            qr_code: null,
            phone_number: instance.phoneNumber,
            last_connected_at: new Date().toISOString()
          })
          .eq('id', instanceId);
      }
    });

    socket.ev.on('creds.update', saveCreds);

    // Handler para mensagens em tempo real
    socket.ev.on('messages.upsert', async (m) => {
      console.log(`[${instanceId}] 📨 messages.upsert: type=${m.type}, count=${m.messages.length}`);
      
      // Armazenar no store para getMessage
      for (const msg of m.messages) {
        if (msg.key.id) {
          messageStore[msg.key.id] = msg;
        }
      }
      
      // Processar mensagens
      if (m.type === 'notify' || m.type === 'append') {
        for (const message of m.messages) {
          await this.handleMessage(instanceId, message, m.type === 'append');
        }
      }
    });

    // Handler para sincronização de histórico (mensagens antigas)
    socket.ev.on('messages.set', async ({ messages, isLatest }) => {
      console.log(`[${instanceId}] 📥 messages.set: ${messages.length} mensagens (isLatest: ${isLatest})`);
      
      // Processar mensagens em lotes para não sobrecarregar
      const batchSize = 50;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        await Promise.all(batch.map(msg => this.handleMessage(instanceId, msg, true)));
        console.log(`[${instanceId}] Histórico: processadas ${Math.min(i + batchSize, messages.length)}/${messages.length} mensagens`);
      }
      
      console.log(`[${instanceId}] ✅ Sincronização de histórico concluída!`);
    });

    // Handler para histórico de conversas (Baileys 7+)
    socket.ev.on('messaging-history.set', async (data: any) => {
      const { chats, contacts, messages, isLatest } = data;
      console.log(`[${instanceId}] 📜 messaging-history.set: ${messages?.length || 0} mensagens, ${chats?.length || 0} chats, ${contacts?.length || 0} contatos`);
      
      // 1. Primeiro, salvar todos os contatos
      if (contacts && Object.keys(contacts).length > 0) {
        await this.saveContacts(instanceId, contacts);
      }
      
      // 2. Depois, processar os chats (conversas)
      if (chats && chats.length > 0) {
        await this.processChats(instanceId, chats);
      }
      
      // 3. Por último, processar mensagens agrupadas por conversa
      if (messages && messages.length > 0) {
        await this.processHistoryMessages(instanceId, messages);
      }
    });

    // Handler para chats (lista de conversas)
    socket.ev.on('chats.set', async (chats: any) => {
      console.log(`[${instanceId}] 💬 chats.set: ${chats?.length || 0} chats recebidos`);
      if (chats && chats.length > 0) {
        await this.processChats(instanceId, chats);
      }
    });

    // Handler para contatos
    socket.ev.on('contacts.set', async (contacts: any) => {
      console.log(`[${instanceId}] 👤 contacts.set: ${contacts?.length || 0} contatos recebidos`);
      if (contacts && Object.keys(contacts).length > 0) {
        await this.saveContacts(instanceId, contacts);
      }
    });

    // Handler para atualizações individuais de contatos
    socket.ev.on('contacts.update', async (updates: any[]) => {
      if (updates && updates.length > 0) {
        const contactsObj: any = {};
        for (const update of updates) {
          if (update.id) {
            contactsObj[update.id] = update;
          }
        }
        await this.saveContacts(instanceId, contactsObj);
      }
    });

    // Handler para atualizações de chats
    socket.ev.on('chats.update', async (updates: any[]) => {
      if (updates && updates.length > 0) {
        await this.processChats(instanceId, updates);
      }
    });
  }

  // Salvar contatos do WhatsApp
  private async saveContacts(instanceId: string, contacts: any): Promise<void> {
    try {
      const contactList = Array.isArray(contacts) ? contacts : Object.values(contacts);
      console.log(`[${instanceId}] 💾 Processando ${contactList.length} contatos...`);
      
      let saved = 0;
      for (const contact of contactList) {
        const jid = contact.id || contact.jid;
        if (!jid || jid.includes('g.us') || jid.includes('broadcast') || jid === 'status@broadcast') {
          continue; // Pular grupos e broadcasts
        }
        
        const phone = jid.split('@')[0];
        // Buscar nome em múltiplas propriedades
        const name = contact.name || contact.notify || contact.verifiedName || contact.pushName || contact.vname || null;
        
        console.log(`[${instanceId}] 👤 Contato ${phone}: nome="${name}", notify="${contact.notify}", pushName="${contact.pushName}"`);
        
        // Salvar mesmo sem nome - será atualizado depois se vier o nome
        try {
          await companySupabase
            .from('contacts')
            .upsert({
              instance_id: instanceId,
              phone: phone,
              name: name || phone, // Usar phone se não tiver nome
              whatsapp_name: contact.notify || contact.pushName || null,
              verified_name: contact.verifiedName || null,
              profile_picture_url: contact.imgUrl || null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'instance_id,phone'
            });
          saved++;
        } catch (err) {
          console.error(`[${instanceId}] ❌ Erro ao salvar contato ${phone}:`, err);
        }
      }
      
      console.log(`[${instanceId}] ✅ ${saved} contatos processados`);
    } catch (error) {
      console.error(`[${instanceId}] ❌ Erro ao salvar contatos:`, error);
    }
  }

  // Processar chats (conversas)
  private async processChats(instanceId: string, chats: any[]): Promise<void> {
    try {
      console.log(`[${instanceId}] 💬 Processando ${chats.length} chats...`);
      
      const instance = this.instances.get(instanceId);
      
      let processed = 0;
      for (const chat of chats) {
        const jid = chat.id || chat.jid;
        if (!jid) continue;
        
        // Pular broadcasts
        if (jid === 'status@broadcast' || jid.includes('broadcast')) {
          continue;
        }
        
        const phone = jid.split('@')[0];
        const isGroup = jid.includes('g.us');
        
        // Buscar nome do contato/grupo
        let contactName = chat.name || chat.notify || null;
        
        // Para grupos, tentar buscar o metadata do grupo para obter o nome real
        if (isGroup && instance?.socket) {
          try {
            // Primeiro tentar do chat
            if (chat.subject) {
              contactName = chat.subject;
            } else if (!contactName) {
              // Tentar buscar metadata do grupo
              const groupMeta = await instance.socket.groupMetadata(jid).catch(() => null);
              if (groupMeta?.subject) {
                contactName = groupMeta.subject;
                console.log(`[${instanceId}] 👥 Grupo ${phone}: "${contactName}"`);
              }
            }
          } catch (e) {
            // Ignorar erro ao buscar metadata
          }
        }
        
        if (!contactName && !isGroup) {
          const { data: savedContact } = await companySupabase
            .from('contacts')
            .select('name')
            .eq('instance_id', instanceId)
            .eq('phone', phone)
            .single();
          
          if (savedContact?.name) {
            contactName = savedContact.name;
          }
        }
        
        // Verificar se conversa existe (usando limit para evitar erro com duplicatas)
        const { data: existingConvs } = await companySupabase
          .from('conversations')
          .select('id, contact_name, unread_count')
          .eq('instance_id', instanceId)
          .eq('contact_phone', phone)
          .order('created_at', { ascending: true })
          .limit(1);
        
        const existingConv = existingConvs?.[0] || null;
        
        const unreadCount = chat.unreadCount || 0;
        
        // Converter timestamp corretamente
        let lastMessageTime = new Date().toISOString();
        if (chat.conversationTimestamp) {
          const ts = chat.conversationTimestamp;
          let tsNum: number;
          if (typeof ts === 'object' && ts !== null && 'low' in ts && 'high' in ts) {
            tsNum = ((ts as any).high >>> 0) * 0x100000000 + ((ts as any).low >>> 0);
          } else if (typeof ts === 'bigint') {
            tsNum = Number(ts);
          } else {
            tsNum = Number(ts);
          }
          if (tsNum && !isNaN(tsNum)) {
            // Verificar se é em segundos
            if (tsNum < 946684800000) tsNum = tsNum * 1000;
            const testDate = new Date(tsNum);
            if (testDate.getFullYear() >= 2000 && testDate.getFullYear() <= 2100) {
              lastMessageTime = testDate.toISOString();
            }
          }
        }
        
        if (existingConv) {
          // Atualizar conversa existente
          const updates: any = {
            updated_at: new Date().toISOString()
          };
          
          // Atualizar nome se veio do chat e não tinha
          if (contactName && (!existingConv.contact_name || existingConv.contact_name.startsWith('Grupo '))) {
            updates.contact_name = contactName;
          }
          
          // Atualizar contagem de não lidas
          if (unreadCount > 0) {
            updates.unread_count = unreadCount;
          }
          
          // Marcar se é grupo
          if (isGroup) {
            updates.is_group = true;
            if (!existingConv.contact_name || existingConv.contact_name.startsWith('Grupo ')) {
              updates.contact_name = contactName || `Grupo ${phone}`;
            }
          }
          
          await companySupabase
            .from('conversations')
            .update(updates)
            .eq('id', existingConv.id);
        } else {
          // NÃO criar conversa aqui - será criada quando chegar a primeira mensagem
          // Isso evita conversas fantasmas com horário atual (22hrs) sem mensagens
          // Apenas salvar nome do contato/grupo se não existir
          if (contactName || isGroup) {
            // Cache temporário para uso quando as mensagens chegarem
            // A conversa real será criada pelo handleMessage/webhook
            console.log(`[${instanceId}] 📋 Chat ${phone} sem conversa - será criada com primeira mensagem`);
          }
        }
        processed++;
      }
      
      console.log(`[${instanceId}] ✅ ${processed} chats processados`);
    } catch (error) {
      console.error(`[${instanceId}] ❌ Erro ao processar chats:`, error);
    }
  }

  // Processar mensagens do histórico de forma organizada
  private async processHistoryMessages(instanceId: string, messages: any[]): Promise<void> {
    try {
      console.log(`[${instanceId}] 📨 Organizando ${messages.length} mensagens por conversa...`);
      
      // Agrupar mensagens por JID (conversa)
      const messagesByChat: Map<string, any[]> = new Map();
      
      for (const msg of messages) {
        const jid = msg.key?.remoteJid;
        if (!jid || jid === 'status@broadcast' || jid.includes('broadcast')) {
          continue;
        }
        
        if (!messagesByChat.has(jid)) {
          messagesByChat.set(jid, []);
        }
        messagesByChat.get(jid)!.push(msg);
      }
      
      // Contar total de mensagens válidas
      let totalValidMessages = 0;
      messagesByChat.forEach(msgs => totalValidMessages += msgs.length);
      
      console.log(`[${instanceId}] 📊 ${messagesByChat.size} conversas encontradas com ${totalValidMessages} mensagens`);
      
      // Inicializar progresso
      const progress = this.syncProgress.get(instanceId) || {
        status: 'idle' as const,
        totalMessages: 0,
        processedMessages: 0,
        totalConversations: 0,
        processedConversations: 0,
        mediaDownloaded: 0,
        mediaFailed: 0
      };
      
      progress.status = 'syncing';
      progress.totalMessages = totalValidMessages;
      progress.totalConversations = messagesByChat.size;
      progress.processedMessages = 0;
      progress.processedConversations = 0;
      progress.startedAt = new Date();
      this.syncProgress.set(instanceId, progress);
      
      // Processar cada conversa
      let conversationIndex = 0;
      
      for (const [jid, chatMessages] of messagesByChat) {
        conversationIndex++;
        const phone = jid.split('@')[0];
        
        // Atualizar progresso com conversa atual
        progress.currentConversation = phone;
        
        // Função helper para extrair timestamp como número
        const getTimestamp = (msg: any): number => {
          const ts = msg.messageTimestamp;
          if (!ts) return 0;
          if (typeof ts === 'object' && ts !== null && 'low' in ts && 'high' in ts) {
            return (ts.high >>> 0) * 0x100000000 + (ts.low >>> 0);
          }
          if (typeof ts === 'bigint') return Number(ts);
          return Number(ts) || 0;
        };
        
        // Ordenar mensagens por timestamp (mais antigas primeiro)
        chatMessages.sort((a, b) => getTimestamp(a) - getTimestamp(b));
        
        console.log(`[${instanceId}] 📥 [${conversationIndex}/${messagesByChat.size}] ${phone}: ${chatMessages.length} mensagens`);
        
        // Processar em lotes menores para esta conversa
        const batchSize = 20;
        for (let i = 0; i < chatMessages.length; i += batchSize) {
          const batch = chatMessages.slice(i, i + batchSize);
          
          for (const msg of batch) {
            await this.handleMessage(instanceId, msg, true);
            progress.processedMessages++;
          }
        }
        
        progress.processedConversations++;
      }
      
      // Marcar como concluído
      progress.status = 'completed';
      progress.completedAt = new Date();
      progress.currentConversation = undefined;
      
      console.log(`[${instanceId}] ✅ Histórico concluído: ${progress.processedMessages} mensagens em ${messagesByChat.size} conversas`);
    } catch (error) {
      console.error(`[${instanceId}] ❌ Erro ao processar histórico:`, error);
      const progress = this.syncProgress.get(instanceId);
      if (progress) {
        progress.status = 'error';
      }
    }
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    if (instance.socket) {
      try {
        await instance.socket.logout();
      } catch (e) {
        // Ignore logout errors
      }
      instance.socket = null;
    }

    // Limpar sessão após logout para forçar novo QR
    const sessionPath = path.join(config.sessionsPath, instanceId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('[' + instanceId + '] Sessao removida apos logout');
    }

    instance.status = 'disconnected';
    instance.qrCode = null;
    this.instances.delete(instanceId);
  }

  async resetInstance(instanceId: string): Promise<WhatsAppInstance> {
    console.log('[' + instanceId + '] Resetando instancia...');
    
    // Desconectar se estiver conectado
    const existing = this.instances.get(instanceId);
    if (existing?.socket) {
      try {
        existing.socket.end(undefined);
      } catch (e) {
        // Ignore
      }
    }
    this.instances.delete(instanceId);
    
    // Limpar sessão antiga
    const sessionPath = path.join(config.sessionsPath, instanceId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('[' + instanceId + '] Sessao antiga removida');
    }
    
    // Criar nova instância
    const instance: WhatsAppInstance = {
      id: instanceId,
      socket: null,
      qrCode: null,
      status: 'disconnected',
      retryCount: 0
    };
    
    this.instances.set(instanceId, instance);
    await this.connectInstance(instanceId);
    
    return instance;
  }

  async sendMessage(instanceId: string, phone: string, text: string, mediaUrl?: string, mediaType?: string): Promise<string> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.socket) {
      throw new Error('Instance not connected');
    }

    const jid = phone.includes('@') ? phone : phone + '@s.whatsapp.net';
    
    let message: any;
    if (mediaUrl && mediaType) {
      // Enviar mídia
      if (mediaType === 'image') {
        message = { image: { url: mediaUrl }, caption: text };
      } else if (mediaType === 'video') {
        message = { video: { url: mediaUrl }, caption: text };
      } else if (mediaType === 'audio') {
        message = { audio: { url: mediaUrl }, mimetype: 'audio/mpeg' };
      } else if (mediaType === 'document') {
        message = { document: { url: mediaUrl }, caption: text, fileName: 'document' };
      } else {
        message = { text };
      }
    } else {
      message = { text };
    }
    
    const result = await instance.socket.sendMessage(jid, message);
    return result?.key?.id || `msg_${Date.now()}`;
  }

  async sendMedia(instanceId: string, phone: string, mediaType: string, mediaData: string, filename?: string, caption?: string): Promise<string> {
    console.log(`📤 [sendMedia] Iniciando envio de ${mediaType} para ${phone}`);
    
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.socket) {
      console.error(`❌ [sendMedia] Instância ${instanceId} não conectada`);
      throw new Error('Instance not connected');
    }

    const jid = phone.includes('@') ? phone : phone + '@s.whatsapp.net';
    console.log(`📱 [sendMedia] JID: ${jid}`);
    
    // Extrair dados do base64
    let buffer: Buffer;
    let mimetype = 'application/octet-stream';
    
    try {
      if (mediaData.includes('base64,')) {
        // Formato: data:image/png;base64,xxx
        const matches = mediaData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimetype = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
          console.log(`📊 [sendMedia] Mimetype detectado: ${mimetype}, Buffer size: ${buffer.length} bytes`);
        } else {
          buffer = Buffer.from(mediaData.split(',')[1], 'base64');
          console.log(`📊 [sendMedia] Buffer size: ${buffer.length} bytes`);
        }
      } else {
        buffer = Buffer.from(mediaData, 'base64');
        console.log(`📊 [sendMedia] Buffer direto, size: ${buffer.length} bytes`);
      }
    } catch (error) {
      console.error(`❌ [sendMedia] Erro ao converter base64:`, error);
      throw new Error('Erro ao processar dados da mídia');
    }
    
    let message: any;
    
    if (mediaType === 'image') {
      message = { 
        image: buffer,
        mimetype: mimetype.startsWith('image/') ? mimetype : 'image/jpeg',
        caption: caption || undefined
      };
      console.log(`🖼️ [sendMedia] Preparando imagem, mimetype: ${message.mimetype}`);
    } else if (mediaType === 'video') {
      message = { 
        video: buffer,
        mimetype: mimetype.startsWith('video/') ? mimetype : 'video/mp4',
        caption: caption || undefined
      };
      console.log(`🎥 [sendMedia] Preparando vídeo, mimetype: ${message.mimetype}`);
    } else if (mediaType === 'audio' || mediaType === 'ptt') {
      // Áudio PTT - mensagem de voz do WhatsApp
      console.log(`🎤 [sendMedia] Mimetype original do áudio: ${mimetype}`);
      console.log(`🎤 [sendMedia] Buffer size: ${buffer.length} bytes`);
      console.log(`🎤 [sendMedia] Primeiros bytes:`, buffer.slice(0, 20).toString('hex'));
      
      // Detectar formato real do áudio
      const isWebM = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
      const isOgg = buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53;
      
      console.log(`🎤 [sendMedia] Formato detectado - WebM: ${isWebM}, OGG: ${isOgg}`);
      
      message = { 
        audio: buffer,
        mimetype: 'audio/ogg; codecs=opus', // WhatsApp sempre espera OGG Opus
        ptt: true, // Push to talk (mensagem de voz)
        seconds: Math.floor(buffer.length / 16000) // Estimativa da duração
      };
      console.log(`🎤 [sendMedia] Preparando áudio PTT com duração estimada: ${message.seconds}s`);
    } else if (mediaType === 'document') {
      message = { 
        document: buffer,
        mimetype,
        fileName: filename || 'document'
      };
      if (caption) {
        message.caption = caption;
      }
      console.log(`📄 [sendMedia] Preparando documento: ${filename}, mimetype: ${mimetype}`);
    } else {
      console.error(`❌ [sendMedia] Tipo não suportado: ${mediaType}`);
      throw new Error(`Tipo de mídia não suportado: ${mediaType}`);
    }
    
    try {
      console.log(`📤 [sendMedia] Enviando ${mediaType} via Baileys...`);
      const result = await instance.socket.sendMessage(jid, message);
      const messageId = result?.key?.id || `msg_${Date.now()}`;
      console.log(`✅ [sendMedia] ${mediaType} enviado com sucesso! ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error(`❌ [sendMedia] Erro ao enviar via Baileys:`, error);
      throw error;
    }
  }

  getInstance(instanceId: string): WhatsAppInstance | undefined {
    return this.instances.get(instanceId);
  }

  getSyncProgress(instanceId: string): SyncProgress | undefined {
    return this.syncProgress.get(instanceId);
  }

  getActiveInstances(): string[] {
    const active: string[] = [];
    this.instances.forEach((inst, id) => {
      if (inst.status === 'connected') {
        active.push(id);
      }
    });
    return active;
  }

  async disconnectAll(): Promise<void> {
    const ids = Array.from(this.instances.keys());
    for (const id of ids) {
      try {
        await this.disconnectInstance(id);
      } catch (e) {
        console.error('Error disconnecting:', e);
      }
    }
  }

  private async handleMessage(instanceId: string, message: WAMessage, isHistorical: boolean = false): Promise<void> {
    try {
      // Ignorar mensagens de status/broadcast
      if (message.key.remoteJid === 'status@broadcast') {
        return;
      }

      // Ignorar mensagens sem conteúdo
      if (!message.message) {
        return;
      }

      const fromJid = message.key.remoteJid || '';
      const isGroup = fromJid.includes('@g.us');
      const chatId = fromJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      
      // Para grupos, o participante é quem enviou a mensagem
      // Para conversas individuais, é o próprio remoteJid
      const participantJid = message.key.participant || fromJid;
      const participantPhone = participantJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      
      const pushName = message.pushName || '';
      
      // Extrair informações da mensagem de forma mais completa
      const msgInfo = this.extractMessageInfo(message);
      
      // Ignorar mensagens de protocolo (sem tipo válido)
      if (!msgInfo.type || msgInfo.type === 'protocol') {
        return;
      }
      
      // Log diferenciado para mensagens históricas
      if (!isHistorical) {
        console.log('[' + instanceId + '] 📩 MENSAGEM RECEBIDA:');
        console.log('  - Chat:', chatId, isGroup ? '(GRUPO)' : '');
        if (isGroup) console.log('  - Participante:', participantPhone);
        console.log('  - Nome:', pushName);
        console.log('  - Tipo:', msgInfo.type);
        console.log('  - Texto:', msgInfo.text?.substring(0, 50) || '[sem texto]');
        console.log('  - FromMe:', message.key.fromMe);
        if (msgInfo.hasMedia) console.log('  - Mídia:', msgInfo.mimetype);
      }

      // Download de mídia (para todas as mensagens com mídia)
      if (msgInfo.hasMedia) {
        const progress = this.syncProgress.get(instanceId);
        try {
          const instance = this.instances.get(instanceId);
          if (instance?.socket) {
            if (!isHistorical) {
              console.log('[' + instanceId + '] 📥 Baixando mídia...');
            }
            const buffer = await downloadMediaMessage(
              message,
              'buffer',
              {},
              {
                logger: P({ level: 'silent' }) as any,
                reuploadRequest: instance.socket.updateMediaMessage
              }
            );
            if (buffer) {
              // Converter para base64 data URL
              const base64 = Buffer.from(buffer).toString('base64');
              const mimeType = msgInfo.mimetype || 'application/octet-stream';
              msgInfo.mediaUrl = `data:${mimeType};base64,${base64}`;
              if (!isHistorical) {
                console.log('[' + instanceId + '] ✅ Mídia baixada! Tamanho:', buffer.length, 'bytes');
              }
              if (progress) progress.mediaDownloaded++;
            }
          }
        } catch (mediaErr) {
          // Silenciar erro para histórico, mostrar apenas para novas
          if (!isHistorical) {
            console.error('[' + instanceId + '] ⚠️ Erro ao baixar mídia:', mediaErr);
          }
          if (progress) progress.mediaFailed++;
          // Continua sem a mídia
        }
      }
      
      // Converter timestamp corretamente (pode ser Long ou BigInt)
      let timestamp: number | undefined;
      if (message.messageTimestamp) {
        const ts = message.messageTimestamp as any;
        if (typeof ts === 'object' && ts !== null && 'low' in ts && 'high' in ts) {
          timestamp = (ts.high >>> 0) * 0x100000000 + (ts.low >>> 0);
        } else if (typeof ts === 'bigint') {
          timestamp = Number(ts);
        } else if (typeof ts === 'number') {
          timestamp = ts;
        } else {
          timestamp = parseInt(String(ts), 10);
        }
      }
      
      const messageData = {
        instanceId: instanceId,
        messageId: message.key.id,
        from: fromJid,
        phone: chatId, // ID do chat (grupo ou contato)
        participantPhone: participantPhone, // Quem enviou (em grupos)
        pushName: pushName,
        fromMe: message.key.fromMe || false,
        isGroup: isGroup,
        timestamp: timestamp,
        text: msgInfo.text,
        type: msgInfo.type,
        caption: msgInfo.caption,
        mimetype: msgInfo.mimetype,
        hasMedia: msgInfo.hasMedia,
        mediaUrl: msgInfo.mediaUrl,
        thumbnailUrl: msgInfo.thumbnailUrl,
        fileName: msgInfo.fileName,
        fileSize: msgInfo.fileSize,
        duration: msgInfo.duration,
        isHistorical: isHistorical,
        // Dados específicos por tipo
        reaction: msgInfo.reaction,
        quotedMessage: msgInfo.quotedMessage,
        mentions: msgInfo.mentions,
        location: msgInfo.location,
        contact: msgInfo.contact
      };

      if (!isHistorical) {
        console.log('[' + instanceId + '] 📤 Enviando para backend webhook...');
      }
      await this.notifyBackend(instanceId, isHistorical ? 'HISTORY_MESSAGE' : 'NEW_MESSAGE', messageData);
      if (!isHistorical) {
        console.log('[' + instanceId + '] ✅ Webhook enviado!');
      }
    } catch (err) {
      console.error('[' + instanceId + '] ❌ Erro ao processar mensagem:', err);
    }
  }

  private extractMessageInfo(message: WAMessage): {
    type: string;
    text: string;
    caption?: string;
    mimetype?: string;
    hasMedia: boolean;
    mediaUrl?: string;
    thumbnailUrl?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
    reaction?: { emoji: string; targetMessageId: string };
    quotedMessage?: { id: string; text: string; type?: string; participant?: string };
    mentions?: string[];
    location?: { latitude: number; longitude: number; name?: string };
    contact?: { displayName: string; vcard: string };
  } {
    const msg = message.message!;
    
    // Helper para extrair quoted message com mais detalhes
    const extractQuotedInfo = (contextInfo: any): { id: string; text: string; type?: string; participant?: string } | undefined => {
      if (!contextInfo?.quotedMessage) return undefined;
      
      const quoted = contextInfo.quotedMessage;
      let text = '';
      let type = 'text';
      
      if (quoted.conversation) {
        text = quoted.conversation;
        type = 'text';
      } else if (quoted.extendedTextMessage?.text) {
        text = quoted.extendedTextMessage.text;
        type = 'text';
      } else if (quoted.imageMessage) {
        text = quoted.imageMessage.caption || '📷 Imagem';
        type = 'image';
      } else if (quoted.videoMessage) {
        text = quoted.videoMessage.caption || '🎥 Vídeo';
        type = 'video';
      } else if (quoted.audioMessage) {
        text = '🎵 Áudio';
        type = 'audio';
      } else if (quoted.documentMessage) {
        text = quoted.documentMessage.fileName || '📎 Documento';
        type = 'document';
      } else if (quoted.stickerMessage) {
        text = '🎨 Figurinha';
        type = 'sticker';
      }
      
      return {
        id: contextInfo.stanzaId || '',
        text,
        type,
        participant: contextInfo.participant || contextInfo.remoteJid
      };
    };
    
    // Texto simples
    if (msg.conversation) {
      return { type: 'text', text: msg.conversation, hasMedia: false };
    }
    
    // Texto estendido (com formatação, links, menções, citações)
    if (msg.extendedTextMessage) {
      const ext = msg.extendedTextMessage;
      return {
        type: 'text',
        text: ext.text || '',
        hasMedia: false,
        mentions: ext.contextInfo?.mentionedJid,
        quotedMessage: extractQuotedInfo(ext.contextInfo)
      };
    }
    
    // Imagem
    if (msg.imageMessage) {
      const img = msg.imageMessage;
      return {
        type: 'image',
        text: img.caption || '',
        caption: img.caption,
        mimetype: img.mimetype,
        hasMedia: true,
        fileSize: img.fileLength ? Number(img.fileLength) : undefined,
        thumbnailUrl: img.jpegThumbnail ? 
          'data:image/jpeg;base64,' + Buffer.from(img.jpegThumbnail).toString('base64') : undefined,
        mentions: img.contextInfo?.mentionedJid,
        quotedMessage: extractQuotedInfo(img.contextInfo)
      };
    }
    
    // Vídeo
    if (msg.videoMessage) {
      const vid = msg.videoMessage;
      return {
        type: 'video',
        text: vid.caption || '',
        caption: vid.caption,
        mimetype: vid.mimetype,
        hasMedia: true,
        fileSize: vid.fileLength ? Number(vid.fileLength) : undefined,
        duration: vid.seconds,
        thumbnailUrl: vid.jpegThumbnail ?
          'data:image/jpeg;base64,' + Buffer.from(vid.jpegThumbnail).toString('base64') : undefined,
        mentions: vid.contextInfo?.mentionedJid,
        quotedMessage: extractQuotedInfo(vid.contextInfo)
      };
    }
    
    // Áudio
    if (msg.audioMessage) {
      const aud = msg.audioMessage;
      return {
        type: aud.ptt ? 'ptt' : 'audio', // ptt = push-to-talk (áudio de voz)
        text: '',
        mimetype: aud.mimetype,
        hasMedia: true,
        fileSize: aud.fileLength ? Number(aud.fileLength) : undefined,
        duration: aud.seconds,
        quotedMessage: extractQuotedInfo(aud.contextInfo)
      };
    }
    
    // Documento
    if (msg.documentMessage) {
      const doc = msg.documentMessage;
      return {
        type: 'document',
        text: doc.caption || '',
        caption: doc.caption,
        mimetype: doc.mimetype,
        hasMedia: true,
        fileName: doc.fileName,
        fileSize: doc.fileLength ? Number(doc.fileLength) : undefined,
        quotedMessage: extractQuotedInfo(doc.contextInfo)
      };
    }
    
    // Documento com legenda (documentWithCaptionMessage)
    if (msg.documentWithCaptionMessage) {
      const docWithCaption = msg.documentWithCaptionMessage.message?.documentMessage;
      if (docWithCaption) {
        return {
          type: 'document',
          text: docWithCaption.caption || '',
          caption: docWithCaption.caption,
          mimetype: docWithCaption.mimetype,
          hasMedia: true,
          fileName: docWithCaption.fileName,
          fileSize: docWithCaption.fileLength ? Number(docWithCaption.fileLength) : undefined
        };
      }
    }
    
    // Sticker
    if (msg.stickerMessage) {
      const stk = msg.stickerMessage;
      return {
        type: 'sticker',
        text: '',
        mimetype: stk.mimetype,
        hasMedia: true,
        fileSize: stk.fileLength ? Number(stk.fileLength) : undefined
      };
    }
    
    // Localização
    if (msg.locationMessage) {
      const loc = msg.locationMessage;
      return {
        type: 'location',
        text: loc.name || loc.address || '',
        hasMedia: false,
        location: {
          latitude: loc.degreesLatitude || 0,
          longitude: loc.degreesLongitude || 0,
          name: loc.name
        },
        thumbnailUrl: loc.jpegThumbnail ?
          'data:image/jpeg;base64,' + Buffer.from(loc.jpegThumbnail).toString('base64') : undefined
      };
    }
    
    // Localização em tempo real
    if (msg.liveLocationMessage) {
      const loc = msg.liveLocationMessage;
      return {
        type: 'live_location',
        text: '',
        hasMedia: false,
        location: {
          latitude: loc.degreesLatitude || 0,
          longitude: loc.degreesLongitude || 0
        }
      };
    }
    
    // Contato
    if (msg.contactMessage) {
      const contact = msg.contactMessage;
      return {
        type: 'contact',
        text: contact.displayName || '',
        hasMedia: false,
        contact: {
          displayName: contact.displayName || '',
          vcard: contact.vcard || ''
        }
      };
    }
    
    // Múltiplos contatos
    if (msg.contactsArrayMessage) {
      const contacts = msg.contactsArrayMessage;
      return {
        type: 'contacts',
        text: contacts.displayName || `${contacts.contacts?.length || 0} contatos`,
        hasMedia: false
      };
    }
    
    // Reação
    if (msg.reactionMessage) {
      const reaction = msg.reactionMessage;
      return {
        type: 'reaction',
        text: reaction.text || '',
        hasMedia: false,
        reaction: {
          emoji: reaction.text || '',
          targetMessageId: reaction.key?.id || ''
        }
      };
    }
    
    // Enquete
    if (msg.pollCreationMessage) {
      const poll = msg.pollCreationMessage;
      return {
        type: 'poll',
        text: poll.name || '',
        hasMedia: false
      };
    }
    
    // Voto em enquete
    if (msg.pollUpdateMessage) {
      return {
        type: 'poll_vote',
        text: '',
        hasMedia: false
      };
    }
    
    // Mensagem com botões (templates)
    if (msg.buttonsResponseMessage || msg.templateButtonReplyMessage) {
      const btn = msg.buttonsResponseMessage || msg.templateButtonReplyMessage;
      return {
        type: 'button_response',
        text: (btn as any).selectedDisplayText || (btn as any).selectedButtonId || '',
        hasMedia: false
      };
    }
    
    // Lista de opções
    if (msg.listResponseMessage) {
      const list = msg.listResponseMessage;
      return {
        type: 'list_response',
        text: list.title || list.singleSelectReply?.selectedRowId || '',
        hasMedia: false
      };
    }
    
    // Mensagem editada (editedMessage)
    if (msg.editedMessage) {
      const edited = msg.editedMessage.message;
      if (edited) {
        // Extrair texto da mensagem editada recursivamente
        if (edited.conversation) {
          return { type: 'text', text: edited.conversation, hasMedia: false };
        }
        if (edited.extendedTextMessage) {
          return { type: 'text', text: edited.extendedTextMessage.text || '', hasMedia: false };
        }
        if (edited.imageMessage) {
          return {
            type: 'image',
            text: edited.imageMessage.caption || '',
            caption: edited.imageMessage.caption,
            hasMedia: true
          };
        }
      }
      return { type: 'text', text: '', hasMedia: false };
    }
    
    // Mensagem editada (via protocolMessage)
    if (msg.protocolMessage?.type === 14) { // EDIT
      return {
        type: 'edit',
        text: msg.protocolMessage?.editedMessage?.conversation || 
              msg.protocolMessage?.editedMessage?.extendedTextMessage?.text || '',
        hasMedia: false
      };
    }
    
    // Mensagem deletada
    if (msg.protocolMessage?.type === 0) { // REVOKE
      return {
        type: 'deleted',
        text: '',
        hasMedia: false
      };
    }
    
    // Outras mensagens de protocolo (ignorar)
    if (msg.protocolMessage || msg.senderKeyDistributionMessage) {
      return { type: 'protocol', text: '', hasMedia: false };
    }
    
    // Mensagem de produto/catálogo
    if (msg.productMessage) {
      return {
        type: 'product',
        text: msg.productMessage.product?.title || '',
        hasMedia: true
      };
    }
    
    // GIF
    if (msg.videoMessage?.gifPlayback) {
      const gif = msg.videoMessage;
      return {
        type: 'gif',
        text: gif.caption || '',
        caption: gif.caption,
        mimetype: gif.mimetype,
        hasMedia: true,
        thumbnailUrl: gif.jpegThumbnail ?
          'data:image/jpeg;base64,' + Buffer.from(gif.jpegThumbnail).toString('base64') : undefined
      };
    }
    
    // Imagem com legenda (imageWithCaptionMessage)
    if ((msg as any).imageWithCaptionMessage) {
      const imgWithCaption = (msg as any).imageWithCaptionMessage.message?.imageMessage;
      if (imgWithCaption) {
        return {
          type: 'image',
          text: imgWithCaption.caption || '',
          caption: imgWithCaption.caption,
          mimetype: imgWithCaption.mimetype,
          hasMedia: true,
          thumbnailUrl: imgWithCaption.jpegThumbnail ?
            'data:image/jpeg;base64,' + Buffer.from(imgWithCaption.jpegThumbnail).toString('base64') : undefined
        };
      }
    }
    
    // Vídeo com legenda (videoWithCaptionMessage)
    if ((msg as any).videoWithCaptionMessage) {
      const vidWithCaption = (msg as any).videoWithCaptionMessage.message?.videoMessage;
      if (vidWithCaption) {
        return {
          type: 'video',
          text: vidWithCaption.caption || '',
          caption: vidWithCaption.caption,
          mimetype: vidWithCaption.mimetype,
          hasMedia: true,
          duration: vidWithCaption.seconds,
          thumbnailUrl: vidWithCaption.jpegThumbnail ?
            'data:image/jpeg;base64,' + Buffer.from(vidWithCaption.jpegThumbnail).toString('base64') : undefined
        };
      }
    }
    
    // Mensagem com view once (fotos/vídeos que desaparecem)
    if ((msg as any).viewOnceMessage || (msg as any).viewOnceMessageV2) {
      const viewOnce = (msg as any).viewOnceMessage?.message || (msg as any).viewOnceMessageV2?.message;
      if (viewOnce?.imageMessage) {
        return {
          type: 'image',
          text: '📷 Visualização única',
          hasMedia: true,
          mimetype: viewOnce.imageMessage.mimetype
        };
      }
      if (viewOnce?.videoMessage) {
        return {
          type: 'video',
          text: '🎥 Visualização única',
          hasMedia: true,
          mimetype: viewOnce.videoMessage.mimetype
        };
      }
    }
    
    // Mensagem de ordem/pedido
    if ((msg as any).orderMessage) {
      return {
        type: 'order',
        text: '🛒 Pedido',
        hasMedia: false
      };
    }
    
    // Mensagem de grupo (notificação)
    if ((msg as any).groupInviteMessage) {
      const invite = (msg as any).groupInviteMessage;
      return {
        type: 'group_invite',
        text: invite.groupName || 'Convite de grupo',
        hasMedia: false
      };
    }
    
    // Ephemeral settings
    if ((msg as any).ephemeralMessage) {
      const eph = (msg as any).ephemeralMessage.message;
      // Processar recursivamente
      if (eph) {
        if (eph.conversation) return { type: 'text', text: eph.conversation, hasMedia: false };
        if (eph.extendedTextMessage) return { type: 'text', text: eph.extendedTextMessage.text || '', hasMedia: false };
        if (eph.imageMessage) return { type: 'image', text: eph.imageMessage.caption || '', hasMedia: true };
        if (eph.videoMessage) return { type: 'video', text: eph.videoMessage.caption || '', hasMedia: true };
        if (eph.audioMessage) return { type: eph.audioMessage.ptt ? 'ptt' : 'audio', text: '', hasMedia: true };
        if (eph.documentMessage) return { type: 'document', text: eph.documentMessage.caption || '', fileName: eph.documentMessage.fileName, hasMedia: true };
      }
    }
    
    // Fallback - tentar extrair qualquer texto
    const anyText = this.extractAnyText(msg);
    if (anyText) {
      return { type: 'text', text: anyText, hasMedia: false };
    }
    
    // Se nada funcionou, é uma mensagem de protocolo desconhecida
    const msgKeys = Object.keys(msg);
    console.log('⚠️ Tipo de mensagem não reconhecido:', msgKeys);
    // Log apenas se não for protocolo comum
    if (!msgKeys.includes('protocolMessage') && !msgKeys.includes('senderKeyDistributionMessage')) {
      console.log('  Estrutura:', JSON.stringify(msg, null, 2).substring(0, 500));
    }
    return { type: 'protocol', text: '', hasMedia: false };
  }

  private extractAnyText(msg: any): string {
    // Tentar encontrar texto em qualquer propriedade comum
    const textProps = ['text', 'caption', 'body', 'content', 'title', 'description'];
    for (const key of Object.keys(msg)) {
      const val = msg[key];
      if (typeof val === 'string' && val.length > 0) {
        return val;
      }
      if (typeof val === 'object' && val !== null) {
        for (const prop of textProps) {
          if (val[prop] && typeof val[prop] === 'string') {
            return val[prop];
          }
        }
      }
    }
    return '';
  }

  private async notifyBackend(instanceId: string, event: string, data?: unknown): Promise<void> {
    try {
      const url = config.backendApiUrl + '/api/webhooks/whatsapp';
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: instanceId,
          event: event,
          data: data,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('Failed to notify backend:', err);
    }
  }
}
