"use client";

import { useEffect, useRef } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { CLOUD_DEVICE_REACTIVATED_EVENT } from "@/lib/cloud/device-events";
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
  sync: ReturnType<typeof useAppStore>["syncCentralBusinessEvents"];
};

export function CentralBusinessAuthorityEventsAutoSync() {
  const { ready, syncCentralBusinessEvents } = useAppStore();
  const { user } = useCloudSync();
  const userId = typeof user?.id === "string" ? user.id : null;
  const enabled = isCentralBusinessEventsAutoSyncEnabledForUser(userId);
  const realtimeWakeupsEnabled =
    isCentralBusinessEventsRealtimeWakeupsEnabledForUser(userId);
  const runningRef = useRef(false);
  const pendingWakeRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const realtimeWakeRef = useRef<() => void>(() => {});
  const latestRef = useRef<LatestState>({
    ready,
    userId,
    sync: syncCentralBusinessEvents,
  });

  useEffect(() => {
    latestRef.current = {
      ready,
      userId,
      sync: syncCentralBusinessEvents,
    };
  }, [ready, syncCentralBusinessEvents, userId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    function clearTimer() {
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    function schedule(delayMs: number) {
      if (cancelled) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void runOnce();
      }, delayMs);
    }

    async function runOnce() {
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
      try {
        const result = await latest.sync(latest.userId, {
          limit: CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT,
        });
        schedule(nextCentralBusinessEventsAutoSyncDelay(result));
      } catch {
        schedule(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS);
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
  }, [enabled]);

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
          .subscribe();
      })
      .catch(() => {
        // The cursor-based polling loop remains the durable fallback.
      });

    return () => {
      cancelled = true;
      if (channel) void channel.unsubscribe();
    };
  }, [enabled, ready, realtimeWakeupsEnabled, userId]);

  return null;
}
