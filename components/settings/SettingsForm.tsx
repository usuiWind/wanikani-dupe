"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/actions/settings";

interface Settings {
  batch_size: number;
  daily_new_cap: number | null;
  flashcard_default: boolean;
  accept_all_readings: boolean;
  lesson_order: string;
  session_item_cap: number | null;
  leech_threshold: number;
  answer_strictness: string;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors ${value ? "bg-blue" : "bg-surface1"}`}
    >
      <div className={`w-4 h-4 bg-text rounded-full transition-transform mx-1 ${value ? "translate-x-4" : ""}`} />
    </button>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [batchSize, setBatchSize] = useState(settings.batch_size);
  const [dailyCap, setDailyCap] = useState<string>(settings.daily_new_cap?.toString() ?? "");
  const [sessionCap, setSessionCap] = useState<string>(settings.session_item_cap?.toString() ?? "");
  const [flashcardDefault, setFlashcardDefault] = useState(settings.flashcard_default);
  const [acceptAllReadings, setAcceptAllReadings] = useState(settings.accept_all_readings);
  const [lessonOrder, setLessonOrder] = useState(settings.lesson_order);
  const [leechThreshold, setLeechThreshold] = useState(settings.leech_threshold.toString());
  const [answerStrictness, setAnswerStrictness] = useState(settings.answer_strictness);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      batch_size: batchSize,
      daily_new_cap: dailyCap ? parseInt(dailyCap) : null,
      flashcard_default: flashcardDefault,
      accept_all_readings: acceptAllReadings,
      lesson_order: lessonOrder,
      session_item_cap: sessionCap ? parseInt(sessionCap) : null,
      leech_threshold: parseFloat(leechThreshold) || 1.0,
      answer_strictness: answerStrictness,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="bg-mantle border border-surface0 rounded-xl p-6 space-y-6">
      <h2 className="font-semibold text-text">Settings</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-subtext mb-1">Batch size (items per lesson session)</label>
          <input type="range" min={3} max={15} value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))} className="w-full accent-blue" />
          <div className="flex justify-between text-xs text-subtext mt-1">
            <span>3</span>
            <span className="text-text font-medium">{batchSize}</span>
            <span>15</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-subtext mb-1">Daily new lessons cap (empty = no cap)</label>
          <input
            type="number" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)}
            placeholder="No cap" min={1} max={999}
            className="w-full bg-surface0 text-text rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue"
          />
        </div>

        <div>
          <label className="block text-sm text-subtext mb-1">Session item cap (empty = use batch size)</label>
          <input
            type="number" value={sessionCap} onChange={(e) => setSessionCap(e.target.value)}
            placeholder="Use batch size" min={1} max={500}
            className="w-full bg-surface0 text-text rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue"
          />
        </div>

        <div>
          <label className="block text-sm text-subtext mb-1">Lesson ordering</label>
          <select
            value={lessonOrder} onChange={(e) => setLessonOrder(e.target.value)}
            className="w-full bg-surface0 text-text rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue"
          >
            <option value="level_type">Level then type (radicals first)</option>
            <option value="shuffled">Shuffled</option>
            <option value="lowest_stage">Lowest SRS stage first</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-subtext mb-1">Answer strictness</label>
          <select
            value={answerStrictness} onChange={(e) => setAnswerStrictness(e.target.value)}
            className="w-full bg-surface0 text-text rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue"
          >
            <option value="lenient">Lenient (near-miss = warning, not wrong)</option>
            <option value="normal">Normal</option>
            <option value="strict">Strict (no near-miss forgiveness)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-subtext mb-1">Leech threshold (score ≥ this = flagged)</label>
          <input
            type="number" value={leechThreshold} onChange={(e) => setLeechThreshold(e.target.value)}
            step={0.5} min={0.5} max={10}
            className="w-full bg-surface0 text-text rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-subtext">Default to flashcard mode</label>
          <Toggle value={flashcardDefault} onChange={setFlashcardDefault} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-subtext">Accept all readings</label>
            <div className="text-xs text-overlay">When off, only primary reading is accepted</div>
          </div>
          <Toggle value={acceptAllReadings} onChange={setAcceptAllReadings} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 bg-blue text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save settings"}
      </button>
    </section>
  );
}
