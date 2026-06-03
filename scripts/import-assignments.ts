import { PrismaClient } from "../app/generated/prisma";

const TOKEN = process.argv[2] || process.env.WANIKANI_TOKEN;
if (!TOKEN) {
  console.error("Usage: npx tsx scripts/import-assignments.ts <api-token>");
  process.exit(1);
}

const prisma = new PrismaClient();
const HEADERS = { Authorization: `Bearer ${TOKEN}` };

async function fetchAll(url: string): Promise<any[]> {
  const results: any[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next, { headers: HEADERS });
    if (!res.ok) throw new Error(`WaniKani API error ${res.status}: ${await res.text()}`);
    const body = await res.json();
    results.push(...body.data);
    next = body.pages?.next_url ?? null;
    process.stdout.write(`\r  fetched ${results.length}...`);
  }
  console.log();
  return results;
}

async function main() {
  console.log("Fetching assignments from WaniKani...");
  const assignments = await fetchAll("https://api.wanikani.com/v2/assignments");
  console.log(`Total assignments: ${assignments.length}`);

  // Load known subject IDs to avoid FK violations
  const knownSubjects = await prisma.subject.findMany({ select: { id: true } });
  const knownIds = new Set(knownSubjects.map((s) => s.id));
  console.log(`Known subjects in DB: ${knownIds.size}`);

  const rows: {
    subject_id: string;
    srs_stage: number | null;
    unlocked_at: Date | null;
    started_at: Date | null;
    next_review_at: Date | null;
    passed_at: Date | null;
    burned_at: Date | null;
  }[] = [];

  let skipped = 0;
  for (const a of assignments) {
    const d = a.data;
    const type = d.subject_type === "kana_vocabulary" ? "vocabulary" : d.subject_type;
    const subjectId = `${type}-${d.subject_id}`;

    if (!knownIds.has(subjectId)) { skipped++; continue; }

    rows.push({
      subject_id: subjectId,
      // WaniKani srs_stage 0 means "available as lesson but not started" — store as null to match our schema
      srs_stage: d.srs_stage > 0 ? d.srs_stage : null,
      unlocked_at: d.unlocked_at ? new Date(d.unlocked_at) : null,
      started_at: d.started_at ? new Date(d.started_at) : null,
      next_review_at: d.available_at ? new Date(d.available_at) : null,
      passed_at: d.passed_at ? new Date(d.passed_at) : null,
      burned_at: d.burned_at ? new Date(d.burned_at) : null,
    });
  }

  console.log(`Importing ${rows.length} assignments (${skipped} skipped — subject not in DB)...`);

  // Wipe existing progress and reimport from WaniKani as source of truth
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "StudyProgress"`);

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.studyProgress.createMany({
      data: rows.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log();
  console.log("Done. Run the dev server and reload the dashboard.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
