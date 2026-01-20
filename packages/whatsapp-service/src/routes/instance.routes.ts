import { Router } from 'express';
import { WhatsAppManager } from '../whatsapp/manager';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Create Supabase client from environment
const companySupabase = createClient(
  process.env.COMPANY_SUPABASE_URL!,
  process.env.COMPANY_SUPABASE_KEY!
);

// Create/Connect instance
router.post('/:instanceId/connect', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { phoneNumber } = req.body; // Número para pairing code (opcional)
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    console.log('📱 Conectando instância:', instanceId, phoneNumber ? '(com pairing code)' : '(QR Code)');
    
    // Update database status to CONNECTING
    await companySupabase
      .from('instances')
      .update({ status: 'CONNECTING' })
      .eq('id', instanceId);
    
    const instance = await manager.createInstance(instanceId, phoneNumber);
    
    res.json({
      success: true,
      data: {
        id: instance.id,
        status: instance.status,
        qrCode: instance.qrCode,
        phoneNumber: instance.phoneNumber,
        pairingCode: instance.pairingCode
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao conectar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset instance (clear session and reconnect with new QR)
router.post('/:instanceId/reset', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    console.log('🔄 Resetando instância:', instanceId);
    
    // Force clear session and create new
    const instance = await manager.resetInstance(instanceId);
    
    res.json({
      success: true,
      data: {
        id: instance.id,
        status: instance.status,
        qrCode: instance.qrCode,
        message: 'Session cleared. New QR code will be generated.'
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao resetar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect instance
router.post('/:instanceId/disconnect', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    console.log('📱 Desconectando instância:', instanceId);
    
    await manager.disconnectInstance(instanceId);
    
    // Update database
    await companySupabase
      .from('instances')
      .update({ 
        status: 'DISCONNECTED',
        qr_code: null,
        phone_number: null
      })
      .eq('id', instanceId);
    
    res.json({
      success: true,
      message: 'Instance disconnected'
    });
  } catch (error: any) {
    console.error('❌ Erro ao desconectar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sync progress
router.get('/:instanceId/sync-progress', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    const progress = manager.getSyncProgress(instanceId);
    
    if (!progress) {
      return res.json({
        success: true,
        data: {
          status: 'idle',
          totalMessages: 0,
          processedMessages: 0,
          totalConversations: 0,
          processedConversations: 0,
          mediaDownloaded: 0,
          mediaFailed: 0
        }
      });
    }
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter progresso:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get instance status
router.get('/:instanceId/status', (req, res) => {
  try {
    const { instanceId } = req.params;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    const instance = manager.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    
    res.json({
      success: true,
      data: {
        id: instance.id,
        status: instance.status,
        qrCode: instance.qrCode,
        phoneNumber: instance.phoneNumber
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect instance
router.post('/:instanceId/disconnect', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    await manager.disconnectInstance(instanceId);
    
    res.json({ success: true, message: 'Instance disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send message
router.post('/:instanceId/send', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { phone, message, text, mediaUrl, mediaType } = req.body;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    const messageContent = message || text;
    const messageId = await manager.sendMessage(instanceId, phone, messageContent, mediaUrl, mediaType);
    
    res.json({ 
      success: true, 
      message: 'Message sent',
      data: { messageId }
    });
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send media (image, video, document, audio)
router.post('/:instanceId/send-media', async (req, res) => {
  try {
    console.log('📥 Recebido request send-media');
    console.log('  - instanceId:', req.params.instanceId);
    console.log('  - Body keys:', Object.keys(req.body));
    console.log('  - Content-Type:', req.headers['content-type']);
    console.log('  - Content-Length:', req.headers['content-length']);
    
    const { instanceId } = req.params;
    const { phone, mediaType, mediaData, filename, caption } = req.body;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    if (!phone || !mediaType || !mediaData) {
      console.error('❌ Faltando parâmetros obrigatórios');
      return res.status(400).json({ 
        success: false, 
        error: 'phone, mediaType e mediaData são obrigatórios' 
      });
    }
    
    console.log('  - phone:', phone);
    console.log('  - mediaType:', mediaType);
    console.log('  - mediaData length:', mediaData?.length || 0);
    console.log('  - filename:', filename);
    
    const messageId = await manager.sendMedia(instanceId, phone, mediaType, mediaData, filename, caption);
    
    console.log('✅ Mídia enviada com sucesso, messageId:', messageId);
    
    res.json({ 
      success: true, 
      message: 'Media sent',
      data: { messageId }
    });
  } catch (error: any) {
    console.error('❌ Erro ao enviar mídia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get group metadata (name, participants, etc)
router.get('/:instanceId/group-metadata/:groupId', async (req, res) => {
  try {
    const { instanceId, groupId } = req.params;
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    
    const instance = manager.getInstance(instanceId);
    if (!instance || !instance.socket) {
      return res.status(404).json({ success: false, error: 'Instance not connected' });
    }
    
    // Construir JID do grupo
    const groupJid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
    
    const groupMetadata = await instance.socket.groupMetadata(groupJid);
    
    res.json({
      success: true,
      data: {
        id: groupMetadata.id,
        subject: groupMetadata.subject,
        owner: groupMetadata.owner,
        creation: groupMetadata.creation,
        participants: groupMetadata.participants?.map(p => ({
          id: p.id,
          admin: p.admin
        }))
      }
    });
  } catch (error: any) {
    // Silenciar erros de metadados (grupo pode não existir mais, etc)
    res.json({ success: false, error: error.message });
  }
});

// List active instances
router.get('/', (req, res) => {
  try {
    const manager: WhatsAppManager = req.app.locals.whatsappManager;
    const activeInstances = manager.getActiveInstances();
    
    res.json({ success: true, data: activeInstances });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as instanceRouter };
