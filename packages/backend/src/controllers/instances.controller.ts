import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const companySupabase = createClient(
  config.companySupabaseUrl,
  config.companySupabaseKey
);

export class InstancesController {
  async list(req: AuthRequest, res: Response) {
    try {
      const { data: instances, error } = await companySupabase
        .from('instances')
        .select('*')
        .eq('company_id', req.user!.companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar instâncias' 
        });
      }

      res.json({
        success: true,
        data: instances || []
      });
    } catch (error) {
      console.error('List instances error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { name } = req.body;

      console.log('📝 Criar instância:', { name, user: req.user?.email, companyId: req.user?.companyId });

      if (!name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Nome da instância é obrigatório' 
        });
      }

      if (!req.user?.companyId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Company ID não encontrado' 
        });
      }

      const { data: instance, error } = await companySupabase
        .from('instances')
        .insert({
          company_id: req.user.companyId,
          name,
          status: 'DISCONNECTED',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao criar instância: ' + error.message 
        });
      }

      console.log('✅ Instância criada:', instance.id);

      res.json({
        success: true,
        data: instance
      });
    } catch (error: any) {
      console.error('❌ Create instance error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno: ' + error.message 
      });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const { data: instance, error } = await companySupabase
        .from('instances')
        .select('*')
        .eq('id', id)
        .eq('company_id', req.user!.companyId)
        .single();

      if (error || !instance) {
        return res.status(404).json({ 
          success: false, 
          error: 'Instância não encontrada' 
        });
      }

      res.json({
        success: true,
        data: instance
      });
    } catch (error) {
      console.error('Get instance error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, webhook_url, is_active } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: instance, error } = await companySupabase
        .from('instances')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', req.user!.companyId)
        .select()
        .single();

      if (error || !instance) {
        return res.status(404).json({ 
          success: false, 
          error: 'Instância não encontrada' 
        });
      }

      res.json({
        success: true,
        data: instance
      });
    } catch (error) {
      console.error('Update instance error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const { error } = await companySupabase
        .from('instances')
        .delete()
        .eq('id', id)
        .eq('company_id', req.user!.companyId);

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao deletar instância' 
        });
      }

      res.json({
        success: true,
        message: 'Instância deletada com sucesso'
      });
    } catch (error) {
      console.error('Delete instance error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
}
