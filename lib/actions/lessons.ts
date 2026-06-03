"use server";

import { prisma } from "@/lib/prisma";
import { scheduleNextReview } from "@/lib/srs";
import { incrementDailyActivity } from "@/lib/actions/reviews";
import { revalidatePath } from "next/cache";

export async function getAvailableLessons() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const batchSize = settings?.batch_size ?? 5;
  const order = settings?.lesson_order ?? "level_type";

  const orderBy =
    order === "shuffled"
      ? [] // fetch all eligible then shuffle client-side
      : order === "lowest_stage"
      ? [{ progress: { srs_stage: "asc" as const } }]
      : [{ level: "asc" as const }, { type: "asc" as const }];

  const available = await prisma.subject.findMany({
    where: {
      progress: {
        unlocked_at: { not: null },
        started_at: null,
      },
    },
    include: {
      meanings: true,
      readings: true,
      mnemonic: true,
      components: {
        include: {
          component: { include: { meanings: true } },
        },
      },
    },
    orderBy,
    take: order === "shuffled" ? batchSize * 3 : batchSize,
  });

  if (order === "shuffled") {
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, batchSize);
  }

  return available;
}

export async function getAvailableLessonCount() {
  return prisma.studyProgress.count({
    where: { unlocked_at: { not: null }, started_at: null },
  });
}

export async function completeLessons(subjectIds: string[]) {
  const now = new Date();

  for (const subjectId of subjectIds) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { level: true },
    });
    if (!subject) continue;

    const nextReview = scheduleNextReview(1, subject.level, now);

    await prisma.studyProgress.update({
      where: { subject_id: subjectId },
      data: {
        srs_stage: 1,
        started_at: now,
        next_review_at: nextReview,
      },
    });
  }

  await incrementDailyActivity(now, 0, subjectIds.length, 0, 0);
  revalidatePath("/");
}

export async function initializeLevel1() {
  const now = new Date();

  const level1Radicals = await prisma.subject.findMany({
    where: { level: 1, type: "radical" },
    select: { id: true },
  });

  for (const r of level1Radicals) {
    await prisma.studyProgress.upsert({
      where: { subject_id: r.id },
      update: {},
      create: { subject_id: r.id, unlocked_at: now },
    });
  }

  revalidatePath("/");
}
