"use client";

import { useSessionStore } from "@/store/session";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { SrsChip } from "@/components/shared/SrsChip";

export function HistoryCard() {
  const store = useSessionStore();
  const { historyViewIndex, history, subjects } = store;

  if (historyViewIndex === null || !history[historyViewIndex]) return null;

  const entry = history[historyViewIndex];
  const subject = subjects[entry.subjectId];
  if (!subject) return null;

  return (
    <div className="w-full max-w-xl space-y-6 opacity-75">
      <div className="flex flex-col items-center gap-3">
        <SubjectBadge type={subject.type} characters={subject.characters} size="xl" />
        <SrsChip stage={subject.srsStage} />
        <div className="text-xs text-subtext">
          Card {historyViewIndex + 1} of {history.length}
        </div>
      </div>

      <div className="text-center text-lg font-semibold text-text capitalize">
        {entry.promptType === "meaning" ? "Meaning" : "Reading"}
      </div>

      <div className={`p-4 rounded-lg border-2 text-center ${entry.correct ? "border-green bg-green/10" : "border-red bg-red/10"}`}>
        <div className="text-text">{entry.answer}</div>
        <div className={`text-xs mt-1 ${entry.correct ? "text-green" : "text-red"}`}>
          {entry.correct ? "Correct" : "Wrong"}
        </div>
      </div>

      <div className="text-center text-sm text-subtext">
        Expected:{" "}
        {entry.promptType === "meaning"
          ? subject.meanings.join(", ")
          : subject.readings.join(", ")}
      </div>
    </div>
  );
}
