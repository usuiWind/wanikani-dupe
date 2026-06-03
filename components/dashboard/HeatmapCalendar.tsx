"use client";

interface DayData {
  date: Date;
  reviews_done: number;
}

function intensityClass(count: number): string {
  if (count === 0) return "bg-surface1";
  if (count < 10) return "bg-blue/30";
  if (count < 30) return "bg-blue/60";
  if (count < 60) return "bg-blue/80";
  return "bg-blue";
}

export function HeatmapCalendar({
  data,
  streak,
}: {
  data: { date: Date | string; reviews_done: number }[];
  streak: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a map keyed by YYYY-MM-DD
  const map = new Map<string, number>();
  for (const row of data) {
    const d = new Date(row.date);
    const key = d.toISOString().slice(0, 10);
    map.set(key, row.reviews_done);
  }

  // Generate last 365 days in week-aligned grid
  const days: DayData[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, reviews_done: map.get(key) ?? 0 });
  }

  // Pad start to Monday boundary
  const firstDayOfWeek = days[0].date.getDay(); // 0=Sun
  const padDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const totalCells = [...Array(padDays).fill(null), ...days];
  const totalReviews = data.reduce((s, r) => s + r.reviews_done, 0);

  return (
    <div className="bg-mantle border border-surface0 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-text">Review Activity</h2>
        <div className="flex items-center gap-4 text-xs text-subtext">
          <span>{totalReviews.toLocaleString()} reviews total</span>
          {streak > 0 && (
            <span className="text-blue font-medium">{streak} day streak</span>
          )}
        </div>
      </div>

      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: "repeat(53, minmax(0, 1fr))" }}
      >
        {/* Render week columns */}
        {Array.from({ length: 53 }, (_, week) =>
          Array.from({ length: 7 }, (__, dayOfWeek) => {
            const cellIdx = week * 7 + dayOfWeek;
            const cell = totalCells[cellIdx];
            if (!cell) return <div key={`${week}-${dayOfWeek}`} />;
            return (
              <div
                key={`${week}-${dayOfWeek}`}
                className={`w-full aspect-square rounded-sm ${intensityClass(cell.reviews_done)}`}
                title={`${cell.date.toDateString()}: ${cell.reviews_done} reviews`}
              />
            );
          })
        ).flat()}
      </div>
    </div>
  );
}
