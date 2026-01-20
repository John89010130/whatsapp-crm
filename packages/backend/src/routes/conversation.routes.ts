import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => res.json({ message: 'List conversations' }));
router.get('/:id', (req, res) => res.json({ message: 'Get conversation' }));
router.post('/:id/messages', (req, res) => res.json({ message: 'Send message' }));
router.post('/:id/assign', (req, res) => res.json({ message: 'Assign conversation' }));
router.post('/:id/close', (req, res) => res.json({ message: 'Close conversation' }));
router.post('/:id/notes', (req, res) => res.json({ message: 'Add note' }));
router.post('/:id/tags', (req, res) => res.json({ message: 'Add tag' }));

export { router as conversationRouter };
