import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'file:./prisma/test.db';
process.env.SESSION_SECRET ||= 'test-only-secret-never-used-for-hosting-0000000000000000';

let app;
let prisma;
let adminAgent;
let adminCsrf;
const createdCases = [];

const demoRequest = (overrides = {}) => ({
  requestType: 'EMERGENCY',
  latitude: 30.7333,
  longitude: 76.7794,
  locationLabel: 'Sector 17, Chandigarh',
  requirements: [],
  callerName: 'Synthetic caller',
  callerPhone: '0000000000',
  ...overrides,
});

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
  ({ prisma } = await import('../src/database/prisma.js'));
  adminAgent = request.agent(app);
  const csrfResponse = await adminAgent.get('/api/auth/csrf').expect(200);
  const loginResponse = await adminAgent.post('/api/auth/login').set('X-CSRF-Token', csrfResponse.body.csrfToken)
    .send({ email: 'admin@demo.local', password: 'DemoAccess!2026' }).expect(200);
  adminCsrf = loginResponse.body.csrfToken;
});

afterAll(async () => { await prisma?.$disconnect(); });
afterEach(async () => { await cancelCreatedCases(); });

async function loginAs(email, password = 'DemoAccess!2026') {
  const agent = request.agent(app);
  const csrf = await agent.get('/api/auth/csrf').expect(200);
  const response = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf.body.csrfToken).send({ email, password });
  if (response.status !== 200) throw new Error(`Unable to sign in ${email}: ${response.body?.error?.message}`);
  return { agent, csrf: response.body.csrfToken, user: response.body.user };
}

async function makePublicAgent() {
  const agent = request.agent(app);
  const csrf = await agent.get('/api/auth/csrf').expect(200);
  return { agent, csrf: csrf.body.csrfToken };
}

async function createCase(overrides = {}) {
  const caller = await makePublicAgent();
  const idempotencyKey = `test-key-${randomUUID()}`;
  const response = await caller.agent.post('/api/requests').set('X-CSRF-Token', caller.csrf).set('Idempotency-Key', idempotencyKey).send(demoRequest(overrides));
  expect([201, 200]).toContain(response.status);
  createdCases.push({ ...caller, item: response.body.case });
  return { ...caller, item: response.body.case, idempotencyKey };
}

async function operatorFor(ambulanceId) {
  const user = await prisma.user.findUnique({ where: { ambulanceId } });
  if (!user) throw new Error('No seeded operator exists for the matched ambulance.');
  return loginAs(user.email);
}

async function hospitalFor(hospitalId) {
  const user = await prisma.user.findUnique({ where: { hospitalId } });
  if (!user) throw new Error('No seeded hospital user exists for the matched facility.');
  return loginAs(user.email);
}

async function cancelCreatedCases() {
  for (const item of createdCases.splice(0)) {
    if (!item.item?.id || ['CLOSED', 'CANCELLED'].includes(item.item.status)) continue;
    await adminAgent.post(`/api/admin/requests/${item.item.id}/cancel`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ reason: 'Automated test cleanup.' }).catch(() => {});
  }
}

describe('Authentication and access control', () => {
  it('logs in with a seeded account and returns the role', async () => {
    const result = await loginAs('operator1@demo.local');
    expect(result.user.role).toBe('OPERATOR');
    await result.agent.get('/api/operator/dashboard').expect(200);
  });

  it('rejects an invalid password without revealing the account state', async () => {
    const agent = request.agent(app);
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const response = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf.body.csrfToken)
      .send({ email: 'admin@demo.local', password: 'incorrect-password' }).expect(401);
    expect(response.body.error.message).toMatch(/not recognized/i);
  });

  it('blocks an operator from administrator routes', async () => {
    const operator = await loginAs('operator1@demo.local');
    await operator.agent.get('/api/admin/dashboard').expect(403);
  });
});

describe('Public requests and matching', () => {
  it('creates a request and returns a private status lookup token', async () => {
    const result = await createCase();
    expect(result.item.reference).toMatch(/^TRI-/);
    expect(result.item.lookupToken).toHaveLength(43);
    expect(['OFFERED', 'NEEDS_REVIEW']).toContain(result.item.status);
  });

  it('rejects invalid coordinates before creating a case', async () => {
    const caller = await makePublicAgent();
    const response = await caller.agent.post('/api/requests').set('X-CSRF-Token', caller.csrf)
      .send(demoRequest({ latitude: 91 })).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('matches an ambulance only when all hard capabilities are present', async () => {
    const result = await createCase({ requestType: 'REQUIREMENT_BASED', requirements: ['ventilator', 'icu'] });
    expect(result.item.ambulance?.callSign).toBe('AMB-101');
    expect(result.item.hospital).toBeTruthy();
  });

  it('moves a request to review when no ambulance meets every capability', async () => {
    const result = await createCase({ requestType: 'REQUIREMENT_BASED', requirements: ['ventilator', 'neonatal_care'] });
    expect(result.item.status).toBe('NEEDS_REVIEW');
    expect(result.item.ambulance).toBeNull();
  });

  it('matches an emergency hospital and creates a temporary capacity hold', async () => {
    const result = await createCase({ requestType: 'REQUIREMENT_BASED', requirements: ['icu'] });
    expect(result.item.hospital?.name).toBeTruthy();
    expect(result.item.hospital?.proposalState).toBe('PENDING');
    const bed = await prisma.hospitalBed.findFirst({ where: { hospitalId: result.item.hospital.id, bedType: 'ICU' } });
    expect(bed.heldCount).toBeGreaterThanOrEqual(1);
  });

  it('returns the same case for a duplicate idempotency key', async () => {
    const caller = await makePublicAgent();
    const key = `test-key-${randomUUID()}`;
    const first = await caller.agent.post('/api/requests').set('X-CSRF-Token', caller.csrf).set('Idempotency-Key', key).send(demoRequest()).expect(201);
    const second = await caller.agent.post('/api/requests').set('X-CSRF-Token', caller.csrf).set('Idempotency-Key', key).send(demoRequest()).expect(200);
    createdCases.push({ ...caller, item: first.body.case });
    expect(second.body.case.reference).toBe(first.body.case.reference);
    expect(second.body.case.lookupToken).toBe(first.body.case.lookupToken);
  });

  it('does not reveal a case with an invalid verification token', async () => {
    const result = await createCase();
    await result.agent.post('/api/requests/status-lookup').set('X-CSRF-Token', result.csrf)
      .send({ reference: result.item.reference, lookupToken: 'x'.repeat(43) }).expect(404);
  });
});

describe('Operator and hospital workflow', () => {
  it('allows the assigned operator to accept an offer', async () => {
    const result = await createCase();
    const operator = await operatorFor(result.item.ambulance.id);
    await operator.agent.post(`/api/operator/assignments/${result.item.ambulance.assignmentId}/decision`).set('X-CSRF-Token', operator.csrf)
      .send({ decision: 'ACCEPT' }).expect(200);
    const updated = await prisma.emergencyRequest.findUnique({ where: { id: result.item.id } });
    expect(updated.status).toBe('ACCEPTED');
  });

  it('moves to the next ambulance after an operator declines', async () => {
    const result = await createCase();
    const operator = await operatorFor(result.item.ambulance.id);
    await operator.agent.post(`/api/operator/assignments/${result.item.ambulance.assignmentId}/decision`).set('X-CSRF-Token', operator.csrf)
      .send({ decision: 'DECLINE', reason: 'Test decline.' }).expect(200);
    const next = await prisma.emergencyRequest.findUnique({ where: { id: result.item.id }, include: { assignments: { where: { isCurrent: true } } } });
    expect(next.status).toBe('OFFERED');
    expect(next.assignments[0].ambulanceId).not.toBe(result.item.ambulance.id);
  });

  it('moves to another hospital after a facility declines', async () => {
    const result = await createCase();
    const hospital = await hospitalFor(result.item.hospital.id);
    await hospital.agent.post(`/api/hospital/proposals/${result.item.hospital.proposalId}/decision`).set('X-CSRF-Token', hospital.csrf)
      .send({ decision: 'DECLINE', reason: 'Test decline.' }).expect(200);
    const alternatives = await prisma.hospitalProposal.findMany({ where: { requestId: result.item.id, isCurrent: true } });
    expect(alternatives).toHaveLength(1);
    expect(alternatives[0].hospitalId).not.toBe(result.item.hospital.id);
  });

  it('rejects a capacity update below an active hold', async () => {
    const result = await createCase({ requestType: 'REQUIREMENT_BASED', requirements: ['icu'] });
    const hospital = await hospitalFor(result.item.hospital.id);
    await hospital.agent.put('/api/hospital/beds/ICU').set('X-CSRF-Token', hospital.csrf).send({ totalCount: 0 }).expect(409);
  });

  it('rejects invalid trip status transitions', async () => {
    const result = await createCase();
    const operator = await operatorFor(result.item.ambulance.id);
    await operator.agent.post(`/api/operator/assignments/${result.item.ambulance.assignmentId}/decision`).set('X-CSRF-Token', operator.csrf).send({ decision: 'ACCEPT' }).expect(200);
    await operator.agent.post(`/api/operator/requests/${result.item.reference}/trip-status`).set('X-CSRF-Token', operator.csrf)
      .send({ status: 'HANDOVER_COMPLETE' }).expect(409);
  });

  it('completes a case and releases ambulance and hospital capacity', async () => {
    const result = await createCase();
    const operator = await operatorFor(result.item.ambulance.id);
    const hospital = await hospitalFor(result.item.hospital.id);
    await hospital.agent.post(`/api/hospital/proposals/${result.item.hospital.proposalId}/decision`).set('X-CSRF-Token', hospital.csrf).send({ decision: 'ACCEPT' }).expect(200);
    await operator.agent.post(`/api/operator/assignments/${result.item.ambulance.assignmentId}/decision`).set('X-CSRF-Token', operator.csrf).send({ decision: 'ACCEPT' }).expect(200);
    for (const status of ['EN_ROUTE_TO_CALLER', 'PATIENT_PICKED_UP', 'EN_ROUTE_TO_HOSPITAL', 'HANDOVER_COMPLETE', 'CLOSED']) {
      await operator.agent.post(`/api/operator/requests/${result.item.reference}/trip-status`).set('X-CSRF-Token', operator.csrf).send({ status }).expect(200);
    }
    const closed = await prisma.emergencyRequest.findUnique({ where: { id: result.item.id } });
    const ambulance = await prisma.ambulance.findUnique({ where: { id: result.item.ambulance.id } });
    const bed = await prisma.hospitalBed.findFirst({ where: { hospitalId: result.item.hospital.id, bedType: 'EMERGENCY' } });
    expect(closed.status).toBe('CLOSED');
    expect(ambulance.status).toBe('AVAILABLE');
    expect(bed.heldCount).toBe(0);
  });
});

describe('Cancellation and resource cleanup', () => {
  it('releases the ambulance offer and capacity hold after caller cancellation', async () => {
    const result = await createCase();
    const bedBefore = await prisma.hospitalBed.findFirst({ where: { hospitalId: result.item.hospital.id, bedType: 'EMERGENCY' } });
    expect(bedBefore.heldCount).toBeGreaterThan(0);
    const response = await result.agent.post(`/api/requests/${result.item.reference}/cancel`).set('X-CSRF-Token', result.csrf)
      .send({ lookupToken: result.item.lookupToken, reason: 'Demo caller changed plans.' }).expect(200);
    const bedAfter = await prisma.hospitalBed.findFirst({ where: { hospitalId: result.item.hospital.id, bedType: 'EMERGENCY' } });
    const ambulance = await prisma.ambulance.findUnique({ where: { id: result.item.ambulance.id } });
    expect(response.body.status).toBe('CANCELLED');
    expect(bedAfter.heldCount).toBe(bedBefore.heldCount - 1);
    expect(ambulance.status).toBe('AVAILABLE');
  });

  it('prevents one operator from reading another ambulance’s offers', async () => {
    const result = await createCase();
    const otherOperator = await prisma.user.findFirst({ where: { role: 'OPERATOR', ambulanceId: { not: result.item.ambulance.id } } });
    const wrongAmbulance = await loginAs(otherOperator.email);
    await wrongAmbulance.agent.post(`/api/operator/assignments/${result.item.ambulance.assignmentId}/decision`).set('X-CSRF-Token', wrongAmbulance.csrf)
      .send({ decision: 'ACCEPT' }).expect(403);
  });
});

