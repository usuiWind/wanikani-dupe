"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as wanakana from "wanakana";
import { SubjectBadge } from "@/components/shared/SubjectBadge";

interface LessonSubject {
  id: string;
  type: "radical" | "kanji" | "vocabulary";
  characters: string | null;
  meanings: string[];
  readings: string[];
  primaryReading: string | null;
}

type QuizPrompt = { subjectId: string; promptType: "meaning" | "reading" };
type AnswerState = "idle" | "correct" | "wrong";

function buildQuizQueue(subjects: LessonSubject[]): QuizPrompt[] {
  const prompts: QuizPrompt[] = [];
  for (const s of subjects) {
    prompts.push({ subjectId: s.id, promptType: "meaning" });
    if (s.type !== "radical") prompts.push({ subjectId: s.id, promptType: "reading" });
  }
  return prompts.sort(() => Math.random() - 0.5);
}

export function LessonQuiz({
  subjects,
  onComplete,
}: {
  subjects: LessonSubject[];
  onComplete: () => void;
}) {
  const [queue, setQueue] = useState<QuizPrompt[]>(() => buildQuizQueue(subjects));
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const current = queue[0];
  const subject = current ? subjectMap[current.subjectId] : null;

  const bindWanakana = useCallback(
    (el: HTMLInputElement | null) => {
      if (el && current?.promptType === "reading") {
        wanakana.bind(el, { IMEMode: true });
      }
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    },
    [current?.promptType]
  );

  useEffect(() => {
    setAnswer("");
    setAnswerState("idle");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [current?.subjectId, current?.promptType]);

  const handleSubmit = useCallback(() => {
    if (!current || !subject || answerState !== "idle") return;
    const trimmed = answer.trim().toLowerCase();
    if (!trimmed) return;

    let correct = false;
    if (current.promptType === "meaning") {
      correct = subject.meanings.some((m) => m.toLowerCase() === trimmed);
    } else {
      correct = subject.readings.some((r) => r === answer.trim());
    }
    setAnswerState(correct ? "correct" : "wrong");
  }, [current, subject, answer, answerState]);

  const handleNext = useCallback(() => {
    if (answerState === "idle" || !current) return;

    setQueue((prev) => {
      const rest = prev.slice(1);
      if (answerState === "wrong") {
        const insertAt = Math.floor(Math.random() * (rest.length + 1));
        const next = [...rest];
        next.splice(insertAt, 0, current);
        return next;
      }
      return rest;
    });

    setAnswer("");
    setAnswerState("idle");
  }, [answerState, current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (answerState === "idle") handleSubmit();
        else handleNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answerState, handleSubmit, handleNext]);

  if (!current || !subject) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="text-6xl">🎓</div>
        <h2 className="text-2xl font-semibold text-text">Quiz complete!</h2>
        <p className="text-subtext">These items will enter your review queue as Apprentice 1.</p>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-blue text-crust rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Start reviewing
        </button>
      </main>
    );
  }

  const borderColor =
    answerState === "correct" ? "border-green" : answerState === "wrong" ? "border-red" : "border-surface1";
  const inputBg =
    answerState === "correct" ? "bg-green/10" : answerState === "wrong" ? "bg-red/10" : "bg-surface0";

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center text-sm text-subtext">{queue.length} remaining</div>

        <div className="flex justify-center">
          <SubjectBadge type={subject.type} characters={subject.characters} size="xl" />
        </div>

        <div className="text-center text-lg font-semibold text-text capitalize">
          {current.promptType === "meaning" ? "Meaning" : "Reading"}
        </div>

        <div className={`rounded-lg border-2 ${borderColor} ${inputBg} transition-colors`}>
          <input
            ref={bindWanakana}
            type="text"
            value={answer}
            onChange={(e) => answerState === "idle" && setAnswer(e.target.value)}
            placeholder={current.promptType === "meaning" ? "Type the meaning..." : "Type the reading..."}
            className="w-full bg-transparent px-4 py-4 text-center text-xl text-text outline-none placeholder:text-overlay"
            readOnly={answerState !== "idle"}
          />
        </div>

        {answerState !== "idle" && (
          <div className={`text-center text-sm ${answerState === "correct" ? "text-green" : "text-red"}`}>
            {answerState === "correct"
              ? "Correct!"
              : `Wrong — expected: ${current.promptType === "meaning" ? subject.meanings.join(", ") : subject.readings.join(", ")}`}
          </div>
        )}

        <button
          onClick={answerState === "idle" ? handleSubmit : handleNext}
          className="w-full py-3 bg-blue text-crust rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          {answerState === "idle" ? "Check (Enter)" : "Next (Enter)"}
        </button>
      </div>
    </main>
  );
}
