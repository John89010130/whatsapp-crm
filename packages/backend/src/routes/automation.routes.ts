import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();
router.use(authenticate);

// Listar automações
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Mapear para formato esperado pelo frontend
    const automations = (data || []).map(auto => ({
      id: auto.id,
      name: auto.name,
      trigger_type: auto.trigger?.type || 'NEW_CONVERSATION',
      trigger_config: auto.trigger?.config || {},
      actions: auto.actions || [],
      is_active: auto.is_active,
      created_at: auto.created_at
    }));

    res.json({ success: true, data: automations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar automação
router.post('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { name, trigger_type, trigger_config, actions, is_active } = req.body;

    // Converter para formato da tabela
    const trigger = {
      type: trigger_type,
      config: trigger_config || {}
    };

    const { data, error } = await supabase
      .from('automations')
      .insert({
        company_id: companyId,
        name,
        trigger,
        actions: actions || [],
        is_active: is_active ?? true
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter automação
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar automação
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, trigger_type, trigger_config, actions, is_active } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (trigger_type !== undefined || trigger_config !== undefined) {
      // Buscar trigger atual para merge
      const { data: current } = await supabase
        .from('automations')
        .select('trigger')
        .eq('id', id)
        .single();
      
      updates.trigger = {
        type: trigger_type || current?.trigger?.type,
        config: trigger_config || current?.trigger?.config || {}
      };
    }
    if (actions !== undefined) updates.actions = actions;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('automations')
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

// Excluir automação
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle ativo/inativo
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar estado atual
    const { data: current } = await supabase
      .from('automations')
      .select('is_active')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('automations')
      .update({ 
        is_active: !current?.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as automationRouter };
