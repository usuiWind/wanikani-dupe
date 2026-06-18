"use client";

import { useTransition } from "react";
import { toggleVacationMode } from "@/lib/actions/settings";

export function VacationToggle({ active }: { active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => toggleVacationMode())}
      disabled={isPending}
      title={active ? "Disable vacation mode (V)" : "Enable vacation mode (V)"}
      className={`text-xs px-2 py-1 rounded border transition-colors ${
        active
          ? "border-yellow text-yellow hover:bg-yellow hover:text-crust"
          : "border-surface1 text-subtext hover:border-yellow hover:text-yellow"
      } ${isPending ? "opacity-50 cursor-wait" : ""}`}
    >
      {isPending ? "..." : active ? "End Vacation" : "Vacation"}
    </button>
  );
}
