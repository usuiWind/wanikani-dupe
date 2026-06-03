import fs from "fs";
import path from "path";
import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();
const CSV = path.join(process.cwd(), "wanikani-subjects.csv");

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      cols.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function num(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

async function main() {
  const lines = fs.readFileSync(CSV, "utf8").split("\n").filter(Boolean);
  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(",");

  const idx = (name: string) => headers.indexOf(name);

  console.log(`Parsing ${dataLines.length} rows...`);

  type Row = {
    id: string; type: "radical" | "kanji" | "vocabulary"; level: number;
    characters: string | null; primary_reading: string | null;
    jlpt_level: number | null; grade: number | null;
    stroke_count: number | null; frequency_rank: number | null;
    meanings: { text: string; is_primary: boolean }[];
    readings: { text: string; reading_type: "onyomi" | "kunyomi" | "vocab"; is_primary: boolean }[];
    meaning_mnemonic: string | null; reading_mnemonic: string | null;
    components: string[];
  };

  const rows: Row[] = [];

  for (const line of dataLines) {
    const c = parseCSVLine(line);
    const type = c[idx("type")] as "radical" | "kanji" | "vocabulary";
    const primaryReading = c[idx("primary_reading")] || null;

    const meanings = c[idx("meanings")].split("|").filter(Boolean).map((t, i) => ({
      text: t, is_primary: i === 0,
    }));

    const readings: Row["readings"] = [];
    for (const r of c[idx("readings_onyomi")].split("|").filter(Boolean))
      readings.push({ text: r, reading_type: "onyomi", is_primary: r === primaryReading });
    for (const r of c[idx("readings_kunyomi")].split("|").filter(Boolean))
      readings.push({ text: r, reading_type: "kunyomi", is_primary: r === primaryReading });
    for (const r of c[idx("readings")].split("|").filter(Boolean))
      readings.push({ text: r, reading_type: "vocab", is_primary: r === primaryReading });

    rows.push({
      id: c[idx("id")],
      type,
      level: parseInt(c[idx("level")], 10),
      characters: c[idx("characters")] || null,
      primary_reading: primaryReading,
      jlpt_level: num(c[idx("jlpt_level")]),
      grade: num(c[idx("grade")]),
      stroke_count: num(c[idx("stroke_count")]),
      frequency_rank: num(c[idx("frequency_rank")]),
      meanings,
      readings,
      meaning_mnemonic: c[idx("meaning_mnemonic")] || null,
      reading_mnemonic: c[idx("reading_mnemonic")] || null,
      components: c[idx("components")].split("|").filter(Boolean),
    });
  }

  const CHUNK = 500;

  // Wipe all subject-related tables instantly (avoids statement timeout from cascading DELETE)
  console.log("Clearing existing data...");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Subject" CASCADE`);

  // 1. Subjects
  console.log("Inserting subjects...");
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.subject.createMany({
      data: rows.slice(i, i + CHUNK).map((r) => ({
        id: r.id, type: r.type, level: r.level, characters: r.characters,
        primary_reading: r.primary_reading, jlpt_level: r.jlpt_level,
        grade: r.grade, stroke_count: r.stroke_count, frequency_rank: r.frequency_rank,
      })),
      skipDuplicates: true,
    });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log();

  // 2. Meanings
  console.log("Inserting meanings...");
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.subjectMeaning.createMany({
      data: rows.slice(i, i + CHUNK).flatMap((r) => r.meanings.map((m) => ({ subject_id: r.id, ...m }))),
    });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log();

  // 3. Readings
  console.log("Inserting readings...");
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.subjectReading.createMany({
      data: rows.slice(i, i + CHUNK).flatMap((r) => r.readings.map((rd) => ({ subject_id: r.id, ...rd }))),
    });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log();

  // 4. Mnemonics
  console.log("Inserting mnemonics...");
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.mnemonic.createMany({
      data: rows.slice(i, i + CHUNK).map((r) => ({
        subject_id: r.id, meaning_mnemonic: r.meaning_mnemonic, reading_mnemonic: r.reading_mnemonic,
      })),
      skipDuplicates: true,
    });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log();

  // 5. Components (after all subjects exist)
  console.log("Inserting components...");
  const compRows = rows.flatMap((r) =>
    r.components.map((cid) => ({ subject_id: r.id, component_id: cid }))
  );
  for (let i = 0; i < compRows.length; i += CHUNK) {
    await prisma.subjectComponent.createMany({
      data: compRows.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, compRows.length)}/${compRows.length}`);
  }
  console.log();

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
