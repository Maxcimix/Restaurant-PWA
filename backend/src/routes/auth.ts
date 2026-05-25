// backend/src/routes/auth.ts
import { Router } from 'express';
import { login, me, register, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Públicas
router.post('/login',   login);

// Requiere token válido (no necesita rol específico)
router.post('/logout',  authenticate, logout);
router.get('/me',       authenticate, me);

// Solo admin
router.post('/register', authenticate, requireRole(['admin']), register);

export default router;