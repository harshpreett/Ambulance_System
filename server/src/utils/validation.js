import { z } from 'zod';
import { BED_TYPES, CAPABILITIES } from '../config/constants.js';

const coordinate = (min, max) => z.coerce.number().finite().min(min).max(max);
const capability = z.enum(CAPABILITIES);

export const requestSchema = z.object({
  requestType: z.enum(['EMERGENCY', 'REQUIREMENT_BASED']).default('EMERGENCY'),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  locationLabel: z.string().trim().min(2).max(140),
  requirements: z.array(capability).max(CAPABILITIES.length).default([]),
  ownershipFilter: z.enum(['GOVERNMENT', 'PRIVATE']).optional().nullable(),
  specialtyFilter: z.string().trim().min(2).max(50).optional().nullable(),
  maxDistanceKm: z.coerce.number().positive().max(100).optional().nullable(),
  callerName: z.string().trim().max(100).optional().nullable(),
  callerPhone: z.string().trim().max(24).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
}).strict();

export const loginSchema = z.object({ email: z.string().email().max(150), password: z.string().min(1).max(200) }).strict();
export const decisionSchema = z.object({ decision: z.enum(['ACCEPT', 'DECLINE']), reason: z.string().trim().max(300).optional().nullable() }).strict();
export const statusSchema = z.object({ status: z.string(), note: z.string().trim().max(300).optional().nullable() }).strict();
export const bedSchema = z.object({ totalCount: z.coerce.number().int().min(0).max(10000) }).strict();
export const cancelSchema = z.object({ reason: z.string().trim().min(3).max(300) }).strict();
export const lookupSchema = z.object({ reference: z.string().trim().min(8).max(40), lookupToken: z.string().min(20).max(100) }).strict();

export const ambulanceSchema = z.object({
  callSign: z.string().trim().min(2).max(24),
  type: z.enum(['ALS', 'BLS', 'NEONATAL']),
  status: z.enum(['AVAILABLE', 'OUT_OF_SERVICE']).optional(),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  inService: z.boolean().optional(),
  capabilities: z.array(capability).default([]),
}).strict();

export const hospitalSchema = z.object({
  name: z.string().trim().min(2).max(140),
  ownership: z.enum(['GOVERNMENT', 'PRIVATE']),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  emergencyEnabled: z.boolean().default(true),
  active: z.boolean().default(true),
  demoPhone: z.string().trim().max(24).optional().nullable(),
  specialties: z.array(z.string().trim().min(2).max(50)).default([]),
  beds: z.array(z.object({ bedType: z.enum(BED_TYPES), totalCount: z.coerce.number().int().min(0).max(10000) })).default([]),
}).strict();

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(150),
  password: z.string().min(10).max(200),
  role: z.enum(['OPERATOR', 'HOSPITAL', 'ADMIN']),
  ambulanceId: z.coerce.number().int().positive().optional().nullable(),
  hospitalId: z.coerce.number().int().positive().optional().nullable(),
}).strict();

export const manualAssignmentSchema = z.object({
  ambulanceId: z.coerce.number().int().positive(),
  hospitalId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
  overrideCompatibility: z.boolean().default(false),
}).strict();
