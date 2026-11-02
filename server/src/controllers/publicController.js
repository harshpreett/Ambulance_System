import { newSecret } from '../utils/crypto.js';
import { requestSchema, lookupSchema, cancelSchema } from '../validators/index.js';
import { badRequest } from '../utils/httpError.js';
import { createRequest, lookupRequest, cancelRequestByCaller } from '../services/dispatch/requestService.js';

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest('Please review the highlighted fields.', result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  return result.data;
}

export async function submitRequest(request, response) {
  const data = parse(requestSchema, request.body);
  const idempotencyKey = request.get('Idempotency-Key') || newSecret(24);
  if (idempotencyKey.length > 100 || idempotencyKey.length < 16) throw badRequest('Invalid request retry key.');
  const created = await createRequest(data, idempotencyKey);
  response.status(created.duplicate ? 200 : 201).json({ case: created });
}

export async function statusLookup(request, response) {
  const input = parse(lookupSchema, request.body);
  response.json({ case: await lookupRequest(input.reference, input.lookupToken) });
}

export async function callerCancel(request, response) {
  const input = parse(cancelSchema.extend({ lookupToken: lookupSchema.shape.lookupToken }), request.body);
  response.json(await cancelRequestByCaller(request.params.reference, input.lookupToken));
}
