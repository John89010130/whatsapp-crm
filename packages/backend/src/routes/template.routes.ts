import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();
router.use(authenticate);

// List templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const { category } = req.query;

    let query = supabase
      .from('templates')
      .select('*')
      .eq('company_id', authReq.user.companyId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar templates' });
  }
});

// Create template
router.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const { name, content, shortcut, category, variables } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Conteúdo é obrigatório' });
    }

    const { data, error } = await supabase
      .from('templates')
      .insert({
        company_id: authReq.user.companyId,
        name: name || shortcut || 'Template',
        content,
        shortcut,
        category,
        variables: variables || [],
        created_by_user_id: authReq.user.userId
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar template' });
  }
});

// Get template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('company_id', authReq.user.companyId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar template' });
  }
});

// Update template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const { id } = req.params;
    const { name, content, shortcut, category, variables } = req.body;

    const { data, error } = await supabase
      .from('templates')
      .update({
        name,
        content,
        shortcut,
        category,
        variables: variables || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', authReq.user.companyId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar template' });
  }
});

// Delete template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const { id } = req.params;

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('company_id', authReq.user.companyId);

    if (error) throw error;

    res.json({ success: true, message: 'Template excluído' });
  } catch (error) {
    console.error('Erro ao excluir template:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir template' });
  }
});

export { router as templateRouter };
