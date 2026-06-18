"use client";

import { useTransition } from "react";
import { toggleCatchUpMode } from "@/lib/actions/settings";

export function CatchUpToggle({ active }: { active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => toggleCatchUpMode())}
      disabled={isPending}
      title={
        active
          ? "Catch-up mode on — new reviews are paused. Click to resume."
          : "Enable catch-up mode to freeze the review queue at its current size"
      }
      className={`text-xs px-2 py-1 rounded border transition-colors ${
        active
          ? "border-green text-green hover:bg-green hover:text-crust"
          : "border-surface1 text-subtext hover:border-green hover:text-green"
      } ${isPending ? "opacity-50 cursor-wait" : ""}`}
    >
      {isPending ? "..." : active ? "Catch-up ✓" : "Catch-up"}
    </button>
  );
}
