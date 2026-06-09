"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/store/session";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { SrsChip } from "@/components/shared/SrsChip";
import * as wanakana from "wanakana";

type AnswerState = "idle" | "correct" | "wrong";

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
  const [showClearHint, setShowClearHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBound = useRef(false);
  const clearHintRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setAnswer("");
    setAnswerState("idle");
    setShowInfo(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [current?.subject.id, current?.promptType]);

  // Reset clear hint whenever we return to idle
  useEffect(() => {
    if (answerState === "idle") {
      clearHintRef.current = false;
      setShowClearHint(false);
      clearTimeout(clearTimerRef.current);
    }
  }, [answerState]);

  const bindWanakana = useCallback(
    (el: HTMLInputElement | null) => {
      const ref = inputRef as React.MutableRefObject<HTMLInputElement | null>;
      if (!el) {
        if (ref.current && isBound.current) {
          wanakana.unbind(ref.current);
          isBound.current = false;
        }
        ref.current = null;
        return;
      }
      if (isBound.current) {
        wanakana.unbind(el);
        isBound.current = false;
      }
      if (current?.promptType === "reading") {
        wanakana.bind(el, { IMEMode: true });
        isBound.current = true;
      }
      ref.current = el;
    },
    [current?.promptType]
  );

  const handleSubmit = useCallback(() => {
    if (!current || answerState !== "idle") return;

    const { subject, promptType } = current;
    // Read live DOM value to catch any pending wanakana conversion React state hasn't synced yet
    const liveValue = inputRef.current?.value ?? answer;
    if (liveValue !== answer) setAnswer(liveValue);
    const trimmed = liveValue.trim().toLowerCase();
    if (!trimmed) return;

    let correct = false;

    if (promptType === "meaning") {
      const accepted = subject.meanings.map((m) => m.toLowerCase());
      correct = accepted.includes(trimmed);
    } else {
      const candidates = acceptAllReadings
        ? subject.readings
        : subject.primaryReading
        ? [subject.primaryReading]
        : subject.readings;
      correct = candidates.some((r) => r === liveValue.trim());
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
        if (answerState === "idle") handleSubmit();
        else handleNext();
      }
      if (e.key === "Backspace" && answerState === "idle" && answer === "" && store.pendingUndo) {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === "Backspace" && (answerState === "wrong" || answerState === "correct")) {
        e.preventDefault();
        if (clearHintRef.current) {
          clearTimeout(clearTimerRef.current);
          clearHintRef.current = false;
          setShowClearHint(false);
          setAnswer("");
          setAnswerState("idle");
          setShowInfo(false);
        } else {
          clearHintRef.current = true;
          setShowClearHint(true);
          clearTimerRef.current = setTimeout(() => {
            clearHintRef.current = false;
            setShowClearHint(false);
          }, 1500);
        }
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
    : "border-surface1";
  const inputBg =
    answerState === "correct" ? "bg-green/10"
    : answerState === "wrong" ? "bg-red/10"
    : "bg-surface0";

  return (
    <div className="w-full max-w-xl space-y-6">
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
          onChange={(e) => answerState === "idle" && setAnswer(e.target.value)}
          placeholder={promptType === "meaning" ? "Type the meaning..." : "Type the reading..."}
          className="w-full bg-transparent px-4 py-4 text-center text-xl text-text outline-none placeholder:text-overlay"
          lang={promptType === "reading" ? "ja" : undefined}
          readOnly={answerState !== "idle"}
        />
      </div>

      {answerState !== "idle" && (
        <div className={`text-center text-sm ${answerState === "correct" ? "text-green" : "text-red"}`}>
          {answerState === "correct" ? "Correct!" : `Wrong — expected: ${
            promptType === "meaning"
              ? subject.meanings.join(", ")
              : subject.readings.join(", ")
          }`}
        </div>
      )}

      {showClearHint && (
        <div className="text-center text-xs text-subtext">
          Press ⌫ again to clear and retype
        </div>
      )}

      <div className="flex gap-3">
        {answerState === "idle" ? (
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
