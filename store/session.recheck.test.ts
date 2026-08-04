// ponytail: single self-check for the missed-card requeue + end-recheck logic.
// Run: npx tsx store/session.recheck.test.ts
import assert from "node:assert";
import { useSessionStore, ReviewSubject } from "./session";

const s = (id: string): ReviewSubject => ({
  id, type: "vocabulary", level: 1, characters: id, imageUrl: null,
  meanings: ["m"], readings: ["r"], primaryReading: "r",
  meaningMnemonic: null, readingMnemonic: null, srsStage: 1, components: [],
});

const st = useSessionStore.getState();
// Enough cards that the requeued prompt lands mid-queue, not clamped to the end.
st.initSession(Array.from({ length: 30 }, (_, i) => s(`s${i}`)));

// Miss the very first card. It must NOT come back as the next card.
const missed = useSessionStore.getState().queue[0];
st.submitAnswer(missed.subjectId, missed.promptType, "x", false);
let q = useSessionStore.getState().queue;
assert.notStrictEqual(q[0].subjectId + q[0].promptType, missed.subjectId + missed.promptType,
  "missed prompt must not be the very next card");
const gap = q.findIndex(i => i.subjectId === missed.subjectId && i.promptType === missed.promptType);
assert.ok(gap >= 14, `missed prompt should return >=15 cards out, got ${gap + 1}`);

// Drain, answering every card correctly, counting how many times the missed
// prompt reappears: requeue (now correct) + exactly ONE end recheck = 2.
let seen = 0, guard = 0;
while (useSessionStore.getState().queue.length > 0 && guard++ < 500) {
  const cur = useSessionStore.getState().queue[0];
  if (cur.subjectId === missed.subjectId && cur.promptType === missed.promptType) seen++;
  st.submitAnswer(cur.subjectId, cur.promptType, "ok", true);
}
assert.strictEqual(seen, 2, `expected requeue + exactly one end recheck, saw ${seen}`);
assert.strictEqual(useSessionStore.getState().queue.length, 0, "session should drain");

console.log("OK: widened requeue gap + single end recheck");
