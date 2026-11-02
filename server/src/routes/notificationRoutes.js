import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications, markRead } from '../controllers/notificationController.js';

const router = Router();
router.use(requireAuth);
router.get('/', listNotifications);
router.post('/:id/read', markRead);

export default router;
