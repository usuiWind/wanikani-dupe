import { PrismaClient } from "../app/generated/prisma";
const p = new PrismaClient();
async function main() {
  const now = new Date();

  const dueReviews = await p.studyProgress.count({
    where: { srs_stage: { gte: 1, lte: 8 }, next_review_at: { lte: now } },
  });
  const lessons = await p.studyProgress.count({
    where: { unlocked_at: { not: null }, started_at: null },
  });
  const burned = await p.studyProgress.count({ where: { srs_stage: 9 } });

  const startedMax = await p.studyProgress.findFirst({
    where: { started_at: { not: null } },
    select: { subject: { select: { level: true } }, started_at: true },
    orderBy: { started_at: "desc" },
  });

  console.log("=== General ===");
  console.log("Due reviews now:    ", dueReviews);
  console.log("Available lessons:  ", lessons);
  console.log("Burned items:       ", burned);
  console.log("Current level (started_at desc):", startedMax?.subject.level ?? "none");
  console.log("Most recently started_at:       ", startedMax?.started_at ?? "none");

  // Check level 3 item stages specifically
  const level3Stages = await p.studyProgress.groupBy({
    by: ["srs_stage"],
    where: { subject: { level: 3 } },
    _count: { srs_stage: true },
  });
  console.log("\n=== Level 3 SRS stage breakdown ===");
  for (const row of level3Stages.sort((a, b) => (a.srs_stage ?? 0) - (b.srs_stage ?? 0))) {
    console.log(`  stage ${row.srs_stage ?? "null"}: ${row._count.srs_stage} items`);
  }

  // How many level 1-3 items are still in apprentice (stages 1-4)?
  const lowLevelApprentice = await p.studyProgress.count({
    where: { subject: { level: { lte: 3 } }, srs_stage: { gte: 1, lte: 4 } },
  });
  const lowLevelLessons = await p.studyProgress.count({
    where: { subject: { level: { lte: 3 } }, unlocked_at: { not: null }, started_at: null },
  });
  const lowLevelNoProgress = await p.studyProgress.count({
    where: { subject: { level: { lte: 3 } }, srs_stage: null },
  });

  console.log("\n=== Level 1-3 items ===");
  console.log("  In Apprentice (stage 1-4): ", lowLevelApprentice);
  console.log("  Available as lessons:      ", lowLevelLessons);
  console.log("  No SRS stage (null):       ", lowLevelNoProgress);

  // Show a sample of level 3 items that are still active
  const sampleActive = await p.studyProgress.findMany({
    where: { subject: { level: 3 }, srs_stage: { gte: 1, lte: 8 } },
    select: {
      srs_stage: true,
      started_at: true,
      subject: { select: { characters: true, type: true } },
    },
    take: 10,
  });
  if (sampleActive.length > 0) {
    console.log("\n=== Sample active level-3 items ===");
    for (const r of sampleActive) {
      console.log(`  ${r.subject.characters ?? "(no char)"} [${r.subject.type}] stage=${r.srs_stage} started=${r.started_at?.toISOString().slice(0, 10) ?? "null"}`);
    }
  }

  await p.$disconnect();
}
main();
