import { prisma } from '../database/prisma.js';
import { hashSecret } from '../utils/crypto.js';
import { forbidden, HttpError } from '../utils/httpError.js';

export const SESSION_COOKIE = 'ambulance.sid';

export function readCookie(request, name = SESSION_COOKIE) {
  const cookieHeader = request.headers.cookie || '';
  const pair = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!pair) return null;
  try { return decodeURIComponent(pair.slice(name.length + 1)); } catch { return null; }
}

export function cookieOptions(maxAge) {
  return { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge };
}

export async function attachSession(request, _response, next) {
  try {
    request.authSession = null;
    request.user = null;
    const token = readCookie(request);
    if (!token) return next();
    const session = await prisma.session.findUnique({ where: { tokenHash: hashSecret(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return next();
    }
    request.authSession = session;
    request.user = session.user?.active ? session.user : null;
    return next();
  } catch (error) { return next(error); }
}

export function requireAuth(request, _response, next) {
  if (!request.user) return next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
  return next();
}

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user) return next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
    if (!roles.includes(request.user.role)) return next(forbidden());
    return next();
  };
}

export function requireCsrf(request, _response, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const headerToken = request.get('x-csrf-token');
  if (!request.authSession || !headerToken || headerToken !== request.authSession.csrfToken) {
    return next(new HttpError(403, 'CSRF_INVALID', 'Refresh the page and try again.'));
  }
  return next();
}
