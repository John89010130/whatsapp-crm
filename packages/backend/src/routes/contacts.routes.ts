import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Listar contatos
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,push_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      total: count
    });
  } catch (error: any) {
    console.error('Erro ao listar contatos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter contato específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar contato
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tags, custom_fields, is_blocked } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (tags !== undefined) updates.tags = tags;
    if (custom_fields !== undefined) updates.custom_fields = custom_fields;
    if (is_blocked !== undefined) updates.is_blocked = is_blocked;

    const { data, error } = await supabase
      .from('contacts')
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

// Bloquear/Desbloquear contato
router.post('/:id/block', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { block = true } = req.body;

    const { data, error } = await supabase
      .from('contacts')
      .update({ is_blocked: block })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
