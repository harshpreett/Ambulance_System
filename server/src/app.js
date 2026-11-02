import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { attachSession, requireCsrf } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import operatorRoutes from './routes/operatorRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

export const app = express();

app.disable('x-powered-by');
app.use((request, response, next) => {
  request.id = randomUUID();
  response.setHeader('X-Request-Id', request.id);
  next();
});
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(attachSession);
app.use('/api', requireCsrf);

app.get('/api/health', (_request, response) => response.json({ status: 'ok', demo: true, service: 'ambulance-dispatch-api' }));
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', notFoundHandler);
app.use(errorHandler);

export default app;
