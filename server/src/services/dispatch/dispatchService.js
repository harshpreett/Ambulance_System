import { prisma } from '../../database/prisma.js';
import { TRIP_TRANSITIONS } from '../../config/constants.js';
import { conflict, forbidden, notFound } from '../../utils/httpError.js';
import { notifyAdmins, notifyUser, recordEvent } from '../notification/notificationService.js';
import { offerNextAmbulance, releaseAllRequestResources } from '../matching/matchingService.js';
import { caseInclude, serializeCase } from '../caseView.js';

export async function getOperatorDashboard(user) {
  if (!user.ambulanceId) throw forbidden('This operator account is not linked to an ambulance.');
  const assignments = await prisma.dispatchAssignment.findMany({
    where: { ambulanceId: user.ambulanceId, isCurrent: true, state: { in: ['OFFERED', 'ACCEPTED'] } },
    include: { request: { include: caseInclude } },
    orderBy: { offeredAt: 'desc' },
  });
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 25 });
  return {
    ambulance: await prisma.ambulance.findUnique({ where: { id: user.ambulanceId }, include: { capabilities: true } }),
    offers: assignments.filter((item) => item.state === 'OFFERED').map((item) => ({ assignmentId: item.id, ...serializeCase(item.request, true) })),
    activeTrips: assignments.filter((item) => item.state === 'ACCEPTED').map((item) => ({ assignmentId: item.id, ...serializeCase(item.request, true) })),
    notifications,
  };
}

export async function decideAssignment(user, assignmentId, decision, reason = null) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.dispatchAssignment.findUnique({ where: { id: assignmentId }, include: { request: { include: { requirements: true } } } });
    if (!assignment) throw notFound('Assignment offer was not found.');
    if (!user.ambulanceId || assignment.ambulanceId !== user.ambulanceId || assignment.operatorId !== user.id) throw forbidden();
    if (!assignment.isCurrent || assignment.state !== 'OFFERED') throw conflict('This offer is no longer available. Refresh your dashboard.');
    if (assignment.expiresAt <= new Date()) throw conflict('This offer has expired. Refresh your dashboard for the next offer.');

    if (decision === 'ACCEPT') {
      await tx.dispatchAssignment.update({ where: { id: assignment.id }, data: { state: 'ACCEPTED', respondedAt: new Date() } });
      await tx.ambulance.update({ where: { id: assignment.ambulanceId }, data: { status: 'ASSIGNED' } });
      const updated = await tx.emergencyRequest.update({ where: { id: assignment.requestId }, data: { status: 'ACCEPTED' } });
      await recordEvent(tx, assignment.requestId, user.id, assignment.request.status, 'ACCEPTED', 'Ambulance operator accepted the offer.');
      const proposal = await tx.hospitalProposal.findFirst({ where: { requestId: assignment.requestId, isCurrent: true }, include: { hospital: true } });
      const staff = proposal ? await tx.user.findFirst({ where: { hospitalId: proposal.hospitalId, active: true } }) : null;
      await notifyUser(tx, staff?.id, assignment.requestId, 'OPERATOR_ACCEPTED', `Ambulance accepted case ${assignment.request.publicReference}.`);
      await notifyAdmins(tx, assignment.requestId, `Ambulance accepted case ${assignment.request.publicReference}.`, 'CASE_UPDATE');
      const full = await tx.emergencyRequest.findUnique({ where: { id: updated.id }, include: caseInclude });
      return serializeCase(full, true);
    }

    await tx.dispatchAssignment.update({ where: { id: assignment.id }, data: { state: 'DECLINED', isCurrent: false, respondedAt: new Date(), declineReason: reason || 'Operator declined the offer.' } });
    await tx.ambulance.update({ where: { id: assignment.ambulanceId }, data: { status: 'AVAILABLE' } });
    await recordEvent(tx, assignment.requestId, user.id, assignment.request.status, assignment.request.status, `Ambulance offer declined${reason ? `: ${reason}` : '.'}`);
    await offerNextAmbulance(tx, assignment.request, user.id);
    const full = await tx.emergencyRequest.findUnique({ where: { id: assignment.requestId }, include: caseInclude });
    return serializeCase(full, true);
  });
}

export async function updateTripStatus(user, reference, nextStatus, note = null) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyRequest.findUnique({ where: { publicReference: reference }, include: { assignments: true, proposals: true } });
    if (!request) throw notFound('Case was not found.');
    const assignment = request.assignments.find((item) => item.isCurrent && item.state === 'ACCEPTED');
    if (!assignment || assignment.operatorId !== user.id || assignment.ambulanceId !== user.ambulanceId) throw forbidden();
    const expected = TRIP_TRANSITIONS[request.status];
    if (!expected || expected !== nextStatus) throw conflict(`Invalid trip update. The next allowed status is ${expected || 'none'}.`);
    if (nextStatus === 'EN_ROUTE_TO_CALLER') {
      const confirmedHospital = request.proposals.find((item) => item.isCurrent && item.state === 'ACCEPTED');
      if (!confirmedHospital) throw conflict('The hospital must confirm readiness before the ambulance begins the trip.');
    }
    const updated = await tx.emergencyRequest.update({ where: { id: request.id }, data: { status: nextStatus } });
    await recordEvent(tx, request.id, user.id, request.status, nextStatus, note);

    if (nextStatus === 'CLOSED') {
      await tx.dispatchAssignment.update({ where: { id: assignment.id }, data: { state: 'COMPLETED', isCurrent: false, respondedAt: new Date() } });
      await tx.ambulance.update({ where: { id: assignment.ambulanceId }, data: { status: 'AVAILABLE' } });
      const proposals = await tx.hospitalProposal.findMany({ where: { requestId: request.id, isCurrent: true }, include: { holds: true } });
      for (const proposal of proposals) {
        for (const hold of proposal.holds.filter((item) => !item.releasedAt)) {
          await tx.hospitalBed.update({ where: { id: hold.hospitalBedId }, data: { heldCount: { decrement: 1 } } });
          await tx.hospitalCapacityHold.update({ where: { id: hold.id }, data: { releasedAt: new Date() } });
        }
        await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { bedHeld: false, isCurrent: false, state: 'COMPLETED' } });
      }
      await notifyAdmins(tx, request.id, `Case ${request.publicReference} is closed.`, 'CASE_CLOSED');
    } else {
      await notifyAdmins(tx, request.id, `Case ${request.publicReference} moved to ${nextStatus}.`, 'CASE_UPDATE');
    }
    const full = await tx.emergencyRequest.findUnique({ where: { id: updated.id }, include: caseInclude });
    return serializeCase(full, true);
  });
}

export async function cancelCaseAsAdmin(user, requestId, reason) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyRequest.findUnique({ where: { id: requestId } });
    if (!request) throw notFound('Case was not found.');
    if (['CLOSED', 'CANCELLED'].includes(request.status)) throw conflict('This case is already closed.');
    await releaseAllRequestResources(tx, request.id);
    const updated = await tx.emergencyRequest.update({ where: { id: request.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    await recordEvent(tx, request.id, user.id, request.status, 'CANCELLED', reason);
    await notifyAdmins(tx, request.id, `Case ${request.publicReference} was cancelled by an administrator.`, 'CASE_CANCELLED');
    return serializeCase(await tx.emergencyRequest.findUnique({ where: { id: updated.id }, include: caseInclude }), true);
  });
}
