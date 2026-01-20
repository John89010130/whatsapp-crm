import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();
router.use(authenticate);

// Listar etapas do Kanban (usando kanban_columns vinculada a kanban_boards)
router.get('/stages', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;

    // Buscar board padrão ou primeiro board da company
    const { data: board } = await supabase
      .from('kanban_boards')
      .select('id')
      .eq('company_id', companyId)
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    if (!board) {
      // Criar board padrão se não existir
      const { data: newBoard, error: boardError } = await supabase
        .from('kanban_boards')
        .insert({
          company_id: companyId,
          name: 'Kanban Principal',
          is_default: true
        })
        .select()
        .single();

      if (boardError) throw boardError;

      // Criar colunas padrão
      const defaultColumns = [
        { name: 'Novos', color: '#3B82F6', position: 1 },
        { name: 'Em Atendimento', color: '#F59E0B', position: 2 },
        { name: 'Aguardando', color: '#8B5CF6', position: 3 },
        { name: 'Resolvidos', color: '#10B981', position: 4 },
      ];

      for (const col of defaultColumns) {
        await supabase.from('kanban_columns').insert({
          kanban_board_id: newBoard.id,
          name: col.name,
          color: col.color,
          position: col.position
        });
      }

      // Buscar colunas criadas
      const { data: columns } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('kanban_board_id', newBoard.id)
        .order('position', { ascending: true });

      const stages = (columns || []).map(col => ({
        id: col.id,
        name: col.name,
        color: col.color,
        order: col.position,
      }));

      return res.json({ success: true, data: stages });
    }

    const { data, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('kanban_board_id', board.id)
      .order('position', { ascending: true });

    if (error) throw error;

    // Mapear campos para o frontend
    const stages = (data || []).map(col => ({
      id: col.id,
      name: col.name,
      color: col.color,
      order: col.position,
    }));

    res.json({ success: true, data: stages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar etapa
router.post('/stages', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { name, color, order } = req.body;

    // Buscar board padrão
    const { data: board } = await supabase
      .from('kanban_boards')
      .select('id')
      .eq('company_id', companyId)
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    if (!board) {
      return res.status(400).json({ success: false, error: 'Kanban board não encontrado' });
    }

    const { data: lastCol } = await supabase
      .from('kanban_columns')
      .select('position')
      .eq('kanban_board_id', board.id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = order ?? ((lastCol?.position || 0) + 1);

    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({
        kanban_board_id: board.id,
        name,
        color: color || '#6B7280',
        position
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: { id: data.id, name: data.name, color: data.color, order: data.position } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar etapa
router.put('/stages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, order } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.position = order;

    const { data, error } = await supabase
      .from('kanban_columns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Excluir etapa
router.delete('/stages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Primeiro, remover kanban_column_id das conversas nesta etapa
    await supabase
      .from('conversations')
      .update({ kanban_column_id: null })
      .eq('kanban_column_id', id);

    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter conversas para o Kanban
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;

    // Primeiro, buscar os IDs das instâncias da company
    const { data: instances } = await supabase
      .from('instances')
      .select('id')
      .eq('company_id', companyId);

    const instanceIds = (instances || []).map(i => i.id);

    if (instanceIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .in('instance_id', instanceIds)
      .neq('status', 'ARCHIVED')
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Mapear para o formato do frontend
    const kanbanConversations = (conversations || []).map(conv => ({
      id: conv.id,
      contact_name: conv.contact_name || null,
      contact_phone: conv.contact_phone || '',
      contact_avatar: conv.contact_avatar || null,
      last_message: conv.last_message_preview,
      last_message_at: conv.last_message_at,
      unread_count: conv.unread_count || 0,
      kanban_stage_id: conv.kanban_column_id,
    }));

    res.json({ success: true, data: kanbanConversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mover conversa para uma etapa do Kanban
router.post('/conversations/:id/move', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stageId } = req.body;

    const { data, error } = await supabase
      .from('conversations')
      .update({ 
        kanban_column_id: stageId,
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

export { router as kanbanRouter };
