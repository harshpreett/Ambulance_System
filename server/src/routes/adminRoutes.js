import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as controller from '../controllers/adminController.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));
router.get('/dashboard', controller.dashboard);
router.get('/requests', controller.cases);
router.get('/requests/:id', controller.caseDetail);
router.post('/requests/:id/retry-matching', controller.retryMatching);
router.post('/requests/:id/assign', controller.manualAssignment);
router.post('/requests/:id/cancel', controller.cancelCase);
router.get('/ambulances', controller.ambulances);
router.post('/ambulances', controller.createAmbulance);
router.put('/ambulances/:id', controller.updateAmbulance);
router.delete('/ambulances/:id', controller.deactivateAmbulance);
router.get('/hospitals', controller.hospitals);
router.post('/hospitals', controller.createHospital);
router.put('/hospitals/:id', controller.updateHospital);
router.delete('/hospitals/:id', controller.deactivateHospital);
router.get('/users', controller.users);
router.post('/users', controller.createUser);
router.patch('/users/:id', controller.updateUser);
router.get('/reports/summary', controller.reports);
router.get('/audit', controller.audit);

export default router;
