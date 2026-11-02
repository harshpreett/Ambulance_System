-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ambulanceId" INTEGER,
    "hospitalId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "csrfToken" TEXT NOT NULL,
    "userId" INTEGER,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ambulance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "callSign" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "inService" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AmbulanceCapability" (
    "ambulanceId" INTEGER NOT NULL,
    "capability" TEXT NOT NULL,

    PRIMARY KEY ("ambulanceId", "capability"),
    CONSTRAINT "AmbulanceCapability_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "emergencyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "demoPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HospitalSpecialty" (
    "hospitalId" INTEGER NOT NULL,
    "specialty" TEXT NOT NULL,

    PRIMARY KEY ("hospitalId", "specialty"),
    CONSTRAINT "HospitalSpecialty_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HospitalBed" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hospitalId" INTEGER NOT NULL,
    "bedType" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "heldCount" INTEGER NOT NULL DEFAULT 0,
    "updatedById" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HospitalBed_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HospitalBed_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmergencyRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicReference" TEXT NOT NULL,
    "lookupTokenHash" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MATCHING',
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "ownershipFilter" TEXT,
    "specialtyFilter" TEXT,
    "maxDistanceKm" REAL,
    "callerName" TEXT,
    "callerPhone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME
);

-- CreateTable
CREATE TABLE "RequestRequirement" (
    "requestId" INTEGER NOT NULL,
    "capability" TEXT NOT NULL,

    PRIMARY KEY ("requestId", "capability"),
    CONSTRAINT "RequestRequirement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EmergencyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "ambulanceId" INTEGER NOT NULL,
    "operatorId" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'OFFERED',
    "offeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "declineReason" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DispatchAssignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EmergencyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispatchAssignment_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DispatchAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HospitalProposal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "offeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "declineReason" TEXT,
    "bedType" TEXT,
    "bedHeld" BOOLEAN NOT NULL DEFAULT false,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "HospitalProposal_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EmergencyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HospitalProposal_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HospitalCapacityHold" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hospitalProposalId" INTEGER NOT NULL,
    "hospitalBedId" INTEGER NOT NULL,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HospitalCapacityHold_hospitalProposalId_fkey" FOREIGN KEY ("hospitalProposalId") REFERENCES "HospitalProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HospitalCapacityHold_hospitalBedId_fkey" FOREIGN KEY ("hospitalBedId") REFERENCES "HospitalBed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TripStatusEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "actorUserId" INTEGER,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripStatusEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EmergencyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripStatusEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "requestId" INTEGER,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EmergencyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_ambulanceId_key" ON "User"("ambulanceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_hospitalId_key" ON "User"("hospitalId");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_callSign_key" ON "Ambulance"("callSign");

-- CreateIndex
CREATE INDEX "Ambulance_status_inService_idx" ON "Ambulance"("status", "inService");

-- CreateIndex
CREATE INDEX "AmbulanceCapability_capability_idx" ON "AmbulanceCapability"("capability");

-- CreateIndex
CREATE INDEX "Hospital_active_emergencyEnabled_ownership_idx" ON "Hospital"("active", "emergencyEnabled", "ownership");

-- CreateIndex
CREATE INDEX "HospitalSpecialty_specialty_idx" ON "HospitalSpecialty"("specialty");

-- CreateIndex
CREATE INDEX "HospitalBed_bedType_hospitalId_idx" ON "HospitalBed"("bedType", "hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalBed_hospitalId_bedType_key" ON "HospitalBed"("hospitalId", "bedType");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyRequest_publicReference_key" ON "EmergencyRequest"("publicReference");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyRequest_idempotencyKey_key" ON "EmergencyRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmergencyRequest_status_createdAt_idx" ON "EmergencyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RequestRequirement_capability_idx" ON "RequestRequirement"("capability");

-- CreateIndex
CREATE INDEX "DispatchAssignment_ambulanceId_state_idx" ON "DispatchAssignment"("ambulanceId", "state");

-- CreateIndex
CREATE INDEX "DispatchAssignment_requestId_isCurrent_idx" ON "DispatchAssignment"("requestId", "isCurrent");

-- CreateIndex
CREATE INDEX "DispatchAssignment_state_expiresAt_idx" ON "DispatchAssignment"("state", "expiresAt");

-- CreateIndex
CREATE INDEX "HospitalProposal_hospitalId_state_idx" ON "HospitalProposal"("hospitalId", "state");

-- CreateIndex
CREATE INDEX "HospitalProposal_requestId_isCurrent_idx" ON "HospitalProposal"("requestId", "isCurrent");

-- CreateIndex
CREATE INDEX "HospitalCapacityHold_hospitalBedId_releasedAt_idx" ON "HospitalCapacityHold"("hospitalBedId", "releasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalCapacityHold_hospitalProposalId_hospitalBedId_key" ON "HospitalCapacityHold"("hospitalProposalId", "hospitalBedId");

-- CreateIndex
CREATE INDEX "TripStatusEvent_requestId_createdAt_idx" ON "TripStatusEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

