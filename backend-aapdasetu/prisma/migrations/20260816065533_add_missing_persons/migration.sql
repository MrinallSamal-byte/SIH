-- CreateTable
CREATE TABLE "MissingPerson" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSeenLocation" TEXT,
    "clothes" TEXT,
    "contactPhone" TEXT,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissingPerson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissingPerson_status_idx" ON "MissingPerson"("status");

-- CreateIndex
CREATE INDEX "MissingPerson_createdAt_idx" ON "MissingPerson"("createdAt");

-- CreateIndex
CREATE INDEX "MissingPerson_name_idx" ON "MissingPerson"("name");
