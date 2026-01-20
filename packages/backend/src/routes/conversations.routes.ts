import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Listar conversas
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { status, instanceId, assigned, search, limit = 50, offset = 0 } = req.query;

    // Primeiro, buscar os IDs das instâncias da company
    const { data: instances } = await supabase
      .from('instances')
      .select('id')
      .eq('company_id', companyId);

    const instanceIds = (instances || []).map(i => i.id);

    if (instanceIds.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    let query = supabase
      .from('conversations')
      .select('*')
      .in('instance_id', instanceIds)
      .order('last_message_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && status !== 'all') {
      query = query.eq('status', String(status).toUpperCase());
    }

    if (instanceId) {
      query = query.eq('instance_id', instanceId);
    }

    if (assigned === 'me') {
      query = query.eq('assigned_to_user_id', (req as any).user?.id);
    } else if (assigned === 'unassigned') {
      query = query.is('assigned_to_user_id', null);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Mapear campos para o frontend
    const conversations = (data || []).map(conv => ({
      id: conv.id,
      instance_id: conv.instance_id,
      contact_id: conv.id, // Usando o ID da conversa já que contato está inline
      contact: {
        id: conv.id,
        phone: conv.contact_phone,
        name: conv.contact_name,
        avatar_url: conv.contact_avatar,
        email: null,
        tags: conv.tags || [],
      },
      is_group: conv.is_group || false,
      status: (conv.status || 'open').toLowerCase(),
      last_message: conv.last_message_preview,
      last_message_at: conv.last_message_at,
      unread_count: conv.unread_count || 0,
      assigned_to: conv.assigned_to_user_id,
      kanban_stage_id: conv.kanban_column_id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
    }));

    res.json({
      success: true,
      data: conversations,
      total: count
    });
  } catch (error: any) {
    console.error('Erro ao listar conversas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter conversa específica
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*),
        instance:instances(id, name, phone_number),
        assigned_user:users(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar conversa (status, atribuição, etc)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, priority, tags } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (priority) updates.priority = priority;
    if (tags) updates.tags = tags;

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar mensagens de uma conversa
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 100, before } = req.query;

    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Marcar como lidas
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', id);

    // Buscar informações dos usuários que enviaram mensagens
    const userIds = [...new Set((data || [])
      .filter(msg => msg.sender_user_id)
      .map(msg => msg.sender_user_id))];
    
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);
      
      (users || []).forEach(u => {
        usersMap[u.id] = u;
      });
    }

    // Mapear campos para o frontend (usando estrutura da tabela messages)
    const messages = (data || []).reverse().map(msg => {
      const sender = msg.sender_user_id ? usersMap[msg.sender_user_id] : null;
      
      // Parse metadata se existir
      let metadata: any = {};
      try {
        if (msg.metadata) {
          metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
        }
      } catch (e) {
        // Ignorar erro de parse
      }
      
      return {
        id: msg.id,
        text: msg.content || '',
        type: (msg.type || 'TEXT').toLowerCase(),
        from_me: msg.direction === 'OUTGOING' || !msg.is_from_client,
        status: 'sent',
        media_url: msg.media_url,
        created_at: msg.created_at,
        // Informações do atendente (para mensagens enviadas pelo sistema)
        sender_user_id: msg.sender_user_id,
        sender_name: msg.sender_name || sender?.name || null,
        sender_phone: msg.sender_phone || metadata?.senderPhone || null,
        sender_email: sender?.email || null,
        is_from_device: metadata?.synced_from_device || false,
        // Metadados extras
        metadata: {
          isGroup: metadata?.isGroup || false,
          quotedMessage: metadata?.quotedMessage || null,
          thumbnailUrl: metadata?.thumbnailUrl || null,
          fileName: metadata?.fileName || null,
          duration: metadata?.duration || null,
          reactions: metadata?.reactions || [],
          location: metadata?.location || null
        }
      };
    });

    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enviar mensagem
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, content, mediaUrl, mediaType } = req.body;
    const messageContent = text || content;
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name;

    if (!messageContent && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Conteúdo da mensagem é obrigatório' });
    }

    // Buscar conversa para pegar instanceId e telefone do contato
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, instance:instances(id, phone_number)')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversa não encontrada');
    }

    // Enviar mensagem via WhatsApp Service
    const wsResponse = await fetch(`http://localhost:3001/api/instances/${conversation.instance_id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: conversation.contact_phone,
        message: messageContent,
        mediaUrl,
        mediaType
      })
    });

    const wsData = await wsResponse.json();

    if (!wsData.success) {
      throw new Error(wsData.error || 'Erro ao enviar mensagem');
    }

    // Salvar mensagem no banco (usando estrutura correta da tabela)
    const waMessageId = wsData.data?.messageId || `msg_${Date.now()}`;
    
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        whatsapp_message_id: waMessageId,
        type: mediaType ? mediaType.toUpperCase() : 'TEXT',
        direction: 'OUTGOING',
        content: messageContent,
        media_url: mediaUrl,
        sender_user_id: userId,
        sender_name: userName || 'Atendente',
        is_from_client: false
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Atualizar última mensagem da conversa
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent?.substring(0, 100) || '[Mídia]',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({ 
      success: true, 
      data: {
        messageId: message.id,
        text: message.content,
        type: (message.type || 'text').toLowerCase(),
        from_me: true,
        status: 'sent',
        created_at: message.created_at
      }
    });
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Arquivar/Desarquivar conversa
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { archive = true } = req.body;

    const { data, error } = await supabase
      .from('conversations')
      .update({ is_archived: archive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enviar mídia (imagem, vídeo, documento, áudio)
router.post('/:id/media', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, data: mediaData, filename, caption } = req.body;
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name;

    console.log('📤 Requisição de envio de mídia recebida:');
    console.log('  - Conversa ID:', id);
    console.log('  - Tipo:', type);
    console.log('  - Filename:', filename);
    console.log('  - Caption:', caption);
    console.log('  - Data size:', mediaData?.length || 0, 'caracteres');

    if (!mediaData) {
      return res.status(400).json({ success: false, error: 'Dados da mídia são obrigatórios' });
    }

    // Buscar conversa para pegar instanceId e telefone do contato
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, instance:instances(id, phone_number)')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      console.error('❌ Conversa não encontrada:', convError);
      throw new Error('Conversa não encontrada');
    }

    console.log('  - Instance ID:', conversation.instance_id);
    console.log('  - Contact Phone:', conversation.contact_phone);

    // Mapear tipo para o formato esperado pelo WhatsApp Service
    let mediaType = type;
    if (type === 'audio') {
      mediaType = 'ptt'; // Push to talk (áudio de voz)
    }

    console.log('  - Enviando para WhatsApp Service...');

    // Enviar mídia via WhatsApp Service (timeout aumentado para arquivos grandes)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minutos
    
    let wsData;
    try {
      const wsUrl = `http://localhost:3001/api/instances/${conversation.instance_id}/send-media`;
      console.log('  - URL:', wsUrl);
      
      const wsResponse = await fetch(wsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: conversation.contact_phone,
          mediaType,
          mediaData,
          filename,
          caption
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      console.log('  - Status HTTP:', wsResponse.status);
      console.log('  - Content-Type:', wsResponse.headers.get('content-type'));

      // Verificar se resposta é JSON
      const contentType = wsResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await wsResponse.text();
        console.error('❌ WhatsApp Service retornou HTML:', text.substring(0, 300));
        throw new Error('WhatsApp Service não está respondendo corretamente. Verifique se está rodando na porta 3001.');
      }

      wsData = await wsResponse.json();
      console.log('  - Resposta do WhatsApp Service:', wsData.success ? '✅ Sucesso' : '❌ Erro');

      if (!wsData.success) {
        console.error('❌ Erro do WhatsApp Service:', wsData.error);
        throw new Error(wsData.error || 'Erro ao enviar mídia');
      }
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Timeout ao enviar mídia - arquivo muito grande ou conexão lenta');
      }
      throw error;
    }

    console.log('  - Message ID:', wsData.data?.messageId);

    // Salvar mensagem no banco
    const waMessageId = wsData.data?.messageId || `msg_${Date.now()}`;
    const messageType = type.toUpperCase() === 'PTT' ? 'AUDIO' : type.toUpperCase();
    
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        whatsapp_message_id: waMessageId,
        type: messageType,
        direction: 'OUTGOING',
        content: caption || '',
        media_url: mediaData, // Guardar o base64 para exibir na interface
        sender_user_id: userId,
        sender_name: userName || 'Atendente',
        is_from_client: false,
        metadata: JSON.stringify({
          fileName: filename,
          mimetype: type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/ogg' : 'application/octet-stream'
        })
      })
      .select()
      .single();

    if (msgError) {
      console.error('❌ Erro ao salvar mensagem:', msgError);
      throw msgError;
    }

    console.log('✅ Mensagem salva no banco:', message.id);

    // Atualizar última mensagem da conversa
    const previewText = caption || `[${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : type === 'audio' ? 'Áudio' : 'Documento'}]`;
    
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: previewText.substring(0, 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({ 
      success: true, 
      data: {
        messageId: message.id,
        text: caption || '',
        type: type.toLowerCase(),
        from_me: true,
        status: 'sent',
        media_url: mediaData,
        created_at: message.created_at
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao enviar mídia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
