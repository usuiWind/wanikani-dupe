import "dotenv/config";
import { prisma } from "../lib/prisma";

// Backfills Subject.image_url for image radicals (those with no Unicode
// character). Only touches image_url — does not truncate or re-import anything.
//
// With a token it pulls current URLs from the WaniKani API (covers all image
// radicals, stays correct across content movements):
//   npx tsx scripts/backfill-radical-images.ts <api-token>
// Without a token it uses IMAGE_URLS below, scraped from the public
// wanikani.com/radicals/<slug> pages (files.wanikani.com CDN, no auth) — the
// 15 image radicals present in this dataset:
//   npx tsx scripts/backfill-radical-images.ts

// ponytail: static map is a snapshot; run with a token to re-sync if WaniKani
// moves/adds image radicals.
const IMAGE_URLS: Record<string, string> = {
  "radical-8766": "https://files.wanikani.com/8v0hjy2gh2dnmh1cgbcg8cedpd58", // Beggar
  "radical-8770": "https://files.wanikani.com/0dhu1giyf87t64fcp993ltgsrf5v", // Kick
  "radical-9452": "https://files.wanikani.com/w2i6pg4t17keomaoftbc1dqmot8k", // Rib Cage
  "radical-8787": "https://files.wanikani.com/15z81qc4c77tmjeypri69yrtipgd", // Yurt
  "radical-8773": "https://files.wanikani.com/zjrb5pypsqst01qqzrf7ikowyrs1", // Pope
  "radical-8778": "https://files.wanikani.com/w371b37nk3fbuf2p4bfclqu33ayr", // Tofu
  "radical-8781": "https://files.wanikani.com/nb178l9s3p19munbl7unsn8x00k6", // Creeper
  "radical-8788": "https://files.wanikani.com/c4mr6dvhrg2vozxgg7252hbtkhg9", // Explosion
  "radical-8790": "https://files.wanikani.com/dgeoshskssv0r7bnmaxj0o4lt1el", // Death Star
  "radical-8792": "https://files.wanikani.com/43evwoxebvriistgr2ti2lvnwjkd", // Comb
  "radical-8771": "https://files.wanikani.com/l5nl91im7fvbcqjuwg1ovpenb82h", // Hills
  "radical-8799": "https://files.wanikani.com/xtpqax3w4v50hbunqkij53oruddj", // Elf
  "radical-8796": "https://files.wanikani.com/qllq7st7fa0cld22teqa9d9x0zbt", // Cactus
  "radical-8798": "https://files.wanikani.com/v61hmex1837301x4dm1hehpg1wx4", // Satellite
  "radical-8797": "https://files.wanikani.com/zttqaf4pmr1hyfn4zm1of5d1ey5l", // Psychopath
};

const TOKEN = process.argv[2] || process.env.WANIKANI_TOKEN;

async function backfillFromMap() {
  let updated = 0;
  for (const [id, url] of Object.entries(IMAGE_URLS)) {
    const res = await prisma.subject.updateMany({ where: { id }, data: { image_url: url } });
    if (res.count > 0) { updated++; console.log(`  ${id} → ${url}`); }
    else console.warn(`  ${id} not found in DB — skipped`);
  }
  console.log(`Done. Updated ${updated} radical image_url(s) from the static map.`);
  await prisma.$disconnect();
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
  if (!TOKEN) {
    console.log("No token — backfilling from the static CDN map...");
    return backfillFromMap();
  }
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
