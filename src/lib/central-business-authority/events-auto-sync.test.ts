import { describe, expect, it } from "vitest";

import {
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_INTERVAL_MS,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS,
  CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUP_EVENT,
  centralBusinessEventsRealtimeSubscription,
  isCentralBusinessEventsAutoSyncEnabledForUser,
  isCentralBusinessEventsRealtimeWakeupsEnabledForUser,
  nextCentralBusinessEventsAutoSyncDelay,
} from "./events-auto-sync";

describe("central business events auto sync", () => {
  it("permite rollout general o lista explicita cuando el flag esta activo", () => {
    expect(
      isCentralBusinessEventsAutoSyncEnabledForUser("user-1", {
        enabled: "true",
        userIds: "user-1,user-2",
      }),
    ).toBe(true);
    expect(
      isCentralBusinessEventsAutoSyncEnabledForUser("user-3", {
        enabled: "true",
        userIds: "user-1,user-2",
      }),
    ).toBe(false);
    expect(
      isCentralBusinessEventsAutoSyncEnabledForUser("real-user-1", {
        enabled: "true",
      }),
    ).toBe(true);
    expect(
      isCentralBusinessEventsAutoSyncEnabledForUser("real-user-2", {
        enabled: "true",
        userIds: "*",
      }),
    ).toBe(true);
    expect(
      isCentralBusinessEventsAutoSyncEnabledForUser(null, {
        enabled: "true",
      }),
    ).toBe(false);
    expect(
      isCentralBusinessEventsAutoSyncEnabledForUser("user-1", {
        enabled: "false",
        userIds: "user-1",
      }),
    ).toBe(false);
  });

  it("activa Realtime solo para UUIDs incluidos en su canario", () => {
    const allowed = "dee25bc5-381c-40a7-9402-383d4b309052";
    const other = "31fd96e3-5eda-4d35-ba6f-79719e1d4d8c";

    expect(
      isCentralBusinessEventsRealtimeWakeupsEnabledForUser(allowed, {
        enabled: "true",
        userIds: allowed,
      }),
    ).toBe(true);
    expect(
      isCentralBusinessEventsRealtimeWakeupsEnabledForUser(other, {
        enabled: "true",
        userIds: allowed,
      }),
    ).toBe(false);
    expect(
      isCentralBusinessEventsRealtimeWakeupsEnabledForUser("not-a-uuid", {
        enabled: "true",
        userIds: "not-a-uuid",
      }),
    ).toBe(false);
  });

  it("construye un canal privado por propietario sin aceptar temas arbitrarios", () => {
    const userId = "dee25bc5-381c-40a7-9402-383d4b309052";
    expect(centralBusinessEventsRealtimeSubscription(userId)).toEqual({
      channelName: `central-business:${userId}`,
    });
    expect(centralBusinessEventsRealtimeSubscription("bad:topic")).toBeNull();
    expect(CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUP_EVENT).toBe(
      "central_business_changed",
    );
  });

  it("continúa páginas inmediatamente y separa red de conflictos", () => {
    expect(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT).toBe(500);
    expect(
      nextCentralBusinessEventsAutoSyncDelay({
        ok: true,
        schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
        pulled: 100,
        applied: 100,
        skipped: 0,
        nextSequence: 100,
        hasMore: true,
      }),
    ).toBe(0);
    expect(
      nextCentralBusinessEventsAutoSyncDelay({
        ok: true,
        schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
        pulled: 0,
        applied: 0,
        skipped: 0,
        nextSequence: 100,
        hasMore: false,
      }),
    ).toBe(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_INTERVAL_MS);
    expect(
      nextCentralBusinessEventsAutoSyncDelay({
        ok: false,
        schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
        code: "NETWORK",
        message: "offline",
        retryable: true,
        nextSequence: 0,
      }),
    ).toBe(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS);
    expect(
      nextCentralBusinessEventsAutoSyncDelay({
        ok: false,
        schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
        code: "CONFLICT",
        message: "review",
        retryable: false,
        nextSequence: 0,
      }),
    ).toBe(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS);
  });
});
