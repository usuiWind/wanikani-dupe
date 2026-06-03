"use client";

import { useState, useEffect, useCallback } from "react";
import { useSessionStore } from "@/store/session";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { SrsChip } from "@/components/shared/SrsChip";

export function FlashCard() {
  const store = useSessionStore();
  const current = store.currentItem();
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [current?.subject.id, current?.promptType]);

  const flip = useCallback(() => setFlipped(true), []);

  const grade = useCallback(
    (knew: boolean) => {
      if (!current || !flipped) return;
      store.submitAnswer(current.subject.id, current.promptType, knew ? "✓" : "✗", knew);
      setFlipped(false);
    },
    [current, flipped, store]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); flip(); }
      if (e.key === "1" && flipped) grade(true);
      if (e.key === "2" && flipped) grade(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, grade, flipped]);

  if (!current) return null;
  const { subject, promptType } = current;

  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="flex flex-col items-center gap-3">
        <SubjectBadge type={subject.type} characters={subject.characters} size="xl" />
        <SrsChip stage={subject.srsStage} />
      </div>

      <div className="text-center text-lg font-semibold text-text capitalize">
        {promptType === "meaning" ? "What is the meaning?" : "What is the reading?"}
      </div>

      {!flipped ? (
        <button
          onClick={flip}
          className="w-full py-4 bg-surface0 text-subtext rounded-lg hover:bg-surface1 transition-colors text-sm"
        >
          Show answer (Space)
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-surface0 rounded-lg text-center">
            <div className="text-text font-medium">
              {promptType === "meaning"
                ? subject.meanings.join(" / ")
                : subject.readings.join(" / ")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => grade(true)}
              className="py-3 bg-green text-crust rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              I knew it (1)
            </button>
            <button
              onClick={() => grade(false)}
              className="py-3 bg-red text-crust rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              I didn&apos;t (2)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
