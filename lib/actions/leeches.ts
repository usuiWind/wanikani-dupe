"use server";

import { prisma } from "@/lib/prisma";

export async function getLeeches() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const threshold = settings?.leech_threshold ?? 1.0;

  return prisma.studyProgress.findMany({
    where: {
      leech_score: { gte: threshold },
      srs_stage: { gte: 1, lte: 8 },
    },
    include: {
      subject: {
        include: {
          meanings: { where: { is_primary: true } },
          readings: { where: { is_primary: true } },
        },
      },
    },
    orderBy: { leech_score: "desc" },
    take: 100,
  });
}

type StudyType = "level" | "stage" | "leeches" | "burned" | "recent";

// Subject-level `where` for each study drill. Recent = subjects answered
// wrong in an in-app review within the last 7 days (from ReviewsLog).
function studyWhere(type: StudyType, opts: { level?: number; stage?: number; leechThreshold: number }) {
  switch (type) {
    case "level":
      return { level: opts.level, progress: { srs_stage: { gte: 1 } } };
    case "stage":
      return { progress: { srs_stage: opts.stage } };
    case "leeches":
      return { progress: { leech_score: { gte: opts.leechThreshold }, srs_stage: { gte: 1, lte: 8 } } };
    case "burned":
      return { progress: { srs_stage: 9 } };
    case "recent": {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return {
        reviewsLog: {
          some: {
            started_at: { gte: since },
            OR: [{ incorrect_meaning_count: { gt: 0 } }, { incorrect_reading_count: { gt: 0 } }],
          },
        },
      };
    }
  }
}

export async function getStudySubjects(filter: {
  type?: StudyType;
  level?: number;
  stage?: number;
  limit?: number;
}) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const cap = filter.limit ?? settings?.session_item_cap ?? 20;
  const leechThreshold = settings?.leech_threshold ?? 1.0;

  const where = filter.type
    ? studyWhere(filter.type, { level: filter.level, stage: filter.stage, leechThreshold })
    : {};

  return prisma.subject.findMany({
    where,
    include: {
      meanings: true,
      readings: true,
      mnemonic: true,
      progress: true,
      components: { include: { component: { include: { meanings: true } } } },
    },
    take: cap,
  });
}

// Counts for the /study hub cards.
export async function getStudyCounts() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const leechThreshold = settings?.leech_threshold ?? 1.0;
  const opts = { leechThreshold };

  const [leeches, burned, recent] = await Promise.all([
    prisma.subject.count({ where: studyWhere("leeches", opts) }),
    prisma.subject.count({ where: studyWhere("burned", opts) }),
    prisma.subject.count({ where: studyWhere("recent", opts) }),
  ]);

  return { leeches, burned, recent };
}
