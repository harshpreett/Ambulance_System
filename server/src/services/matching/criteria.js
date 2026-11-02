import { haversineKm, estimateEtaMinutes } from '../../utils/distance.js';

const HOSPITAL_REQUIREMENT_SPECIALTIES = {
  oxygen: 'oxygen',
  cardiac_support: 'cardiac_care',
  neonatal_care: 'neonatal_care',
};

export function requestCapabilities(request) {
  return request.requirements?.map((item) => item.capability) ?? [];
}

export function hospitalBedTypes(request) {
  const requirements = requestCapabilities(request);
  const beds = ['EMERGENCY'];
  if (requirements.includes('icu')) beds.push('ICU');
  if (requirements.includes('ventilator')) beds.push('VENTILATOR');
  return [...new Set(beds)];
}

export function getCandidateDistance(request, candidate) {
  return haversineKm(request, candidate);
}

export function ambulanceCapabilityFit(request, ambulance) {
  const required = requestCapabilities(request);
  const have = new Set(ambulance.capabilities.map((item) => item.capability));
  return required.every((capability) => have.has(capability));
}

export function hospitalCapabilityFit(request, hospital) {
  const specialties = new Set(hospital.specialties.map((item) => item.specialty));
  if (request.specialtyFilter && !specialties.has(request.specialtyFilter)) return false;
  const requiredSpecialties = requestCapabilities(request)
    .map((capability) => HOSPITAL_REQUIREMENT_SPECIALTIES[capability])
    .filter(Boolean);
  return requiredSpecialties.every((specialty) => specialties.has(specialty));
}

export function rankByDistanceAndFit(request, candidates, capabilityCount) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      distanceKm: getCandidateDistance(request, candidate),
      etaMinutes: estimateEtaMinutes(getCandidateDistance(request, candidate)),
      extraCapabilityCount: capabilityCount(candidate),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm
      || a.extraCapabilityCount - b.extraCapabilityCount
      || String(a.callSign ?? a.name).localeCompare(String(b.callSign ?? b.name)));
}
