import { Router } from 'express';
import { WorkstationController } from '../controllers/workstationController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/export', requireRole(['SUPERADMIN', 'INSTRUCTOR', 'LAB_ASSISTANT']), WorkstationController.exportWorkstations);
router.post('/import', requireRole(['SUPERADMIN', 'INSTRUCTOR']), WorkstationController.importWorkstations);
router.post('/scan-network', requireRole(['SUPERADMIN', 'INSTRUCTOR']), WorkstationController.scanNetwork);
router.post('/:id/ping', requireRole(['SUPERADMIN', 'INSTRUCTOR', 'LAB_ASSISTANT']), WorkstationController.pingWorkstation);
router.post('/', requireRole(['SUPERADMIN', 'INSTRUCTOR']), WorkstationController.createWorkstation);
router.put('/:id', requireRole(['SUPERADMIN', 'INSTRUCTOR']), WorkstationController.updateWorkstation);
router.delete('/:id', requireRole(['SUPERADMIN', 'INSTRUCTOR']), WorkstationController.deleteWorkstation);

export default router;
