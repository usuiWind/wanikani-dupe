"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeLessons } from "@/lib/actions/lessons";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { LessonQuiz } from "./LessonQuiz";

interface LessonSubject {
  id: string;
  type: "radical" | "kanji" | "vocabulary";
  level: number;
  characters: string | null;
  imageUrl: string | null;
  meanings: string[];
  readings: string[];
  primaryReading: string | null;
  meaningMnemonic: string | null;
  readingMnemonic: string | null;
  components: { id: string; meaning: string }[];
}

type FlowStep = "teach" | "quiz" | "done";

const TAB_LABELS = ["Character", "Meanings", "Readings", "Mnemonic", "Components"];

export function LessonFlow({ subjects }: { subjects: LessonSubject[] }) {
  const router = useRouter();
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState<FlowStep>("teach");

  const subject = subjects[subjectIndex];
  const isLastSubject = subjectIndex === subjects.length - 1;
  const isLastTab = tab === TAB_LABELS.length - 1;

  const availableTabs = TAB_LABELS.filter((t) => {
    if (t === "Readings" && subject.type === "radical") return false;
    if (t === "Components" && subject.components.length === 0) return false;
    return true;
  });

  const handleNext = () => {
    const currentTabIdx = availableTabs.indexOf(TAB_LABELS[tab]);
    if (currentTabIdx < availableTabs.length - 1) {
      setTab(TAB_LABELS.indexOf(availableTabs[currentTabIdx + 1]));
    } else if (!isLastSubject) {
      setSubjectIndex((i) => i + 1);
      setTab(0);
    } else {
      setStep("quiz");
    }
  };

  const handleQuizComplete = async () => {
    await completeLessons(subjects.map((s) => s.id));
    router.push("/reviews");
    router.refresh();
  };

  if (step === "quiz") {
    return <LessonQuiz subjects={subjects} onComplete={handleQuizComplete} />;
  }

  return (
    <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      {/* Progress */}
      <div className="flex justify-between text-sm text-subtext mb-6">
        <span>Item {subjectIndex + 1} of {subjects.length}</span>
        <span className="capitalize">{subject.type}</span>
      </div>

      {/* Character */}
      <div className="flex justify-center mb-6">
        <SubjectBadge type={subject.type} characters={subject.characters} size="xl" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {availableTabs.map((label) => (
          <button
            key={label}
            onClick={() => setTab(TAB_LABELS.indexOf(label))}
            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
              TAB_LABELS[tab] === label
                ? "bg-blue text-crust font-medium"
                : "bg-surface0 text-subtext hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 bg-mantle border border-surface0 rounded-xl p-6 min-h-48">
        {tab === 0 && (
          <div className="space-y-2">
            <div className="text-subtext text-sm">Character</div>
            <div className="text-5xl font-bold text-text" style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}>
              {subject.characters}
            </div>
            <div className="text-subtext text-sm mt-2 capitalize">{subject.type} · Level {subject.level}</div>
          </div>
        )}
        {tab === 1 && (
          <div className="space-y-2">
            <div className="text-subtext text-sm">Meanings</div>
            <div className="flex flex-wrap gap-2">
              {subject.meanings.map((m, i) => (
                <span key={m} className={`px-3 py-1 rounded-lg text-sm ${i === 0 ? "bg-blue text-crust font-medium" : "bg-surface0 text-text"}`}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
        {tab === 2 && subject.type !== "radical" && (
          <div className="space-y-2">
            <div className="text-subtext text-sm">Readings</div>
            <div className="flex flex-wrap gap-2">
              {subject.readings.map((r) => (
                <span
                  key={r}
                  className={`px-3 py-1 rounded-lg text-sm ${r === subject.primaryReading ? "bg-pink text-crust font-medium" : "bg-surface0 text-text"}`}
                  style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}
                >
                  {r}
                </span>
              ))}
            </div>
            {subject.primaryReading && (
              <div className="text-xs text-subtext mt-1">Highlighted = primary reading</div>
            )}
          </div>
        )}
        {tab === 3 && (
          <div className="space-y-3">
            {subject.meaningMnemonic && (
              <div>
                <div className="text-subtext text-xs mb-1">Meaning mnemonic</div>
                <div className="text-text text-sm leading-relaxed">{subject.meaningMnemonic}</div>
              </div>
            )}
            {subject.readingMnemonic && subject.type !== "radical" && (
              <div>
                <div className="text-subtext text-xs mb-1">Reading mnemonic</div>
                <div className="text-text text-sm leading-relaxed">{subject.readingMnemonic}</div>
              </div>
            )}
            {!subject.meaningMnemonic && !subject.readingMnemonic && (
              <div className="text-subtext text-sm">No mnemonic available.</div>
            )}
          </div>
        )}
        {tab === 4 && subject.components.length > 0 && (
          <div className="space-y-2">
            <div className="text-subtext text-sm">Components</div>
            <div className="flex flex-wrap gap-2">
              {subject.components.map((c) => (
                <span key={c.id} className="px-3 py-1 rounded-lg text-sm bg-surface0 text-text">
                  {c.meaning}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleNext}
        className="mt-6 w-full py-3 bg-blue text-crust rounded-lg font-semibold hover:opacity-90 transition-opacity"
      >
        {isLastSubject && isLastTab ? "Start quiz →" : "Next →"}
      </button>
    </main>
  );
}
