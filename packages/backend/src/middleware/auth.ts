import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '@whatsapp-crm/shared';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name?: string;
    role: UserRole;
    companyId: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      companyId: decoded.companyId
    };
    
    // Mapear campos adicionais para compatibilidade
    (req as any).user.id = decoded.userId;
    
    console.log('✅ Autenticado:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Token inválido:', error);
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
};
