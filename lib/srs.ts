// SRS intervals in hours per stage (index = stage number)
const STAGE_INTERVALS: (number | null)[] = [
  null, // 0 unused
  4,    // 1 Apprentice 1
  8,    // 2 Apprentice 2
  24,   // 3 Apprentice 3
  48,   // 4 Apprentice 4
  168,  // 5 Guru 1 (1 week)
  336,  // 6 Guru 2 (2 weeks)
  720,  // 7 Master (~1 month)
  2880, // 8 Enlightened (~4 months)
  null, // 9 Burned
];

// Accelerated intervals for levels 1–2, Apprentice stages only
const ACCELERATED_INTERVALS: (number | null)[] = [
  null, // 0 unused
  2,    // 1: 2h
  4,    // 2: 4h
  8,    // 3: 8h
  24,   // 4: 1d
];

export type SrsGroup = "apprentice" | "guru" | "master" | "enlightened" | "burned";

export function getSrsGroup(stage: number): SrsGroup {
  if (stage <= 4) return "apprentice";
  if (stage <= 6) return "guru";
  if (stage === 7) return "master";
  if (stage === 8) return "enlightened";
  return "burned";
}

export function getSrsLabel(stage: number): string {
  if (stage <= 4) return `Apprentice ${stage}`;
  if (stage === 5) return "Guru 1";
  if (stage === 6) return "Guru 2";
  if (stage === 7) return "Master";
  if (stage === 8) return "Enlightened";
  return "Burned";
}

export function computeNextStage(currentStage: number, incorrectCount: number): number {
  if (incorrectCount === 0) return Math.min(9, currentStage + 1);
  const incorrectAdjustment = Math.round(incorrectCount / 2);
  const penalty = currentStage < 5 ? 1 : 2;
  return Math.max(1, currentStage - incorrectAdjustment * penalty);
}

export function scheduleNextReview(stage: number, level: number, from: Date = new Date()): Date | null {
  if (stage === 9) return null;

  const isAccelerated = level <= 2 && stage >= 1 && stage <= 4;
  const hours = isAccelerated ? ACCELERATED_INTERVALS[stage] : STAGE_INTERVALS[stage];

  if (hours === null) return null;

  const next = new Date(from.getTime() + hours * 60 * 60 * 1000);
  // Round down to start of the hour
  next.setMinutes(0, 0, 0);
  return next;
}

export function shiftReviewTime(nextReviewAt: Date | null, vacationMs: number): Date | null {
  if (!nextReviewAt) return null;
  return new Date(nextReviewAt.getTime() + vacationMs);
}
