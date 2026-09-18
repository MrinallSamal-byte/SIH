/** Admin command-center overview / KPI service. */
import { prisma } from '../lib/prisma.js';

export async function getOverview() {
  const [
    totalReports,
    activeRed,
    openShelters,
    availableVolunteers,
    activeAgencies,
    pendingReports,
    inProgressReports,
    resolvedReports,
    totalCheckins,
    avgPriority,
    latestReports,
  ] = await Promise.all([
    prisma.report.count(),
    prisma.report.count({ where: { priorityLabel: 'RED', status: { in: ['pending', 'in_progress'] } } }),
    prisma.shelter.count({ where: { status: 'open' } }),
    prisma.volunteer.count({ where: { status: 'available' } }),
    prisma.agency.count(),
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.report.count({ where: { status: 'in_progress' } }),
    prisma.report.count({ where: { status: 'resolved' } }),
    prisma.safetyCheckin.count(),
    prisma.report.aggregate({ _avg: { priorityScore: true } }),
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      // Dashboard polls this every few seconds — never ship base64 media blobs
      // or reporter PII (mediaData alone can be megabytes per row).
      select: {
        id: true,
        trackingId: true,
        type: true,
        status: true,
        priorityScore: true,
        priorityLabel: true,
        latitude: true,
        longitude: true,
        landmark: true,
        description: true,
        mediaType: true,
        resolutionNotes: true,
        resolvedAt: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        assignedVolunteer: { select: { id: true, name: true } },
        assignedAgency: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    kpis: {
      totalReports,
      activeRed,
      openShelters,
      availableVolunteers,
      activeAgencies,
      pendingReports,
      inProgressReports,
      resolvedReports,
      totalCheckins,
      avgPriorityScore: avgPriority._avg.priorityScore ? Math.round(avgPriority._avg.priorityScore * 100) / 100 : 0,
      crisisGaugeScore: computeCrisisGaugeScore(activeRed, totalReports, openShelters, availableVolunteers),
    },
    latestReports,
  };
}

function computeCrisisGaugeScore(
  activeRed: number,
  totalReports: number,
  openShelters: number,
  availableVolunteers: number,
): number {
  // Heuristic 0-100 crisis severity for the header gauge. An empty system
  // must read 0 — staffing/shelter penalties only apply once there is
  // actual incident load, otherwise a calm day reads ~25 (dishonest).
  if (totalReports === 0 && activeRed === 0) return 0;
  const redFactor = Math.min(50, activeRed * 12);
  const loadFactor = totalReports > 0 ? Math.min(25, (totalReports / 200) * 25) : 0;
  const shelterPenalty = openShelters === 0 ? 15 : Math.min(15, Math.max(0, 15 - openShelters * 3));
  const volunteerPenalty = availableVolunteers < 10 ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(redFactor + loadFactor + shelterPenalty + volunteerPenalty)));
}