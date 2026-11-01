import { Router } from 'express';
import { RemoteController } from '../controllers/remoteController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/token', requireRole(['SUPERADMIN', 'INSTRUCTOR']), RemoteController.generateToken);
router.post('/:id/mstsc', requireRole(['SUPERADMIN', 'INSTRUCTOR']), RemoteController.launchMstsc);
router.get('/:id/rdp', requireRole(['SUPERADMIN', 'INSTRUCTOR', 'LAB_ASSISTANT']), RemoteController.downloadRdpFile);

export default router;
