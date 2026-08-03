"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useCentralAuthorityPlanGate } from "@/hooks/useCentralAuthorityPlanGate";
import type { AppData } from "@/lib/types";
import { CLOUD_DEVICE_REACTIVATED_EVENT } from "@/lib/cloud/device-events";
import {
  centralAuthorityRealtimeStateFromStatus,
  type CentralAuthorityRealtimeState,
} from "@/lib/central-authority/sync-schedule";
import {
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT,
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS,
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS,
  CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_SCHEMA,
  CENTRAL_AUTHORITY_EVENTS_REALTIME_WAKEUPS_TABLE,
  centralInvoiceAuthorityEventsRealtimeWakeupsSubscription,
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
  syncCentralInvoiceAuthorityEvents: ReturnType<
    typeof useAppStore
  >["syncCentralInvoiceAuthorityEvents"];
};

export function CentralInvoiceAuthorityEventsAutoSync() {
  const { data, ready, syncCentralInvoiceAuthorityEvents } = useAppStore();
  const { cloudEnabled, emailConfirmed } = useCloudSync();
  const planGate = useCentralAuthorityPlanGate();
  const enabled =
    planGate.mode === "central" &&
    isCentralInvoiceAuthorityEventsAutoSyncEnabled();
  const realtimeWakeupsEnabled =
    isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled();
  const userId = planGate.centralUserId;
  const userCanaryAllowed =
    isCentralInvoiceAuthorityEventsCanaryUserAllowed(userId);
  const runningRef = useRef(false);
  const pendingWakeRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const realtimeStateRef = useRef<CentralAuthorityRealtimeState>("disabled");
  const realtimeWakeRef = useRef<() => void>(() => {});
  const latestRef = useRef<LatestCentralAuthorityAutoSyncState>({
    data,
    ready,
    cloudEnabled: cloudEnabled && planGate.mode === "central",
    hasUser: Boolean(userId),
    emailConfirmed,
    userCanaryAllowed,
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
    syncCentralInvoiceAuthorityEvents,
  ]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    function clearTimer() {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function schedule(delayMs: number | null) {
      if (cancelled || delayMs === null) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void runOnce();
      }, delayMs);
    }

    async function runOnce() {
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
      try {
        const result = await latest.syncCentralInvoiceAuthorityEvents(
          latest.data,
          {
            limit: CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT,
          },
        );
        schedule(
          nextCentralInvoiceAuthorityEventsAutoSyncDelay(result, {
            realtimeState: realtimeStateRef.current,
            jitterFraction: Math.random(),
          }),
        );
      } catch {
        schedule(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
      } finally {
        runningRef.current = false;
        if (pendingWakeRef.current) {
          pendingWakeRef.current = false;
          schedule(0);
        }
      }
    }

    function wake() {
      if (runningRef.current) {
        pendingWakeRef.current = true;
        return;
      }
      schedule(0);
    }

    realtimeWakeRef.current = wake;
    schedule(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    window.addEventListener(CLOUD_DEVICE_REACTIVATED_EVENT, wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      cancelled = true;
      realtimeWakeRef.current = () => {};
      pendingWakeRef.current = false;
      clearTimer();
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener(CLOUD_DEVICE_REACTIVATED_EVENT, wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [enabled, userCanaryAllowed]);

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
            const previous = realtimeStateRef.current;
            const next = centralAuthorityRealtimeStateFromStatus(status);
            realtimeStateRef.current = next;
            if (
              (next === "degraded" && previous !== "degraded") ||
              (next === "subscribed" && previous === "degraded")
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
