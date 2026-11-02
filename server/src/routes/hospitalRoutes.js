import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/hospitalController.js';

const router = Router();
router.use(requireAuth, requireRole('HOSPITAL'));
router.get('/dashboard', controller.dashboard);
router.post('/proposals/:id/decision', controller.decide);
router.put('/beds/:bedType', controller.updateBed);

export default router;
