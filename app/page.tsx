import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { DashboardShortcuts } from "@/components/layout/DashboardShortcuts";
import { ReviewForecast } from "@/components/dashboard/ReviewForecast";
import { HeatmapCalendar } from "@/components/dashboard/HeatmapCalendar";
import { getDueReviewCount } from "@/lib/actions/reviews";
import { getAvailableLessonCount } from "@/lib/actions/lessons";
import { getSettings } from "@/lib/actions/settings";
import { getReviewForecast, getHeatmapData, getStreakCount } from "@/lib/actions/forecast";
import { prisma } from "@/lib/prisma";
import { getSrsGroup } from "@/lib/srs";

async function getDashboardData() {
  // Round 1: fetch everything that doesn't depend on current level in parallel
  const [
    dueCount, lessonCount, settings, forecast, heatmap, streak,
    latestProgress, stageCounts,
  ] = await Promise.all([
    getDueReviewCount(),
    getAvailableLessonCount(),
    getSettings(),
    getReviewForecast(),
    getHeatmapData(),
    getStreakCount(),
    prisma.studyProgress.findFirst({
      where: { started_at: { not: null }, srs_stage: { gte: 1, lte: 8 } },
      select: { subject: { select: { level: true } } },
      orderBy: { started_at: "desc" },
    }),
    prisma.studyProgress.groupBy({
      by: ["srs_stage"],
      where: { srs_stage: { not: null } },
      _count: { srs_stage: true },
    }),
  ]);

  const currentLevel = latestProgress?.subject.level ?? 1;

  // Auto-unlock Level 1 radicals only if no progress exists at all
  if (!latestProgress && lessonCount === 0) {
    const level1Radicals = await prisma.subject.findMany({
      where: { level: 1, type: "radical" },
      select: { id: true },
    });
    if (level1Radicals.length > 0) {
      await prisma.studyProgress.createMany({
        data: level1Radicals.map((r) => ({ subject_id: r.id, unlocked_at: new Date() })),
        skipDuplicates: true,
      });
    }
  }

  // Round 2: current-level counts (depends on currentLevel from round 1)
  const [radicalTotal, kanjiTotal, radicalsGuru, kanjiGuru] = await Promise.all([
    prisma.subject.count({ where: { level: currentLevel, type: "radical" } }),
    prisma.subject.count({ where: { level: currentLevel, type: "kanji" } }),
    prisma.studyProgress.count({
      where: { subject: { level: currentLevel, type: "radical" }, srs_stage: { gte: 5 } },
    }),
    prisma.studyProgress.count({
      where: { subject: { level: currentLevel, type: "kanji" }, srs_stage: { gte: 5 } },
    }),
  ]);

  const dist = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 };
  for (const row of stageCounts) {
    if (row.srs_stage != null) {
      dist[getSrsGroup(row.srs_stage)] += row._count.srs_stage;
    }
  }

  return {
    dueCount,
    lessonCount,
    currentLevel,
    radicalTotal,
    radicalsGuru,
    kanjiTotal,
    kanjiGuru,
    dist,
    settings,
    forecast,
    heatmap,
    streak,
  };
}

export default async function Dashboard() {
  const {
    dueCount, lessonCount, currentLevel, radicalTotal, radicalsGuru,
    kanjiTotal, kanjiGuru, dist, settings, forecast, heatmap, streak,
  } = await getDashboardData();

  const radicalPct = radicalTotal ? Math.round((radicalsGuru / radicalTotal) * 100) : 0;
  const kanjiPct = kanjiTotal ? Math.round((kanjiGuru / kanjiTotal) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <DashboardShortcuts />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">

        {settings.vacation_mode && (
          <div className="bg-yellow/10 border border-yellow rounded-xl p-4 text-yellow text-sm">
            Vacation mode is active — reviews are frozen. Press <kbd className="bg-yellow/20 px-1 rounded">V</kbd> or use the header button to disable.
          </div>
        )}

        <div className="flex items-center gap-4 p-5 bg-mantle border border-surface0 rounded-xl">
          <span className="text-5xl leading-none select-none">🦀</span>
          <div>
            <div className="font-semibold text-text text-lg">
              {dueCount > 0
                ? `${dueCount} review${dueCount === 1 ? "" : "s"} waiting`
                : lessonCount > 0
                ? `${lessonCount} new lesson${lessonCount === 1 ? "" : "s"} available`
                : streak > 0
                ? `${streak}-day streak — all caught up!`
                : "All caught up!"}
            </div>
            <div className="text-sm text-subtext">Level {currentLevel} · KaniLocal</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/lessons"
            className={`p-6 rounded-xl bg-mantle border border-surface0 hover:border-blue transition-colors ${
              lessonCount === 0 ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <div className="text-4xl font-bold text-blue">{lessonCount}</div>
            <div className="text-subtext mt-1">Lessons available</div>
          </Link>

          <Link
            href="/reviews"
            className={`p-6 rounded-xl bg-mantle border border-surface0 hover:border-mauve transition-colors ${
              dueCount === 0 ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <div className="text-4xl font-bold text-mauve">{dueCount}</div>
            <div className="text-subtext mt-1">Reviews due</div>
          </Link>
        </div>

        <ReviewForecast hourly={forecast.hourly} daily={forecast.daily} />

        <div className="bg-mantle border border-surface0 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text">Level {currentLevel} Progress</h2>
            <Link href="/levels" className="text-sm text-blue hover:underline">View all levels</Link>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue">Radicals</span>
                <span className="text-subtext">{radicalsGuru}/{radicalTotal} Guru</span>
              </div>
              <div className="h-2 bg-surface0 rounded-full overflow-hidden">
                <div className="h-full bg-blue rounded-full transition-all" style={{ width: `${radicalPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-mauve">Kanji</span>
                <span className="text-subtext">{kanjiGuru}/{kanjiTotal} Guru (need 90%)</span>
              </div>
              <div className="h-2 bg-surface0 rounded-full overflow-hidden">
                <div className="h-full bg-mauve rounded-full transition-all" style={{ width: `${kanjiPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-mantle border border-surface0 rounded-xl p-6">
          <h2 className="font-semibold text-text mb-4">Items by Stage</h2>
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { label: "Apprentice", count: dist.apprentice, color: "text-red" },
              { label: "Guru", count: dist.guru, color: "text-mauve" },
              { label: "Master", count: dist.master, color: "text-blue" },
              { label: "Enlightened", count: dist.enlightened, color: "text-sky" },
              { label: "Burned", count: dist.burned, color: "text-overlay" },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-surface0 rounded-lg p-3">
                <div className={`text-2xl font-bold ${color}`}>{count}</div>
                <div className="text-xs text-subtext mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <HeatmapCalendar data={heatmap} streak={streak} />

        <div className="bg-mantle border border-surface0 rounded-xl p-4 text-xs text-subtext">
          <div className="font-medium text-text mb-2">Keyboard shortcuts</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <span><kbd className="bg-surface0 px-1 rounded">V</kbd> Toggle vacation mode</span>
            <span><kbd className="bg-surface0 px-1 rounded">Enter</kbd> Submit answer (in reviews)</span>
            <span><kbd className="bg-surface0 px-1 rounded">←</kbd> <kbd className="bg-surface0 px-1 rounded">→</kbd> Navigate history</span>
            <span><kbd className="bg-surface0 px-1 rounded">Backspace</kbd> Undo last answer</span>
            <span><kbd className="bg-surface0 px-1 rounded">Space</kbd> Flip flashcard</span>
            <span><kbd className="bg-surface0 px-1 rounded">1</kbd> Knew it · <kbd className="bg-surface0 px-1 rounded">2</kbd> Missed it</span>
          </div>
        </div>

      </main>
    </div>
  );
}
