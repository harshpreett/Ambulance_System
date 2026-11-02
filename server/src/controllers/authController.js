import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma.js';
import { SESSION_COOKIE, cookieOptions } from '../middleware/auth.js';
import { hashSecret, newSecret } from '../utils/crypto.js';
import { HttpError } from '../utils/httpError.js';

const ttlHours = Math.min(48, Math.max(1, Number(process.env.SESSION_TTL_HOURS || 12)));
const maxAge = ttlHours * 60 * 60 * 1000;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, ambulanceId: user.ambulanceId, hospitalId: user.hospitalId };
}

async function createSession(userId, response, previousSessionId = null) {
  const token = newSecret();
  const csrfToken = newSecret(24);
  if (previousSessionId) await prisma.session.deleteMany({ where: { id: previousSessionId } });
  await prisma.session.create({ data: {
    id: randomUUID(), tokenHash: hashSecret(token), csrfToken, userId,
    expiresAt: new Date(Date.now() + maxAge),
  } });
  response.cookie(SESSION_COOKIE, token, cookieOptions(maxAge));
  return csrfToken;
}

export async function csrf(request, response) {
  if (request.authSession) return response.json({ csrfToken: request.authSession.csrfToken });
  const csrfToken = await createSession(null, response);
  return response.json({ csrfToken });
}

export async function login(request, response) {
  const { email, password } = request.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const valid = user?.active && await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password was not recognized.');
  const csrfToken = await createSession(user.id, response, request.authSession?.id);
  return response.json({ user: publicUser(user), csrfToken });
}

export async function logout(request, response) {
  if (request.authSession) await prisma.session.deleteMany({ where: { id: request.authSession.id } });
  response.clearCookie(SESSION_COOKIE, { ...cookieOptions(0), maxAge: undefined });
  return response.status(204).end();
}

export async function currentUser(request, response) {
  if (!request.user) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  response.json({ user: publicUser(request.user) });
}
