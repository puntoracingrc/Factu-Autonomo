export const WELCOME_MAX_CLIENT_RETRIES = 3;

const WELCOME_RETRY_BASE_MS = 30_000;
const WELCOME_RETRY_MAX_MS = 5 * 60_000;

export function isRetryableWelcomeStatus(status: number): boolean {
  return (
    status === 401 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

function retryAfterDelayMs(value: string | null, now: number): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(
      1_000,
      Math.min(WELCOME_RETRY_MAX_MS, Math.ceil(seconds * 1_000)),
    );
  }

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.max(1_000, Math.min(WELCOME_RETRY_MAX_MS, retryAt - now));
}

export function welcomeRetryDelayMs(input: {
  retryIndex: number;
  retryAfter?: string | null;
  now?: number;
}): number {
  const serverDelay = retryAfterDelayMs(
    input.retryAfter ?? null,
    input.now ?? Date.now(),
  );
  if (serverDelay !== null) return serverDelay;

  const retryIndex = Math.max(0, Math.floor(input.retryIndex));
  return Math.min(
    WELCOME_RETRY_MAX_MS,
    WELCOME_RETRY_BASE_MS * 2 ** retryIndex,
  );
}
