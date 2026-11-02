# User Guide

> This is an academic demo. Use fictional information and sample locations. Do not use it for a real emergency.

## Caller / attendant

1. Open the landing page and choose **Start a demo request** or **Choose care requirements**.
2. Select a sample location in Chandigarh, Mohali or Panchkula. The app does not access device GPS.
3. For a requirement-based request, select every capability that must be present. Optional ownership, specialty and distance preferences narrow hospital matching.
4. Use fictional contact details only and submit.
5. Save the case reference and private lookup token on the confirmation page. An offer is not a confirmed dispatch until an operator accepts. Hospital readiness is shown separately.
6. Open **Check case status**, enter both values and view the case timeline. A caller can cancel before the operator accepts.

## Ambulance operator

1. Sign in with an operator account listed in the README.
2. Review incoming offers, sample distance, requirements and hospital proposal.
3. Accept the offer or decline with a reason. A decline lets the system try another eligible demo vehicle.
4. Wait until the hospital confirms readiness before starting the trip.
5. Advance the case in order: en route to caller, patient picked up, en route to hospital, handover complete, close case.
6. Use the OSM link only as a sample direction view; vehicle location is not live.

## Hospital staff

1. Sign in with the account linked to the sample facility.
2. Review pending proposals, listed requirements and approximate ETA.
3. Confirm readiness or decline with a reason. A decline releases the sample hold and tries another facility.
4. Update emergency, ICU or ventilator sample counts. Counts cannot be reduced below active holds.
5. Remember that the displayed values do not come from a real hospital system.

## Administrator

1. Sign in with the seeded admin account.
2. Use **Overview** and **Emergency cases** to identify active and review-needed cases.
3. Open a case to inspect matching history and timeline, retry matching, manually assign compatible resources or cancel with a reason.
4. Manage ambulances, hospitals and sample users. Deactivation is soft; cases retain their history.
5. Use reports for current status counts and audit history for recorded changes.

## Sample data and reset

The seed script recreates all demo users, providers and two example cases. It resets the development database contents. Run it only when you are willing to discard local demonstration cases:

```bash
npm run db:seed
```

All sample login accounts share `DemoAccess!2026` locally. Change/remove the seeded accounts before any public hosting.
