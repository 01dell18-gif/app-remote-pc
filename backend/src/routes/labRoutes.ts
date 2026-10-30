import { Router } from 'express';
import { LabController } from '../controllers/labController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', LabController.getAllLabs);
router.get('/:id/workstations', LabController.getLabWorkstations);
router.post('/', requireRole(['SUPERADMIN']), LabController.createLab);

export default router;
