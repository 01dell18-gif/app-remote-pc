import { Router } from 'express';
import { ClassroomController } from '../controllers/classroomController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/lock', requireRole(['SUPERADMIN', 'INSTRUCTOR']), ClassroomController.lockClassroom);
router.get('/lock/:labId', ClassroomController.getLockState);

export default router;
