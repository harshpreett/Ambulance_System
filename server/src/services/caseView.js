import { estimateEtaMinutes, haversineKm } from '../utils/distance.js';

export const caseInclude = {
  requirements: true,
  assignments: { include: { ambulance: { include: { capabilities: true } }, operator: { select: { id: true, name: true } } }, orderBy: { offeredAt: 'asc' } },
  proposals: { include: { hospital: { include: { specialties: true, beds: true } }, holds: true }, orderBy: { offeredAt: 'asc' } },
  tripEvents: { include: { actor: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
};

export function serializeCase(request, includePrivate = false) {
  if (!request) return null;
  const assignment = [...(request.assignments || [])].reverse().find((item) => item.isCurrent) || null;
  const proposal = [...(request.proposals || [])].reverse().find((item) => item.isCurrent) || null;
  const ambulance = assignment?.ambulance;
  const hospital = proposal?.hospital;
  const distanceToAmbulance = ambulance ? haversineKm(request, ambulance) : null;
  const distanceToHospital = hospital ? haversineKm(request, hospital) : null;
  const phone = request.callerPhone;
  const maskedPhone = phone ? `${'•'.repeat(Math.max(0, phone.length - 3))}${phone.slice(-3)}` : null;
  return {
    id: request.id,
    reference: request.publicReference,
    requestType: request.requestType,
    status: request.status,
    latitude: request.latitude,
    longitude: request.longitude,
    locationLabel: request.locationLabel,
    requirements: request.requirements?.map((item) => item.capability) || [],
    ownershipFilter: request.ownershipFilter,
    specialtyFilter: request.specialtyFilter,
    maxDistanceKm: request.maxDistanceKm,
    caller: includePrivate ? { name: request.callerName, phone: includePrivate === 'ADMIN' ? phone : maskedPhone, notes: includePrivate === 'ADMIN' ? request.notes : undefined } : undefined,
    ambulance: ambulance ? {
      id: ambulance.id,
      assignmentId: assignment.id,
      callSign: ambulance.callSign,
      type: ambulance.type,
      capabilities: ambulance.capabilities.map((item) => item.capability),
      distanceKm: Math.round(distanceToAmbulance * 100) / 100,
      etaMinutes: estimateEtaMinutes(distanceToAmbulance),
      assignmentState: assignment.state,
      expiresAt: assignment.expiresAt,
    } : null,
    hospital: hospital ? {
      id: hospital.id,
      proposalId: proposal.id,
      name: hospital.name,
      ownership: hospital.ownership,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      distanceKm: Math.round(distanceToHospital * 100) / 100,
      etaMinutes: estimateEtaMinutes(distanceToHospital),
      proposalState: proposal.state,
      beds: hospital.beds.map((bed) => ({ bedType: bed.bedType, available: bed.totalCount - bed.heldCount })),
    } : null,
    assignmentHistory: request.assignments?.map((item) => ({ id: item.id, callSign: item.ambulance.callSign, state: item.state, offeredAt: item.offeredAt, respondedAt: item.respondedAt, reason: item.declineReason })) || [],
    hospitalHistory: request.proposals?.map((item) => ({ id: item.id, name: item.hospital.name, state: item.state, offeredAt: item.offeredAt, respondedAt: item.respondedAt, reason: item.declineReason })) || [],
    timeline: request.tripEvents?.map((item) => ({ oldStatus: item.oldStatus, status: item.newStatus, note: item.note, actor: item.actor?.name || 'System', createdAt: item.createdAt })) || [],
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    cancelledAt: request.cancelledAt,
  };
}
