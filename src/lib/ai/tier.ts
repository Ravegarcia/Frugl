export type Tier = 'auto' | 'suggest' | 'manual';

export function tierFor(confidence: number): Tier {
  if (confidence >= 0.8) return 'auto';
  if (confidence >= 0.5) return 'suggest';
  return 'manual';
}
