"use client";

import { useEffect, useRef } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_LIMIT,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_RETRY_MS,
  CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_START_DELAY_MS,
  isCentralBusinessEventsAutoSyncEnabledForUser,
  nextCentralBusinessEventsAutoSyncDelay,
} from "@/lib/central-business-authority/events-auto-sync";

type LatestState = {
  ready: boolean;
  userId: string | null;
  sync: ReturnType<typeof useAppStore>["syncCentralBusinessEvents"];
};

export function CentralBusinessAuthorityEventsAutoSync() {
  const { ready, syncCentralBusinessEvents } = useAppStore();
  const { user, emailConfirmed } = useCloudSync();
  const userId = typeof user?.id === "string" ? user.id : null;
  const enabled =
    emailConfirmed && isCentralBusinessEventsAutoSyncEnabledForUser(userId);
  const runningRef = useRef(false);
  const timerRef = useRef<number | null>(null);
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
      }
    }

    function wake() {
      schedule(0);
    }

    schedule(CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_START_DELAY_MS);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      cancelled = true;
      clearTimer();
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [enabled]);

  return null;
}
