export const CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS = 3 * 60_000;
export const CENTRAL_AUTHORITY_DEGRADED_POLL_MS = 30_000;
export const CENTRAL_AUTHORITY_POLL_JITTER_MS = 15_000;
export const CENTRAL_AUTHORITY_WAKE_COALESCE_MS = 80;
export const CENTRAL_AUTHORITY_FOREGROUND_FRESH_MS = 30_000;

/** Coalesce duplicate focus events; an OS-suspended socket still needs a read. */
export function shouldWakeCentralAuthorityForActivity(input: {
  visible: boolean;
  online: boolean;
  realtimeState: CentralAuthorityRealtimeState;
  lastSuccessfulSyncAt: number | null;
  now: number;
  resumedFromHidden?: boolean;
}): boolean {
  if (!input.visible || !input.online) return false;
  return (
    input.resumedFromHidden === true ||
    input.realtimeState !== "subscribed" ||
    input.lastSuccessfulSyncAt === null ||
    input.now - input.lastSuccessfulSyncAt >= CENTRAL_AUTHORITY_FOREGROUND_FRESH_MS
  );
}

export type CentralAuthorityRealtimeState =
  | "disabled"
  | "connecting"
  | "subscribed"
  | "degraded";

export function centralAuthorityRealtimeStateFromStatus(
  status: string,
): CentralAuthorityRealtimeState {
  if (status === "SUBSCRIBED") return "subscribed";
  if (
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT" ||
    status === "CLOSED"
  ) {
    return "degraded";
  }
  return "connecting";
}

export function centralAuthorityIdlePollDelay(
  realtimeState: CentralAuthorityRealtimeState,
  jitterFraction = 0,
): number {
  const base =
    realtimeState === "subscribed"
      ? CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS
      : CENTRAL_AUTHORITY_DEGRADED_POLL_MS;
  const boundedJitter = Math.min(Math.max(jitterFraction, 0), 1);
  return base + Math.floor(CENTRAL_AUTHORITY_POLL_JITTER_MS * boundedJitter);
}

export function maximumFallbackRequestsPerWindow(input: {
  devices: number;
  windowMs: number;
  intervalMs?: number;
}): number {
  const intervalMs =
    input.intervalMs ?? CENTRAL_AUTHORITY_DEGRADED_POLL_MS;
  if (input.devices <= 0 || input.windowMs <= 0 || intervalMs <= 0) return 0;
  return input.devices * Math.ceil(input.windowMs / intervalMs);
}
