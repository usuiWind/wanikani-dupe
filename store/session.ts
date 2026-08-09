"use client";

import { create } from "zustand";

export type PromptType = "meaning" | "reading";

export interface ReviewSubject {
  id: string;
  type: "radical" | "kanji" | "vocabulary";
  level: number;
  characters: string | null;
  imageUrl: string | null;
  meanings: string[];
  readings: string[];
  onyomi?: string[];
  kunyomi?: string[];
  primaryReading: string | null;
  meaningMnemonic: string | null;
  readingMnemonic: string | null;
  srsStage: number;
  components: { id: string; characters: string | null; meanings: string[] }[];
}

interface QueueItem {
  subjectId: string;
  promptType: PromptType;
}

interface ItemState {
  incorrectMeaningCount: number;
  incorrectReadingCount: number;
  meaningAnswered: boolean;
  readingAnswered: boolean;
  everWrong: boolean;
  // A missed prompt gets exactly one end-of-session recheck; these guard
  // against scheduling a second one.
  meaningRechecked: boolean;
  readingRechecked: boolean;
}

export interface HistoryEntry {
  subjectId: string;
  promptType: PromptType;
  answer: string;
  correct: boolean;
}

interface SessionStore {
  subjects: Record<string, ReviewSubject>;
  queue: QueueItem[];
  itemState: Record<string, ItemState>;
  history: HistoryEntry[];
  historyViewIndex: number | null; // null = viewing current card
  pendingUndo: HistoryEntry | null;
  flashcardMode: boolean;
  speedMode: boolean; // typed mode only: correct answers auto-advance
  completed: string[]; // subject ids fully answered this session

  initSession: (subjects: ReviewSubject[], flashcardDefault?: boolean) => void;
  currentItem: () => { subject: ReviewSubject; promptType: PromptType } | null;
  submitAnswer: (subjectId: string, promptType: PromptType, answer: string, correct: boolean) => void;
  undoLast: () => void;
  goBack: () => void;
  goForward: () => void;
  toggleFlashcard: () => void;
  toggleSpeed: () => void;
  getItemState: (subjectId: string) => ItemState;
  totalCount: () => number;
  completedCount: () => number;
  correctPercent: () => number;
}

const defaultItemState = (): ItemState => ({
  incorrectMeaningCount: 0,
  incorrectReadingCount: 0,
  meaningAnswered: false,
  readingAnswered: false,
  everWrong: false,
  meaningRechecked: false,
  readingRechecked: false,
});

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// A missed prompt is requeued into the BACK PORTION of what's left, so as many
// other cards as possible sit between you and its return. That interference is
// what actually flushes the spelling you were just shown out of short-term
// memory — a fixed small gap just lets you echo it back. Never nearer than this
// floor (so it isn't the very next card in a tiny queue). On top of that, every
// missed prompt gets one final recheck appended to the very end of the session.
const REQUEUE_MIN_GAP = 15;

function buildInitialQueue(subjects: ReviewSubject[]): QueueItem[] {
  // Fully interleave and shuffle every prompt (like WaniKani's review queue) so
  // an item's meaning and reading land at independent random spots — you have
  // to recall each one, not echo the half you just saw a few cards ago.
  const prompts: QueueItem[] = [];
  for (const s of subjects) {
    prompts.push({ subjectId: s.id, promptType: "meaning" });
    if (s.type !== "radical") prompts.push({ subjectId: s.id, promptType: "reading" });
  }
  return shuffle(prompts);
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  subjects: {},
  queue: [],
  itemState: {},
  history: [],
  historyViewIndex: null,
  pendingUndo: null,
  flashcardMode: false,
  speedMode: false,
  completed: [],

  initSession(subjects, flashcardDefault = false) {
    const subjectMap: Record<string, ReviewSubject> = {};
    const itemState: Record<string, ItemState> = {};
    for (const s of subjects) {
      subjectMap[s.id] = s;
      itemState[s.id] = defaultItemState();
    }
    set({
      subjects: subjectMap,
      queue: buildInitialQueue(subjects),
      itemState,
      history: [],
      historyViewIndex: null,
      pendingUndo: null,
      flashcardMode: flashcardDefault,
      completed: [],
    });
  },

  currentItem() {
    const { queue, subjects, historyViewIndex, history } = get();
    if (historyViewIndex !== null) {
      const entry = history[historyViewIndex];
      if (!entry) return null;
      return { subject: subjects[entry.subjectId], promptType: entry.promptType };
    }
    const next = queue[0];
    if (!next) return null;
    return { subject: subjects[next.subjectId], promptType: next.promptType };
  },

  submitAnswer(subjectId, promptType, answer, correct) {
    const entry: HistoryEntry = { subjectId, promptType, answer, correct };

    set((state) => {
      const itemSt = { ...(state.itemState[subjectId] ?? defaultItemState()) };

      if (!correct) {
        if (promptType === "meaning") itemSt.incorrectMeaningCount++;
        else itemSt.incorrectReadingCount++;
        itemSt.everWrong = true;
      }

      if (correct) {
        if (promptType === "meaning") itemSt.meaningAnswered = true;
        else itemSt.readingAnswered = true;
      }

      const subject = state.subjects[subjectId];
      const needsReading = subject.type !== "radical";
      const fullyAnswered =
        itemSt.meaningAnswered && (!needsReading || itemSt.readingAnswered);

      // Remove current prompt from queue
      const newQueue = state.queue.slice(1);

      // If wrong, requeue this prompt into the back portion of the remaining
      // queue (at least REQUEUE_MIN_GAP away), so lots of other cards intervene
      // before you see it again and the just-shown spelling has faded.
      if (!correct) {
        const remaining = newQueue.length;
        const minPos = Math.min(remaining, Math.max(REQUEUE_MIN_GAP, Math.floor(remaining / 2)));
        const insertAt = minPos + Math.floor(Math.random() * (remaining - minPos + 1));
        newQueue.splice(insertAt, 0, { subjectId, promptType });
      }

      // If this prompt was missed earlier and is now finally correct, append
      // one final recheck to the end of the session — but only once.
      if (correct) {
        const missedThis = promptType === "meaning"
          ? itemSt.incorrectMeaningCount > 0
          : itemSt.incorrectReadingCount > 0;
        const alreadyScheduled = promptType === "meaning"
          ? itemSt.meaningRechecked
          : itemSt.readingRechecked;
        if (missedThis && !alreadyScheduled) {
          newQueue.push({ subjectId, promptType });
          if (promptType === "meaning") itemSt.meaningRechecked = true;
          else itemSt.readingRechecked = true;
        }
      }

      const newCompleted = fullyAnswered && !state.completed.includes(subjectId)
        ? [...state.completed, subjectId]
        : state.completed;

      return {
        itemState: { ...state.itemState, [subjectId]: itemSt },
        queue: newQueue,
        history: [...state.history, entry],
        pendingUndo: entry,
        historyViewIndex: null,
        completed: newCompleted,
      };
    });
  },

  undoLast() {
    const { pendingUndo, queue, itemState, completed } = get();
    if (!pendingUndo) return;

    const { subjectId, promptType, correct } = pendingUndo;
    const itemSt = { ...itemState[subjectId] };

    if (!correct) {
      if (promptType === "meaning") itemSt.incorrectMeaningCount = Math.max(0, itemSt.incorrectMeaningCount - 1);
      else itemSt.incorrectReadingCount = Math.max(0, itemSt.incorrectReadingCount - 1);
    }

    if (promptType === "meaning") {
      itemSt.meaningAnswered = false;
      itemSt.meaningRechecked = false;
    } else {
      itemSt.readingAnswered = false;
      itemSt.readingRechecked = false;
    }

    // Put the prompt back at the front of the queue. Drop every other copy of
    // this exact prompt first — a mid-queue requeue (wrong) or the appended
    // end-of-session recheck (correct) — so undo can't leave a duplicate.
    const filtered = queue.filter(
      (q) => !(q.subjectId === subjectId && q.promptType === promptType)
    );
    const newQueue = [{ subjectId, promptType }, ...filtered];

    set((state) => ({
      itemState: { ...state.itemState, [subjectId]: itemSt },
      queue: newQueue,
      history: state.history.slice(0, -1),
      pendingUndo: null,
      completed: completed.filter((id) => id !== subjectId),
    }));
  },

  goBack() {
    const { historyViewIndex, history } = get();
    if (history.length === 0) return;
    if (historyViewIndex === null) {
      set({ historyViewIndex: history.length - 1, pendingUndo: null });
    } else if (historyViewIndex > 0) {
      set({ historyViewIndex: historyViewIndex - 1 });
    }
  },

  goForward() {
    const { historyViewIndex, history } = get();
    if (historyViewIndex === null) return;
    if (historyViewIndex >= history.length - 1) {
      set({ historyViewIndex: null });
    } else {
      set({ historyViewIndex: historyViewIndex + 1 });
    }
  },

  toggleFlashcard() {
    set((state) => ({ flashcardMode: !state.flashcardMode }));
  },

  toggleSpeed() {
    set((state) => ({ speedMode: !state.speedMode }));
  },

  getItemState(subjectId) {
    return get().itemState[subjectId] ?? defaultItemState();
  },

  totalCount() {
    return Object.keys(get().subjects).length;
  },

  completedCount() {
    return get().completed.length;
  },

  correctPercent() {
    const { history } = get();
    if (history.length === 0) return 100;
    const correct = history.filter((h) => h.correct).length;
    return Math.round((correct / history.length) * 100);
  },
}));
