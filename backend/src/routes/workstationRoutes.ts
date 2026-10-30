import { Router } from 'express';
import { WorkstationController } from '../controllers/workstationController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(['SUPERADMIN']), WorkstationController.createWorkstation);
router.put('/:id', requireRole(['SUPERADMIN']), WorkstationController.updateWorkstation);
router.delete('/:id', requireRole(['SUPERADMIN']), WorkstationController.deleteWorkstation);

export default router;
