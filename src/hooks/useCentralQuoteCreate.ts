"use client";

import { useCallback, useRef } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type {
  CentralQuoteCreateResult,
  CentralQuoteDraft,
  CentralManualReceiptDraft,
} from "@/lib/central-business-authority/quote-create-canary";
import { CENTRAL_BUSINESS_PREWRITE_EVENT_LIMIT } from "@/lib/central-business-authority/sync-before-write";

export function useCentralQuoteCreate(): {
  createQuote: (
    draft: CentralQuoteDraft | CentralManualReceiptDraft,
    options?: { id?: string },
  ) => Promise<CentralQuoteCreateResult>;
} {
  const {
    addDocument,
    addCentralBusinessNumberedDocumentDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;
  const latestGate = useRef(planGate);
  latestGate.current = planGate;

  const createQuote = useCallback(
    async (
      draft: CentralQuoteDraft | CentralManualReceiptDraft,
      options?: { id?: string },
    ) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const { createQuoteWithCentralCanary } = await import(
        "@/lib/central-business-authority/quote-create-canary"
      );
      return createQuoteWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addDocumentFallback: addDocument,
          addCentralDocumentDurably: addCentralBusinessNumberedDocumentDurably,
          createId: options?.id ? () => options.id as string : undefined,
          isCurrent: () =>
            latestGate.current.centralUserId === userId &&
            latestGate.current.mode === planGate.mode,
          syncEventsBeforeWrite: userId
            ? () =>
                syncCentralBusinessEvents(userId, {
                  limit: CENTRAL_BUSINESS_PREWRITE_EVENT_LIMIT,
                })
            : undefined,
        },
      });
    },
    [
      addCentralBusinessNumberedDocumentDurably,
      addDocument,
      getCurrentData,
      planGate.mode,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createQuote };
}
