# API Documentation

Base URL in development: `http://localhost:4000/api`. The Vite client calls the same routes at `/api` and proxies them to Express.

All request and response bodies are JSON. Authenticated responses are scoped by user role and linked ambulance/hospital. Unsafe methods require the current `X-CSRF-Token` header, obtained from `GET /api/auth/csrf`. The session cookie is HTTP-only and is not read by client JavaScript.

## Error format

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "The case has already changed.",
    "requestId": "request-id"
  }
}
```

Common HTTP responses: `400` invalid input, `401` missing/invalid session, `403` wrong role/owner/CSRF token, `404` unavailable record or invalid protected lookup, `409` invalid current state or resource conflict, `422` valid coordinates outside the demo service area, `429` rate limit, `500` unexpected server error.

## Authentication

| Method | Endpoint | Access | Body / result |
|---|---|---|---|
| GET | `/auth/csrf` | Public | Creates/reuses an anonymous session and returns `{csrfToken}`. |
| POST | `/auth/login` | Public + CSRF | `{email,password}` -> `{user,csrfToken}`. Login rate limited. |
| POST | `/auth/logout` | Signed-in + CSRF | Deletes current session and clears cookie; `204`. |
| GET | `/auth/me` | Public | Returns `{user}` or `401`. |
| GET | `/health` | Public | `{status:"ok",demo:true,service:"ambulance-dispatch-api"}`. |

## Public request and lookup

### `POST /requests`

Creates a request and runs matching in the backend. Send an `Idempotency-Key` header (a random UUID is recommended).

Example body:

```json
{
  "requestType": "REQUIREMENT_BASED",
  "latitude": 30.7333,
  "longitude": 76.7794,
  "locationLabel": "Sector 17, Chandigarh",
  "requirements": ["oxygen", "stretcher"],
  "ownershipFilter": "GOVERNMENT",
  "maxDistanceKm": 20,
  "callerName": "Synthetic caller",
  "callerPhone": "0000000000",
  "notes": "Sample-only note"
}
```

Requirements may contain `icu`, `ventilator`, `oxygen`, `cardiac_support`, `paramedic`, `stretcher`, `neonatal_care`. Optional hospital filters: `ownershipFilter` (`GOVERNMENT` or `PRIVATE`), `specialtyFilter` (`cardiac_care`, `neonatal_care`, `oxygen`), and `maxDistanceKm`.

Success: `201` for a new request or `200` for an idempotent duplicate. Response is `{case}` containing a random public reference, current status, matching summaries and a `lookupToken`. Save the token; the API does not provide a token-recovery endpoint.

If either resource type cannot be secured, case status is `NEEDS_REVIEW`; an offer is not described as a dispatch until the operator accepts it.

### `POST /requests/status-lookup`

Public, rate limited. Body: `{reference,lookupToken}`. Returns a restricted case summary and status timeline. An invalid reference/token pair returns a generic `404`.

### `POST /requests/:reference/cancel`

Public + CSRF. Body: `{lookupToken,reason}`. Caller cancellation is allowed before operator acceptance. Accepted trips must be cancelled by an administrator.

## Operator

All routes require `OPERATOR` role and records are scoped to the user's linked ambulance.

| Method | Endpoint | Body / result |
|---|---|---|
| GET | `/operator/dashboard` | `{ambulance,offers,activeTrips,notifications}`. |
| POST | `/operator/assignments/:id/decision` | `{decision:"ACCEPT"}` or `{decision:"DECLINE",reason}`. Decline advances matching. |
| POST | `/operator/requests/:reference/trip-status` | `{status,note?}`. Status must be the next valid lifecycle step. |

Trip sequence: `ACCEPTED` -> `EN_ROUTE_TO_CALLER` -> `PATIENT_PICKED_UP` -> `EN_ROUTE_TO_HOSPITAL` -> `HANDOVER_COMPLETE` -> `CLOSED`. Hospital readiness is required before `EN_ROUTE_TO_CALLER`. Closing a case releases the ambulance and sample capacity holds.

## Hospital

All routes require `HOSPITAL` role and records are scoped to the user's linked hospital.

| Method | Endpoint | Body / result |
|---|---|---|
| GET | `/hospital/dashboard` | `{hospital,proposals,beds,notifications}`. |
| POST | `/hospital/proposals/:id/decision` | `{decision:"ACCEPT"}` or `{decision:"DECLINE",reason}`. A decline releases holds and tries another hospital. |
| PUT | `/hospital/beds/:bedType` | `{totalCount}`; bed type is `EMERGENCY`, `ICU` or `VENTILATOR`. Counts cannot go below active holds. |

## Administrator

All routes require `ADMIN` role.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Summary counts, recent cases, cases needing review. |
| GET | `/admin/requests?status=...&from=...&to=...` | Case list, optionally filtered. |
| GET | `/admin/requests/:id` | Full case detail and timeline. |
| POST | `/admin/requests/:id/retry-matching` | Retry automatic matching for a case needing review and without active resources. |
| POST | `/admin/requests/:id/assign` | Manually assign compatible resources; body includes ambulanceId, hospitalId, reason and optional compatibility override. |
| POST | `/admin/requests/:id/cancel` | Cancel a case with a reason and release current resources. |
| GET/POST/PUT/DELETE | `/admin/ambulances[/:id]` | List, create, update or deactivate an ambulance. Delete is soft deactivation. |
| GET/POST/PUT/DELETE | `/admin/hospitals[/:id]` | List, create, update or deactivate a hospital. Delete is soft deactivation. |
| GET/POST | `/admin/users` | List or create a role-linked user. Passwords are never returned. |
| PATCH | `/admin/users/:id` | Update name/email, active status or reset password. Existing sessions are cleared. |
| GET | `/admin/reports/summary?from=...&to=...` | Counts by status, total, completed, needs-review and recent events. |
| GET | `/admin/audit` | Latest 200 audit records. |

## Notifications

| Method | Endpoint | Access |
|---|---|---|
| GET | `/notifications` | Signed-in user; returns only their notifications. |
| POST | `/notifications/:id/read` | Signed-in user; marks only their own notification as read. |

## Matching and concurrency

The backend hard-filters on current availability, in-service state, all requested ambulance capabilities, active hospital/ER status, specialty filters, preferences, distance, and sample capacity. Eligible resources are ranked by Haversine distance, then fewer extra capabilities/specialties, then stable name/call-sign order. ETA is a simple estimate at 30 km/h and is not a routing result.

An ambulance is claimed with a conditional database update inside a Prisma transaction. Hospital capacity holds are created for the emergency bed and any requested ICU/ventilator bed. A race or stale offer returns a conflict instead of overwriting the current state.
