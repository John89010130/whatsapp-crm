import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { LoginRequest } from '@whatsapp-crm/shared';
import { createClient } from '@supabase/supabase-js';

const companySupabase = createClient(
  config.companySupabaseUrl,
  config.companySupabaseKey
);

export class AuthController {
  async login(req: AuthRequest, res: Response) {
    try {
      const { email, password }: LoginRequest = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email e senha são obrigatórios' 
        });
      }

      // Get user from Company database
      const { data: users, error } = await companySupabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .limit(1);

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar usuário' 
        });
      }

      if (!users || users.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Email ou senha inválidos' 
        });
      }

      const user = users[0];

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuário inativo' 
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false, 
          error: 'Email ou senha inválidos' 
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          name: user.name,
          role: user.role,
          companyId: user.company_id
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // Return user without password
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
  
  async register(req: AuthRequest, res: Response) {
    try {
      // TODO: Implement registration logic
      res.json({ success: true, message: 'User registered' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }
  
  async refreshToken(req: AuthRequest, res: Response) {
    try {
      // TODO: Implement token refresh logic
      res.json({ success: true, data: { token: 'new_token' } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Token refresh failed' });
    }
  }
  
  async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Não autenticado' 
        });
      }

      // Get user from database
      const { data: users, error } = await companySupabase
        .from('users')
        .select('*')
        .eq('id', req.user.userId)
        .limit(1);

      if (error || !users || users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuário não encontrado' 
        });
      }

      const { password_hash, ...userWithoutPassword } = users[0];

      res.json({ 
        success: true, 
        data: userWithoutPassword 
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar usuário' 
      });
    }
  }
}

