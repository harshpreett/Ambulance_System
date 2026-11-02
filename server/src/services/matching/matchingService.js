import { notifyAdmins, notifyUser, recordEvent } from '../notification/notificationService.js';
import { ambulanceCapabilityFit, hospitalBedTypes, hospitalCapabilityFit, rankByDistanceAndFit } from './criteria.js';
import { conflict } from '../../utils/httpError.js';
import { haversineKm } from '../../utils/distance.js';

const OFFER_TIMEOUT_MS = Math.max(10, Number(process.env.OFFER_TIMEOUT_SECONDS || 120)) * 1000;

async function candidateAmbulances(tx, request, includePreviouslyTried = false) {
  const previous = includePreviouslyTried ? [] : await tx.dispatchAssignment.findMany({ where: { requestId: request.id }, select: { ambulanceId: true } });
  const excluded = previous.map((item) => item.ambulanceId);
  const rows = await tx.ambulance.findMany({
    where: { status: 'AVAILABLE', inService: true, ...(excluded.length ? { id: { notIn: excluded } } : {}) },
    include: { capabilities: true, operator: { where: { active: true } } },
  });
  const compatible = rows.filter((ambulance) => ambulance.operator && ambulanceCapabilityFit(request, ambulance));
  return rankByDistanceAndFit(request, compatible, (ambulance) => Math.max(0, ambulance.capabilities.length - request.requirements.length));
}

async function candidateHospitals(tx, request, includePreviouslyTried = false) {
  const previous = includePreviouslyTried ? [] : await tx.hospitalProposal.findMany({ where: { requestId: request.id }, select: { hospitalId: true } });
  const excluded = previous.map((item) => item.hospitalId);
  const rows = await tx.hospital.findMany({
    where: {
      active: true,
      emergencyEnabled: true,
      ...(excluded.length ? { id: { notIn: excluded } } : {}),
      ...(request.ownershipFilter ? { ownership: request.ownershipFilter } : {}),
    },
    include: { specialties: true, beds: true, staff: { where: { active: true } } },
  });
  const requiredBeds = hospitalBedTypes(request);
  const filtered = rows.filter((hospital) => {
    if (!hospital.staff) return false;
    if (!hospitalCapabilityFit(request, hospital)) return false;
    if (request.maxDistanceKm != null && request.maxDistanceKm > 0) {
      const distance = Math.round((rankByDistanceAndFit(request, [hospital], () => 0)[0].distanceKm) * 100) / 100;
      if (distance > request.maxDistanceKm) return false;
    }
    return requiredBeds.every((type) => {
      const bed = hospital.beds.find((item) => item.bedType === type);
      return bed && bed.totalCount - bed.heldCount > 0;
    });
  });
  return rankByDistanceAndFit(request, filtered, (hospital) => Math.max(0, hospital.specialties.length));
}

async function holdCapacity(tx, hospital, request) {
  const requiredTypes = hospitalBedTypes(request);
  const selectedBeds = requiredTypes.map((type) => hospital.beds.find((bed) => bed.bedType === type));
  if (selectedBeds.some((bed) => !bed || bed.totalCount <= bed.heldCount)) return null;

  const changed = [];
  for (const bed of selectedBeds) {
    const result = await tx.hospitalBed.updateMany({
      where: { id: bed.id, totalCount: bed.totalCount, heldCount: bed.heldCount },
      data: { heldCount: bed.heldCount + 1 },
    });
    if (result.count !== 1) {
      for (const prior of changed) await tx.hospitalBed.update({ where: { id: prior.id }, data: { heldCount: { decrement: 1 } } });
      return null;
    }
    changed.push(bed);
  }
  return changed;
}

async function releaseProposalHolds(tx, proposal) {
  const holds = await tx.hospitalCapacityHold.findMany({ where: { hospitalProposalId: proposal.id, releasedAt: null } });
  const now = new Date();
  for (const hold of holds) {
    await tx.hospitalBed.update({ where: { id: hold.hospitalBedId }, data: { heldCount: { decrement: 1 } } });
    await tx.hospitalCapacityHold.update({ where: { id: hold.id }, data: { releasedAt: now } });
  }
  if (holds.length) await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { bedHeld: false } });
}

export async function createProposal(tx, request, hospital) {
  const heldBeds = await holdCapacity(tx, hospital, request);
  if (!heldBeds) return null;
  const bedType = hospitalBedTypes(request).join('+');
  const proposal = await tx.hospitalProposal.create({
    data: { requestId: request.id, hospitalId: hospital.id, bedType, bedHeld: true, isCurrent: true },
  });
  await tx.hospitalCapacityHold.createMany({
    data: heldBeds.map((bed) => ({ hospitalProposalId: proposal.id, hospitalBedId: bed.id })),
  });
  await notifyUser(tx, hospital.staff?.id, request.id, 'HOSPITAL_PROPOSAL', `Case ${request.publicReference} is awaiting hospital readiness confirmation.`);
  return proposal;
}

export async function createAmbulanceOffer(tx, request, ambulance) {
  const claim = await tx.ambulance.updateMany({
    where: { id: ambulance.id, status: 'AVAILABLE', inService: true },
    data: { status: 'OFFERED' },
  });
  if (claim.count !== 1) return null;
  const now = new Date();
  const assignment = await tx.dispatchAssignment.create({
    data: {
      requestId: request.id,
      ambulanceId: ambulance.id,
      operatorId: ambulance.operator?.id ?? null,
      state: 'OFFERED',
      isCurrent: true,
      offeredAt: now,
      expiresAt: new Date(now.getTime() + OFFER_TIMEOUT_MS),
    },
  });
  await notifyUser(tx, ambulance.operator?.id, request.id, 'AMBULANCE_OFFER', `Case ${request.publicReference} is awaiting your response.`);
  return assignment;
}

export async function setNeedsReview(tx, request, actorId, reason) {
  const fresh = await tx.emergencyRequest.findUnique({ where: { id: request.id } });
  if (!fresh || ['CLOSED', 'CANCELLED'].includes(fresh.status)) return fresh;
  const oldStatus = fresh.status;
  const updated = await tx.emergencyRequest.update({ where: { id: request.id }, data: { status: 'NEEDS_REVIEW' } });
  await recordEvent(tx, request.id, actorId, oldStatus, 'NEEDS_REVIEW', reason);
  await notifyAdmins(tx, request.id, `Case ${fresh.publicReference} needs administrator review.`, 'CASE_REVIEW');
  return updated;
}

export async function matchRequestInTransaction(tx, request, actorId = null, { includePreviouslyTried = false } = {}) {
  const ambulances = await candidateAmbulances(tx, request, includePreviouslyTried);
  const hospitals = await candidateHospitals(tx, request, includePreviouslyTried);
  if (!ambulances.length || !hospitals.length) {
    const missing = [!ambulances.length ? 'ambulance' : null, !hospitals.length ? 'hospital' : null].filter(Boolean).join(' and ');
    await setNeedsReview(tx, request, actorId, `No eligible ${missing} candidate was available.`);
    return { matched: false, reason: `No eligible ${missing} candidate was available.` };
  }

  for (const ambulance of ambulances) {
    for (const hospital of hospitals) {
      const proposal = await createProposal(tx, request, hospital);
      if (!proposal) continue;
      const assignment = await createAmbulanceOffer(tx, request, ambulance);
      if (!assignment) {
        await releaseProposalHolds(tx, proposal);
        await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { state: 'UNAVAILABLE', isCurrent: false } });
        continue;
      }
      const oldStatus = request.status;
      await tx.emergencyRequest.update({ where: { id: request.id }, data: { status: 'OFFERED' } });
      await recordEvent(tx, request.id, actorId, oldStatus, 'OFFERED', 'An ambulance offer and hospital proposal were created.');
      return { matched: true, assignmentId: assignment.id, proposalId: proposal.id, ambulanceId: ambulance.id, hospitalId: hospital.id };
    }
  }
  await setNeedsReview(tx, request, actorId, 'All eligible candidates changed availability before assignment could be secured.');
  return { matched: false, reason: 'Eligible resources could not be secured.' };
}

export async function offerNextAmbulance(tx, request, actorId = null) {
  const candidates = await candidateAmbulances(tx, request);
  for (const ambulance of candidates) {
    const assignment = await createAmbulanceOffer(tx, request, ambulance);
    if (assignment) return assignment;
  }
  await setNeedsReview(tx, request, actorId, 'No eligible ambulance remained after offer decisions.');
  return null;
}

export async function proposeNextHospital(tx, request, actorId = null) {
  const candidates = await candidateHospitals(tx, request);
  for (const hospital of candidates) {
    const proposal = await createProposal(tx, request, hospital);
    if (proposal) return proposal;
  }
  await setNeedsReview(tx, request, actorId, 'No eligible hospital remained after proposal decisions.');
  return null;
}

export async function releaseAllRequestResources(tx, requestId) {
  const proposals = await tx.hospitalProposal.findMany({ where: { requestId, bedHeld: true } });
  for (const proposal of proposals) await releaseProposalHolds(tx, proposal);
  const assignments = await tx.dispatchAssignment.findMany({ where: { requestId, isCurrent: true } });
  for (const assignment of assignments) {
    if (['OFFERED', 'ACCEPTED'].includes(assignment.state)) {
      await tx.ambulance.update({ where: { id: assignment.ambulanceId }, data: { status: 'AVAILABLE' } });
      await tx.dispatchAssignment.update({ where: { id: assignment.id }, data: { state: 'CANCELLED', isCurrent: false, respondedAt: new Date() } });
    }
  }
  const currentProposals = await tx.hospitalProposal.findMany({ where: { requestId, isCurrent: true } });
  for (const proposal of currentProposals) {
    await tx.hospitalProposal.update({ where: { id: proposal.id }, data: { state: 'CANCELLED', isCurrent: false, respondedAt: new Date() } });
  }
}

export async function expirePendingOffers(prisma, now = new Date()) {
  const expired = await prisma.dispatchAssignment.findMany({ where: { state: 'OFFERED', isCurrent: true, expiresAt: { lte: now } }, include: { request: { include: { requirements: true } } } });
  for (const item of expired) {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.dispatchAssignment.updateMany({ where: { id: item.id, state: 'OFFERED', isCurrent: true, expiresAt: { lte: now } }, data: { state: 'EXPIRED', isCurrent: false, respondedAt: now } });
      if (claim.count !== 1) return;
      await tx.ambulance.updateMany({ where: { id: item.ambulanceId, status: 'OFFERED' }, data: { status: 'AVAILABLE' } });
      await recordEvent(tx, item.requestId, null, item.request.status, item.request.status, 'An ambulance offer expired without a response.');
      await notifyUser(tx, item.operatorId, item.requestId, 'OFFER_EXPIRED', `The response window for case ${item.request.publicReference} expired.`);
      await offerNextAmbulance(tx, item.request, null);
    }).catch((error) => { if (error.code !== 'P2025') console.error('Offer expiry processing failed.'); });
  }
  return expired.length;
}

export async function assertCompatibleResources(tx, request, ambulanceId, hospitalId, { overrideCompatibility = false } = {}) {
  const [ambulance, hospital] = await Promise.all([
    tx.ambulance.findUnique({ where: { id: ambulanceId }, include: { capabilities: true } }),
    tx.hospital.findUnique({ where: { id: hospitalId }, include: { specialties: true, beds: true } }),
  ]);
  if (!ambulance || !hospital) throw conflict('Select an existing ambulance and hospital.');
  if (ambulance.status !== 'AVAILABLE' || !ambulance.inService) throw conflict('The selected ambulance is not available.');
  if (!overrideCompatibility && !ambulanceCapabilityFit(request, ambulance)) throw conflict('The selected ambulance does not meet all required capabilities.');
  if (!hospital.active || !hospital.emergencyEnabled || (!overrideCompatibility && !hospitalCapabilityFit(request, hospital))) throw conflict('The selected hospital does not meet the request requirements.');
  if (!overrideCompatibility && request.ownershipFilter && hospital.ownership !== request.ownershipFilter) throw conflict('The selected hospital does not match the ownership preference.');
  if (request.maxDistanceKm != null) {
    if (haversineKm(request, hospital) > request.maxDistanceKm) throw conflict('The selected hospital is outside the requested distance.');
  }
  if (hospitalBedTypes(request).some((type) => {
    const bed = hospital.beds.find((row) => row.bedType === type);
    return !bed || bed.totalCount <= bed.heldCount;
  })) throw conflict('The selected hospital has no available sample capacity for this request.');
  return { ambulance, hospital };
}
