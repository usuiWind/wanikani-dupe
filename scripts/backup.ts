import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const progress = await prisma.studyProgress.findMany({
    include: { subject: { select: { id: true, type: true, level: true } } },
  });

  const out = {
    exported_at: new Date().toISOString(),
    count: progress.length,
    progress: progress.map((p) => ({
      subject_id: p.subject_id,
      subject_type: p.subject.type,
      subject_level: p.subject.level,
      srs_stage: p.srs_stage,
      unlocked_at: p.unlocked_at,
      started_at: p.started_at,
      next_review_at: p.next_review_at,
      passed_at: p.passed_at,
      burned_at: p.burned_at,
      total_correct: p.total_correct,
      total_incorrect: p.total_incorrect,
      leech_score: p.leech_score,
    })),
  };

  const outDir = path.join(process.cwd(), "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `backup-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`✓ Backed up ${progress.length} progress records → ${outPath}`);
  await prisma.$disconnect();
}

main().catch(console.error);
