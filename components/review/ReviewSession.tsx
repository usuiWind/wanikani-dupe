"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore, ReviewSubject } from "@/store/session";
import { saveReviewItem, finalizeReviewSession } from "@/lib/actions/reviews";
import { TypedReviewCard } from "./TypedReviewCard";
import { FlashCard } from "./FlashCard";
import { HistoryCard } from "./HistoryCard";

interface Props {
  subjects: ReviewSubject[];
  acceptAllReadings?: boolean;
}

export function ReviewSession({ subjects, acceptAllReadings = true }: Props) {
  const router = useRouter();
  const store = useSessionStore();

  useEffect(() => {
    store.initSession(subjects);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Items already persisted to the DB this session, so we never double-save.
  const savedRef = useRef<Set<string>>(new Set());
  // Serialize saves so concurrent flushes can't race on shared rows.
  const flushChain = useRef<Promise<void>>(Promise.resolve());

  const flushItem = useCallback((subjectId: string) => {
    if (savedRef.current.has(subjectId)) return;
    const st = store.itemState[subjectId];
    if (!st) return;
    savedRef.current.add(subjectId);
    const payload = {
      subjectId,
      incorrectMeaningCount: st.incorrectMeaningCount,
      incorrectReadingCount: st.incorrectReadingCount,
    };
    flushChain.current = flushChain.current
      .then(() => saveReviewItem(payload))
      .catch((err) => {
        // Allow a later retry (on end-session) if this save failed.
        savedRef.current.delete(subjectId);
        console.error("Failed to save review item", subjectId, err);
      });
  }, [store.itemState]);

  // Persist each completed item once it's "locked in" — i.e. no longer the
  // undoable last answer — so an undo can never contradict a saved row.
  useEffect(() => {
    const undoable = store.pendingUndo?.subjectId ?? null;
    for (const id of store.completed) {
      if (id !== undoable) flushItem(id);
    }
  }, [store.completed, store.pendingUndo, flushItem]);

  const endSession = useCallback(async () => {
    // Flush any remaining completed items (including the last undoable one).
    for (const id of store.completed) flushItem(id);
    await flushChain.current;
    await finalizeReviewSession();
    router.push("/");
    router.refresh();
  }, [store.completed, flushItem, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") store.goBack();
      if (e.key === "ArrowRight") store.goForward();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  const totalCount = Object.keys(store.subjects).length;
  const completedCount = Object.values(store.subjects).filter((s) => {
    const st = store.itemState[s.id];
    return !!st && st.meaningAnswered && (s.type === "radical" || st.readingAnswered);
  }).length;
  const correctPct = store.history.length === 0 ? 100
    : Math.round(store.history.filter(h => h.correct).length / store.history.length * 100);
  const queueEmpty = store.queue.length === 0;

  if (queueEmpty) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-semibold text-text">Session complete!</h1>
        <p className="text-subtext">
          {completedCount} items reviewed · {correctPct}% correct
        </p>
        <button
          onClick={endSession}
          className="px-6 py-3 bg-blue text-crust rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Save and finish
        </button>
      </main>
    );
  }

  const isViewingHistory = store.historyViewIndex !== null;

  return (
    <main className="flex-1 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-surface0">
        <div
          className="h-full bg-blue transition-all"
          style={{
            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Stats row */}
      <div className="flex justify-between px-4 py-2 text-sm text-subtext bg-mantle border-b border-surface0">
        <span>{totalCount - completedCount} remaining</span>
        <div className="flex items-center gap-3">
          <span>{correctPct}% correct</span>
          <button
            onClick={store.toggleFlashcard}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              store.flashcardMode
                ? "border-mauve text-mauve"
                : "border-surface1 text-subtext hover:border-mauve hover:text-mauve"
            }`}
          >
            {store.flashcardMode ? "Flashcard ✓" : "Flashcard"}
          </button>
          <button
            onClick={endSession}
            className="text-xs px-2 py-0.5 rounded border border-surface1 text-subtext hover:border-red hover:text-red transition-colors"
          >
            End session
          </button>
        </div>
        <span>{completedCount}/{totalCount} done</span>
      </div>

      {/* Navigation hint */}
      {isViewingHistory && (
        <div className="text-center py-2 text-xs text-yellow bg-yellow/10 border-b border-yellow/30">
          Viewing history (read only) — press → to return
        </div>
      )}

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {isViewingHistory ? (
          <HistoryCard />
        ) : store.flashcardMode ? (
          <FlashCard />
        ) : (
          <TypedReviewCard acceptAllReadings={acceptAllReadings} />
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex justify-center gap-4 pb-6 text-xs text-subtext">
        <button onClick={store.goBack} className="hover:text-text transition-colors">
          ← Previous
        </button>
        {isViewingHistory && (
          <button onClick={store.goForward} className="hover:text-text transition-colors">
            → Current
          </button>
        )}
      </div>
    </main>
  );
}
