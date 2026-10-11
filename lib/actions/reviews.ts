"use server";

import { prisma } from "@/lib/prisma";
import { computeNextStage, scheduleNextReview } from "@/lib/srs";
import { computeLeechScore } from "@/lib/leech";
import { getCurrentLevel } from "@/lib/level";
import type { Prisma } from "@/app/generated/prisma";
import { revalidatePath } from "next/cache";

export async function getDueReviewCount(): Promise<number> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings?.vacation_mode) return 0;
  const cutoff = settings?.review_freeze_at ?? new Date();
  return prisma.studyProgress.count({
    where: { srs_stage: { gte: 1, lte: 8 }, next_review_at: { lte: cutoff } },
  });
}

export async function getDueReviews() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings?.vacation_mode) return [];
  const cutoff = settings?.review_freeze_at ?? new Date();

  return prisma.subject.findMany({
    where: {
      progress: {
        srs_stage: { gte: 1, lte: 8 },
        next_review_at: { lte: cutoff },
      },
    },
    include: {
      meanings: true,
      readings: true,
      mnemonic: true,
      progress: true,
      components: {
        include: {
          component: { include: { meanings: true } },
        },
      },
    },
  });
}

type ReviewResult = {
  subjectId: string;
  incorrectMeaningCount: number;
  incorrectReadingCount: number;
};

// Persist a single fully-answered item. Kept cheap (no checkLevelUp/revalidate)
// so it can be called incrementally as each item is completed during a session.
async function applyReviewResult(result: ReviewResult, now: Date) {
  const progress = await prisma.studyProgress.findUnique({
    where: { subject_id: result.subjectId },
    include: { subject: { select: { level: true } } },
  });

  if (!progress || !progress.srs_stage) return;

  const totalIncorrect = result.incorrectMeaningCount + result.incorrectReadingCount;
  const newStage = computeNextStage(progress.srs_stage, totalIncorrect);
  const nextReview = scheduleNextReview(newStage, progress.subject.level, now);

  const newTotalCorrect = progress.total_correct + (totalIncorrect === 0 ? 1 : 0);
  const newTotalIncorrect = progress.total_incorrect + (totalIncorrect > 0 ? 1 : 0);
  const leechScore = computeLeechScore(newTotalIncorrect, newStage);

  await prisma.studyProgress.update({
    where: { subject_id: result.subjectId },
    data: {
      srs_stage: newStage,
      next_review_at: nextReview,
      passed_at: newStage >= 5 && !progress.passed_at ? now : progress.passed_at,
      burned_at: newStage === 9 ? now : progress.burned_at,
      total_correct: newTotalCorrect,
      total_incorrect: newTotalIncorrect,
      leech_score: leechScore,
      last_reviewed_at: now,
    },
  });

  await prisma.reviewsLog.create({
    data: {
      subject_id: result.subjectId,
      started_at: now,
      ended_at: now,
      incorrect_meaning_count: result.incorrectMeaningCount,
      incorrect_reading_count: result.incorrectReadingCount,
      resulting_stage: newStage,
    },
  });

  await incrementDailyActivity(
    now,
    1,
    0,
    totalIncorrect === 0 ? 1 : 0,
    totalIncorrect > 0 ? 1 : 0
  );

  if (newStage >= 5) {
    await unlockDependents(result.subjectId, now);
  }
}

// Save one completed review item immediately. Called per item during a session
// so progress survives leaving/refreshing before the session is finished.
export async function saveReviewItem(result: ReviewResult) {
  await applyReviewResult(result, new Date());
}

// Run once when a session ends: level-up check + dashboard revalidation.
export async function finalizeReviewSession() {
  await checkLevelUp(new Date());
  revalidatePath("/");
}

async function incrementDailyActivity(
  date: Date,
  reviewsDone: number,
  lessonsDone: number,
  correct: number,
  incorrect: number
) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  await prisma.dailyActivity.upsert({
    where: { date: day },
    update: {
      reviews_done: { increment: reviewsDone },
      lessons_done: { increment: lessonsDone },
      correct: { increment: correct },
      incorrect: { increment: incorrect },
    },
    create: {
      date: day,
      reviews_done: reviewsDone,
      lessons_done: lessonsDone,
      correct,
      incorrect,
    },
  });
}

export { incrementDailyActivity };

// Unlock every still-locked subject matching `where` whose components are all
// Guru+. Radicals have no components, so they always qualify.
async function unlockReady(where: Prisma.SubjectWhereInput, now: Date) {
  const locked = await prisma.subject.findMany({
    where: { ...where, OR: [{ progress: null }, { progress: { unlocked_at: null } }] },
    select: {
      id: true,
      components: {
        select: { component: { select: { progress: { select: { srs_stage: true } } } } },
      },
    },
  });

  for (const s of locked) {
    const allGuruPlus = s.components.every(
      (c) => (c.component.progress?.srs_stage ?? 0) >= 5
    );
    if (allGuruPlus) {
      await prisma.studyProgress.upsert({
        where: { subject_id: s.id },
        update: { unlocked_at: now },
        create: { subject_id: s.id, unlocked_at: now },
      });
    }
  }
}

async function unlockDependents(componentId: string, now: Date) {
  const currentLevel = await getCurrentLevel();
  if (!currentLevel) return;
  // Level-gated: items above the current level wait for the level-up.
  await unlockReady(
    { components: { some: { component_id: componentId } }, level: { lte: currentLevel } },
    now
  );
}

async function checkLevelUp(now: Date) {
  const currentLevel = await getCurrentLevel();
  if (!currentLevel) return;

  // Catch anything at or below the current level that should already be unlocked.
  await unlockReady({ level: { lte: currentLevel } }, now);

  const radicals = await prisma.subject.findMany({
    where: { level: currentLevel, type: "radical" },
    include: { progress: true },
  });

  const radicalsGuru = radicals.every((r) => (r.progress?.srs_stage ?? 0) >= 5);
  if (!radicals.length || !radicalsGuru) return;

  const kanji = await prisma.subject.findMany({
    where: { level: currentLevel, type: "kanji" },
    include: { progress: true },
  });

  const kanjiGuruCount = kanji.filter((k) => (k.progress?.srs_stage ?? 0) >= 5).length;
  if (kanji.length === 0 || kanjiGuruCount / kanji.length < 0.9) return;

  // Level up: next level's radicals, plus its kanji/vocab whose components are
  // already Guru+ from earlier levels.
  await unlockReady({ level: currentLevel + 1 }, now);
}

export async function unburnItem(subjectId: string) {
  await prisma.studyProgress.update({
    where: { subject_id: subjectId },
    data: {
      srs_stage: 1,
      burned_at: null,
      next_review_at: scheduleNextReview(1, 1),
    },
  });
  revalidatePath(`/items/${subjectId}`);
}
