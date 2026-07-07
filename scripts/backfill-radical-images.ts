import { prisma } from "../lib/prisma";

// Backfills Subject.image_url for image radicals (those with no Unicode
// character). Only touches image_url — does not truncate or re-import anything.
// Usage: npx tsx scripts/backfill-radical-images.ts <api-token>

const TOKEN = process.argv[2] || process.env.WANIKANI_TOKEN;
if (!TOKEN) {
  console.error("Usage: npx tsx scripts/backfill-radical-images.ts <api-token>");
  process.exit(1);
}

const HEADERS = { Authorization: `Bearer ${TOKEN}` };

async function fetchAll(url: string): Promise<any[]> {
  const results: any[] = [];
  let next: string | null = url;
  while (next) {
    const res: Response = await fetch(next, { headers: HEADERS });
    if (!res.ok) throw new Error(`WaniKani API error ${res.status}: ${await res.text()}`);
    const body: any = await res.json();
    results.push(...body.data);
    next = body.pages?.next_url ?? null;
  }
  return results;
}

function pickImage(images: any[]): string | null {
  if (!images?.length) return null;
  // Prefer an SVG with inline styles (renders standalone); fall back to any SVG, then PNG.
  const svgInline = images.find((i) => i.content_type === "image/svg+xml" && i.metadata?.inline_styles);
  const svg = svgInline ?? images.find((i) => i.content_type === "image/svg+xml");
  if (svg) return svg.url;
  return images.find((i) => i.content_type === "image/png")?.url ?? null;
}

async function main() {
  console.log("Fetching radicals from WaniKani...");
  const radicals = await fetchAll("https://api.wanikani.com/v2/subjects?types=radical");

  let updated = 0;
  let missing = 0;
  for (const s of radicals) {
    if (s.data.characters) continue; // only image radicals need a URL
    const url = pickImage(s.data.character_images);
    if (!url) { missing++; continue; }
    const res = await prisma.subject.updateMany({
      where: { id: `radical-${s.id}` },
      data: { image_url: url },
    });
    if (res.count > 0) { updated++; console.log(`  radical-${s.id} → ${url}`); }
  }

  console.log(`Done. Updated ${updated} radical image_url(s).` + (missing ? ` (${missing} had no image)` : ""));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
