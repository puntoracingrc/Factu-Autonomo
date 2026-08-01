"use client";

import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";

export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC =
  "CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_V1";
export const CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUPS =
  "CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUPS_V1";
export const CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUP_EVENT =
  "central_business_changed";
export const CENTRAL_BUSINESS_EVENTS_REALTIME_CHANNEL_PREFIX =
  "central-business";
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_START_DELAY_MS = 0;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_INTERVAL_MS = 15_000;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS = 30_000;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS = 60_000;
export const CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT = 500;

export interface CentralBusinessEventsAutoSyncEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralBusinessEventsRealtimeWakeupsEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralBusinessEventsRealtimeSubscription {
  channelName: string;
}

const publicEnvironment: CentralBusinessEventsAutoSyncEnvironment = {
  enabled: process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_ENABLED,
  userIds: process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_USER_IDS,
};

const publicRealtimeEnvironment: CentralBusinessEventsRealtimeWakeupsEnvironment =
  {
    enabled:
      process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUPS_ENABLED,
    userIds:
      process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUPS_USER_IDS,
  };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function allowsUser(
  userId: string | null | undefined,
  userIds: string | undefined,
): boolean {
  if (typeof userId !== "string" || !userId.trim()) return false;
  const allowed = values(userIds);
  if (allowed.size === 0 || allowed.has("*")) return true;
  return allowed.has(userId.trim().toLowerCase());
}

export function isCentralBusinessEventsAutoSyncEnabledForUser(
  userId: string | null | undefined,
  environment: CentralBusinessEventsAutoSyncEnvironment = publicEnvironment,
): boolean {
  return (
    environment.enabled?.trim().toLowerCase() === "true" &&
    allowsUser(userId, environment.userIds)
  );
}

export function isCentralBusinessEventsRealtimeWakeupsEnabledForUser(
  userId: string | null | undefined,
  environment: CentralBusinessEventsRealtimeWakeupsEnvironment = publicRealtimeEnvironment,
): boolean {
  return (
    environment.enabled?.trim().toLowerCase() === "true" &&
    typeof userId === "string" &&
    UUID_PATTERN.test(userId) &&
    values(environment.userIds).has(userId)
  );
}

export function centralBusinessEventsRealtimeSubscription(
  userId: string | null | undefined,
): CentralBusinessEventsRealtimeSubscription | null {
  if (!userId || !UUID_PATTERN.test(userId)) return null;
  return {
    channelName: `${CENTRAL_BUSINESS_EVENTS_REALTIME_CHANNEL_PREFIX}:${userId}`,
  };
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
