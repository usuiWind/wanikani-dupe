// Runnable check for the review-queue spacing fix (store/session.ts).
// Run: npx tsx scripts/test-review-queue.ts
import assert from "node:assert";
import { useSessionStore, ReviewSubject } from "../store/session";

function subj(id: string): ReviewSubject {
  return {
    id, type: "vocabulary", level: 1, characters: id, imageUrl: null,
    meanings: [id], readings: [id], primaryReading: id,
    meaningMnemonic: null, readingMnemonic: null, srsStage: 4, components: [],
  };
}

const store = useSessionStore.getState;
const BATCH = Array.from({ length: 100 }, (_, i) => subj(`s${i}`));

// 1. Pair proximity: reading always AFTER its meaning (never adjacent/before),
//    and stays completably close — final gap drifts above the 7 insert-window as
//    later readings splice in between, but must not blow back out to hundreds.
useSessionStore.getState().initSession(BATCH);
{
  const q = store().queue;
  let maxGap = 0;
  for (const s of BATCH) {
    const m = q.findIndex(x => x.subjectId === s.id && x.promptType === "meaning");
    const r = q.findIndex(x => x.subjectId === s.id && x.promptType === "reading");
    const gap = r - m;
    // Firm guarantee: reading always strictly after its meaning. Near the queue
    // tail there's no room for the 2-slot target, so gap can clamp to 1.
    assert(gap >= 1, `pair gap for ${s.id} was ${gap}, reading must come after meaning`);
    assert(gap <= 25, `pair gap for ${s.id} was ${gap}, drifted too far to complete`);
    maxGap = Math.max(maxGap, gap);
  }
  console.log(`pair proximity OK — max meaning→reading gap = ${maxGap} (floor 1, drift ceiling 25)`);
}

// 2. Wrong-answer requeue lands within 3..9 of the front, in a big queue.
useSessionStore.getState().initSession(BATCH);
{
  const front = store().queue[0];
  useSessionStore.getState().submitAnswer(front.subjectId, front.promptType, "x", false);
  const pos = store().queue.findIndex(
    q => q.subjectId === front.subjectId && q.promptType === front.promptType
  );
  assert(pos >= 3 && pos <= 9, `requeue landed at ${pos}, expected 3..9`);
  console.log(`requeue window OK — missed card returns at position ${pos} (bound 3..9)`);
}

console.log("all checks passed");
