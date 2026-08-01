-- CreateEnum
CREATE TYPE "HELPTYPE" AS ENUM ('FOOD', 'WATER', 'MEDICAL', 'RESCUE', 'SHELTER', 'OTHER');

-- CreateEnum
CREATE TYPE "URGENCY" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "STATUS" AS ENUM ('PENDING', 'APPROVED', 'ASSIGNED', 'RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SOS" (
    "id" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reporterPhone" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "helpType" "HELPTYPE" NOT NULL,
    "urgency" "URGENCY" NOT NULL,
    "peopleCount" INTEGER NOT NULL,
    "hasChildren" BOOLEAN NOT NULL,
    "hasElderly" BOOLEAN NOT NULL,
    "medicalNeed" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "status" "STATUS" NOT NULL,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SOS_pkey" PRIMARY KEY ("id")
);
