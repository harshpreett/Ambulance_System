export const ROLES = Object.freeze({ OPERATOR: 'OPERATOR', HOSPITAL: 'HOSPITAL', ADMIN: 'ADMIN' });
export const CAPABILITIES = Object.freeze(['icu', 'ventilator', 'oxygen', 'cardiac_support', 'paramedic', 'stretcher', 'neonatal_care']);
export const REQUEST_STATUSES = Object.freeze([
  'MATCHING', 'OFFERED', 'ACCEPTED', 'EN_ROUTE_TO_CALLER', 'PATIENT_PICKED_UP',
  'EN_ROUTE_TO_HOSPITAL', 'HANDOVER_COMPLETE', 'CLOSED', 'NEEDS_REVIEW', 'CANCELLED',
]);
export const BED_TYPES = Object.freeze(['EMERGENCY', 'ICU', 'VENTILATOR']);
export const TRIP_TRANSITIONS = Object.freeze({
  ACCEPTED: 'EN_ROUTE_TO_CALLER',
  EN_ROUTE_TO_CALLER: 'PATIENT_PICKED_UP',
  PATIENT_PICKED_UP: 'EN_ROUTE_TO_HOSPITAL',
  EN_ROUTE_TO_HOSPITAL: 'HANDOVER_COMPLETE',
  HANDOVER_COMPLETE: 'CLOSED',
});

export const DEMO_AREA = Object.freeze({ minLat: 30.60, maxLat: 30.86, minLng: 76.55, maxLng: 76.96 });
