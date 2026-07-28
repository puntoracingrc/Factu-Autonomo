"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { AppData } from "@/lib/types";
import {
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT,
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS,
  CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS,
  isCentralInvoiceAuthorityEventsAutoSyncEnabled,
  nextCentralInvoiceAuthorityEventsAutoSyncDelay,
  shouldRunCentralInvoiceAuthorityEventsAutoSync,
} from "@/lib/central-invoice-authority/events-auto-sync";

type LatestCentralAuthorityAutoSyncState = {
  data: AppData;
  ready: boolean;
  cloudEnabled: boolean;
  hasUser: boolean;
  emailConfirmed: boolean;
  syncCentralInvoiceAuthorityEvents: ReturnType<typeof useAppStore>["syncCentralInvoiceAuthorityEvents"];
};

export function CentralInvoiceAuthorityEventsAutoSync() {
  const { data, ready, syncCentralInvoiceAuthorityEvents } = useAppStore();
  const { cloudEnabled, user, emailConfirmed } = useCloudSync();
  const enabled = isCentralInvoiceAuthorityEventsAutoSyncEnabled();
  const runningRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef<LatestCentralAuthorityAutoSyncState>({
    data,
    ready,
    cloudEnabled,
    hasUser: Boolean(user),
    emailConfirmed,
    syncCentralInvoiceAuthorityEvents,
  });

  useEffect(() => {
    latestRef.current = {
      data,
      ready,
      cloudEnabled,
      hasUser: Boolean(user),
      emailConfirmed,
      syncCentralInvoiceAuthorityEvents,
    };
  }, [
    data,
    ready,
    cloudEnabled,
    user,
    emailConfirmed,
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
        schedule(nextCentralInvoiceAuthorityEventsAutoSyncDelay(result));
      } catch {
        schedule(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_RETRY_MS);
      } finally {
        runningRef.current = false;
      }
    }

    function wake() {
      schedule(0);
    }

    schedule(CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_START_DELAY_MS);
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
