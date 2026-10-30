import { Router } from 'express';
import { RemoteController } from '../controllers/remoteController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['SUPERADMIN', 'INSTRUCTOR']));

router.post('/token', RemoteController.generateToken);

export default router;
