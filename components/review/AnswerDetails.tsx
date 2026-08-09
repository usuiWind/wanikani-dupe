"use client";

import { ReviewSubject } from "@/store/session";
import { Mnemonic } from "@/components/shared/Mnemonic";

// Shared post-answer info panel so typed mode and flashcard mode reveal the
// exact same details (meanings, readings, mnemonics) when an answer is shown.
export function AnswerDetails({ subject }: { subject: ReviewSubject }) {
  return (
    <div className="p-4 bg-surface0 rounded-lg space-y-3 text-sm">
      <div>
        <div className="text-xs text-subtext mb-1">Meanings</div>
        <div className="text-text">{subject.meanings.join(", ")}</div>
      </div>

      {subject.type === "kanji" ? (
        <div className="flex gap-8">
          {(subject.onyomi ?? []).length > 0 && (
            <div>
              <div className="text-xs text-subtext mb-1">On&apos;yomi</div>
              <div className="text-text" lang="ja">{(subject.onyomi ?? []).join("、")}</div>
            </div>
          )}
          {(subject.kunyomi ?? []).length > 0 && (
            <div>
              <div className="text-xs text-subtext mb-1">Kun&apos;yomi</div>
              <div className="text-text" lang="ja">{(subject.kunyomi ?? []).join("、")}</div>
            </div>
          )}
        </div>
      ) : subject.type === "vocabulary" && subject.readings.length > 0 ? (
        <div>
          <div className="text-xs text-subtext mb-1">Reading</div>
          <div className="text-text" lang="ja">{subject.readings.join("、")}</div>
        </div>
      ) : null}

      <div>
        <div className="text-xs text-subtext mb-1">Meaning mnemonic</div>
        <div className="text-text leading-relaxed"><Mnemonic text={subject.meaningMnemonic} /></div>
      </div>
      {subject.type !== "radical" && (
        <div>
          <div className="text-xs text-subtext mb-1">Reading mnemonic</div>
          <div className="text-text leading-relaxed"><Mnemonic text={subject.readingMnemonic} /></div>
        </div>
      )}
    </div>
  );
}
