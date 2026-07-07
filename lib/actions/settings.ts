"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function updateSettings(data: {
  batch_size?: number;
  daily_new_cap?: number | null;
  flashcard_default?: boolean;
  theme?: string;
  answer_strictness?: string;
  accept_all_readings?: boolean;
  lesson_order?: string;
  session_item_cap?: number | null;
  leech_threshold?: number;
}) {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function toggleCatchUpMode() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const now = new Date();

  if (settings.review_freeze_at) {
    // Disabling: shift every scheduled review forward by the paused duration so
    // the backlog you cleared returns on its normal spacing, not all at once.
    const elapsed = now.getTime() - settings.review_freeze_at.getTime();

    if (elapsed > 0) {
      await prisma.$executeRaw`
        UPDATE "StudyProgress"
        SET next_review_at = next_review_at + (${elapsed} * interval '1 millisecond')
        WHERE next_review_at IS NOT NULL AND srs_stage >= 1 AND srs_stage <= 8
      `;
    }

    await prisma.settings.update({
      where: { id: 1 },
      data: { review_freeze_at: null },
    });
  } else {
    // Enabling: freeze the due cutoff at now — nothing new becomes due until off.
    await prisma.settings.update({
      where: { id: 1 },
      data: { review_freeze_at: now },
    });
  }

  revalidatePath("/");
  revalidatePath("/settings");
}

export async function toggleVacationMode() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const now = new Date();

  if (settings.vacation_mode) {
    const elapsed = settings.vacation_started_at
      ? now.getTime() - settings.vacation_started_at.getTime()
      : 0;

    if (elapsed > 0) {
      await prisma.$executeRaw`
        UPDATE "StudyProgress"
        SET next_review_at = next_review_at + (${elapsed} * interval '1 millisecond')
        WHERE next_review_at IS NOT NULL AND srs_stage >= 1 AND srs_stage <= 8
      `;
    }

    await prisma.settings.update({
      where: { id: 1 },
      data: { vacation_mode: false, vacation_started_at: null },
    });
  } else {
    await prisma.settings.update({
      where: { id: 1 },
      data: { vacation_mode: true, vacation_started_at: now },
    });
  }

  revalidatePath("/");
  revalidatePath("/settings");
}
