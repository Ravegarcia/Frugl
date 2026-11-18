export type UsageLimitResult = 'allowed' | 'limited' | 'unavailable';

export function resolveUsageLimit(data: boolean | null, hasError: boolean): UsageLimitResult {
  if (hasError || data === null) return 'unavailable';
  return data ? 'allowed' : 'limited';
}

export function secondsUntilDailyReset(now = new Date()) {
  const nextUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextUtcDay - now.getTime()) / 1000));
}
