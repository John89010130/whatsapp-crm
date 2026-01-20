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
    console.log('🗑️ Limpando mensagens da instância:', id);

    // Buscar todas as conversas da instância
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('instance_id', id);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      
      // Deletar mensagens
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);

      if (msgError) {
        console.error('Erro ao deletar mensagens:', msgError);
      }

      // Deletar conversas
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('instance_id', id);

      if (convError) {
        console.error('Erro ao deletar conversas:', convError);
      }

      console.log(`✅ Limpas ${conversations.length} conversas e suas mensagens`);
    }

    res.json({ success: true, message: 'Mensagens e conversas removidas' });
  } catch (error: any) {
    console.error('Erro ao limpar mensagens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as instanceRouter };

