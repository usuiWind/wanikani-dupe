"use client";

import { ForecastBucket } from "@/lib/actions/forecast";
import { useState } from "react";

function Bar({ bucket, max }: { bucket: ForecastBucket; max: number }) {
  const pct = max > 0 ? Math.round((bucket.count / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="text-xs text-subtext w-full text-center truncate" title={`${bucket.count} reviews`}>
        {bucket.count > 0 ? bucket.count : ""}
      </div>
      <div className="w-full bg-surface1 rounded-sm overflow-hidden" style={{ height: 48 }}>
        <div className="w-full transition-all rounded-sm" style={{ height: `${pct}%`, marginTop: `${100 - pct}%`, background: "var(--blue)" }} />
        {bucket.critical > 0 && (
          <div className="w-full absolute bottom-0" style={{ height: `${Math.round((bucket.critical / Math.max(1, bucket.count)) * pct)}%`, background: "var(--red)" }} />
        )}
      </div>
      <div className="text-xs text-subtext truncate w-full text-center">{bucket.label}</div>
    </div>
  );
}

export function ReviewForecast({
  hourly,
  daily,
}: {
  hourly: ForecastBucket[];
  daily: ForecastBucket[];
}) {
  const [view, setView] = useState<"hourly" | "daily">("hourly");
  const buckets = view === "hourly" ? hourly : daily;
  const max = Math.max(...buckets.map((b) => b.count), 1);

  const totalUpcoming = buckets.slice(1).reduce((s, b) => s + b.count, 0);

  return (
    <div className="bg-mantle border border-surface0 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-text">Upcoming Reviews</h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setView("hourly")}
            className={`px-2 py-1 rounded transition-colors ${view === "hourly" ? "bg-blue text-white" : "bg-surface0 text-subtext hover:text-text"}`}
          >
            24h
          </button>
          <button
            onClick={() => setView("daily")}
            className={`px-2 py-1 rounded transition-colors ${view === "daily" ? "bg-blue text-white" : "bg-surface0 text-subtext hover:text-text"}`}
          >
            7d
          </button>
        </div>
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
        {buckets.map((b, i) => {
          const pct = max > 0 ? Math.round((b.count / max) * 100) : 0;
          const critPct = b.count > 0 ? Math.round((b.critical / b.count) * pct) : 0;
          const burnPct = b.count > 0 ? Math.round((b.burn / b.count) * pct) : 0;
          return (
            <div key={i} className="flex flex-col items-center gap-1 min-w-0" title={`${b.count} reviews${b.critical ? ` (${b.critical} critical)` : ""}${b.burn ? ` (${b.burn} burns)` : ""}`}>
              <div className="text-xs text-subtext w-full text-center" style={{ fontSize: 10 }}>
                {b.count > 0 ? b.count : ""}
              </div>
              <div className="relative w-full bg-surface1 rounded-sm" style={{ height: 40 }}>
                {b.count > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-sm"
                    style={{ height: `${pct}%`, background: b.critical > 0 ? "var(--red)" : b.burn > 0 ? "var(--yellow)" : "var(--blue)" }}
                  />
                )}
              </div>
              <div className="text-subtext truncate w-full text-center" style={{ fontSize: 9 }}>{b.label}</div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-3 text-xs text-subtext">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue inline-block" /> Normal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red inline-block" /> Critical (Apprentice, current level)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-yellow inline-block" /> Burns
        </span>
      </div>
    </div>
  );
}
