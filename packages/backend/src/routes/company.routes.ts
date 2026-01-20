import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Company routes placeholder
router.get('/', (req, res) => {
  res.json({ message: 'List companies' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create company' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get company' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update company' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete company' });
});

export { router as companyRouter };
