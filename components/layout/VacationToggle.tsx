"use client";

import { toggleVacationMode } from "@/lib/actions/settings";

export function VacationToggle({ active }: { active: boolean }) {
  return (
    <button
      onClick={() => toggleVacationMode()}
      title={active ? "Disable vacation mode (V)" : "Enable vacation mode (V)"}
      className={`text-xs px-2 py-1 rounded border transition-colors ${
        active
          ? "border-yellow text-yellow hover:bg-yellow hover:text-crust"
          : "border-surface1 text-subtext hover:border-yellow hover:text-yellow"
      }`}
    >
      {active ? "End Vacation" : "Vacation"}
    </button>
  );
}
