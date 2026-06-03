"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore, ReviewSubject } from "@/store/session";
import { TypedReviewCard } from "@/components/review/TypedReviewCard";
import { FlashCard } from "@/components/review/FlashCard";

function toReviewSubject(s: any): ReviewSubject {
  return {
    id: s.id,
    type: s.type,
    level: s.level,
    characters: s.characters,
    meanings: s.meanings.map((m: any) => m.text),
    readings: s.readings.map((r: any) => r.text),
    primaryReading: s.primary_reading,
    meaningMnemonic: s.mnemonic?.meaning_mnemonic ?? null,
    readingMnemonic: s.mnemonic?.reading_mnemonic ?? null,
    components: s.components?.map((c: any) => ({
      id: c.component.id,
      characters: c.component.characters,
      meanings: c.component.meanings.map((m: any) => m.text),
    })) ?? [],
    srsStage: s.progress?.srs_stage ?? null,
  };
}

export function SelfStudySession({ subjects, filterLabel }: { subjects: any[]; filterLabel: string }) {
  const router = useRouter();
  const store = useSessionStore();

  useEffect(() => {
    store.initSession(subjects.map(toReviewSubject));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") store.goBack();
      if (e.key === "ArrowRight") store.goForward();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  const queueEmpty = store.queue.length === 0;

  if (queueEmpty) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-semibold text-text">Done!</h1>
        <p className="text-subtext">{store.completedCount()} items · {store.correctPercent()}% correct</p>
        <p className="text-xs text-subtext">Self-study results are not saved to SRS.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-blue text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      <div className="h-1 bg-surface0">
        <div
          className="h-full bg-blue transition-all"
          style={{ width: `${store.totalCount() > 0 ? (store.completedCount() / store.totalCount()) * 100 : 0}%` }}
        />
      </div>
      <div className="flex justify-between px-4 py-2 text-sm text-subtext bg-mantle border-b border-surface0">
        <span className="text-xs text-yellow">Self Study — not saved to SRS</span>
        <div className="flex items-center gap-3">
          <span>{store.correctPercent()}% correct</span>
          <button
            onClick={store.toggleFlashcard}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${store.flashcardMode ? "border-mauve text-mauve" : "border-surface1 text-subtext hover:border-mauve"}`}
          >
            {store.flashcardMode ? "Flashcard ✓" : "Flashcard"}
          </button>
        </div>
        <span>{store.completedCount()}/{store.totalCount()} done</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {store.flashcardMode ? <FlashCard /> : <TypedReviewCard selfStudy />}
      </div>
      <div className="flex justify-center gap-4 pb-6 text-xs text-subtext">
        <button onClick={store.goBack} className="hover:text-text transition-colors">← Previous</button>
      </div>
    </main>
  );
}
