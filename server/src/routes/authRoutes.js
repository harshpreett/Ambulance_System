import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { csrf, login, logout, currentUser } from '../controllers/authController.js';
import { loginSchema } from '../validators/index.js';
import { badRequest } from '../utils/httpError.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 100 : 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' } } });

router.get('/csrf', csrf);
router.post('/login', loginLimiter, (request, _response, next) => {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) return next(badRequest('Email and password are required.', result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))));
  request.body = result.data;
  return next();
}, login);
router.post('/logout', requireAuth, logout);
router.get('/me', currentUser);

export default router;
