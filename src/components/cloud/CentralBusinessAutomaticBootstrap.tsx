"use client";

import { useEffect, useRef, useState } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useCentralAuthorityPlanGate } from "@/hooks/useCentralAuthorityPlanGate";
import { isCentralAuthorityPublicRolloutUser } from "@/lib/central-authority/rollout";
import {
  automaticBootstrapDisposition,
  hasVerifiedCentralBusinessAutomaticBootstrap,
  markCentralBusinessAutomaticBootstrapVerified,
} from "@/lib/central-business-authority/automatic-bootstrap-state";
import {
  buildCentralBusinessBootstrapBrowserSnapshot,
  centralBusinessBootstrapSnapshotSignature,
  commitCentralBusinessBootstrapFromBrowser,
  previewCentralBusinessBootstrapFromBrowser,
} from "@/lib/central-business-authority/bootstrap-client";
import { recordCentralBusinessBootstrapCheckpoint } from "@/lib/central-business-authority/bootstrap-checkpoint";
import { fetchCentralBusinessAuthorityStatusFromBrowser } from "@/lib/central-business-authority/status-client";
import { isLegacyCloudExplicitlyRetiredForUser } from "@/lib/supabase/config";

const BUSINESS_EVENT_LIMIT = 500;
const INVOICE_EVENT_LIMIT = 50;
const MAX_EVENT_PAGES = 100;
const RETRY_DELAY_MS = 15_000;

type AutomaticBootstrapRunResult = "verified" | "manual_review" | "retry";
type AutomaticBootstrapSyncResult = "ok" | "manual_review" | "retry";

async function bootstrapIdempotencyKey(signature: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(signature),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `CENTRAL_BUSINESS_AUTO_BOOTSTRAP:${hash}`;
}

export function CentralBusinessAutomaticBootstrap() {
  const {
    ready,
    getCurrentData,
    syncCentralBusinessEvents,
    syncCentralInvoiceAuthorityEvents,
  } = useAppStore();
  const { emailConfirmed, requiresEmailConfirmation } = useCloudSync();
  const planGate = useCentralAuthorityPlanGate({
    requireBootstrapVerified: false,
  });
  const ownerScope = planGate.centralUserId;
  const runningOwnerRef = useRef<string | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const [retryRevision, setRetryRevision] = useState(0);
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  useEffect(() => {
    if (
      planGate.mode !== "central" ||
      !ownerScope ||
      !isCentralAuthorityPublicRolloutUser(ownerScope) ||
      !ready ||
      !emailConfirmed ||
      requiresEmailConfirmation
    ) {
      runningOwnerRef.current = null;
      return;
    }

    const alreadyVerified =
      hasVerifiedCentralBusinessAutomaticBootstrap(ownerScope);
    if (isLegacyCloudExplicitlyRetiredForUser(ownerScope)) {
      if (!alreadyVerified) {
        markCentralBusinessAutomaticBootstrapVerified({ ownerScope });
      }
      return;
    }
    if (alreadyVerified) {
      return;
    }

    if (!online || runningOwnerRef.current === ownerScope) return;

    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    let cancelled = false;
    runningOwnerRef.current = ownerScope;

    async function syncAllBusinessEvents(): Promise<AutomaticBootstrapSyncResult> {
      for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
        const result = await syncCentralBusinessEvents(ownerScope!, {
          limit: BUSINESS_EVENT_LIMIT,
        });
        if (!result.ok) {
          return result.retryable ? "retry" : "manual_review";
        }
        if (!result.hasMore) return "ok";
      }
      return "manual_review";
    }

    async function syncAllInvoiceEvents(): Promise<AutomaticBootstrapSyncResult> {
      for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
        const result = await syncCentralInvoiceAuthorityEvents(
          getCurrentData(),
          { limit: INVOICE_EVENT_LIMIT },
        );
        if (result.status === "indeterminate") return "manual_review";
        if (result.status === "blocked") return "retry";
        if (!result.value.localSync.ok) {
          return result.value.localSync.conflicts.length > 0
            ? "manual_review"
            : "retry";
        }
        if (result.value.localSync.pulledEvents < INVOICE_EVENT_LIMIT) {
          return "ok";
        }
      }
      return "manual_review";
    }

    async function run(): Promise<AutomaticBootstrapRunResult> {
      const status = await fetchCentralBusinessAuthorityStatusFromBrowser();
      if (
        !status.ok ||
        !status.activation.appliesToUser ||
        !status.summary.writesPossible
      ) {
        return "retry";
      }
      const invoiceSync = await syncAllInvoiceEvents();
      if (invoiceSync !== "ok") return invoiceSync;
      const businessSync = await syncAllBusinessEvents();
      if (businessSync !== "ok") return businessSync;

      const snapshot =
        buildCentralBusinessBootstrapBrowserSnapshot(getCurrentData());
      const snapshotSignature =
        centralBusinessBootstrapSnapshotSignature(snapshot);
      const previewResult =
        await previewCentralBusinessBootstrapFromBrowser(snapshot);
      if (!previewResult.ok) {
        return previewResult.status === 409 ? "manual_review" : "retry";
      }

      const disposition = automaticBootstrapDisposition(previewResult.preview);
      if (disposition === "manual_review") return "manual_review";

      if (disposition === "commit") {
        const result = await commitCentralBusinessBootstrapFromBrowser({
          entities: snapshot,
          preview: previewResult.preview,
          idempotencyKey: await bootstrapIdempotencyKey(snapshotSignature),
        });
        if (!result.ok) return "retry";
      }

      await recordCentralBusinessBootstrapCheckpoint({
        ownerScope: ownerScope!,
        entities: snapshot,
        preview: previewResult.preview,
        verifyCurrentSnapshot: () =>
          centralBusinessBootstrapSnapshotSignature(
            buildCentralBusinessBootstrapBrowserSnapshot(getCurrentData()),
          ) === snapshotSignature,
      });

      const confirmationSync = await syncAllBusinessEvents();
      if (confirmationSync !== "ok") return confirmationSync;
      const verifiedSnapshot =
        buildCentralBusinessBootstrapBrowserSnapshot(getCurrentData());
      const verified =
        await previewCentralBusinessBootstrapFromBrowser(verifiedSnapshot);
      if (!verified.ok) {
        return verified.status === 409 ? "manual_review" : "retry";
      }
      const verifiedDisposition = automaticBootstrapDisposition(
        verified.preview,
      );
      if (verifiedDisposition === "manual_review") {
        return "manual_review";
      }
      if (verifiedDisposition !== "verified") {
        return "retry";
      }

      markCentralBusinessAutomaticBootstrapVerified({
        ownerScope: ownerScope!,
      });
      return "verified";
    }

    void run()
      .catch(() => "retry" as const)
      .then((result) => {
        if (cancelled || result !== "retry") return;
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          setRetryRevision((value) => value + 1);
        }, RETRY_DELAY_MS);
      })
      .finally(() => {
        if (runningOwnerRef.current === ownerScope) {
          runningOwnerRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [
    emailConfirmed,
    getCurrentData,
    online,
    ownerScope,
    planGate.mode,
    ready,
    requiresEmailConfirmation,
    retryRevision,
    syncCentralBusinessEvents,
    syncCentralInvoiceAuthorityEvents,
  ]);

  return null;
}
