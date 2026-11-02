import { prisma } from '../database/prisma.js';
import { notFound } from '../utils/httpError.js';

export async function listNotifications(request, response) {
  const notifications = await prisma.notification.findMany({ where: { userId: request.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  response.json({ notifications });
}

export async function markRead(request, response) {
  const result = await prisma.notification.updateMany({ where: { id: Number(request.params.id), userId: request.user.id, readAt: null }, data: { readAt: new Date() } });
  if (!result.count) {
    const exists = await prisma.notification.findFirst({ where: { id: Number(request.params.id), userId: request.user.id } });
    if (!exists) throw notFound('Notification was not found.');
  }
  response.json({ success: true });
}
