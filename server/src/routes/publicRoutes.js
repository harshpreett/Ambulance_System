import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { submitRequest, statusLookup, callerCancel } from '../controllers/publicController.js';

const router = Router();
const lookupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const createLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/requests', createLimiter, submitRequest);
router.post('/requests/status-lookup', lookupLimiter, statusLookup);
router.post('/requests/:reference/cancel', lookupLimiter, callerCancel);

export default router;
