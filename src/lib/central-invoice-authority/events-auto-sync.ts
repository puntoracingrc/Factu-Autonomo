"use client";

import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "./events-app-data-sync";
import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { CentralInvoiceAuthorityEventsSyncLastResultV1 } from "@/lib/types";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_V1";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_PUBLIC_FLAG =
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC";

export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT = 50;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS = 3_000;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS = 60_000;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS = 30_000;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_NOT_READY_RETRY_MS = 5_000;

export type CentralInvoiceAuthorityEventsAutoSyncSkipReason =
  | "flag_disabled"
  | "already_running"
  | "workspace_not_ready"
  | "cloud_unavailable"
  | "session_unavailable"
  | "email_unconfirmed"
  | "browser_offline"
  | "document_hidden"
  | "conflict_paused";

export type CentralInvoiceAuthorityEventsAutoSyncDecision =
  | { shouldRun: true }
  | {
      shouldRun: false;
      reason: CentralInvoiceAuthorityEventsAutoSyncSkipReason;
      retryAfterMs: number | null;
    };

export interface CentralInvoiceAuthorityEventsAutoSyncDecisionInput {
  enabled: boolean;
  ready: boolean;
  cloudEnabled: boolean;
  hasUser: boolean;
  emailConfirmed: boolean;
  online: boolean;
  visible: boolean;
  running: boolean;
  lastStatus?: CentralInvoiceAuthorityEventsSyncLastResultV1["status"];
}

function skipped(
  reason: CentralInvoiceAuthorityEventsAutoSyncSkipReason,
  retryAfterMs: number | null,
): CentralInvoiceAuthorityEventsAutoSyncDecision {
  return {
    shouldRun: false,
    reason,
    retryAfterMs,
  };
}

export function isCentralInvoiceAuthorityEventsAutoSyncEnabled(
  value: string | undefined =
    process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC,
): boolean {
  return value === "true";
}

export function shouldRunCentralInvoiceAuthorityEventsAutoSync(
  input: CentralInvoiceAuthorityEventsAutoSyncDecisionInput,
): CentralInvoiceAuthorityEventsAutoSyncDecision {
  if (!input.enabled) return skipped("flag_disabled", null);
  if (input.running) {
    return skipped("already_running", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
  }
  if (!input.ready) {
    return skipped(
      "workspace_not_ready",
      CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_NOT_READY_RETRY_MS,
    );
  }
  if (!input.cloudEnabled) {
    return skipped("cloud_unavailable", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
  }
  if (!input.hasUser) {
    return skipped("session_unavailable", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
  }
  if (!input.emailConfirmed) {
    return skipped("email_unconfirmed", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
  }
  if (!input.online) {
    return skipped("browser_offline", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS);
  }
  if (!input.visible) {
    return skipped("document_hidden", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS);
  }
  if (input.lastStatus === "conflict") {
    return skipped("conflict_paused", null);
  }
  return { shouldRun: true };
}

export function nextCentralInvoiceAuthorityEventsAutoSyncDelay(
  result: AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>,
): number | null {
  if (result.status === "blocked" || result.status === "indeterminate") {
    return CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS;
  }

  const sync = result.value.localSync;
  if (!sync.ok && sync.conflicts.length > 0) return null;
  if (!sync.ok) return CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS;
  return CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS;
}
