import { Router } from 'express';
import { PowerController } from '../controllers/powerController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['SUPERADMIN', 'INSTRUCTOR']));

router.post('/wol', PowerController.wakeOnLan);
router.post('/shutdown', PowerController.shutdown);
router.post('/reboot', PowerController.reboot);

export default router;
