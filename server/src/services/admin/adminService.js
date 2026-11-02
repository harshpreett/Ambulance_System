import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { conflict, notFound } from '../../utils/httpError.js';
import { notifyAdmins, notifyUser, recordAudit, recordEvent } from '../notification/notificationService.js';
import { assertCompatibleResources, createAmbulanceOffer, createProposal, matchRequestInTransaction } from '../matching/matchingService.js';
import { caseInclude, serializeCase } from '../caseView.js';

export async function getAdminDashboard() {
  const [grouped, recent, needsReview, fleetAvailable, hospitalCount, activeTrips] = await Promise.all([
    prisma.emergencyRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.emergencyRequest.findMany({ orderBy: { updatedAt: 'desc' }, take: 8, include: caseInclude }),
    prisma.emergencyRequest.findMany({ where: { status: 'NEEDS_REVIEW' }, orderBy: { updatedAt: 'asc' }, take: 8, include: caseInclude }),
    prisma.ambulance.count({ where: { status: 'AVAILABLE', inService: true } }),
    prisma.hospital.count({ where: { active: true, emergencyEnabled: true } }),
    prisma.emergencyRequest.count({ where: { status: { in: ['ACCEPTED', 'EN_ROUTE_TO_CALLER', 'PATIENT_PICKED_UP', 'EN_ROUTE_TO_HOSPITAL', 'HANDOVER_COMPLETE'] } } }),
  ]);
  return {
    counts: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])),
    fleetAvailable,
    hospitalCount,
    activeTrips,
    recent: recent.map((item) => serializeCase(item, 'ADMIN')),
    needsReview: needsReview.map((item) => serializeCase(item, 'ADMIN')),
  };
}

export async function listCases({ status, from, to }) {
  const where = {};
  if (status) where.status = status;
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
  const rows = await prisma.emergencyRequest.findMany({ where, include: caseInclude, orderBy: { createdAt: 'desc' }, take: 200 });
  return rows.map((item) => serializeCase(item, 'ADMIN'));
}

export async function getCaseDetail(id) {
  const request = await prisma.emergencyRequest.findUnique({ where: { id }, include: caseInclude });
  if (!request) throw notFound('Case was not found.');
  return serializeCase(request, 'ADMIN');
}

export async function retryMatching(user, id) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyRequest.findUnique({ where: { id }, include: { requirements: true, assignments: true, proposals: true } });
    if (!request) throw notFound('Case was not found.');
    if (request.status !== 'NEEDS_REVIEW') throw conflict('Only cases needing review can be automatically rematched.');
    const activeAssignment = request.assignments.some((item) => item.isCurrent && ['OFFERED', 'ACCEPTED'].includes(item.state));
    const activeProposal = request.proposals.some((item) => item.isCurrent && ['PENDING', 'ACCEPTED'].includes(item.state));
    if (activeAssignment || activeProposal) throw conflict('This case still has an active resource. Review it and use manual assignment if a change is needed.');
    const ready = await tx.emergencyRequest.update({ where: { id }, data: { status: 'MATCHING' } });
    await recordEvent(tx, id, user.id, request.status, 'MATCHING', 'Administrator retried automatic matching.');
    const result = await matchRequestInTransaction(tx, { ...request, ...ready, requirements: request.requirements }, user.id, { includePreviouslyTried: true });
    await recordAudit(tx, user.id, 'RETRY_MATCHING', 'EmergencyRequest', id, 'Administrator retried matching.');
    const full = await tx.emergencyRequest.findUnique({ where: { id }, include: caseInclude });
    return { result, case: serializeCase(full, 'ADMIN') };
  });
}

export async function manualAssign(user, id, input) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyRequest.findUnique({ where: { id }, include: { requirements: true, assignments: true, proposals: true } });
    if (!request) throw notFound('Case was not found.');
    if (['CLOSED', 'CANCELLED'].includes(request.status)) throw conflict('A closed or cancelled case cannot be assigned.');
    const { ambulance, hospital } = await assertCompatibleResources(tx, request, input.ambulanceId, input.hospitalId, { overrideCompatibility: input.overrideCompatibility });
    if (input.overrideCompatibility && !input.reason) throw conflict('An override requires an administrator reason.');

    for (const assignment of request.assignments.filter((item) => item.isCurrent)) {
      if (['OFFERED', 'ACCEPTED'].includes(assignment.state)) {
        await tx.ambulance.update({ where: { id: assignment.ambulanceId }, data: { status: 'AVAILABLE' } });
        await tx.dispatchAssignment.update({ where: { id: assignment.id }, data: { state: 'REASSIGNED', isCurrent: false, respondedAt: new Date(), declineReason: input.reason } });
      }
    }
    const activeProposals = await tx.hospitalProposal.findMany({ where: { requestId: id, isCurrent: true }, include: { holds: true } });
    for (const proposal of activeProposals) {
      for (const hold of proposal.holds.filter((item) => !item.releasedAt)) {
        await tx.hospitalBed.update({ where: { id: hold.hospitalBedId }, data: { heldCount: { decrement: 1 } } });
        await tx.hospitalCapacityHold.update({ where: { id: hold.id }, data: { releasedAt: new Date() } });
      }
      await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { state: 'REASSIGNED', isCurrent: false, respondedAt: new Date(), bedHeld: false } });
    }

    const hospitalWithData = await tx.hospital.findUnique({ where: { id: hospital.id }, include: { specialties: true, beds: true, staff: { where: { active: true } } } });
    const ambulanceWithData = await tx.ambulance.findUnique({ where: { id: ambulance.id }, include: { capabilities: true, operator: { where: { active: true } } } });
    const proposal = await createProposal(tx, { ...request, requirements: request.requirements }, hospitalWithData);
    const assignment = proposal ? await createAmbulanceOffer(tx, request, ambulanceWithData) : null;
    if (!proposal || !assignment) throw conflict('The selected resources changed availability. Refresh and choose again.');

    await tx.emergencyRequest.update({ where: { id }, data: { status: 'OFFERED' } });
    await recordEvent(tx, id, user.id, request.status, 'OFFERED', `Administrator assigned ${ambulance.callSign} and ${hospital.name}.`);
    await recordAudit(tx, user.id, 'MANUAL_ASSIGNMENT', 'EmergencyRequest', id, input.reason);
    const full = await tx.emergencyRequest.findUnique({ where: { id }, include: caseInclude });
    return serializeCase(full, 'ADMIN');
  });
}

export async function listAmbulances() {
  return prisma.ambulance.findMany({ include: { capabilities: true, operator: { select: { id: true, name: true, email: true, active: true } }, assignments: { where: { isCurrent: true, state: { in: ['OFFERED', 'ACCEPTED'] } }, select: { id: true } } }, orderBy: { callSign: 'asc' } });
}

export async function saveAmbulance(user, id, input) {
  return prisma.$transaction(async (tx) => {
    const existing = id ? await tx.ambulance.findUnique({ where: { id }, include: { assignments: { where: { isCurrent: true, state: { in: ['OFFERED', 'ACCEPTED'] } } } } }) : null;
    if (id && !existing) throw notFound('Ambulance was not found.');
    if (existing?.assignments.length) throw conflict('An ambulance with an active case cannot be edited.');
    const data = {
      callSign: input.callSign,
      type: input.type,
      status: input.inService === false ? 'OUT_OF_SERVICE' : (input.status === 'OUT_OF_SERVICE' ? 'OUT_OF_SERVICE' : 'AVAILABLE'),
      inService: input.inService !== false && input.status !== 'OUT_OF_SERVICE',
      latitude: input.latitude,
      longitude: input.longitude,
    };
    const saved = id
      ? await tx.ambulance.update({ where: { id }, data: { ...data, capabilities: { deleteMany: {}, create: input.capabilities.map((capability) => ({ capability })) } } })
      : await tx.ambulance.create({ data: { ...data, capabilities: { create: input.capabilities.map((capability) => ({ capability })) } } });
    await recordAudit(tx, user.id, id ? 'UPDATE_AMBULANCE' : 'CREATE_AMBULANCE', 'Ambulance', saved.id, null);
    return tx.ambulance.findUnique({ where: { id: saved.id }, include: { capabilities: true } });
  });
}

export async function deactivateAmbulance(user, id) {
  return prisma.$transaction(async (tx) => {
    const ambulance = await tx.ambulance.findUnique({ where: { id }, include: { assignments: { where: { isCurrent: true, state: { in: ['OFFERED', 'ACCEPTED'] } } } } });
    if (!ambulance) throw notFound('Ambulance was not found.');
    if (ambulance.assignments.length) throw conflict('Resolve the active assignment before deactivating this ambulance.');
    await tx.ambulance.update({ where: { id }, data: { status: 'OUT_OF_SERVICE', inService: false } });
    await recordAudit(tx, user.id, 'DEACTIVATE_AMBULANCE', 'Ambulance', id, 'Deactivated from demo fleet.');
  });
}

export async function listHospitals() {
  return prisma.hospital.findMany({ include: { specialties: true, beds: true, staff: { select: { id: true, name: true, email: true, active: true } }, proposals: { where: { isCurrent: true, state: { in: ['PENDING', 'ACCEPTED'] } }, select: { id: true, isCurrent: true } } }, orderBy: { name: 'asc' } });
}

export async function saveHospital(user, id, input) {
  return prisma.$transaction(async (tx) => {
    const existing = id ? await tx.hospital.findUnique({ where: { id }, include: { beds: true, proposals: { where: { isCurrent: true, state: { in: ['PENDING', 'ACCEPTED'] } } } } }) : null;
    if (id && !existing) throw notFound('Hospital was not found.');
    if (existing?.proposals.length) throw conflict('Resolve active hospital proposals before editing this facility.');
    const data = {
      name: input.name,
      ownership: input.ownership,
      latitude: input.latitude,
      longitude: input.longitude,
      emergencyEnabled: input.emergencyEnabled,
      active: input.active,
      demoPhone: input.demoPhone || null,
    };
    const hospital = id
      ? await tx.hospital.update({ where: { id }, data: { ...data, specialties: { deleteMany: {}, create: input.specialties.map((specialty) => ({ specialty })) } } })
      : await tx.hospital.create({ data: { ...data, specialties: { create: input.specialties.map((specialty) => ({ specialty })) } } });

    for (const bedInput of input.beds) {
      const previous = await tx.hospitalBed.findUnique({ where: { hospitalId_bedType: { hospitalId: hospital.id, bedType: bedInput.bedType } } });
      if (previous && bedInput.totalCount < previous.heldCount) throw conflict(`${bedInput.bedType} count cannot be lower than current demo holds.`);
      await tx.hospitalBed.upsert({
        where: { hospitalId_bedType: { hospitalId: hospital.id, bedType: bedInput.bedType } },
        create: { hospitalId: hospital.id, bedType: bedInput.bedType, totalCount: bedInput.totalCount },
        update: { totalCount: bedInput.totalCount },
      });
    }
    await recordAudit(tx, user.id, id ? 'UPDATE_HOSPITAL' : 'CREATE_HOSPITAL', 'Hospital', hospital.id, null);
    return tx.hospital.findUnique({ where: { id: hospital.id }, include: { specialties: true, beds: true } });
  });
}

export async function deactivateHospital(user, id) {
  return prisma.$transaction(async (tx) => {
    const hospital = await tx.hospital.findUnique({ where: { id }, include: { proposals: { where: { isCurrent: true, state: { in: ['PENDING', 'ACCEPTED'] } } } } });
    if (!hospital) throw notFound('Hospital was not found.');
    if (hospital.proposals.length) throw conflict('Resolve active hospital proposals before deactivating this facility.');
    await tx.hospital.update({ where: { id }, data: { active: false } });
    await recordAudit(tx, user.id, 'DEACTIVATE_HOSPITAL', 'Hospital', id, 'Deactivated from demo directory.');
  });
}

export async function listUsers() {
  const users = await prisma.user.findMany({ include: { ambulance: { select: { id: true, callSign: true } }, hospital: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
  return users.map(({ passwordHash, ...user }) => user);
}

export async function createUser(actor, input) {
  if ((input.role === 'OPERATOR' && (!input.ambulanceId || input.hospitalId))
    || (input.role === 'HOSPITAL' && (!input.hospitalId || input.ambulanceId))
    || (input.role === 'ADMIN' && (input.hospitalId || input.ambulanceId))) {
    throw conflict('Provider accounts must be linked to exactly one matching resource. Admin accounts cannot be linked to a provider.');
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email.toLowerCase(), passwordHash, role: input.role, ambulanceId: input.ambulanceId || null, hospitalId: input.hospitalId || null },
    include: { ambulance: { select: { id: true, callSign: true } }, hospital: { select: { id: true, name: true } } },
  });
  await prisma.auditLog.create({ data: { actorId: actor.id, action: 'CREATE_USER', entityType: 'User', entityId: String(user.id), reason: null } });
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function updateUser(actor, id, input) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound('User was not found.');
  if (existing.role === 'ADMIN' && input.active === false && await prisma.user.count({ where: { role: 'ADMIN', active: true } }) <= 1) throw conflict('At least one active administrator must remain.');
  const data = {};
  if (input.name) data.name = input.name;
  if (input.email) data.email = input.email.toLowerCase();
  if (typeof input.active === 'boolean') data.active = input.active;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 12);
  const saved = await prisma.user.update({ where: { id }, data, include: { ambulance: { select: { id: true, callSign: true } }, hospital: { select: { id: true, name: true } } } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.auditLog.create({ data: { actorId: actor.id, action: 'UPDATE_USER', entityType: 'User', entityId: String(id), reason: null } });
  const { passwordHash: _passwordHash, ...safeUser } = saved;
  return safeUser;
}

export async function getReports({ from, to }) {
  const where = {};
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
  const [byStatus, total, completed, needsReview, recentEvents] = await Promise.all([
    prisma.emergencyRequest.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.emergencyRequest.count({ where }),
    prisma.emergencyRequest.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.emergencyRequest.count({ where: { ...where, status: 'NEEDS_REVIEW' } }),
    prisma.tripStatusEvent.findMany({ where: { request: where }, orderBy: { createdAt: 'desc' }, take: 50, include: { request: { select: { publicReference: true } }, actor: { select: { name: true } } } }),
  ]);
  return { total, completed, needsReview, byStatus: Object.fromEntries(byStatus.map((item) => [item.status, item._count._all])), recentEvents };
}

export async function listAudit() {
  return prisma.auditLog.findMany({ include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
}

export async function adminCancel(user, id, reason) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyRequest.findUnique({ where: { id } });
    if (!request) throw notFound('Case was not found.');
    if (['CLOSED', 'CANCELLED'].includes(request.status)) throw conflict('This case is already closed.');
    const resources = await tx.dispatchAssignment.findMany({ where: { requestId: id, isCurrent: true, state: { in: ['OFFERED', 'ACCEPTED'] } } });
    for (const assignment of resources) {
      await tx.ambulance.update({ where: { id: assignment.ambulanceId }, data: { status: 'AVAILABLE' } });
      await tx.dispatchAssignment.update({ where: { id: assignment.id }, data: { state: 'CANCELLED', isCurrent: false, respondedAt: new Date(), declineReason: reason } });
    }
    const proposals = await tx.hospitalProposal.findMany({ where: { requestId: id, isCurrent: true }, include: { holds: true } });
    for (const proposal of proposals) {
      for (const hold of proposal.holds.filter((item) => !item.releasedAt)) {
        await tx.hospitalBed.update({ where: { id: hold.hospitalBedId }, data: { heldCount: { decrement: 1 } } });
        await tx.hospitalCapacityHold.update({ where: { id: hold.id }, data: { releasedAt: new Date() } });
      }
      await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { state: 'CANCELLED', isCurrent: false, respondedAt: new Date(), bedHeld: false } });
    }
    const updated = await tx.emergencyRequest.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    await recordEvent(tx, id, user.id, request.status, 'CANCELLED', reason);
    await recordAudit(tx, user.id, 'CANCEL_CASE', 'EmergencyRequest', id, reason);
    await notifyAdmins(tx, id, `Case ${request.publicReference} was cancelled by an administrator.`, 'CASE_CANCELLED');
    return serializeCase(await tx.emergencyRequest.findUnique({ where: { id: updated.id }, include: caseInclude }), 'ADMIN');
  });
}
