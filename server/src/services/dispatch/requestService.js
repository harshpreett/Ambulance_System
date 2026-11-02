import { timingSafeEqual } from 'node:crypto';
import { prisma } from '../../database/prisma.js';
import { DEMO_AREA } from '../../config/constants.js';
import { deriveLookupToken, hashSecret, newReference } from '../../utils/crypto.js';
import { HttpError, notFound } from '../../utils/httpError.js';
import { recordEvent } from '../notification/notificationService.js';
import { matchRequestInTransaction, releaseAllRequestResources } from '../matching/matchingService.js';
import { caseInclude, serializeCase } from '../caseView.js';

export function isWithinDemoArea(latitude, longitude) {
  return latitude >= DEMO_AREA.minLat && latitude <= DEMO_AREA.maxLat && longitude >= DEMO_AREA.minLng && longitude <= DEMO_AREA.maxLng;
}

function tokenMatches(storedHash, suppliedToken) {
  const actual = Buffer.from(hashSecret(suppliedToken), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createRequest(data, idempotencyKey) {
  if (!isWithinDemoArea(data.latitude, data.longitude)) throw new HttpError(422, 'OUTSIDE_SERVICE_AREA', 'Select a location in the Chandigarh, Mohali or Panchkula demo area.');
  const lookupToken = deriveLookupToken(idempotencyKey);

  const createOrGet = async () => prisma.$transaction(async (tx) => {
    const existing = await tx.emergencyRequest.findUnique({ where: { idempotencyKey }, include: caseInclude });
    if (existing) return { request: existing, duplicate: true };
    const request = await tx.emergencyRequest.create({
      data: {
        publicReference: newReference(), lookupTokenHash: hashSecret(lookupToken), idempotencyKey,
        requestType: data.requestType, status: 'MATCHING', latitude: data.latitude, longitude: data.longitude,
        locationLabel: data.locationLabel, ownershipFilter: data.ownershipFilter || null,
        specialtyFilter: data.specialtyFilter || null, maxDistanceKm: data.maxDistanceKm ?? null,
        callerName: data.callerName || null, callerPhone: data.callerPhone || null, notes: data.notes || null,
        requirements: { create: data.requirements.map((capability) => ({ capability })) },
      },
      include: { requirements: true },
    });
    await recordEvent(tx, request.id, null, null, 'MATCHING', 'Request received for demo matching.');
    await matchRequestInTransaction(tx, request, null);
    const full = await tx.emergencyRequest.findUnique({ where: { id: request.id }, include: caseInclude });
    return { request: full, duplicate: false };
  });

  let result;
  try { result = await createOrGet(); }
  catch (error) {
    if (error.code !== 'P2002') throw error;
    const existing = await prisma.emergencyRequest.findUnique({ where: { idempotencyKey }, include: caseInclude });
    if (!existing) throw error;
    result = { request: existing, duplicate: true };
  }
  return { ...serializeCase(result.request, true), lookupToken, duplicate: result.duplicate };
}

export async function lookupRequest(reference, lookupToken) {
  const request = await prisma.emergencyRequest.findUnique({ where: { publicReference: reference }, include: caseInclude });
  if (!request || !tokenMatches(request.lookupTokenHash, lookupToken)) throw notFound('Case reference or verification token was not recognized.');
  const safeCase = serializeCase(request, false);
  return { ...safeCase, timeline: safeCase.timeline.map(({ status, createdAt }) => ({ status, createdAt })) };
}

export async function cancelRequestByCaller(reference, lookupToken) {
  const request = await prisma.emergencyRequest.findUnique({ where: { publicReference: reference } });
  if (!request || !tokenMatches(request.lookupTokenHash, lookupToken)) throw notFound('Case reference or verification token was not recognized.');
  if (request.status !== 'OFFERED' && request.status !== 'NEEDS_REVIEW' && request.status !== 'MATCHING') {
    throw conflict('After an operator accepts, cancellation must be handled by the administrator.');
  }
  return prisma.$transaction(async (tx) => {
    await releaseAllRequestResources(tx, request.id);
    const updated = await tx.emergencyRequest.update({ where: { id: request.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    await recordEvent(tx, request.id, null, request.status, 'CANCELLED', 'Caller cancelled before operator acceptance.');
    return { reference: updated.publicReference, status: updated.status };
  });
}
