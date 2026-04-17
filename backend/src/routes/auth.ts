import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Públicas
router.post('/login',    login);

// Protegidas
router.get('/me',        authenticate, me);
router.post('/register', authenticate, requireRole(['admin']), register);

export default router;