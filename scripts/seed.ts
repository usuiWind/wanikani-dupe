import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();

// Minimal Level 1 sample data — replace with your full dataset
const sampleData = [
  {
    id: "radical-ground",
    type: "radical" as const,
    level: 1,
    characters: "一",
    meanings: ["Ground"],
    meaning_mnemonic: "This is the ground. A flat line on the ground.",
  },
  {
    id: "radical-fins",
    type: "radical" as const,
    level: 1,
    characters: "丨",
    meanings: ["Stick"],
    meaning_mnemonic: "A stick sticking straight up from the ground.",
  },
  {
    id: "kanji-one",
    type: "kanji" as const,
    level: 1,
    characters: "一",
    meanings: ["One"],
    readings_onyomi: ["いち", "いつ"],
    readings_kunyomi: ["ひと"],
    primary_reading: "いち",
    components: ["radical-ground"],
    meaning_mnemonic: "One line. One.",
    reading_mnemonic: "いち sounds like 'each'. Each one.",
  },
  {
    id: "kanji-two",
    type: "kanji" as const,
    level: 1,
    characters: "二",
    meanings: ["Two"],
    readings_onyomi: ["に", "じ"],
    readings_kunyomi: ["ふた"],
    primary_reading: "に",
    components: ["radical-ground"],
    meaning_mnemonic: "Two lines. Two.",
    reading_mnemonic: "に is the sound of 'knee'. Two knees.",
  },
  {
    id: "vocab-one",
    type: "vocabulary" as const,
    level: 1,
    characters: "一",
    meanings: ["One"],
    readings: ["いち"],
    primary_reading: "いち",
    components: ["kanji-one"],
    meaning_mnemonic: "Just the number one.",
    reading_mnemonic: "いち — one.",
  },
];

async function main() {
  console.log("Seeding database...");

  // Ensure settings row exists
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  for (const row of sampleData) {
    await prisma.subject.upsert({
      where: { id: row.id },
      update: { type: row.type, level: row.level, characters: row.characters, primary_reading: row.primary_reading ?? null },
      create: { id: row.id, type: row.type, level: row.level, characters: row.characters, primary_reading: row.primary_reading ?? null },
    });

    await prisma.subjectMeaning.deleteMany({ where: { subject_id: row.id } });
    await prisma.subjectMeaning.createMany({
      data: row.meanings.map((text, i) => ({ subject_id: row.id, text, is_primary: i === 0 })),
    });

    await prisma.subjectReading.deleteMany({ where: { subject_id: row.id } });
    const readingRows: { subject_id: string; text: string; reading_type: "onyomi" | "kunyomi" | "vocab"; is_primary: boolean }[] = [];
    if ("readings" in row && Array.isArray(row.readings)) {
      for (const r of row.readings as string[]) {
        readingRows.push({ subject_id: row.id, text: r, reading_type: "vocab", is_primary: r === row.primary_reading });
      }
    } else {
      for (const r of (row as { readings_onyomi?: string[] }).readings_onyomi ?? []) {
        readingRows.push({ subject_id: row.id, text: r, reading_type: "onyomi", is_primary: r === (row as { primary_reading?: string }).primary_reading });
      }
      for (const r of (row as { readings_kunyomi?: string[] }).readings_kunyomi ?? []) {
        readingRows.push({ subject_id: row.id, text: r, reading_type: "kunyomi", is_primary: r === (row as { primary_reading?: string }).primary_reading });
      }
    }
    if (readingRows.length) await prisma.subjectReading.createMany({ data: readingRows });

    await prisma.mnemonic.upsert({
      where: { subject_id: row.id },
      update: {
        meaning_mnemonic: row.meaning_mnemonic ?? null,
        reading_mnemonic: (row as { reading_mnemonic?: string }).reading_mnemonic ?? null,
      },
      create: {
        subject_id: row.id,
        meaning_mnemonic: row.meaning_mnemonic ?? null,
        reading_mnemonic: (row as { reading_mnemonic?: string }).reading_mnemonic ?? null,
      },
    });

    await prisma.subjectComponent.deleteMany({ where: { subject_id: row.id } });
    const components = (row as { components?: string[] }).components ?? [];
    if (components.length) {
      await prisma.subjectComponent.createMany({
        data: components.map((cid) => ({ subject_id: row.id, component_id: cid })),
      });
    }
  }

  // Unlock Level 1 radicals for lessons
  const level1Radicals = await prisma.subject.findMany({
    where: { level: 1, type: "radical" },
    select: { id: true },
  });

  for (const r of level1Radicals) {
    await prisma.studyProgress.upsert({
      where: { subject_id: r.id },
      update: {},
      create: { subject_id: r.id, unlocked_at: new Date() },
    });
  }

  console.log(`Seeded ${sampleData.length} subjects. Level 1 radicals unlocked for lessons.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
