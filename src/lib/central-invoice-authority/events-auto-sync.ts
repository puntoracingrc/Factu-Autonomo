"use client";

import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "./events-app-data-sync";
import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { CentralInvoiceAuthorityEventsSyncLastResultV1 } from "@/lib/types";
import {
  CENTRAL_AUTHORITY_DEGRADED_POLL_MS,
  CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS,
  centralAuthorityIdlePollDelay,
  type CentralAuthorityRealtimeState,
} from "@/lib/central-authority/sync-schedule";
import { isCentralAuthorityPublicRolloutUser } from "@/lib/central-authority/rollout";

const UUID_V4_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_V1";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_PUBLIC_FLAG =
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS_V1";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS_PUBLIC_FLAG =
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_CANARY_USERS_PUBLIC_FLAG =
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_CANARY_USERS";

export const CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_SCHEMA = "public";
export const CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_TABLE =
  "central_invoice_event_wakeups";
export const CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_CHANNEL_PREFIX =
  "central-invoice-authority-events";

export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT = 50;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS = 3_000;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS =
  CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_DEGRADED_INTERVAL_MS =
  CENTRAL_AUTHORITY_DEGRADED_POLL_MS;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS = 30_000;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS = 60_000;
export const CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_NOT_READY_RETRY_MS = 5_000;

export type CentralInvoiceAuthorityEventsAutoSyncSkipReason =
  | "flag_disabled"
  | "already_running"
  | "workspace_not_ready"
  | "cloud_unavailable"
  | "session_unavailable"
  | "email_unconfirmed"
  | "user_not_allowlisted"
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

export type CentralInvoiceAuthorityEventsRealtimeWakeupsSkipReason =
  | "auto_sync_disabled"
  | "flag_disabled"
  | "workspace_not_ready"
  | "cloud_unavailable"
  | "session_unavailable"
  | "email_unconfirmed"
  | "user_not_allowlisted";

export type CentralInvoiceAuthorityEventsRealtimeWakeupsDecision =
  | { shouldSubscribe: true }
  | {
      shouldSubscribe: false;
      reason: CentralInvoiceAuthorityEventsRealtimeWakeupsSkipReason;
    };

export interface CentralInvoiceAuthorityEventsAutoSyncDecisionInput {
  enabled: boolean;
  ready: boolean;
  cloudEnabled: boolean;
  hasUser: boolean;
  emailConfirmed: boolean;
  userCanaryAllowed: boolean;
  online: boolean;
  visible: boolean;
  running: boolean;
  lastStatus?: CentralInvoiceAuthorityEventsSyncLastResultV1["status"];
}

export interface CentralInvoiceAuthorityEventsRealtimeWakeupsDecisionInput {
  autoSyncEnabled: boolean;
  realtimeWakeupsEnabled: boolean;
  ready: boolean;
  cloudEnabled: boolean;
  hasUser: boolean;
  emailConfirmed: boolean;
  userCanaryAllowed: boolean;
}

export interface CentralInvoiceAuthorityEventsRealtimeWakeupsSubscription {
  channelName: string;
  filter: string;
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

export function isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled(
  value: string | undefined =
    process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS,
): boolean {
  return value === "true";
}

export function isCentralInvoiceAuthorityEventsCanaryUserAllowed(
  userId: string | null | undefined,
  value: string | undefined =
    process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_CANARY_USERS,
): boolean {
  if (isCentralAuthorityPublicRolloutUser(userId)) return true;
  const raw = value?.trim();
  if (!raw) return true;
  if (!userId || !UUID_V4_LIKE_PATTERN.test(userId)) return false;

  const allowed = new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => UUID_V4_LIKE_PATTERN.test(entry)),
  );

  return allowed.has(userId.toLowerCase());
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
  if (!input.userCanaryAllowed) {
    return skipped("user_not_allowlisted", null);
  }
  if (!input.online) {
    return skipped("browser_offline", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS);
  }
  if (!input.visible) {
    return skipped("document_hidden", CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_INTERVAL_MS);
  }
  if (input.lastStatus === "conflict") {
    return skipped(
      "conflict_paused",
      CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS,
    );
  }
  return { shouldRun: true };
}

export function shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups(
  input: CentralInvoiceAuthorityEventsRealtimeWakeupsDecisionInput,
): CentralInvoiceAuthorityEventsRealtimeWakeupsDecision {
  if (!input.autoSyncEnabled) {
    return { shouldSubscribe: false, reason: "auto_sync_disabled" };
  }
  if (!input.realtimeWakeupsEnabled) {
    return { shouldSubscribe: false, reason: "flag_disabled" };
  }
  if (!input.ready) {
    return { shouldSubscribe: false, reason: "workspace_not_ready" };
  }
  if (!input.cloudEnabled) {
    return { shouldSubscribe: false, reason: "cloud_unavailable" };
  }
  if (!input.hasUser) {
    return { shouldSubscribe: false, reason: "session_unavailable" };
  }
  if (!input.emailConfirmed) {
    return { shouldSubscribe: false, reason: "email_unconfirmed" };
  }
  if (!input.userCanaryAllowed) {
    return { shouldSubscribe: false, reason: "user_not_allowlisted" };
  }
  return { shouldSubscribe: true };
}

export function centralInvoiceAuthorityEventsRealtimeWakeupsSubscription(
  userId: string | null | undefined,
): CentralInvoiceAuthorityEventsRealtimeWakeupsSubscription | null {
  if (!userId || !UUID_V4_LIKE_PATTERN.test(userId)) return null;

  return {
    channelName: `${CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_CHANNEL_PREFIX}:${userId}`,
    filter: `user_id=eq.${userId}`,
  };
}

export function nextCentralInvoiceAuthorityEventsAutoSyncDelay(
  result: AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>,
  options: {
    realtimeState?: CentralAuthorityRealtimeState;
    jitterFraction?: number;
  } = {},
): number | null {
  if (result.status === "blocked" || result.status === "indeterminate") {
    return CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS;
  }

  const sync = result.value.localSync;
  if (!sync.ok && sync.conflicts.length > 0) {
    return CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_CONFLICT_RETRY_MS;
  }
  if (!sync.ok) return CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS;
  return centralAuthorityIdlePollDelay(
    options.realtimeState ?? "subscribed",
    options.jitterFraction,
  );
}
