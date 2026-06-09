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
  completed: string[]; // subject ids fully answered this session

  initSession: (subjects: ReviewSubject[], flashcardDefault?: boolean) => void;
  currentItem: () => { subject: ReviewSubject; promptType: PromptType } | null;
  submitAnswer: (subjectId: string, promptType: PromptType, answer: string, correct: boolean) => void;
  undoLast: () => void;
  goBack: () => void;
  goForward: () => void;
  toggleFlashcard: () => void;
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
});

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildInitialQueue(subjects: ReviewSubject[]): QueueItem[] {
  const meanings: QueueItem[] = shuffle(
    subjects.map(s => ({ subjectId: s.id, promptType: "meaning" as const }))
  );
  const readings: QueueItem[] = shuffle(
    subjects
      .filter(s => s.type !== "radical")
      .map(s => ({ subjectId: s.id, promptType: "reading" as const }))
  );

  // Insert each reading at a random position so they're spread throughout,
  // not clustered at the end as a plain Fisher-Yates can produce.
  const queue = [...meanings];
  for (const r of readings) {
    queue.splice(Math.floor(Math.random() * (queue.length + 1)), 0, r);
  }
  return queue;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  subjects: {},
  queue: [],
  itemState: {},
  history: [],
  historyViewIndex: null,
  pendingUndo: null,
  flashcardMode: false,
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

      if (promptType === "meaning") itemSt.meaningAnswered = true;
      else itemSt.readingAnswered = true;

      const subject = state.subjects[subjectId];
      const needsReading = subject.type !== "radical";
      const fullyAnswered =
        itemSt.meaningAnswered && (!needsReading || itemSt.readingAnswered);

      // Remove current prompt from queue
      const newQueue = state.queue.slice(1);

      // If wrong, requeue this prompt at a random position in the remaining queue
      if (!correct) {
        const insertAt = Math.floor(Math.random() * (newQueue.length + 1));
        newQueue.splice(insertAt, 0, { subjectId, promptType });
      }

      const newCompleted = fullyAnswered
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

    if (promptType === "meaning") itemSt.meaningAnswered = false;
    else itemSt.readingAnswered = false;

    // Put the prompt back at the front of the queue, remove any requeue of it
    const filtered = queue.filter(
      (q) => !(q.subjectId === subjectId && q.promptType === promptType && !correct)
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
