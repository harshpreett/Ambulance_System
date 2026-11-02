import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/operatorController.js';

const router = Router();
router.use(requireAuth, requireRole('OPERATOR'));
router.get('/dashboard', controller.dashboard);
router.post('/assignments/:id/decision', controller.decide);
router.post('/requests/:reference/trip-status', controller.updateStatus);

export default router;
