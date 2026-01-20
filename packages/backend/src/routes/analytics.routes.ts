import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/dashboard', (req, res) => res.json({ message: 'Dashboard analytics' }));
router.get('/conversations', (req, res) => res.json({ message: 'Conversation analytics' }));
router.get('/attendants', (req, res) => res.json({ message: 'Attendant analytics' }));
router.get('/response-time', (req, res) => res.json({ message: 'Response time analytics' }));

export { router as analyticsRouter };
