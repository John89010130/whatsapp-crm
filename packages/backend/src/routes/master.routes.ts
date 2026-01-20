import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@whatsapp-crm/shared';

const router = Router();

// Todas as rotas requerem autenticação MASTER
router.use(authenticate);
router.use(authorize(UserRole.MASTER));

// Master routes placeholder
router.get('/owners', (req, res) => {
  res.json({ message: 'List owners' });
});

router.post('/owners', (req, res) => {
  res.json({ message: 'Create owner' });
});

router.get('/plans', (req, res) => {
  res.json({ message: 'List plans' });
});

export { router as masterRouter };
