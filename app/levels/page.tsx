import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { SrsChip } from "@/components/shared/SrsChip";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ jlpt?: string; type?: string; stage?: string }>;
}

const SRS_GROUPS: Record<string, [number, number]> = {
  apprentice: [1, 4],
  guru: [5, 6],
  master: [7, 7],
  enlightened: [8, 8],
  burned: [9, 9],
};

export default async function LevelsPage({ searchParams }: Props) {
  const params = await searchParams;
  const jlptFilter = params.jlpt ? parseInt(params.jlpt) : null;
  const typeFilter = params.type ?? null;
  const stageFilter = params.stage ?? null;
  const [stageMin, stageMax] = stageFilter ? (SRS_GROUPS[stageFilter] ?? [null, null]) : [null, null];

  const where: Record<string, unknown> = {};
  if (jlptFilter) where.jlpt_level = jlptFilter;
  if (typeFilter) where.type = typeFilter;
  if (stageMin !== null) where.progress = { srs_stage: { gte: stageMin, lte: stageMax } };

  const subjects = await prisma.subject.findMany({
    where,
    include: { progress: true, meanings: { where: { is_primary: true } } },
    orderBy: [{ level: "asc" }, { type: "asc" }],
  });

  const byLevel: Record<number, typeof subjects> = {};
  for (const s of subjects) {
    if (!byLevel[s.level]) byLevel[s.level] = [];
    byLevel[s.level].push(s);
  }
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

  // JLPT band stats
  const jlptStats = await prisma.$queryRaw<{ jlpt_level: number; total: bigint; guru: bigint }[]>`
    SELECT s.jlpt_level, COUNT(*) as total,
      SUM(CASE WHEN sp.srs_stage >= 5 THEN 1 ELSE 0 END) as guru
    FROM "Subject" s
    LEFT JOIN "StudyProgress" sp ON sp.subject_id = s.id
    WHERE s.jlpt_level IS NOT NULL
    GROUP BY s.jlpt_level
    ORDER BY s.jlpt_level DESC
  `;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold text-text">Level Browser</h1>

        {/* JLPT progress bands */}
        {jlptStats.length > 0 && (
          <div className="bg-mantle border border-surface0 rounded-xl p-5">
            <h2 className="text-sm font-medium text-subtext mb-3">JLPT Progress</h2>
            <div className="space-y-2">
              {jlptStats.map((row) => {
                const total = Number(row.total);
                const guru = Number(row.guru);
                const pct = total > 0 ? Math.round((guru / total) * 100) : 0;
                const label = row.jlpt_level ? `N${6 - row.jlpt_level}` : "—";
                return (
                  <div key={row.jlpt_level}>
                    <div className="flex justify-between text-xs text-subtext mb-0.5">
                      <Link href={`/levels?jlpt=${row.jlpt_level}`} className="hover:text-blue">{label}</Link>
                      <span>{guru}/{total} Guru ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-surface0 rounded-full overflow-hidden">
                      <div className="h-full bg-blue rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <form className="flex flex-wrap gap-2 text-sm" method="GET">
          <select name="jlpt" defaultValue={jlptFilter?.toString() ?? ""} className="bg-surface0 text-text rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue">
            <option value="">All JLPT</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={6 - n}>N{n}</option>)}
          </select>
          <select name="type" defaultValue={typeFilter ?? ""} className="bg-surface0 text-text rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue">
            <option value="">All types</option>
            <option value="radical">Radicals</option>
            <option value="kanji">Kanji</option>
            <option value="vocabulary">Vocabulary</option>
          </select>
          <select name="stage" defaultValue={stageFilter ?? ""} className="bg-surface0 text-text rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue">
            <option value="">All stages</option>
            <option value="apprentice">Apprentice</option>
            <option value="guru">Guru</option>
            <option value="master">Master</option>
            <option value="enlightened">Enlightened</option>
            <option value="burned">Burned</option>
          </select>
          <button type="submit" className="px-3 py-1.5 bg-blue text-white rounded-lg hover:opacity-90">Filter</button>
          {(jlptFilter || typeFilter || stageFilter) && (
            <Link href="/levels" className="px-3 py-1.5 bg-surface0 text-subtext rounded-lg hover:text-text">Clear</Link>
          )}
        </form>

        {levels.length === 0 && (
          <p className="text-subtext">No subjects found. <Link href="/import" className="text-blue hover:underline">Import data</Link></p>
        )}

        {levels.map((level) => {
          const items = byLevel[level];
          const radicals = items.filter((s) => s.type === "radical");
          const kanji = items.filter((s) => s.type === "kanji");
          const vocab = items.filter((s) => s.type === "vocabulary");

          return (
            <div key={level} className="bg-mantle border border-surface0 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text mb-4">Level {level}</h2>
              {[
                { label: "Radicals", items: radicals, color: "text-blue" },
                { label: "Kanji", items: kanji, color: "text-mauve" },
                { label: "Vocabulary", items: vocab, color: "text-pink" },
              ].map(({ label, items: subs, color }) =>
                subs.length > 0 ? (
                  <div key={label} className="mb-4">
                    <div className={`text-sm font-medium ${color} mb-2`}>{label}</div>
                    <div className="flex flex-wrap gap-2">
                      {subs.map((s) => (
                        <Link
                          key={s.id}
                          href={`/items/${s.id}`}
                          className="flex flex-col items-center gap-1 p-2 bg-surface0 rounded-lg hover:bg-surface1 transition-colors min-w-12"
                        >
                          <span className="text-lg text-text" style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}>
                            {s.characters ?? s.meanings[0]?.text ?? s.id}
                          </span>
                          <SrsChip stage={s.progress?.srs_stage ?? null} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
