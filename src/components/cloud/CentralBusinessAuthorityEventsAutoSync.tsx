"use client";

import { useEffect, useRef } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useCentralAuthorityPlanGate } from "@/hooks/useCentralAuthorityPlanGate";
import { CLOUD_DEVICE_REACTIVATED_EVENT } from "@/lib/cloud/device-events";
import { EXPENSE_ORIGINAL_REFRESH_EVENT } from "@/lib/expense-originals/types";
import {
  CENTRAL_AUXILIARY_WAKEUP_EVENT,
  EXPENSE_INBOX_REFRESH_EVENT,
  auxiliaryWakeupKind,
} from "@/lib/central-business-authority/auxiliary-wakeups";
import {
  centralAuthorityRealtimeStateFromStatus,
  CENTRAL_AUTHORITY_WAKE_COALESCE_MS,
  shouldWakeCentralAuthorityForActivity,
  type CentralAuthorityRealtimeState,
} from "@/lib/central-authority/sync-schedule";
import {
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_START_DELAY_MS,
  CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUP_EVENT,
  centralBusinessEventsRealtimeSubscription,
  isCentralBusinessEventsAutoSyncEnabledForUser,
  isCentralBusinessEventsRealtimeWakeupsEnabledForUser,
  nextCentralBusinessEventsAutoSyncDelay,
} from "@/lib/central-business-authority/events-auto-sync";

type CentralBusinessRealtimeChannel = {
  unsubscribe: () => unknown;
};

type LatestState = {
  ready: boolean;
  userId: string | null;
  report: ReturnType<typeof useCloudSync>["reportCentralSyncOutcome"];
  sync: ReturnType<typeof useAppStore>["syncCentralBusinessEvents"];
  syncFiscal: ReturnType<
    typeof useAppStore
  >["syncFiscalNotificationsWorkspace"];
};

export function CentralBusinessAuthorityEventsAutoSync() {
  const { ready, syncCentralBusinessEvents, syncFiscalNotificationsWorkspace } =
    useAppStore();
  const { reportCentralSyncOutcome } = useCloudSync();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;
  const enabled =
    planGate.mode === "central" &&
    isCentralBusinessEventsAutoSyncEnabledForUser(userId);
  const realtimeWakeupsEnabled =
    isCentralBusinessEventsRealtimeWakeupsEnabledForUser(userId);
  const runningRef = useRef(false);
  const pendingWakeRef = useRef(false);
  const auxiliaryRefreshRef = useRef(true);
  const lastAuxiliaryReadRef = useRef({ ownerScope: userId, at: 0 });
  const timerRef = useRef<number | null>(null);
  const timerDueAtRef = useRef<number | null>(null);
  const lastSuccessfulSyncAtRef = useRef<number | null>(null);
  const wakeSequenceRef = useRef(0);
  const realtimeStateRef = useRef<CentralAuthorityRealtimeState>("disabled");
  const realtimeWakeRef = useRef<() => void>(() => {});
  const latestRef = useRef<LatestState>({
    ready,
    userId,
    report: reportCentralSyncOutcome,
    sync: syncCentralBusinessEvents,
    syncFiscal: syncFiscalNotificationsWorkspace,
  });

  useEffect(() => {
    latestRef.current = {
      ready,
      userId,
      report: reportCentralSyncOutcome,
      sync: syncCentralBusinessEvents,
      syncFiscal: syncFiscalNotificationsWorkspace,
    };
  }, [
    ready,
    syncCentralBusinessEvents,
    syncFiscalNotificationsWorkspace,
    userId,
    reportCentralSyncOutcome,
  ]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let auxiliaryRunning = false;
    let wasHidden = document.visibilityState !== "visible";

    function clearTimer() {
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      timerDueAtRef.current = null;
    }

    function schedule(delayMs: number) {
      if (cancelled) return;
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

    async function refreshAuxiliary(latest: LatestState) {
      if (auxiliaryRunning || !latest.userId || cancelled) return;
      auxiliaryRunning = true;
      auxiliaryRefreshRef.current = false;
      let succeeded = false;
      try {
        const result = await latest.syncFiscal(latest.userId);
        if (cancelled || latestRef.current.userId !== latest.userId) return;
        latest.report(latest.userId, "fiscal", result);
        if (!result.ok) {
          auxiliaryRefreshRef.current = true;
          schedule(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS);
          return;
        }
        succeeded = true;
        lastAuxiliaryReadRef.current = { ownerScope: latest.userId, at: Date.now() };
        window.dispatchEvent(new CustomEvent(EXPENSE_INBOX_REFRESH_EVENT, {
          detail: { ownerScope: latest.userId },
        }));
        window.dispatchEvent(new CustomEvent(EXPENSE_ORIGINAL_REFRESH_EVENT, {
          detail: { ownerScope: latest.userId },
        }));
      } catch {
        if (cancelled || latestRef.current.userId !== latest.userId) return;
        auxiliaryRefreshRef.current = true;
        latest.report(latest.userId, "fiscal", {
          ok: false, message: "No se pudo actualizar el expediente fiscal. Se reintentará automáticamente.",
        });
        schedule(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS);
      } finally {
        auxiliaryRunning = false;
        if (succeeded && auxiliaryRefreshRef.current) schedule(CENTRAL_AUTHORITY_WAKE_COALESCE_MS);
      }
    }

    async function runOnce() {
      if (cancelled) return;
      const latest = latestRef.current;
      if (
        runningRef.current ||
        !latest.ready ||
        !latest.userId ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      ) {
        schedule(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS);
        return;
      }

      runningRef.current = true;
      const wakeSequence = wakeSequenceRef.current;
      try {
        let result = await latest.sync(latest.userId, {
          limit: CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT,
        });
        if (!result.ok && result.retryable && result.code === "CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED" && !cancelled) {
          result = await latest.sync(latest.userId, { limit: CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT });
        }
        if (cancelled || latestRef.current.userId !== latest.userId) return;
        if (!result.ok) lastSuccessfulSyncAtRef.current = null;
        if (!result.ok || !result.hasMore) {
          if (result.ok) lastSuccessfulSyncAtRef.current = wakeSequence === wakeSequenceRef.current ? Date.now() : null;
          latest.report(latest.userId, "business", result);
        }
        // Recover lost signals without downloading the full auxiliary workspace
        // on every unrelated customer, product or expense event.
        if (
          !cancelled &&
          latestRef.current.userId === latest.userId &&
          result.ok &&
          !result.hasMore &&
          (auxiliaryRefreshRef.current ||
            lastAuxiliaryReadRef.current.ownerScope !== latest.userId ||
            Date.now() - lastAuxiliaryReadRef.current.at >= 30_000)
        ) {
          // Auxiliary reads have their own single flight. A slow fiscal read
          // must not hold up a new quote/customer/expense notification.
          void refreshAuxiliary(latest);
        }
        schedule(
          nextCentralBusinessEventsAutoSyncDelay(result, {
            realtimeState: realtimeStateRef.current,
            jitterFraction: Math.random(),
          }),
        );
      } catch {
        lastSuccessfulSyncAtRef.current = null;
        if (!cancelled && latest.userId) latest.report(latest.userId, "business", {
          ok: false, message: "No se pudo recibir los cambios centrales. Se reintentará automáticamente.",
        });
        schedule(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS);
      } finally {
        runningRef.current = false;
        if (pendingWakeRef.current) {
          pendingWakeRef.current = false;
          schedule(0);
        }
      }
    }

    function wake(event?: Event) {
      const resumedFromHidden = event?.type === "visibilitychange" &&
        wasHidden && document.visibilityState === "visible";
      if (event?.type === "visibilitychange") wasHidden = document.visibilityState !== "visible";
      if (event && ["focus", "pageshow", "visibilitychange"].includes(event.type) &&
        !shouldWakeCentralAuthorityForActivity({
          visible: document.visibilityState === "visible",
          online: navigator.onLine,
          realtimeState: realtimeStateRef.current,
          lastSuccessfulSyncAt: lastSuccessfulSyncAtRef.current,
          now: Date.now(),
          resumedFromHidden,
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
    schedule(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_START_DELAY_MS);
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
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !ready || !userId) return;
    realtimeWakeRef.current();
  }, [enabled, ready, userId]);

  useEffect(() => {
    const subscription = centralBusinessEventsRealtimeSubscription(userId);
    if (
      !enabled ||
      !realtimeWakeupsEnabled ||
      !ready ||
      subscription === null
    ) {
      return;
    }

    let cancelled = false;
    let channel: CentralBusinessRealtimeChannel | null = null;
    realtimeStateRef.current = "connecting";

    void import("@/lib/supabase/client")
      .then(async ({ getSupabaseClientAsync }) => getSupabaseClientAsync())
      .then(async (supabase) => {
        if (cancelled || supabase === null) return;

        await supabase.realtime.setAuth();
        if (cancelled) return;

        channel = supabase
          .channel(subscription.channelName, {
            config: { private: true },
          })
          .on(
            "broadcast",
            { event: CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUP_EVENT },
            () => {
              realtimeWakeRef.current();
            },
          )
          .on(
            "broadcast",
            { event: CENTRAL_AUXILIARY_WAKEUP_EVENT },
            (message) => {
              if (cancelled || latestRef.current.userId !== userId) return;
              const kind = auxiliaryWakeupKind(message);
              if (kind === "fiscal_notifications") {
                auxiliaryRefreshRef.current = true;
                realtimeWakeRef.current();
              }
              if (kind === "expense_inbox")
                window.dispatchEvent(
                  new CustomEvent(EXPENSE_INBOX_REFRESH_EVENT, {
                    detail: { ownerScope: userId },
                  }),
                );
              if (kind === "expense_originals")
                window.dispatchEvent(new CustomEvent(EXPENSE_ORIGINAL_REFRESH_EVENT, {
                  detail: { ownerScope: userId },
                }));
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
  }, [enabled, ready, realtimeWakeupsEnabled, userId]);

  return null;
}
