import { Prisma } from '../generated/prisma/index.js';

export function notFoundHandler(_request, _response, next) {
  const error = new Error('API endpoint not found.');
  error.status = 404;
  error.code = 'ENDPOINT_NOT_FOUND';
  next(error);
}

export function errorHandler(error, request, response, _next) {
  if (response.headersSent) return;
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = status >= 500 ? 'Something went wrong. Please try again.' : error.message;
  let details = error.details;

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    status = 409; code = 'DUPLICATE_RECORD'; message = 'A record with those details already exists.';
  }
  if (error.name === 'ZodError') {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Please review the highlighted fields.';
    details = error.issues?.map(({ path, message: issueMessage }) => ({ field: path.join('.'), message: issueMessage }));
  }
  if (status >= 500) console.error(JSON.stringify({ requestId: request.id || null, method: request.method, path: request.path, name: error.name }));
  response.status(status).json({ error: { code, message, ...(details ? { details } : {}), requestId: request.id || null } });
}

