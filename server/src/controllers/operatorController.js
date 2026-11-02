import { decisionSchema, statusSchema } from '../validators/index.js';
import { badRequest } from '../utils/httpError.js';
import { getOperatorDashboard, decideAssignment, updateTripStatus } from '../services/dispatch/dispatchService.js';

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest('Please review the highlighted fields.', result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  return result.data;
}

export async function dashboard(request, response) { response.json(await getOperatorDashboard(request.user)); }
export async function decide(request, response) {
  const input = parse(decisionSchema, request.body);
  response.json({ case: await decideAssignment(request.user, Number(request.params.id), input.decision, input.reason) });
}
export async function updateStatus(request, response) {
  const input = parse(statusSchema, request.body);
  response.json({ case: await updateTripStatus(request.user, request.params.reference, input.status, input.note) });
}
