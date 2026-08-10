// Verifies the SRS engine against WaniKani's published behavior.
// Run: npx tsx lib/srs.test.ts
import assert from "node:assert";
import { computeNextStage, scheduleNextReview, getSrsGroup, getSrsLabel } from "./srs";

// --- getSrsGroup: stage → bucket boundaries -------------------------------
for (const s of [1, 2, 3, 4]) assert.strictEqual(getSrsGroup(s), "apprentice", `stage ${s}`);
assert.strictEqual(getSrsGroup(5), "guru");
assert.strictEqual(getSrsGroup(6), "guru");
assert.strictEqual(getSrsGroup(7), "master");
assert.strictEqual(getSrsGroup(8), "enlightened");
assert.strictEqual(getSrsGroup(9), "burned");
assert.strictEqual(getSrsLabel(8), "Enlightened");

// --- computeNextStage: passing advances exactly one stage -----------------
assert.strictEqual(computeNextStage(1, 0), 2, "pass advances one stage");
assert.strictEqual(computeNextStage(8, 0), 9, "pass from Enlightened → Burned");
assert.strictEqual(computeNextStage(9, 0), 9, "Burned never advances past 9");

// --- computeNextStage: failing drops by ceil(incorrect/2) * penalty -------
// Apprentice (stage < 5): penalty factor 1.
assert.strictEqual(computeNextStage(4, 1), 3, "1 wrong at Apprentice → -1");
assert.strictEqual(computeNextStage(4, 2), 3, "2 wrong → still -1 (ceil(2/2)=1)");
assert.strictEqual(computeNextStage(4, 3), 2, "3 wrong → -2 (ceil(3/2)=2)");
// Guru+ (stage >= 5): penalty factor 2 — items fall twice as hard.
assert.strictEqual(computeNextStage(5, 1), 3, "1 wrong at Guru → -2");
assert.strictEqual(computeNextStage(7, 2), 5, "1 adjustment at Master → -2");
assert.strictEqual(computeNextStage(7, 4), 3, "2 adjustments at Master → -4");
// Never falls below Apprentice 1.
assert.strictEqual(computeNextStage(2, 10), 1, "floor is stage 1");
assert.strictEqual(computeNextStage(5, 20), 1, "floor holds even at Guru penalty");

// --- scheduleNextReview: standard intervals (hours), minutes zeroed -------
const t = new Date("2026-01-01T10:37:00.000Z");
const hoursBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 3_600_000;
// level 3+ uses the standard ladder: 4, 8, 24, 48, 168, 336, 720, 2880h.
const standard: Record<number, number> = { 1: 4, 2: 8, 3: 24, 4: 48, 5: 168, 6: 336, 7: 720, 8: 2880 };
for (const [stage, hrs] of Object.entries(standard)) {
  const next = scheduleNextReview(Number(stage), 3, t)!;
  // Interval is measured from the top of the hour, since minutes are zeroed.
  const base = new Date(t); base.setMinutes(0, 0, 0);
  assert.strictEqual(hoursBetween(base, next), hrs, `stage ${stage} standard interval`);
  assert.strictEqual(next.getMinutes(), 0, `stage ${stage} minutes zeroed`);
}

// --- scheduleNextReview: accelerated intervals for levels 1-2 -------------
const accel: Record<number, number> = { 1: 2, 2: 4, 3: 8, 4: 24 };
for (const [stage, hrs] of Object.entries(accel)) {
  const next = scheduleNextReview(Number(stage), 1, t)!;
  const base = new Date(t); base.setMinutes(0, 0, 0);
  assert.strictEqual(hoursBetween(base, next), hrs, `stage ${stage} accelerated (level 1)`);
}
// Acceleration only applies to Apprentice stages; Guru+ uses the standard ladder.
{
  const base = new Date(t); base.setMinutes(0, 0, 0);
  assert.strictEqual(hoursBetween(base, scheduleNextReview(5, 1, t)!), 168, "Guru at level 1 is not accelerated");
}

// --- scheduleNextReview: burned never gets scheduled ----------------------
assert.strictEqual(scheduleNextReview(9, 3, t), null, "Burned → no next review");

// --- mastery lifecycle: an item climbs each rank in order, then burns ------
// Start a fresh Apprentice-1 item and answer it correctly every time. It must
// visit every mastery rank exactly in WaniKani's order and stop at Burned.
{
  let stage = 1;
  const journey: string[] = [getSrsGroup(stage)];
  for (let i = 0; i < 8; i++) {
    stage = computeNextStage(stage, 0);
    journey.push(getSrsGroup(stage));
  }
  assert.strictEqual(stage, 9, "8 clean passes from Apprentice 1 reach Burned");
  assert.deepStrictEqual(
    journey,
    ["apprentice", "apprentice", "apprentice", "apprentice", "guru", "guru", "master", "enlightened", "burned"],
    "mastery ranks are visited in order"
  );
  // Burned is terminal: further correct reviews don't advance, and it's never rescheduled.
  assert.strictEqual(computeNextStage(stage, 0), 9, "Burned stays Burned");
  assert.strictEqual(scheduleNextReview(stage, 3, t), null, "Burned item is not rescheduled");
}

// --- mastery demotion: a miss knocks the rank back down -------------------
// An Enlightened item answered wrong drops out of Enlightened, and a Guru miss
// falls all the way back to Apprentice (Guru+ penalty factor 2).
assert.strictEqual(getSrsGroup(computeNextStage(8, 1)), "guru", "Enlightened miss → Guru");
assert.strictEqual(getSrsGroup(computeNextStage(5, 1)), "apprentice", "Guru miss → Apprentice");

console.log("OK: SRS engine matches WaniKani intervals + stage math");
