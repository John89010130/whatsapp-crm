import { Request } from 'express';
import { UserRole } from '@whatsapp-crm/shared';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role: UserRole;
    companyId: string;
    company_id: string;
  };
}
