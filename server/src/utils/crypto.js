import { createHash, createHmac, randomBytes } from 'node:crypto';

export const hashSecret = (value) => createHash('sha256').update(value).digest('hex');
export const newSecret = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const newReference = () => `TRI-${newSecret(6).toUpperCase()}`;
export const deriveLookupToken = (idempotencyKey) => createHmac('sha256', process.env.SESSION_SECRET || 'academic-demo-only-secret')
  .update(`lookup:${idempotencyKey}`).digest('base64url');
