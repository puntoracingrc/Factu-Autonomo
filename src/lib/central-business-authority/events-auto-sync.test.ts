import { describe, expect, it } from "vitest";

import {
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_INTERVAL_MS,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS,
  isCentralBusinessEventsAutoSyncEnabledForUser,
  nextCentralBusinessEventsAutoSyncDelay,
} from "./events-auto-sync";

describe("central business events auto sync", () => {
  it("solo se activa para UUIDs incluidos explícitamente", () => {
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
      isCentralBusinessEventsAutoSyncEnabledForUser("user-1", {
        enabled: "false",
        userIds: "user-1",
      }),
    ).toBe(false);
  });

  it("continúa páginas inmediatamente y separa red de conflictos", () => {
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
