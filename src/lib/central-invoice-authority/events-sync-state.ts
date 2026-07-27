import type {
  AppData,
  CentralInvoiceAuthorityEventsCursorV1,
  CentralInvoiceAuthorityEventsSyncLastResultV1,
  CentralInvoiceAuthorityEventsSyncStateV1,
} from "@/lib/types";

import type { CentralInvoiceAuthorityEventsLocalSyncResult } from "./events-local-sync";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_SYNC_STATE =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_SYNC_STATE_V1";

export interface CentralInvoiceAuthorityEventsSyncStateTransitionInput {
  data: AppData;
  result: CentralInvoiceAuthorityEventsLocalSyncResult;
  recordedAt?: string;
}

export interface CentralInvoiceAuthorityEventsSyncStateTransitionResult {
  data: AppData;
  state: CentralInvoiceAuthorityEventsSyncStateV1;
}

function cursorOrPrevious(
  cursor: CentralInvoiceAuthorityEventsCursorV1 | null,
  previous: CentralInvoiceAuthorityEventsCursorV1 | null | undefined,
): CentralInvoiceAuthorityEventsCursorV1 | null {
  return cursor ?? previous ?? null;
}

function lastResult(input: {
  result: CentralInvoiceAuthorityEventsLocalSyncResult;
  checkedAt: string;
  status: CentralInvoiceAuthorityEventsSyncLastResultV1["status"];
}): CentralInvoiceAuthorityEventsSyncLastResultV1 {
  const base = {
    schemaVersion: 1 as const,
    status: input.status,
    checkedAt: input.checkedAt,
    pulledEvents: input.result.pulledEvents,
    appliedEvents: input.result.applied.length,
    skippedEvents: input.result.skipped.length,
    conflictEvents: input.result.conflicts.length,
    serverNextCursor: input.result.serverNextCursor,
  };

  if (input.result.ok) return base;
  return {
    ...base,
    code: input.result.code,
    message: input.result.message,
  };
}

export function recordCentralInvoiceAuthorityEventsLocalSyncResult(
  input: CentralInvoiceAuthorityEventsSyncStateTransitionInput,
): CentralInvoiceAuthorityEventsSyncStateTransitionResult {
  const checkedAt = input.recordedAt ?? new Date().toISOString();
  const previous = input.data.centralInvoiceAuthorityEventsSync;
  const cursor = cursorOrPrevious(input.result.cursorToPersist, previous?.cursor);
  const status = input.result.ok
    ? "ok"
    : input.result.conflicts.length > 0
      ? "conflict"
      : "error";
  const state: CentralInvoiceAuthorityEventsSyncStateV1 = {
    schemaVersion: 1,
    source: "central_invoice_authority_events",
    cursor,
    lastCheckedAt: checkedAt,
    lastAppliedAt:
      input.result.ok && input.result.applied.length > 0
        ? checkedAt
        : previous?.lastAppliedAt,
    lastConflictAt: status === "conflict" ? checkedAt : previous?.lastConflictAt,
    lastErrorAt: status === "error" ? checkedAt : previous?.lastErrorAt,
    lastResult: lastResult({
      result: input.result,
      checkedAt,
      status,
    }),
  };

  return {
    state,
    data: {
      ...input.data,
      documents: input.result.ok ? input.result.documents : input.data.documents,
      centralInvoiceAuthorityEventsSync: state,
    },
  };
}
