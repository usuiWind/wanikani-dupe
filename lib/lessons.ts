/**
 * How many lessons a single session will actually serve, given how many are
 * available and the configured batch size. The dashboard tile and the lesson
 * session both go through this so the number shown matches the number taught.
 */
export function lessonBatchCount(available: number, batchSize: number): number {
  return Math.max(0, Math.min(available, batchSize));
}
