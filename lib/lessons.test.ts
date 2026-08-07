// Run: npx tsx lib/lessons.test.ts
import assert from "node:assert";
import { lessonBatchCount } from "./lessons";

// The bug: dashboard showed the whole pool (50) instead of the batch (3).
assert.strictEqual(lessonBatchCount(50, 3), 3, "batch caps a large backlog");
// Fewer available than the batch → show what's actually there.
assert.strictEqual(lessonBatchCount(2, 3), 2, "available caps the batch");
// Nothing available → zero (keeps the tile disabled).
assert.strictEqual(lessonBatchCount(0, 3), 0, "no lessons → 0");
// Never negative, even with a nonsense batch size.
assert.strictEqual(lessonBatchCount(0, -5), 0, "never negative");

console.log("OK: lessonBatchCount clamps pool to batch");
