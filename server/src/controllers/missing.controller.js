import TryCatch from "../lib/TryCatch.js";
import { prisma } from "../lib/db.js";

function normalizeName(value) {
  return value.trim().toLowerCase();
}

export const createMissingReport = TryCatch(async (req, res) => {
  const missingReport = await prisma.missingPerson.create({
    data: {
      reporterId: req.user.id,
      personName: req.body.personName.trim(),
      age: req.body.age ?? null,
      gender: req.body.gender ?? null,
      photoUrl: req.body.photoUrl,
      contactName: req.body.contactName.trim(),
      contactPhone: req.body.contactPhone,
      shelter: req.body.shelter ?? null,
    },
  });

  res.status(201).json({
    message: "Missing person report created",
    data: missingReport,
  });
});

export const listMissingReports = TryCatch(async (_req, res) => {
  const missingReports = await prisma.missingPerson.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: { id: true, name: true, phoneNumber: true },
      },
    },
  });

  res.status(200).json({
    count: missingReports.length,
    data: missingReports,
  });
});

export const getMissingReportById = TryCatch(async (req, res) => {
  const missingReport = await prisma.missingPerson.findUnique({
    where: { id: req.params.id },
    include: {
      reporter: {
        select: { id: true, name: true, phoneNumber: true },
      },
    },
  });

  if (!missingReport) {
    return res.status(404).json({ message: "Missing person report not found" });
  }

  res.status(200).json({ data: missingReport });
});

export const createShelterResident = TryCatch(async (req, res) => {
  const residentName = req.body.residentName.trim();

  const [shelterResident, matches] = await Promise.all([
    prisma.shelterResident.create({
      data: {
        volunteerId: req.user.id,
        residentName,
        age: req.body.age ?? null,
        gender: req.body.gender ?? null,
        contactPhone: req.body.contactPhone ?? null,
        shelterName: req.body.shelterName.trim(),
        notes: req.body.notes ?? null,
      },
    }),
    prisma.missingPerson.findMany({
      where: {
        status: "PENDING",
        personName: {
          contains: normalizeName(residentName),
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        personName: true,
        age: true,
        gender: true,
        photoUrl: true,
        contactName: true,
        contactPhone: true,
      },
    }),
  ]);

  res.status(201).json({
    message: matches.length ? "Shelter resident saved. Possible missing-person match found." : "Shelter resident saved",
    data: shelterResident,
    possibleMatches: matches,
  });
});

export const confirmMissingMatch = TryCatch(async (req, res) => {
  const missingReport = await prisma.missingPerson.findUnique({
    where: { id: req.params.id },
    select: { id: true, personName: true },
  });

  if (!missingReport) {
    return res.status(404).json({ message: "Missing person report not found" });
  }

  const shelterResident = await prisma.shelterResident.findUnique({
    where: { id: req.body.shelterResidentId },
    select: { id: true, volunteerId: true, residentName: true, shelterName: true },
  });

  if (!shelterResident) {
    return res.status(404).json({ message: "Shelter resident record not found" });
  }

  await prisma.$transaction([
    prisma.shelterResident.update({
      where: { id: shelterResident.id },
      data: { isMatchConfirmed: true },
    }),
    prisma.missingPerson.delete({
      where: { id: missingReport.id },
    }),
  ]);

  res.status(200).json({
    message: "Missing person confirmed and removed from active missing records",
    data: {
      removedMissingPersonId: missingReport.id,
      personName: missingReport.personName,
      shelterResidentId: shelterResident.id,
      shelterName: shelterResident.shelterName,
    },
  });
});

export const searchShelterResidents = TryCatch(async (req, res) => {
  const name = req.query.name?.trim();
  if (!name) {
    return res.status(400).json({ message: "name query is required" });
  }

  const residents = await prisma.shelterResident.findMany({
    where: {
      residentName: {
        contains: name,
        mode: "insensitive",
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      volunteer: {
        select: { id: true, name: true, phoneNumber: true },
      },
    },
  });

  res.status(200).json({
    count: residents.length,
    data: residents,
  });
});
