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

// Paired queue: every vocab subject contributes exactly one meaning and one
// reading prompt, and each reading lands a short span AFTER its own meaning so
// the pair completes together (keeping the done-counter and per-item saves
// ticking through the session instead of stalling under a full shuffle).
{
  const built = useSessionStore.getState().queue;
  assert.strictEqual(built.length, 60, "30 subjects → 30 meaning + 30 reading prompts");
  const meanings = built.filter(q => q.promptType === "meaning").length;
  assert.strictEqual(meanings, 30, "one meaning prompt per subject");
  const meanGaps = built.map((q, i) => ({ q, i }))
    .filter(({ q }) => q.promptType === "reading")
    .map(({ q, i }) => i - built.findIndex(m => m.subjectId === q.subjectId && m.promptType === "meaning"));
  // Every reading must sit after its meaning by at least the min pair gap
  // (later inserts only widen the gap, never shrink it below the floor).
  assert.ok(meanGaps.every(g => g >= 2), "every reading must follow its meaning by ≥2 slots");
}

// Miss the very first card. It must NOT come back as the next card.
const missed = useSessionStore.getState().queue[0];
st.submitAnswer(missed.subjectId, missed.promptType, "x", false);
let q = useSessionStore.getState().queue;
assert.notStrictEqual(q[0].subjectId + q[0].promptType, missed.subjectId + missed.promptType,
  "missed prompt must not be the very next card");
const gap = q.findIndex(i => i.subjectId === missed.subjectId && i.promptType === missed.promptType);
// Bounded window: the miss returns 5..12 cards out (0-based index 5..12).
// Far enough to defeat rote echo, close enough to relearn in-session.
assert.ok(gap >= 5 && gap <= 12, `missed prompt should return 5-12 cards out, got ${gap} (0-based)`);

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
