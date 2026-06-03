// Leech score: items that keep getting wrong relative to their SRS stage.
// High score = stuck at low stage with many incorrect answers.
export function computeLeechScore(totalIncorrect: number, srsStage: number): number {
  if (totalIncorrect === 0) return 0;
  return totalIncorrect / Math.max(1, srsStage);
}
