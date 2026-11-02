import { prisma } from '../../database/prisma.js';
import { conflict, forbidden, notFound } from '../../utils/httpError.js';
import { notifyAdmins, notifyUser, recordAudit, recordEvent } from '../notification/notificationService.js';
import { proposeNextHospital } from '../matching/matchingService.js';
import { caseInclude, serializeCase } from '../caseView.js';

export async function getHospitalDashboard(user) {
  if (!user.hospitalId) throw forbidden('This staff account is not linked to a hospital.');
  const proposals = await prisma.hospitalProposal.findMany({
    where: { hospitalId: user.hospitalId, isCurrent: true, state: { in: ['PENDING', 'ACCEPTED'] } },
    include: { request: { include: caseInclude } },
    orderBy: { offeredAt: 'desc' },
  });
  const beds = await prisma.hospitalBed.findMany({ where: { hospitalId: user.hospitalId }, orderBy: { bedType: 'asc' } });
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 25 });
  return {
    hospital: await prisma.hospital.findUnique({ where: { id: user.hospitalId }, include: { specialties: true } }),
    proposals: proposals.map((item) => ({ proposalId: item.id, ...serializeCase(item.request, false), proposalState: item.state })),
    beds,
    notifications,
  };
}

export async function decideHospitalProposal(user, proposalId, decision, reason = null) {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.hospitalProposal.findUnique({ where: { id: proposalId }, include: { request: { include: { requirements: true } }, holds: true } });
    if (!proposal) throw notFound('Hospital proposal was not found.');
    if (!user.hospitalId || proposal.hospitalId !== user.hospitalId) throw forbidden();
    if (!proposal.isCurrent || proposal.state !== 'PENDING') throw conflict('This proposal is no longer available. Refresh your dashboard.');
    if (decision === 'ACCEPT') {
      if (!proposal.bedHeld || proposal.holds.some((hold) => hold.releasedAt)) throw conflict('The sample capacity hold is no longer active.');
      await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { state: 'ACCEPTED', respondedAt: new Date() } });
      await recordEvent(tx, proposal.requestId, user.id, proposal.request.status, proposal.request.status, 'Hospital staff confirmed readiness.');
      const assignment = await tx.dispatchAssignment.findFirst({ where: { requestId: proposal.requestId, isCurrent: true }, include: { ambulance: { include: { operator: true } } } });
      await notifyUser(tx, assignment?.ambulance.operator?.id, proposal.requestId, 'HOSPITAL_CONFIRMED', `Hospital confirmed case ${proposal.request.publicReference}.`);
      await notifyAdmins(tx, proposal.requestId, `Hospital confirmed case ${proposal.request.publicReference}.`, 'HOSPITAL_CONFIRMED');
    } else {
      await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { state: 'DECLINED', isCurrent: false, respondedAt: new Date(), declineReason: reason || 'Hospital declined the proposal.', bedHeld: false } });
      for (const hold of proposal.holds.filter((item) => !item.releasedAt)) {
        await tx.hospitalBed.update({ where: { id: hold.hospitalBedId }, data: { heldCount: { decrement: 1 } } });
        await tx.hospitalCapacityHold.update({ where: { id: hold.id }, data: { releasedAt: new Date() } });
      }
      await recordEvent(tx, proposal.requestId, user.id, proposal.request.status, proposal.request.status, `Hospital declined${reason ? `: ${reason}` : '.'}`);
      await proposeNextHospital(tx, proposal.request, user.id);
    }
    const full = await tx.emergencyRequest.findUnique({ where: { id: proposal.requestId }, include: caseInclude });
    return serializeCase(full, false);
  });
}

export async function updateBedCount(user, bedType, totalCount) {
  if (!user.hospitalId) throw forbidden();
  return prisma.$transaction(async (tx) => {
    const bed = await tx.hospitalBed.findUnique({ where: { hospitalId_bedType: { hospitalId: user.hospitalId, bedType } } });
    if (!bed) throw notFound('Bed type was not found for this hospital.');
    if (totalCount < bed.heldCount) throw conflict(`Capacity cannot be lower than the ${bed.heldCount} active demo holds.`);
    const updated = await tx.hospitalBed.update({ where: { id: bed.id }, data: { totalCount, updatedById: user.id } });
    await recordAudit(tx, user.id, 'UPDATE_SAMPLE_BEDS', 'HospitalBed', bed.id, `Updated ${bedType} sample capacity to ${totalCount}.`);
    return updated;
  });
}
