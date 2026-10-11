import { prisma } from "@/lib/prisma";

// Current level = highest level with an unlocked radical, since levelling up is
// what unlocks the next level's radicals. Not derived from started_at or from
// kanji/vocab: imported progress has strays far above and below the real level.
export async function getCurrentLevel(): Promise<number | null> {
  const top = await prisma.subject.findFirst({
    where: { type: "radical", progress: { unlocked_at: { not: null } } },
    select: { level: true },
    orderBy: { level: "desc" },
  });
  return top?.level ?? null;
}
