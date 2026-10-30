import { Router } from 'express';
import { ExecutionController } from '../controllers/executionController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/presets', ExecutionController.getPresets);
router.get('/restrictions', ExecutionController.getRestrictions);
router.post('/restrictions', requireRole(['SUPERADMIN', 'INSTRUCTOR']), ExecutionController.applyRestriction);
router.post('/launch', requireRole(['SUPERADMIN', 'INSTRUCTOR']), ExecutionController.launchApp);
router.post('/terminate', requireRole(['SUPERADMIN', 'INSTRUCTOR']), ExecutionController.terminateApp);

export default router;
