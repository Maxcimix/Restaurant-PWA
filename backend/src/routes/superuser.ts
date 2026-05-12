import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { getSuperuserConfig, updateSuperuserConfig } from '../controllers/superuserController';

const router = Router();

router.use(authenticate, requireRole(['superusuario']));
router.get('/config',  getSuperuserConfig);
router.put('/config',  updateSuperuserConfig);

export default router;