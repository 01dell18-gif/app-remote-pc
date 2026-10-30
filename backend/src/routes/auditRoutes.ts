import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['SUPERADMIN', 'INSTRUCTOR']));

router.get('/logs', AuditController.getLogs);

export default router;
