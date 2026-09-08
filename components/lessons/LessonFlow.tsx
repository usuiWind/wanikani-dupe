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

export function LessonFlow({ subjects }: { subjects: LessonSubject[] }) {
  const router = useRouter();
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [step, setStep] = useState<FlowStep>("teach");

  const subject = subjects[subjectIndex];
  const isLastSubject = subjectIndex === subjects.length - 1;

  const handleNext = () => {
    if (!isLastSubject) {
      setSubjectIndex((i) => i + 1);
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

  const isRadical = subject.type === "radical";

  return (
    <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      {/* Progress */}
      <div className="flex justify-between text-sm text-subtext mb-6">
        <span>Item {subjectIndex + 1} of {subjects.length}</span>
        <span className="capitalize">{subject.type} · Level {subject.level}</span>
      </div>

      {/* Character */}
      <div className="flex justify-center mb-6">
        <SubjectBadge
          type={subject.type}
          characters={subject.characters}
          imageUrl={subject.imageUrl}
          fallbackLabel={subject.meanings[0]}
          size="xl"
        />
      </div>

      {/* Everything about this item on one scrollable page */}
      <div className="flex-1 bg-mantle border border-surface0 rounded-xl p-6 space-y-6">
        <section className="space-y-2">
          <div className="text-subtext text-sm">Meanings</div>
          <div className="flex flex-wrap gap-2">
            {subject.meanings.map((m, i) => (
              <span key={m} className={`px-3 py-1 rounded-lg text-sm ${i === 0 ? "bg-blue text-crust font-medium" : "bg-surface0 text-text"}`}>
                {m}
              </span>
            ))}
          </div>
        </section>

        {!isRadical && subject.readings.length > 0 && (
          <section className="space-y-2">
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
              <div className="text-xs text-subtext">Highlighted = primary reading</div>
            )}
          </section>
        )}

        {subject.components.length > 0 && (
          <section className="space-y-2">
            <div className="text-subtext text-sm">Components</div>
            <div className="flex flex-wrap gap-2">
              {subject.components.map((c) => (
                <span key={c.id} className="px-3 py-1 rounded-lg text-sm bg-surface0 text-text">
                  {c.meaning}
                </span>
              ))}
            </div>
          </section>
        )}

        {(subject.meaningMnemonic || (subject.readingMnemonic && !isRadical)) ? (
          <section className="space-y-3">
            {subject.meaningMnemonic && (
              <div>
                <div className="text-subtext text-xs mb-1">Meaning mnemonic</div>
                <div className="text-text text-sm leading-relaxed">{subject.meaningMnemonic}</div>
              </div>
            )}
            {subject.readingMnemonic && !isRadical && (
              <div>
                <div className="text-subtext text-xs mb-1">Reading mnemonic</div>
                <div className="text-text text-sm leading-relaxed">{subject.readingMnemonic}</div>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <button
        onClick={handleNext}
        className="mt-6 w-full py-3 bg-blue text-crust rounded-lg font-semibold hover:opacity-90 transition-opacity"
      >
        {isLastSubject ? "Start quiz →" : "Next →"}
      </button>
    </main>
  );
}
