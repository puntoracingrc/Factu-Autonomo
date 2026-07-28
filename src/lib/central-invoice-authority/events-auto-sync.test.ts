import { describe, expect, it } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { EMPTY_DATA } from "@/lib/types";

import {
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS,
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS,
  CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_CHANNEL_PREFIX,
  CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_TABLE,
  centralInvoiceAuthorityEventsRealtimeWakeupsSubscription,
  CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC,
  CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_PUBLIC_FLAG,
  CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS,
  CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS_PUBLIC_FLAG,
  isCentralInvoiceAuthorityEventsAutoSyncEnabled,
  isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled,
  nextCentralInvoiceAuthorityEventsAutoSyncDelay,
  shouldRunCentralInvoiceAuthorityEventsAutoSync,
  shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups,
} from "./events-auto-sync";
import {
  CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC,
  type CentralInvoiceAuthorityEventsAppDataSyncValue,
} from "./events-app-data-sync";
import { CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC } from "./events-local-sync";

const runnableInput = {
  enabled: true,
  ready: true,
  cloudEnabled: true,
  hasUser: true,
  emailConfirmed: true,
  online: true,
  visible: true,
  running: false,
};

function committedResult(
  overrides: Partial<CentralInvoiceAuthorityEventsAppDataSyncValue> = {},
): AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue> {
  return {
    status: "applied" as const,
    data: EMPTY_DATA,
    replayed: false,
    value: {
      schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC,
      localSync: {
        ok: true as const,
        schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
        documents: [],
        pulledEvents: 0,
        applied: [],
        skipped: [],
        conflicts: [],
        cursorToPersist: null,
        serverNextCursor: null,
      },
      state: {
        schemaVersion: 1 as const,
        source: "central_invoice_authority_events" as const,
        cursor: null,
        lastCheckedAt: "2026-07-28T10:00:00.000Z",
        lastResult: {
          schemaVersion: 1 as const,
          status: "ok" as const,
          checkedAt: "2026-07-28T10:00:00.000Z",
          pulledEvents: 0,
          appliedEvents: 0,
          skippedEvents: 0,
          conflictEvents: 0,
          serverNextCursor: null,
        },
      },
      ...overrides,
    },
  };
}

describe("central invoice authority events auto sync policy", () => {
  it("permanece apagado salvo flag publica explicita", () => {
    expect(CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC).toBe(
      "CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_V1",
    );
    expect(CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_PUBLIC_FLAG).toBe(
      "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC",
    );
    expect(isCentralInvoiceAuthorityEventsAutoSyncEnabled("true")).toBe(true);
    expect(isCentralInvoiceAuthorityEventsAutoSyncEnabled("TRUE")).toBe(false);
    expect(isCentralInvoiceAuthorityEventsAutoSyncEnabled(undefined)).toBe(false);
    expect(CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS).toBe(
      "CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS_V1",
    );
    expect(CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS_PUBLIC_FLAG).toBe(
      "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS",
    );
    expect(isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled("true")).toBe(
      true,
    );
    expect(isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled("TRUE")).toBe(
      false,
    );
    expect(isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled(undefined)).toBe(
      false,
    );
  });

  it("solo ejecuta cuando sesion, nube, email, ventana y datos estan listos", () => {
    expect(shouldRunCentralInvoiceAuthorityEventsAutoSync(runnableInput)).toEqual({
      shouldRun: true,
    });

    expect(
      shouldRunCentralInvoiceAuthorityEventsAutoSync({
        ...runnableInput,
        ready: false,
      }),
    ).toMatchObject({ shouldRun: false, reason: "workspace_not_ready" });
    expect(
      shouldRunCentralInvoiceAuthorityEventsAutoSync({
        ...runnableInput,
        cloudEnabled: false,
      }),
    ).toMatchObject({ shouldRun: false, reason: "cloud_unavailable" });
    expect(
      shouldRunCentralInvoiceAuthorityEventsAutoSync({
        ...runnableInput,
        hasUser: false,
      }),
    ).toMatchObject({ shouldRun: false, reason: "session_unavailable" });
    expect(
      shouldRunCentralInvoiceAuthorityEventsAutoSync({
        ...runnableInput,
        emailConfirmed: false,
      }),
    ).toMatchObject({ shouldRun: false, reason: "email_unconfirmed" });
    expect(
      shouldRunCentralInvoiceAuthorityEventsAutoSync({
        ...runnableInput,
        online: false,
      }),
    ).toMatchObject({ shouldRun: false, reason: "browser_offline" });
    expect(
      shouldRunCentralInvoiceAuthorityEventsAutoSync({
        ...runnableInput,
        visible: false,
      }),
    ).toMatchObject({ shouldRun: false, reason: "document_hidden" });
  });

  it("pausa la automatizacion ante conflictos centrales", () => {
    expect(
      shouldRunCentralInvoiceAuthorityEventsAutoSync({
        ...runnableInput,
        lastStatus: "conflict",
      }),
    ).toEqual({
      shouldRun: false,
      reason: "conflict_paused",
      retryAfterMs: null,
    });
  });

  it("solo suscribe realtime si tambien esta activo el auto-sync seguro", () => {
    expect(
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: true,
        realtimeWakeupsEnabled: true,
        ready: true,
        cloudEnabled: true,
        hasUser: true,
        emailConfirmed: true,
      }),
    ).toEqual({ shouldSubscribe: true });
    expect(
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: false,
        realtimeWakeupsEnabled: true,
        ready: true,
        cloudEnabled: true,
        hasUser: true,
        emailConfirmed: true,
      }),
    ).toEqual({ shouldSubscribe: false, reason: "auto_sync_disabled" });
    expect(
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: true,
        realtimeWakeupsEnabled: false,
        ready: true,
        cloudEnabled: true,
        hasUser: true,
        emailConfirmed: true,
      }),
    ).toEqual({ shouldSubscribe: false, reason: "flag_disabled" });
    expect(
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: true,
        realtimeWakeupsEnabled: true,
        ready: false,
        cloudEnabled: true,
        hasUser: true,
        emailConfirmed: true,
      }),
    ).toEqual({ shouldSubscribe: false, reason: "workspace_not_ready" });
    expect(
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: true,
        realtimeWakeupsEnabled: true,
        ready: true,
        cloudEnabled: false,
        hasUser: true,
        emailConfirmed: true,
      }),
    ).toEqual({ shouldSubscribe: false, reason: "cloud_unavailable" });
    expect(
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: true,
        realtimeWakeupsEnabled: true,
        ready: true,
        cloudEnabled: true,
        hasUser: false,
        emailConfirmed: true,
      }),
    ).toEqual({ shouldSubscribe: false, reason: "session_unavailable" });
    expect(
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: true,
        realtimeWakeupsEnabled: true,
        ready: true,
        cloudEnabled: true,
        hasUser: true,
        emailConfirmed: false,
      }),
    ).toEqual({ shouldSubscribe: false, reason: "email_unconfirmed" });
  });

  it("construye una suscripcion filtrada por usuario sin payload fiscal", () => {
    const userId = "00000000-0000-4000-8000-000000000001";

    expect(
      centralInvoiceAuthorityEventsRealtimeWakeupsSubscription(userId),
    ).toEqual({
      channelName: `${CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_CHANNEL_PREFIX}:${userId}`,
      filter: `user_id=eq.${userId}`,
    });
    expect(CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_TABLE).toBe(
      "central_invoice_event_wakeups",
    );
    expect(centralInvoiceAuthorityEventsRealtimeWakeupsSubscription("bad")).toBe(
      null,
    );
  });

  it("programa el siguiente intento segun el resultado durable", () => {
    expect(
      nextCentralInvoiceAuthorityEventsAutoSyncDelay(committedResult()),
    ).toBe(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS);
    expect(
      nextCentralInvoiceAuthorityEventsAutoSyncDelay({
        status: "blocked",
        reason: "stale_precondition",
      }),
    ).toBe(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
    expect(
      nextCentralInvoiceAuthorityEventsAutoSyncDelay({
        status: "indeterminate",
        reason: "storage_state_unknown",
      }),
    ).toBe(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
    expect(
      nextCentralInvoiceAuthorityEventsAutoSyncDelay(
        committedResult({
          localSync: {
            ok: false as const,
            schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
            code: "CENTRAL_AUTHORITY_EVENTS_LOCAL_CONFLICT",
            message: "Revision necesaria.",
            status: 409,
            documents: [],
            pulledEvents: 1,
            applied: [],
            skipped: [],
            conflicts: [
              {
                eventId: "event-1",
                fullNumber: "F-2026-0001",
                code: "duplicate_fiscal_number",
                localDocumentId: "local-1",
                centralDocumentId: "central-1",
              },
            ],
            cursorToPersist: null,
            serverNextCursor: null,
          },
        }),
      ),
    ).toBeNull();
  });
});
