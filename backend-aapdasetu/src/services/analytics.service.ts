/** Crisis analytics service for the admin chart dashboard. */
import { prisma } from '../lib/prisma.js';

export interface AnalyticsResult {
  byType: Array<{ type: string; count: number }>;
  byPriority: Array<{ priorityLabel: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  trendsByDay: Array<{ day: string; count: number }>;
  geographic: Array<{ type: string; latitude: number; longitude: number; count: number }>;
  avgResponseMinutes: number | null;
  shelterUtilization: Array<{ name: string; occupancy: number; capacity: number; utilization: number }>;
  volunteerStatus: Array<{ status: string; count: number }>;
  checkinsByStatus: Array<{ status: string; count: number }>;
  damageSummary: Array<{ classification: string; count: number }>;
}

export async function getAnalytics(rangeDays = 14): Promise<AnalyticsResult> {
  const since = new Date(Date.now() - rangeDays * 86400000);

  const [byType, byPriority, byStatus, trends, geographic, resolvedReports, shelters, volunteers, checkins, damage] =
    await Promise.all([
      prisma.report.groupBy({ by: ['type'], _count: { _all: true }, where: { createdAt: { gte: since } } }),
      prisma.report.groupBy({ by: ['priorityLabel'], _count: { _all: true }, where: { createdAt: { gte: since } } }),
      prisma.report.groupBy({ by: ['status'], _count: { _all: true }, where: { createdAt: { gte: since } } }),
      prisma.report.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.report.groupBy({ by: ['type', 'latitude', 'longitude'], _count: { _all: true }, where: { createdAt: { gte: since } } }),
      prisma.report.findMany({
        where: { status: 'resolved', createdAt: { gte: since } },
        select: { createdAt: true, updatedAt: true, resolvedAt: true },
      }),
      prisma.shelter.findMany({ select: { name: true, occupancy: true, capacity: true } }),
      prisma.volunteer.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.safetyCheckin.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.damageAssessment.groupBy({ by: ['classification'], _count: { _all: true } }),
    ]);

  // ponytail: JS bucketing ceiling — upgrade path is $queryRaw date_trunc in IST
  const istDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
  const dayBuckets = new Map<string, number>();
  for (let i = rangeDays - 1; i >= 0; i--) {
    dayBuckets.set(istDay.format(new Date(Date.now() - i * 86400000)), 0);
  }
  for (const r of trends) {
    const day = istDay.format(r.createdAt);
    dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1);
  }
  const trendsByDay = [...dayBuckets.entries()].map(([day, count]) => ({ day, count }));

  let avgResponseMinutes: number | null = null;
  const durations: number[] = [];
  for (const r of resolvedReports) {
    const start = r.createdAt.getTime();
    const end = r.resolvedAt ? r.resolvedAt.getTime() : r.updatedAt.getTime();
    if (end >= start) durations.push((end - start) / 60000);
  }
  if (durations.length > 0) {
    avgResponseMinutes = Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100;
  }

  return {
    byType: byType.map((g: (typeof byType)[number]) => ({ type: g.type, count: g._count._all })),
    byPriority: byPriority.map((g: (typeof byPriority)[number]) => ({
      priorityLabel: g.priorityLabel,
      count: g._count._all,
    })),
    byStatus: byStatus.map((g: (typeof byStatus)[number]) => ({ status: g.status, count: g._count._all })),
    trendsByDay,
    geographic: geographic.map((g: (typeof geographic)[number]) => ({
      type: g.type,
      latitude: g.latitude,
      longitude: g.longitude,
      count: g._count._all,
    })),
    avgResponseMinutes,
    shelterUtilization: shelters.map((s: (typeof shelters)[number]) => ({
      name: s.name,
      occupancy: s.occupancy,
      capacity: s.capacity,
      utilization: s.capacity > 0 ? Math.round((s.occupancy / s.capacity) * 100) : 0,
    })),
    volunteerStatus: volunteers.map((g: (typeof volunteers)[number]) => ({ status: g.status, count: g._count._all })),
    checkinsByStatus: checkins.map((g: (typeof checkins)[number]) => ({ status: g.status, count: g._count._all })),
    damageSummary: damage.map((g: (typeof damage)[number]) => ({ classification: g.classification, count: g._count._all })),
  };
}