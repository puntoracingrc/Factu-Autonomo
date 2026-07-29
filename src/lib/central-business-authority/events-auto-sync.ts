"use client";

import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";

export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC =
  "CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_V1";
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_START_DELAY_MS = 0;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_INTERVAL_MS = 15_000;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS = 30_000;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS = 60_000;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT = 100;

export interface CentralBusinessEventsAutoSyncEnvironment {
  enabled?: string;
  userIds?: string;
}

const publicEnvironment: CentralBusinessEventsAutoSyncEnvironment = {
  enabled: process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_ENABLED,
  userIds: process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isCentralBusinessEventsAutoSyncEnabledForUser(
  userId: string | null | undefined,
  environment: CentralBusinessEventsAutoSyncEnvironment = publicEnvironment,
): boolean {
  return (
    environment.enabled?.trim().toLowerCase() === "true" &&
    typeof userId === "string" &&
    values(environment.userIds).has(userId)
  );
}

export function nextCentralBusinessEventsAutoSyncDelay(
  result: CentralBusinessEventsAppDataSyncResult,
): number {
  if (result.ok) {
    return result.hasMore ? 0 : CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_INTERVAL_MS;
  }
  return result.retryable
    ? CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS
    : CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS;
}
