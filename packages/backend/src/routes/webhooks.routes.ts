import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Cache de contatos para evitar queries repetidas
const contactsCache: Map<string, { name: string, expiresAt: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Buscar nome do contato (com cache)
async function getContactName(instanceId: string, phone: string): Promise<string | null> {
  const cacheKey = `${instanceId}:${phone}`;
  const cached = contactsCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.name;
  }
  
  // Buscar do banco
  const { data: contact } = await supabase
    .from('contacts')
    .select('name')
    .eq('instance_id', instanceId)
    .eq('phone', phone)
    .single();
  
  if (contact?.name) {
    contactsCache.set(cacheKey, { name: contact.name, expiresAt: Date.now() + CACHE_TTL });
    return contact.name;
  }
  
  return null;
}

// Salvar contato identificado nas mensagens
async function saveContactFromMessage(instanceId: string, phone: string, name: string): Promise<void> {
  if (!phone || !name) return;
  
  try {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('instance_id', instanceId)
      .eq('phone', phone)
      .single();
    
    if (existing) {
      // Atualizar apenas se não tinha nome ou o nome é o número
      if (!existing.name || existing.name === phone) {
        await supabase
          .from('contacts')
          .update({ name, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        // Atualizar cache
        const cacheKey = `${instanceId}:${phone}`;
        contactsCache.set(cacheKey, { name, expiresAt: Date.now() + CACHE_TTL });
      }
    } else {
      // Criar novo contato
      await supabase
        .from('contacts')
        .insert({
          instance_id: instanceId,
          phone,
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      // Adicionar ao cache
      const cacheKey = `${instanceId}:${phone}`;
      contactsCache.set(cacheKey, { name, expiresAt: Date.now() + CACHE_TTL });
    }
  } catch (error) {
    // Ignorar erros de contato (pode ser duplicata)
  }
}

// Webhook para receber eventos do WhatsApp Service
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const { instanceId, event, data, timestamp } = req.body;
    
    // Log reduzido para mensagens históricas
    if (event !== 'HISTORY_MESSAGE') {
      console.log(`📨 Webhook recebido: ${event} para instância ${instanceId}`);
    }

    switch (event) {
      case 'NEW_MESSAGE':
        await handleNewMessage(instanceId, data, false);
        break;
      case 'HISTORY_MESSAGE':
        await handleNewMessage(instanceId, data, true);
        break;
      case 'MESSAGE_STATUS':
        await handleMessageStatus(data);
        break;
      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(instanceId, data);
        break;
      default:
        console.log(`Evento não tratado: ${event}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function handleNewMessage(instanceId: string, data: any, isHistorical: boolean = false) {
  try {
    const { 
      messageId, from, phone: dataPhone, participantPhone, fromMe, text, type, 
      timestamp: msgTimestamp, pushName, caption, mimetype, hasMedia,
      mediaUrl, thumbnailUrl, fileName, fileSize, duration, reaction, quotedMessage,
      mentions, location, contact, isGroup
    } = data;
    
    // Ignorar mensagens de protocolo
    if (type === 'protocol' || type === 'deleted' || type === 'poll_vote') {
      return;
    }
    
    // Extrair ID do chat (grupo ou contato individual)
    const chatId = dataPhone || from?.split('@')[0] || '';
    
    // Em grupos, participantPhone é quem enviou. Em conversas individuais, é igual ao chatId
    const senderPhone = participantPhone || chatId;
    
    if (!chatId) {
      return;
    }

    // Log detalhado apenas para mensagens novas
    if (!isHistorical) {
      console.log('📩 Nova mensagem:');
      console.log('  - chat:', chatId, isGroup ? '(GRUPO)' : '');
      if (isGroup) console.log('  - participante:', senderPhone, pushName ? `(${pushName})` : '');
      console.log('  - tipo:', type);
      console.log('  - texto:', text?.substring(0, 50) || caption?.substring(0, 50) || '[sem texto]');
    }

    // Tratar reações separadamente
    if (type === 'reaction' && reaction) {
      await handleReaction(instanceId, messageId, senderPhone, reaction, fromMe);
      return;
    }

    // Verificar se mensagem já existe (evita duplicatas no histórico)
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id')
      .eq('whatsapp_message_id', messageId)
      .single();

    if (existingMsg) {
      // Mensagem já existe, pular
      return;
    }

    // Para mensagens de entrada (não fromMe), salvar/atualizar contato do remetente
    if (!fromMe && pushName && !isGroup) {
      // Salvar contato individual
      await saveContactFromMessage(instanceId, senderPhone, pushName);
    } else if (!fromMe && pushName && isGroup) {
      // Salvar participante do grupo como contato
      await saveContactFromMessage(instanceId, senderPhone, pushName);
    }

    // Buscar nome do contato salvo (para conversas individuais)
    const savedContactName = !fromMe && !isGroup ? await getContactName(instanceId, chatId) : null;
    const contactDisplayName = savedContactName || (!isGroup ? pushName : null);

    // Criar ou obter conversa
    let conversation;
    const { data: existingConversations, error: convFetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('contact_phone', chatId)
      .order('created_at', { ascending: true })
      .limit(1);

    const existingConv = existingConversations?.[0] || null;
    
    if (convFetchError && !isHistorical) {
      console.error('❌ Erro ao buscar conversa:', convFetchError);
    }

    // Gerar preview da mensagem baseado no tipo
    const messagePreview = generateMessagePreview(type, text, caption, fileName);

    // Converter timestamp do WhatsApp para ISO ANTES de criar conversa
    let messageDate = new Date();
    if (msgTimestamp) {
      try {
        let ts: number;
        
        if (typeof msgTimestamp === 'object' && msgTimestamp !== null) {
          if ('low' in msgTimestamp && 'high' in msgTimestamp) {
            ts = (msgTimestamp.high >>> 0) * 0x100000000 + (msgTimestamp.low >>> 0);
          } else if ('toNumber' in msgTimestamp) {
            ts = msgTimestamp.toNumber();
          } else {
            ts = Number(msgTimestamp);
          }
        } else if (typeof msgTimestamp === 'bigint') {
          ts = Number(msgTimestamp);
        } else if (typeof msgTimestamp === 'string') {
          ts = parseInt(msgTimestamp, 10);
        } else {
          ts = Number(msgTimestamp);
        }
        
        if (ts && !isNaN(ts)) {
          if (ts < 946684800000) {
            ts = ts * 1000;
          }
          
          const testDate = new Date(ts);
          if (testDate.getFullYear() >= 2000 && testDate.getFullYear() <= 2100) {
            messageDate = testDate;
          }
        }
      } catch (e) {
        // Manter data atual se houver erro
      }
    }

    if (existingConv) {
      conversation = existingConv;
      
      // Atualizar nome do contato se temos um melhor (apenas para não-grupos)
      if (contactDisplayName && !existingConv.contact_name && !isGroup) {
        await supabase
          .from('conversations')
          .update({ contact_name: contactDisplayName })
          .eq('id', existingConv.id);
        conversation.contact_name = contactDisplayName;
      }
      
      // Para grupos sem nome ou com nome genérico, tentar buscar o nome real
      if (isGroup && (!existingConv.contact_name || existingConv.contact_name.startsWith('Grupo '))) {
        // Buscar nome do grupo via WhatsApp Service
        try {
          const groupNameResponse = await fetch(`http://localhost:3001/api/instances/${instanceId}/group-metadata/${chatId}`);
          const groupData = await groupNameResponse.json();
          if (groupData.success && groupData.data?.subject) {
            await supabase
              .from('conversations')
              .update({ contact_name: groupData.data.subject })
              .eq('id', existingConv.id);
            conversation.contact_name = groupData.data.subject;
            if (!isHistorical) {
              console.log(`📋 Grupo ${chatId} atualizado: "${groupData.data.subject}"`);
            }
          }
        } catch (e) {
          // Ignorar erro ao buscar metadata do grupo
        }
      }
    } else {
      // Para grupos, tentar buscar o nome real do grupo
      let convName = isGroup ? `Grupo ${chatId}` : contactDisplayName;
      
      if (isGroup) {
        try {
          const groupNameResponse = await fetch(`http://localhost:3001/api/instances/${instanceId}/group-metadata/${chatId}`);
          const groupData = await groupNameResponse.json();
          if (groupData.success && groupData.data?.subject) {
            convName = groupData.data.subject;
            if (!isHistorical) {
              console.log(`📋 Novo grupo detectado: "${convName}"`);
            }
          }
        } catch (e) {
          // Ignorar erro ao buscar metadata do grupo
        }
      }
      
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          instance_id: instanceId,
          contact_phone: chatId,
          contact_name: convName,
          is_group: isGroup || false,
          status: 'OPEN',
          last_message_at: messageDate.toISOString(), // Usar timestamp da mensagem
          last_message_preview: messagePreview,
          unread_count: isHistorical ? 0 : 1
        })
        .select()
        .single();

      if (convError) {
        if (!isHistorical) {
          console.error('❌ Erro ao criar conversa:', convError);
        }
        return;
      }
      conversation = newConv;
    }

    // Determinar direção e se é do cliente
    const direction = fromMe ? 'OUTGOING' : 'INCOMING';
    const isFromClient = !fromMe;

    // Mapear tipos do WhatsApp para tipos do banco
    const typeMap: Record<string, string> = {
      'text': 'TEXT',
      'image': 'IMAGE',
      'video': 'VIDEO',
      'audio': 'AUDIO',
      'ptt': 'AUDIO', // push-to-talk = audio de voz
      'document': 'DOCUMENT',
      'sticker': 'STICKER',
      'location': 'LOCATION',
      'live_location': 'LOCATION',
      'contact': 'CONTACT',
      'contacts': 'CONTACT',
      'gif': 'IMAGE',
      'poll': 'TEXT',
      'button_response': 'TEXT',
      'list_response': 'TEXT',
      'product': 'TEXT',
      'edit': 'TEXT'
    };
    
    const normalizedType = typeMap[type?.toLowerCase()] || 'TEXT';

    // Construir metadados da mensagem
    const metadata: any = {};
    if (hasMedia) metadata.hasMedia = true;
    if (mimetype) metadata.mimetype = mimetype;
    if (fileName) metadata.fileName = fileName;
    if (fileSize) metadata.fileSize = fileSize;
    if (duration) metadata.duration = duration;
    if (thumbnailUrl) metadata.thumbnailUrl = thumbnailUrl;
    if (quotedMessage) metadata.quotedMessage = quotedMessage;
    if (mentions?.length) metadata.mentions = mentions;
    if (location) metadata.location = location;
    if (contact) metadata.contact = contact;
    if (isHistorical && fromMe) metadata.synced_from_device = true;
    // Para grupos, salvar informações do remetente
    if (isGroup) {
      metadata.isGroup = true;
      metadata.senderPhone = senderPhone;
      metadata.senderName = pushName || senderPhone;
    }

    // Salvar mensagem
    const messageData: any = {
      conversation_id: conversation.id,
      whatsapp_message_id: messageId,
      type: normalizedType,
      direction: direction,
      content: text || caption || '',
      is_from_client: isFromClient,
      sender_name: fromMe ? 'Atendimento' : (pushName || senderPhone),
      sender_phone: isGroup ? senderPhone : null, // Guardar telefone do remetente em grupos
      media_url: mediaUrl || null, // URL da mídia (base64 ou link)
      created_at: messageDate.toISOString(),
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null
    };

    const { error: msgError } = await supabase
      .from('messages')
      .insert(messageData);

    if (msgError) {
      if (!isHistorical) {
        console.error('❌ Erro ao salvar mensagem:', msgError);
      }
      return;
    }

    // Atualizar conversa apenas se a mensagem for mais recente
    const lastMessageAt = conversation.last_message_at ? new Date(conversation.last_message_at) : new Date(0);
    
    if (messageDate > lastMessageAt) {
      const updates: any = {
        last_message_at: messageDate.toISOString(),
        last_message_preview: messagePreview,
        updated_at: new Date().toISOString()
      };

      // Incrementar não lidas apenas para mensagens novas de entrada
      if (!isHistorical && !fromMe) {
        updates.unread_count = (conversation.unread_count || 0) + 1;
        
        // Se estava fechada, reabrir
        if (['CLOSED', 'ARCHIVED'].includes(conversation.status)) {
          updates.status = 'OPEN';
        }
      }

      // Atualizar nome do contato se veio pushName (apenas para conversas individuais)
      if (pushName && !conversation.contact_name && !fromMe && !isGroup) {
        updates.contact_name = pushName;
      }

      await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversation.id);
    }

    if (!isHistorical) {
      console.log(`✅ Mensagem processada: ${messageId} (${type})${isGroup ? ' [GRUPO]' : ''}`);
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
}

// Gerar preview da mensagem baseado no tipo
function generateMessagePreview(type: string, text?: string, caption?: string, fileName?: string): string {
  const content = text || caption || '';
  
  switch (type?.toLowerCase()) {
    case 'image':
      return content ? `📷 ${content.substring(0, 80)}` : '📷 Imagem';
    case 'video':
    case 'gif':
      return content ? `🎥 ${content.substring(0, 80)}` : '🎥 Vídeo';
    case 'audio':
    case 'ptt':
      return '🎵 Áudio';
    case 'document':
      return fileName ? `📎 ${fileName}` : '📎 Documento';
    case 'sticker':
      return '🎨 Figurinha';
    case 'location':
    case 'live_location':
      return '📍 Localização';
    case 'contact':
    case 'contacts':
      return content ? `👤 ${content}` : '👤 Contato';
    case 'poll':
      return content ? `📊 ${content}` : '📊 Enquete';
    case 'product':
      return content ? `🛒 ${content}` : '🛒 Produto';
    default:
      return content?.substring(0, 100) || '[Mensagem]';
  }
}

// Tratar reações
async function handleReaction(instanceId: string, messageId: string, phone: string, reaction: any, fromMe: boolean) {
  try {
    // Buscar a mensagem alvo da reação
    const { data: targetMsg } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('whatsapp_message_id', reaction.targetMessageId)
      .single();

    if (!targetMsg) {
      // Mensagem alvo não encontrada
      return;
    }

    // Atualizar as reações da mensagem
    const { data: currentMsg } = await supabase
      .from('messages')
      .select('metadata')
      .eq('id', targetMsg.id)
      .single();

    let metadata = currentMsg?.metadata ? JSON.parse(currentMsg.metadata) : {};
    if (!metadata.reactions) metadata.reactions = [];
    
    // Adicionar ou remover reação
    const existingIndex = metadata.reactions.findIndex((r: any) => r.phone === phone);
    
    if (reaction.emoji) {
      // Adicionar/atualizar reação
      if (existingIndex >= 0) {
        metadata.reactions[existingIndex] = { phone, emoji: reaction.emoji, fromMe };
      } else {
        metadata.reactions.push({ phone, emoji: reaction.emoji, fromMe });
      }
    } else {
      // Remover reação (emoji vazio)
      if (existingIndex >= 0) {
        metadata.reactions.splice(existingIndex, 1);
      }
    }

    await supabase
      .from('messages')
      .update({ metadata: JSON.stringify(metadata) })
      .eq('id', targetMsg.id);

    console.log(`✅ Reação processada: ${reaction.emoji} em ${reaction.targetMessageId}`);
  } catch (error) {
    console.error('Erro ao processar reação:', error);
  }
}

async function handleMessageStatus(data: any) {
  try {
    const { messageId, status } = data;
    
    // Não temos campo de status na tabela messages atual
    console.log(`📋 Status atualizado: ${messageId} -> ${status}`);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
}

async function handleConnectionUpdate(instanceId: string, data: any) {
  try {
    const { status, phoneNumber } = data;
    
    await supabase
      .from('instances')
      .update({
        status: status,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId);
      
    console.log(`🔌 Conexão atualizada: ${instanceId} -> ${status}`);
  } catch (error) {
    console.error('Erro ao atualizar conexão:', error);
  }
}

export default router;
