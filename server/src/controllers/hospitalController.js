import { BED_TYPES } from '../config/constants.js';
import { badRequest } from '../utils/httpError.js';
import { decisionSchema, bedSchema } from '../validators/index.js';
import { getHospitalDashboard, decideHospitalProposal, updateBedCount } from '../services/hospital/hospitalService.js';

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest('Please review the highlighted fields.', result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  return result.data;
}

export async function dashboard(request, response) { response.json(await getHospitalDashboard(request.user)); }
export async function decide(request, response) {
  const input = parse(decisionSchema, request.body);
  response.json({ case: await decideHospitalProposal(request.user, Number(request.params.id), input.decision, input.reason) });
}
export async function updateBed(request, response) {
  if (!BED_TYPES.includes(request.params.bedType)) throw badRequest('Unknown bed type.');
  const input = parse(bedSchema, request.body);
  response.json({ bed: await updateBedCount(request.user, request.params.bedType, input.totalCount) });
}
