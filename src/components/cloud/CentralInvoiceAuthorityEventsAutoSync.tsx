"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useCentralAuthorityPlanGate } from "@/hooks/useCentralAuthorityPlanGate";
import type { AppData } from "@/lib/types";
import { CLOUD_DEVICE_REACTIVATED_EVENT } from "@/lib/cloud/device-events";
import {
  centralAuthorityRealtimeStateFromStatus,
  CENTRAL_AUTHORITY_WAKE_COALESCE_MS,
  shouldWakeCentralAuthorityForActivity,
  type CentralAuthorityRealtimeState,
} from "@/lib/central-authority/sync-schedule";
import {
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT,
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS,
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS,
  CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_SCHEMA,
  CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_TABLE,
  centralInvoiceAuthorityEventsRealtimeWakeupsSubscription,
  centralInvoiceEventsSyncOutcome,
  isCentralInvoiceAuthorityEventsAutoSyncEnabled,
  isCentralInvoiceAuthorityEventsCanaryUserAllowed,
  isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled,
  nextCentralInvoiceAuthorityEventsAutoSyncDelay,
  shouldRunCentralInvoiceAuthorityEventsAutoSync,
  shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups,
} from "@/lib/central-invoice-authority/events-auto-sync";

type CentralInvoiceAuthorityRealtimeChannel = {
  unsubscribe: () => unknown;
};

type LatestCentralAuthorityAutoSyncState = {
  data: AppData;
  ready: boolean;
  cloudEnabled: boolean;
  hasUser: boolean;
  emailConfirmed: boolean;
  userCanaryAllowed: boolean;
  userId: string | null;
  report: ReturnType<typeof useCloudSync>["reportCentralSyncOutcome"];
  syncCentralInvoiceAuthorityEvents: ReturnType<
    typeof useAppStore
  >["syncCentralInvoiceAuthorityEvents"];
};

export function CentralInvoiceAuthorityEventsAutoSync() {
  const { data, ready, syncCentralInvoiceAuthorityEvents } = useAppStore();
  const { cloudEnabled, emailConfirmed, reportCentralSyncOutcome } = useCloudSync();
  const planGate = useCentralAuthorityPlanGate();
  const enabled =
    planGate.mode === "central" &&
    isCentralInvoiceAuthorityEventsAutoSyncEnabled();
  const realtimeWakeupsEnabled =
    isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled();
  const userId = planGate.centralUserId;
  const userCanaryAllowed = isCentralInvoiceAuthorityEventsCanaryUserAllowed(
    planGate.authenticatedUserId,
  );
  const runningRef = useRef(false);
  const pendingWakeRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const timerDueAtRef = useRef<number | null>(null);
  const lastSuccessfulSyncAtRef = useRef<number | null>(null);
  const wakeSequenceRef = useRef(0);
  const realtimeStateRef = useRef<CentralAuthorityRealtimeState>("disabled");
  const realtimeWakeRef = useRef<() => void>(() => {});
  const latestRef = useRef<LatestCentralAuthorityAutoSyncState>({
    data,
    ready,
    cloudEnabled: cloudEnabled && planGate.mode === "central",
    hasUser: Boolean(userId),
    emailConfirmed,
    userCanaryAllowed,
    userId,
    report: reportCentralSyncOutcome,
    syncCentralInvoiceAuthorityEvents,
  });

  useEffect(() => {
    latestRef.current = {
      data,
      ready,
      cloudEnabled: cloudEnabled && planGate.mode === "central",
      hasUser: Boolean(userId),
      emailConfirmed,
      userCanaryAllowed,
      userId,
      report: reportCentralSyncOutcome,
      syncCentralInvoiceAuthorityEvents,
    };
  }, [
    data,
    ready,
    cloudEnabled,
    planGate.mode,
    userId,
    emailConfirmed,
    userCanaryAllowed,
    reportCentralSyncOutcome,
    syncCentralInvoiceAuthorityEvents,
  ]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    function clearTimer() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        timerDueAtRef.current = null;
      }
    }

    function schedule(delayMs: number | null) {
      if (cancelled || delayMs === null) return;
      const dueAt = Date.now() + delayMs;
      if (timerDueAtRef.current !== null && timerDueAtRef.current <= dueAt) return;
      clearTimer();
      timerDueAtRef.current = dueAt;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        timerDueAtRef.current = null;
        void runOnce();
      }, delayMs);
    }

    async function runOnce() {
      if (cancelled) return;
      const latest = latestRef.current;
      const decision = shouldRunCentralInvoiceAuthorityEventsAutoSync({
        enabled,
        ready: latest.ready,
        cloudEnabled: latest.cloudEnabled,
        hasUser: latest.hasUser,
        emailConfirmed: latest.emailConfirmed,
        userCanaryAllowed: latest.userCanaryAllowed,
        online: typeof navigator === "undefined" ? true : navigator.onLine,
        visible:
          typeof document === "undefined"
            ? true
            : document.visibilityState === "visible",
        running: runningRef.current,
        lastStatus:
          latest.data.centralInvoiceAuthorityEventsSync?.lastResult?.status,
      });

      if (!decision.shouldRun) {
        schedule(decision.retryAfterMs);
        return;
      }

      runningRef.current = true;
      const wakeSequence = wakeSequenceRef.current;
      try {
        let result = await latest.syncCentralInvoiceAuthorityEvents(
          latest.data,
          {
            limit: CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT,
          },
        );
        // Another central stream may have committed while this request was in
        // flight. Re-read once from the current baseline, never force old data.
        if (result.status === "blocked" && result.reason === "stale_precondition" && !cancelled) {
          result = await latest.syncCentralInvoiceAuthorityEvents(latestRef.current.data, {
            limit: CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT,
          });
        }
        if (cancelled || latestRef.current.userId !== latest.userId) return;
        const outcome = centralInvoiceEventsSyncOutcome(result);
        lastSuccessfulSyncAtRef.current = outcome.ok && wakeSequence === wakeSequenceRef.current
          ? Date.now()
          : null;
        if (latest.userId) latest.report(latest.userId, "invoices", outcome);
        schedule(
          nextCentralInvoiceAuthorityEventsAutoSyncDelay(result, {
            realtimeState: realtimeStateRef.current,
            jitterFraction: Math.random(),
          }),
        );
      } catch {
        lastSuccessfulSyncAtRef.current = null;
        if (!cancelled && latest.userId) latest.report(latest.userId, "invoices", {
          ok: false, message: "No se pudo recibir las facturas centrales. Se reintentará automáticamente.",
        });
        schedule(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
      } finally {
        runningRef.current = false;
        if (pendingWakeRef.current) {
          pendingWakeRef.current = false;
          schedule(0);
        }
      }
    }

    function wake(event?: Event) {
      if (event && ["focus", "pageshow", "visibilitychange"].includes(event.type) &&
        !shouldWakeCentralAuthorityForActivity({
          visible: document.visibilityState === "visible",
          online: navigator.onLine,
          realtimeState: realtimeStateRef.current,
          lastSuccessfulSyncAt: lastSuccessfulSyncAtRef.current,
          now: Date.now(),
        })) return;
      wakeSequenceRef.current += 1;
      lastSuccessfulSyncAtRef.current = null;
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (runningRef.current) {
        pendingWakeRef.current = true;
        return;
      }
      schedule(CENTRAL_AUTHORITY_WAKE_COALESCE_MS);
    }

    realtimeWakeRef.current = wake;
    schedule(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener(CLOUD_DEVICE_REACTIVATED_EVENT, wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      cancelled = true;
      realtimeWakeRef.current = () => {};
      pendingWakeRef.current = false;
      clearTimer();
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener(CLOUD_DEVICE_REACTIVATED_EVENT, wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [enabled, userCanaryAllowed, userId]);

  useEffect(() => {
    if (enabled && ready && userId) realtimeWakeRef.current();
  }, [enabled, ready, userId]);

  useEffect(() => {
    const decision =
      shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups({
        autoSyncEnabled: enabled,
        realtimeWakeupsEnabled,
        ready,
        cloudEnabled: cloudEnabled && planGate.mode === "central",
        hasUser: Boolean(userId),
        emailConfirmed,
        userCanaryAllowed,
      });
    const subscription =
      centralInvoiceAuthorityEventsRealtimeWakeupsSubscription(userId);

    if (!decision.shouldSubscribe || subscription === null) return;

    let cancelled = false;
    let channel: CentralInvoiceAuthorityRealtimeChannel | null = null;
    realtimeStateRef.current = "connecting";

    void import("@/lib/supabase/client")
      .then(async ({ getSupabaseClientAsync }) => getSupabaseClientAsync())
      .then(async (supabase) => {
        if (cancelled || supabase === null) return;

        await supabase.realtime.setAuth();
        if (cancelled) return;

        channel = supabase
          .channel(subscription.channelName)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_SCHEMA,
              table: CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_TABLE,
              filter: subscription.filter,
            },
            () => {
              realtimeWakeRef.current();
            },
          )
          .subscribe((status) => {
            if (cancelled) return;
            const previous = realtimeStateRef.current;
            const next = centralAuthorityRealtimeStateFromStatus(status);
            realtimeStateRef.current = next;
            if (
              (next === "degraded" && previous !== "degraded") ||
              (next === "subscribed" && previous !== "subscribed")
            ) {
              realtimeWakeRef.current();
            }
          });
      })
      .catch(() => {
        realtimeStateRef.current = "degraded";
        realtimeWakeRef.current();
      });

    return () => {
      cancelled = true;
      realtimeStateRef.current = "disabled";
      if (channel) void channel.unsubscribe();
    };
  }, [
    enabled,
    realtimeWakeupsEnabled,
    ready,
    cloudEnabled,
    planGate.mode,
    userId,
    emailConfirmed,
    userCanaryAllowed,
  ]);

  return null;
}
