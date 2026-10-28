export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const;
export const MAX_AUTOMATIC_RETRIES = 10;

export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const cappedAttempt = Math.max(0, attempt);
  const base = RETRY_DELAYS_MS[Math.min(cappedAttempt, RETRY_DELAYS_MS.length - 1)] ?? 30000;
  const jitterBudget = Math.min(250, Math.floor(base * 0.2));
  const jitter = Math.floor(random() * (jitterBudget + 1));
  return base + jitter;
}
