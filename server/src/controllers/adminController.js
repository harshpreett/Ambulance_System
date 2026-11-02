import { prisma } from '../database/prisma.js';
import { z } from 'zod';
import { badRequest } from '../utils/httpError.js';
import { ambulanceSchema, hospitalSchema, userCreateSchema, manualAssignmentSchema, cancelSchema } from '../validators/index.js';
import * as admin from '../services/admin/adminService.js';

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest('Please review the highlighted fields.', result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  return result.data;
}

export async function dashboard(_request, response) { response.json(await admin.getAdminDashboard()); }
export async function cases(request, response) {
  response.json({ cases: await admin.listCases({ status: request.query.status, from: request.query.from, to: request.query.to }) });
}
export async function caseDetail(request, response) { response.json({ case: await admin.getCaseDetail(Number(request.params.id)) }); }
export async function retryMatching(request, response) { response.json(await admin.retryMatching(request.user, Number(request.params.id))); }
export async function manualAssignment(request, response) {
  response.json({ case: await admin.manualAssign(request.user, Number(request.params.id), parse(manualAssignmentSchema, request.body)) });
}
export async function cancelCase(request, response) {
  const { reason } = parse(cancelSchema, request.body);
  response.json({ case: await admin.adminCancel(request.user, Number(request.params.id), reason) });
}
export async function ambulances(_request, response) { response.json({ ambulances: await admin.listAmbulances() }); }
export async function createAmbulance(request, response) { response.status(201).json({ ambulance: await admin.saveAmbulance(request.user, null, parse(ambulanceSchema, request.body)) }); }
export async function updateAmbulance(request, response) { response.json({ ambulance: await admin.saveAmbulance(request.user, Number(request.params.id), parse(ambulanceSchema, request.body)) }); }
export async function deactivateAmbulance(request, response) { await admin.deactivateAmbulance(request.user, Number(request.params.id)); response.status(204).end(); }
export async function hospitals(_request, response) { response.json({ hospitals: await admin.listHospitals() }); }
export async function createHospital(request, response) { response.status(201).json({ hospital: await admin.saveHospital(request.user, null, parse(hospitalSchema, request.body)) }); }
export async function updateHospital(request, response) { response.json({ hospital: await admin.saveHospital(request.user, Number(request.params.id), parse(hospitalSchema, request.body)) }); }
export async function deactivateHospital(request, response) { await admin.deactivateHospital(request.user, Number(request.params.id)); response.status(204).end(); }
export async function users(request, response) { response.json({ users: await admin.listUsers(), ambulances: await prisma.ambulance.findMany({ select: { id: true, callSign: true } }), hospitals: await prisma.hospital.findMany({ select: { id: true, name: true } }), currentUserId: request.user.id }); }
export async function createUser(request, response) { response.status(201).json({ user: await admin.createUser(request.user, parse(userCreateSchema, request.body)) }); }
export async function updateUser(request, response) {
  const schema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().email().max(150).optional(),
    password: z.string().min(10).max(200).optional(),
    active: z.boolean().optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.');
  response.json({ user: await admin.updateUser(request.user, Number(request.params.id), parse(schema, request.body)) });
}
export async function reports(request, response) { response.json(await admin.getReports({ from: request.query.from, to: request.query.to })); }
export async function audit(_request, response) { response.json({ entries: await admin.listAudit() }); }
