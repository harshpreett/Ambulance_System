export async function notifyUser(tx, userId, requestId, type, message) {
  if (!userId) return null;
  return tx.notification.create({ data: { userId, requestId: requestId ?? null, type, message } });
}

export async function notifyAdmins(tx, requestId, message, type = 'CASE_REVIEW') {
  const admins = await tx.user.findMany({ where: { role: 'ADMIN', active: true }, select: { id: true } });
  for (const admin of admins) await notifyUser(tx, admin.id, requestId, type, message);
}

export async function recordEvent(tx, requestId, actorUserId, oldStatus, newStatus, note = null) {
  return tx.tripStatusEvent.create({ data: { requestId, actorUserId: actorUserId ?? null, oldStatus, newStatus, note } });
}

export async function recordAudit(tx, actorId, action, entityType, entityId, reason = null) {
  return tx.auditLog.create({ data: { actorId, action, entityType, entityId: String(entityId), reason } });
}
