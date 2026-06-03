import fs from "fs";
import path from "path";

const TOKEN = process.argv[2] || process.env.WANIKANI_TOKEN;
if (!TOKEN) {
  console.error("Usage: npx tsx scripts/fetch-wanikani.ts <api-token>");
  process.exit(1);
}

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

function esc(s: string): string {
  if (!s) return "";
  s = s.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  return s.includes(",") || s.includes('"')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function col(arr: string[], sep = "|"): string {
  return esc(arr.join(sep));
}

async function main() {
  console.log("Fetching subjects from WaniKani...");
  const subjects = await fetchAll(
    "https://api.wanikani.com/v2/subjects?hidden=false"
  );
  console.log(`Total subjects: ${subjects.length}`);

  // Build id→subject map for component name resolution
  const byId = new Map<number, any>(subjects.map((s) => [s.id, s]));

  const header = [
    "id","type","level","characters","meanings",
    "readings_onyomi","readings_kunyomi","readings","primary_reading",
    "jlpt_level","grade","stroke_count","frequency_rank",
    "components","meaning_mnemonic","reading_mnemonic",
  ].join(",");

  const rows: string[] = [header];

  for (const s of subjects) {
    const d = s.data;
    const type: string = s.object; // radical | kanji | vocabulary (kana_vocabulary treated as vocabulary)
    if (!["radical", "kanji", "vocabulary", "kana_vocabulary"].includes(type)) continue;

    const normalizedType = type === "kana_vocabulary" ? "vocabulary" : type;
    const id = `${normalizedType}-${s.id}`;
    const characters = d.characters ?? "";
    const level = d.level;

    const meanings = (d.meanings as any[])
      .sort((a: any, b: any) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .map((m: any) => m.meaning);

    const onyomi = (d.readings ?? [])
      .filter((r: any) => r.type === "onyomi")
      .sort((a: any, b: any) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .map((r: any) => r.reading);

    const kunyomi = (d.readings ?? [])
      .filter((r: any) => r.type === "kunyomi")
      .sort((a: any, b: any) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .map((r: any) => r.reading);

    const vocabReadings = (d.readings ?? [])
      .filter((r: any) => r.type === "onyomi" || r.type === "kunyomi" || r.type === "reading")
      .sort((a: any, b: any) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .map((r: any) => r.reading);

    const primaryReading =
      (d.readings ?? []).find((r: any) => r.primary)?.reading ?? "";

    // Component IDs → app-style IDs (only the parts that make up this subject, not what it's used in)
    const componentIds: string[] = (d.component_subject_ids ?? []).map((cid: number) => {
      const comp = byId.get(cid);
      if (!comp) return `unknown-${cid}`;
      const ct = comp.object === "kana_vocabulary" ? "vocabulary" : comp.object;
      return `${ct}-${cid}`;
    });

    const meaningMnemonic: string = d.meaning_mnemonic ?? "";
    const readingMnemonic: string = d.reading_mnemonic ?? "";

    const row = [
      esc(id),
      normalizedType,
      String(level),
      esc(characters),
      col(meanings),
      col(onyomi),
      col(kunyomi),
      col(normalizedType === "vocabulary" ? vocabReadings : []),
      esc(primaryReading),
      String(d.jlpt_level ?? ""),
      String(d.grade ?? ""),
      String(d.stroke_count ?? ""),
      String(d.frequency_rank ?? ""),
      col(componentIds),
      esc(meaningMnemonic),
      esc(readingMnemonic),
    ].join(",");

    rows.push(row);
  }

  const outPath = path.join(process.cwd(), "wanikani-subjects.csv");
  fs.writeFileSync(outPath, rows.join("\n"), "utf8");
  console.log(`Written ${rows.length - 1} subjects to ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
