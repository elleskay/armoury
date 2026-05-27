export interface ScoreInput {
  okCount: number;
  itemCount: number;
}

export function computeScore({ okCount, itemCount }: ScoreInput): number {
  if (itemCount <= 0) return 100;
  return Math.round((okCount / itemCount) * 100);
}
