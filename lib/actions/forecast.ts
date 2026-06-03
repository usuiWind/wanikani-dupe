"use server";

import { prisma } from "@/lib/prisma";

export interface ForecastBucket {
  label: string;
  count: number;
  critical: number; // current-level apprentice items
  burn: number;     // enlightened items about to burn
}

export async function getReviewForecast() {
  const now = new Date();
  const in48h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find current level
  const latestProgress = await prisma.studyProgress.findFirst({
    where: { started_at: { not: null } },
    include: { subject: { select: { level: true } } },
    orderBy: { subject: { level: "desc" } },
  });
  const currentLevel = latestProgress?.subject.level ?? 1;

  const upcoming = await prisma.studyProgress.findMany({
    where: {
      next_review_at: { gte: now, lte: in7d },
      srs_stage: { gte: 1, lte: 8 },
    },
    select: {
      next_review_at: true,
      srs_stage: true,
      subject: { select: { level: true } },
    },
  });

  // Build hourly buckets for next 24h
  const hourlyBuckets: ForecastBucket[] = Array.from({ length: 24 }, (_, i) => {
    const label = i === 0 ? "Now" : `+${i}h`;
    return { label, count: 0, critical: 0, burn: 0 };
  });

  // Build daily buckets for next 7 days
  const dailyBuckets: ForecastBucket[] = Array.from({ length: 7 }, (_, i) => {
    const t = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : t.toLocaleDateString("en-US", { weekday: "short" });
    return { label, count: 0, critical: 0, burn: 0 };
  });

  for (const item of upcoming) {
    if (!item.next_review_at) continue;
    const hoursAhead = (item.next_review_at.getTime() - now.getTime()) / (60 * 60 * 1000);
    const daysAhead = Math.floor(hoursAhead / 24);
    const isCritical = (item.srs_stage ?? 0) <= 4 && item.subject.level === currentLevel;
    const isBurn = item.srs_stage === 8;

    if (hoursAhead < 24) {
      const bucket = hourlyBuckets[Math.floor(hoursAhead)];
      if (bucket) {
        bucket.count++;
        if (isCritical) bucket.critical++;
        if (isBurn) bucket.burn++;
      }
    }

    if (daysAhead < 7) {
      const bucket = dailyBuckets[daysAhead];
      if (bucket) {
        bucket.count++;
        if (isCritical) bucket.critical++;
        if (isBurn) bucket.burn++;
      }
    }
  }

  // Also include currently due items in "Now" bucket
  const dueNow = await prisma.studyProgress.count({
    where: { next_review_at: { lte: now }, srs_stage: { gte: 1, lte: 8 } },
  });
  if (hourlyBuckets[0]) hourlyBuckets[0].count += dueNow;
  if (dailyBuckets[0]) dailyBuckets[0].count += dueNow;

  return { hourly: hourlyBuckets, daily: dailyBuckets };
}

export async function getHeatmapData() {
  const since = new Date();
  since.setDate(since.getDate() - 365);

  return prisma.dailyActivity.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
  });
}

export async function getStreakCount(): Promise<number> {
  const rows = await prisma.dailyActivity.findMany({
    where: { reviews_done: { gt: 0 } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!rows.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const d = new Date(rows[i].date);
    d.setHours(0, 0, 0, 0);
    const expected = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    if (d.getTime() !== expected.getTime()) break;
    streak++;
  }

  return streak;
}
