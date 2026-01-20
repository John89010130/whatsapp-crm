import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { InstancesController } from '../controllers/instances.controller';
import { supabase } from '../config/supabase';

const router = Router();
const instancesController = new InstancesController();

router.use(authenticate);

router.get('/', instancesController.list.bind(instancesController));
router.post('/', instancesController.create.bind(instancesController));
router.get('/:id', instancesController.get.bind(instancesController));
router.put('/:id', instancesController.update.bind(instancesController));
router.delete('/:id', instancesController.delete.bind(instancesController));

// Limpar mensagens e conversas de uma instância
router.delete('/:id/clear-messages', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Iniciando limpeza completa da instância:', id);

    let deletedMessages = 0;
    let deletedConversations = 0;
    let deletedContacts = 0;

    // 1. Buscar todas as conversas da instância
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('instance_id', id);

    if (fetchError) {
      console.error('❌ Erro ao buscar conversas:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Encontradas ${conversations?.length || 0} conversas`);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      
      // 2. Deletar mensagens (em lotes se necessário)
      console.log('🗑️ Deletando mensagens...');
      const { data: deletedMsgs, error: msgError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds)
        .select('id');

      if (msgError) {
        console.error('❌ Erro ao deletar mensagens:', msgError);
      } else {
        deletedMessages = deletedMsgs?.length || 0;
        console.log(`✅ ${deletedMessages} mensagens deletadas`);
      }

      // 3. Deletar conversas
      console.log('🗑️ Deletando conversas...');
      const { data: deletedConvs, error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('instance_id', id)
        .select('id');

      if (convError) {
        console.error('❌ Erro ao deletar conversas:', convError);
      } else {
        deletedConversations = deletedConvs?.length || 0;
        console.log(`✅ ${deletedConversations} conversas deletadas`);
      }
    }

    // 4. Deletar contatos da instância
    console.log('🗑️ Deletando contatos...');
    const { data: deletedCtcs, error: contactError } = await supabase
      .from('contacts')
      .delete()
      .eq('instance_id', id)
      .select('id');

    if (contactError) {
      console.error('❌ Erro ao deletar contatos:', contactError);
    } else {
      deletedContacts = deletedCtcs?.length || 0;
      console.log(`✅ ${deletedContacts} contatos deletados`);
    }

    console.log(`✅ Limpeza completa finalizada:
      - ${deletedMessages} mensagens
      - ${deletedConversations} conversas
      - ${deletedContacts} contatos`);

    res.json({ 
      success: true, 
      message: 'Dados removidos com sucesso',
      data: {
        messages: deletedMessages,
        conversations: deletedConversations,
        contacts: deletedContacts
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao limpar mensagens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as instanceRouter };

