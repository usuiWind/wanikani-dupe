import { PrismaClient } from "../app/generated/prisma";
const p = new PrismaClient();
async function main() {
  // Fix the started_at we just wrote — set to a past date so it doesn't pollute level detection
  const fixed = await p.studyProgress.updateMany({
    where: {
      subject: { level: { lte: 3 } },
      srs_stage: 9,
      started_at: { gte: new Date("2026-01-01") }, // only the ones we just wrote
    },
    data: { started_at: new Date("2020-01-01") },
  });
  console.log("Fixed started_at for:", fixed.count, "items");
  await p.$disconnect();
}
main();
