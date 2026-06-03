/**
 * KANJIDIC2 dataset builder
 *
 * Downloads required:
 *   kanjidic2.xml  — https://www.edrdg.org/kanjidic/kanjidic2.xml.gz  (decompress first)
 *   jmdict.json    — https://github.com/scriptin/jmdict-simplified/releases (optional, for vocabulary)
 *
 * Usage:
 *   npx tsx scripts/build-dataset/index.ts <kanjidic2.xml> [jmdict.json] [--jlpt-only]
 *
 * Output:
 *   data/base-dataset.json  — import-ready JSON for KaniLocal's import screen
 */
import "dotenv/config";
import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import * as path from "path";

// ── Types ────────────────────────────────────────────────────────────────────

interface KanjiEntry {
  character: string;
  jlpt: number | null;    // old scale: 4=N5 (easiest), 1=N2/N1 (hardest)
  grade: number | null;
  strokes: number | null;
  frequency: number | null;
  onyomi: string[];
  kunyomi: string[];
  meanings: string[];
}

interface ExportRow {
  id: string;
  type: "kanji" | "vocabulary";
  level: number;
  characters: string;
  jlpt_level: number | null;  // modern scale: N5=5, N4=4, ..., N1=1
  grade: number | null;
  stroke_count: number | null;
  frequency_rank: number | null;
  meanings: string[];
  readings_onyomi?: string[];
  readings_kunyomi?: string[];
  readings?: string[];
  primary_reading: string | null;
  components: string[];
}

// ── KANJIDIC2 parser ─────────────────────────────────────────────────────────

function parseKanjidic2(xmlPath: string): KanjiEntry[] {
  console.log(`Reading ${xmlPath}...`);
  const xml = fs.readFileSync(xmlPath, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => ["character", "reading", "meaning", "stroke_count"].includes(name),
  });

  const parsed = parser.parse(xml);
  const characters: any[] = parsed?.kanjidic2?.character ?? [];
  console.log(`Found ${characters.length} character entries`);

  const entries: KanjiEntry[] = [];

  for (const char of characters) {
    const literal = char.literal;
    if (!literal || typeof literal !== "string") continue;

    const misc = char.misc ?? {};
    const jlpt = misc.jlpt != null ? Number(misc.jlpt) : null;
    const grade = misc.grade != null ? Number(misc.grade) : null;
    const strokes = Array.isArray(misc.stroke_count)
      ? Number(misc.stroke_count[0])
      : misc.stroke_count != null ? Number(misc.stroke_count) : null;
    const frequency = misc.freq != null ? Number(misc.freq) : null;

    const rmgroup = char.reading_meaning?.rmgroup ?? {};
    const rawReadings: any[] = Array.isArray(rmgroup.reading)
      ? rmgroup.reading
      : rmgroup.reading ? [rmgroup.reading] : [];
    const rawMeanings: any[] = Array.isArray(rmgroup.meaning)
      ? rmgroup.meaning
      : rmgroup.meaning ? [rmgroup.meaning] : [];

    const onyomi: string[] = [];
    const kunyomi: string[] = [];

    for (const r of rawReadings) {
      const rtype = r["@_r_type"];
      const text = typeof r === "string" ? r : (r["#text"] ?? String(r));
      if (rtype === "ja_on") onyomi.push(text);
      else if (rtype === "ja_kun") kunyomi.push(text);
    }

    // English meanings only (no @_m_lang attribute = English)
    const meanings: string[] = rawMeanings
      .filter((m) => typeof m === "string" || !m["@_m_lang"])
      .map((m) => (typeof m === "string" ? m : (m["#text"] ?? String(m))))
      .filter(Boolean);

    if (meanings.length === 0) continue;

    entries.push({ character: literal, jlpt, grade, strokes, frequency, onyomi, kunyomi, meanings });
  }

  return entries;
}

// ── Level assignment ──────────────────────────────────────────────────────────

function assignLevels(entries: KanjiEntry[], numLevels = 60): Map<string, number> {
  // Sort: higher JLPT old-scale first (4=N5=easiest), then lower frequency first (more common)
  const sorted = [...entries].sort((a, b) => {
    const aj = a.jlpt ?? -1;
    const bj = b.jlpt ?? -1;
    if (bj !== aj) return bj - aj; // descending: 4, 3, 2, 1, null
    const af = a.frequency ?? 99999;
    const bf = b.frequency ?? 99999;
    return af - bf; // ascending: more common items first within same JLPT tier
  });

  const levelMap = new Map<string, number>();
  const chunkSize = Math.ceil(sorted.length / numLevels);

  sorted.forEach((e, i) => {
    const level = Math.min(numLevels, Math.floor(i / chunkSize) + 1);
    levelMap.set(e.character, level);
  });

  return levelMap;
}

// Old JLPT scale → modern N-level (N5=5, N4=4, N3=3, N2=2, N1=1)
function toModernJlpt(oldJlpt: number | null): number | null {
  if (oldJlpt === null) return null;
  // old 4=N5, 3=N4, 2=N3, 1=N2 (N1 not distinguished in KANJIDIC2)
  return oldJlpt + 1; // 4→5, 3→4, 2→3, 1→2
}

// ── Vocabulary from JMdict-simplified ────────────────────────────────────────

function extractVocabulary(
  jmdictPath: string,
  kanjiLevelMap: Map<string, number>,
  maxPerKanji = 3
): ExportRow[] {
  console.log(`Reading JMdict from ${jmdictPath}...`);
  const data = JSON.parse(fs.readFileSync(jmdictPath, "utf-8"));
  const words: any[] = data.words ?? [];

  const vocabRows: ExportRow[] = [];
  const kanjiVocabCount = new Map<string, number>();

  for (const word of words) {
    const kanjiForm = word.kanji?.find((k: any) => k.common)?.text ?? word.kanji?.[0]?.text;
    const kanaForm = word.kana?.find((k: any) => k.common)?.text ?? word.kana?.[0]?.text;

    if (!kanjiForm || !kanaForm) continue;

    // Only include words using kanji in our set
    const usedKanji = [...kanjiForm].filter((ch) => kanjiLevelMap.has(ch));
    if (usedKanji.length === 0) continue;

    // Assign vocabulary to the highest level of its component kanji
    const vocabLevel = Math.max(...usedKanji.map((ch) => kanjiLevelMap.get(ch) ?? 60));

    // Limit vocabulary per kanji to avoid flooding
    for (const ch of usedKanji) {
      if ((kanjiVocabCount.get(ch) ?? 0) >= maxPerKanji) continue;
      kanjiVocabCount.set(ch, (kanjiVocabCount.get(ch) ?? 0) + 1);
    }

    const meanings: string[] = word.sense
      ?.flatMap((s: any) => s.gloss?.map((g: any) => g.text) ?? [])
      .filter(Boolean)
      .slice(0, 5) ?? [];

    if (meanings.length === 0) continue;

    const id = `vocab-${kanjiForm}-${kanaForm}`.replace(/[^\w-]/g, "_");

    vocabRows.push({
      id,
      type: "vocabulary",
      level: vocabLevel,
      characters: kanjiForm,
      jlpt_level: null,
      grade: null,
      stroke_count: null,
      frequency_rank: null,
      meanings,
      readings: [kanaForm],
      primary_reading: kanaForm,
      components: [],
    });
  }

  return vocabRows;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jlptOnly = args.includes("--jlpt-only");
  const positional = args.filter((a) => !a.startsWith("--"));
  const xmlPath = positional[0];
  const jmdictPath = positional[1];

  if (!xmlPath) {
    console.error("Usage: npx tsx scripts/build-dataset/index.ts <kanjidic2.xml> [jmdict.json] [--jlpt-only]");
    console.error("\nGet the source files:");
    console.error("  kanjidic2.xml: https://www.edrdg.org/kanjidic/kanjidic2.xml.gz  (gunzip it)");
    console.error("  jmdict.json:   https://github.com/scriptin/jmdict-simplified/releases");
    process.exit(1);
  }

  if (!fs.existsSync(xmlPath)) {
    console.error(`Not found: ${xmlPath}`);
    process.exit(1);
  }

  let entries = parseKanjidic2(xmlPath);

  if (jlptOnly) {
    entries = entries.filter((e) => e.jlpt !== null);
    console.log(`Filtered to ${entries.length} JLPT kanji`);
  }

  console.log("Assigning levels...");
  const levelMap = assignLevels(entries, 60);

  const kanjiRows: ExportRow[] = entries.map((e) => ({
    id: `kanji-${e.character}`,
    type: "kanji",
    level: levelMap.get(e.character) ?? 60,
    characters: e.character,
    jlpt_level: toModernJlpt(e.jlpt),
    grade: e.grade,
    stroke_count: e.strokes,
    frequency_rank: e.frequency,
    meanings: e.meanings,
    readings_onyomi: e.onyomi,
    readings_kunyomi: e.kunyomi,
    primary_reading: e.onyomi[0] ?? e.kunyomi[0] ?? null,
    components: [],
  }));

  let allRows: ExportRow[] = kanjiRows;

  if (jmdictPath && fs.existsSync(jmdictPath)) {
    console.log("Extracting vocabulary from JMdict...");
    const vocabRows = extractVocabulary(jmdictPath, levelMap);
    allRows = [...kanjiRows, ...vocabRows];
    console.log(`Added ${vocabRows.length} vocabulary words`);
  }

  // Sort by level then type
  allRows.sort((a, b) => a.level !== b.level ? a.level - b.level : a.type.localeCompare(b.type));

  const outDir = path.join(process.cwd(), "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "base-dataset.json");
  fs.writeFileSync(outPath, JSON.stringify(allRows, null, 2));

  const levelCounts: Record<number, number> = {};
  for (const r of allRows) levelCounts[r.level] = (levelCounts[r.level] ?? 0) + 1;
  const counts = Object.values(levelCounts);

  console.log(`\n✓ ${allRows.length} items → ${outPath}`);
  console.log(`  Kanji: ${kanjiRows.length} | Vocab: ${allRows.length - kanjiRows.length}`);
  console.log(`  Levels: ${Object.keys(levelCounts).length} | Per level: ${Math.min(...counts)}–${Math.max(...counts)} (avg ${Math.round(allRows.length / counts.length)})`);
  console.log(`\nNext: npm run db:seed  (loads data/base-dataset.json into the database)`);
}

main();
