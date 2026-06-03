"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/store/session";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { SrsChip } from "@/components/shared/SrsChip";
import { isNearMiss } from "@/lib/fuzzy";
import * as wanakana from "wanakana";

type AnswerState = "idle" | "correct" | "wrong" | "nearmiss";

export function TypedReviewCard({
  acceptAllReadings = true,
  selfStudy = false,
}: {
  acceptAllReadings?: boolean;
  selfStudy?: boolean;
}) {
  const store = useSessionStore();
  const current = store.currentItem();
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [showInfo, setShowInfo] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnswer("");
    setAnswerState("idle");
    setShowInfo(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [current?.subject.id, current?.promptType]);

  const bindWanakana = useCallback(
    (el: HTMLInputElement | null) => {
      const ref = inputRef as React.MutableRefObject<HTMLInputElement | null>;
      if (!el) {
        if (ref.current) wanakana.unbind(ref.current);
        ref.current = null;
        return;
      }
      // Always unbind first so a previous reading binding doesn't carry over to meaning
      wanakana.unbind(el);
      if (current?.promptType === "reading") {
        wanakana.bind(el, { IMEMode: true });
      }
      ref.current = el;
    },
    [current?.promptType]
  );

  const handleSubmit = useCallback(() => {
    if (!current || answerState !== "idle") return;

    const { subject, promptType } = current;
    const trimmed = answer.trim().toLowerCase();
    if (!trimmed) return;

    let correct = false;
    let nearMiss = false;

    if (promptType === "meaning") {
      const accepted = subject.meanings.map((m) => m.toLowerCase());
      correct = accepted.includes(trimmed);
      if (!correct) nearMiss = isNearMiss(trimmed, subject.meanings);
    } else {
      const candidates = acceptAllReadings
        ? subject.readings
        : subject.primaryReading
        ? [subject.primaryReading]
        : subject.readings;
      correct = candidates.some((r) => r === answer.trim());
    }

    if (nearMiss && !correct) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setAnswerState("nearmiss");
      return;
    }

    setAnswerState(correct ? "correct" : "wrong");
    setShowInfo(!correct);
  }, [current, answer, answerState, acceptAllReadings]);

  const handleNext = useCallback(
    (override?: boolean) => {
      if (!current || answerState === "idle") return;
      const isCorrect = override !== undefined ? override : answerState === "correct";
      store.submitAnswer(current.subject.id, current.promptType, answer, isCorrect);
      setAnswer("");
      setAnswerState("idle");
      setShowInfo(false);
    },
    [current, answerState, answer, store]
  );

  const handleUndo = useCallback(() => {
    store.undoLast();
    setAnswer("");
    setAnswerState("idle");
    setShowInfo(false);
  }, [store]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (answerState === "idle" || answerState === "nearmiss") handleSubmit();
        else handleNext();
      }
      if (e.key === "Backspace" && answer === "" && store.pendingUndo && answerState === "idle") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answerState, answer, handleSubmit, handleNext, handleUndo, store.pendingUndo]);

  if (!current) return null;
  const { subject, promptType } = current;
  const itemState = store.getItemState(subject.id);

  const borderColor =
    answerState === "correct" ? "border-green"
    : answerState === "wrong" ? "border-red"
    : answerState === "nearmiss" ? "border-yellow"
    : "border-surface1";
  const inputBg =
    answerState === "correct" ? "bg-green/10"
    : answerState === "wrong" ? "bg-red/10"
    : answerState === "nearmiss" ? "bg-yellow/10"
    : "bg-surface0";

  return (
    <div className={`w-full max-w-xl space-y-6 ${shake ? "animate-pulse" : ""}`}>
      <div className="flex flex-col items-center gap-3">
        <SubjectBadge type={subject.type} characters={subject.characters} size="xl" />
        <SrsChip stage={subject.srsStage} />
        <div className="text-sm text-subtext capitalize">
          {subject.type} · Level {subject.level}
        </div>
      </div>

      <div className="text-center">
        <div className="text-lg font-semibold text-text capitalize">
          {promptType === "meaning" ? "Meaning" : "Reading"}
        </div>
        {promptType === "reading" && (
          <div className="text-xs text-subtext mt-0.5">Type in Japanese (romaji auto-converts)</div>
        )}
        {promptType === "reading" && !acceptAllReadings && (
          <div className="text-xs text-overlay mt-0.5">Primary reading only</div>
        )}
      </div>

      <div className={`rounded-lg border-2 ${borderColor} ${inputBg} transition-colors`}>
        <input
          ref={bindWanakana}
          type="text"
          value={answer}
          onChange={(e) => (answerState === "idle" || answerState === "nearmiss") && setAnswer(e.target.value)}
          placeholder={promptType === "meaning" ? "Type the meaning..." : "Type the reading..."}
          className="w-full bg-transparent px-4 py-4 text-center text-xl text-text outline-none placeholder:text-overlay"
          lang={promptType === "reading" ? "ja" : undefined}
          readOnly={answerState === "correct" || answerState === "wrong"}
        />
      </div>

      {answerState === "nearmiss" && (
        <div className="text-center text-sm text-yellow">
          Close! Check your spelling and try again.
        </div>
      )}

      {answerState !== "idle" && answerState !== "nearmiss" && (
        <div className={`text-center text-sm ${answerState === "correct" ? "text-green" : "text-red"}`}>
          {answerState === "correct" ? "Correct!" : `Wrong — expected: ${
            promptType === "meaning"
              ? subject.meanings.join(", ")
              : subject.readings.join(", ")
          }`}
        </div>
      )}

      <div className="flex gap-3">
        {answerState === "idle" || answerState === "nearmiss" ? (
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-blue text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Check (Enter)
          </button>
        ) : (
          <>
            {!selfStudy && answerState === "wrong" && (
              <button
                onClick={() => handleNext(true)}
                className="px-3 py-3 bg-surface0 text-yellow rounded-lg text-sm hover:bg-surface1 transition-colors"
                title="Mark as correct (typo)"
              >
                Typo ✓
              </button>
            )}
            <button
              onClick={handleUndo}
              className="px-4 py-3 bg-surface0 text-subtext rounded-lg hover:text-text transition-colors text-sm"
            >
              Undo
            </button>
            <button
              onClick={() => handleNext()}
              className="flex-1 py-3 bg-blue text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Next (Enter)
            </button>
          </>
        )}
      </div>

      <div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full text-sm text-subtext hover:text-text transition-colors text-left"
        >
          {showInfo ? "▼" : "▶"} {promptType === "meaning" ? "Meaning mnemonic" : "Reading mnemonic"}
        </button>
        {showInfo && (
          <div className="mt-2 p-3 bg-surface0 rounded-lg text-sm text-text">
            {promptType === "meaning"
              ? (subject.meaningMnemonic ?? "No mnemonic.")
              : (subject.readingMnemonic ?? "No mnemonic.")}
          </div>
        )}
      </div>

      {(itemState.incorrectMeaningCount > 0 || itemState.incorrectReadingCount > 0) && (
        <div className="text-center text-xs text-red">
          This item: {itemState.incorrectMeaningCount} meaning mistake(s), {itemState.incorrectReadingCount} reading mistake(s)
        </div>
      )}
    </div>
  );
}
