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

export async function getStudySubjects(filter: {
  type?: "level" | "stage" | "leeches" | "burned" | "recent";
  level?: number;
  stage?: number;
  limit?: number;
}) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const cap = filter.limit ?? settings?.session_item_cap ?? 20;
  const leechThreshold = settings?.leech_threshold ?? 1.0;

  let where = {};

  if (filter.type === "level" && filter.level) {
    where = { subject: { level: filter.level }, srs_stage: { gte: 1 } };
  } else if (filter.type === "stage" && filter.stage !== undefined) {
    where = { srs_stage: filter.stage };
  } else if (filter.type === "leeches") {
    where = { leech_score: { gte: leechThreshold }, srs_stage: { gte: 1, lte: 8 } };
  } else if (filter.type === "burned") {
    where = { srs_stage: 9 };
  } else if (filter.type === "recent") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    where = { last_reviewed_at: { gte: since } };
  }

  return prisma.subject.findMany({
    where: { progress: where },
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
