"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type {
  CentralQuoteCreateResult,
  CentralQuoteDraft,
} from "@/lib/central-business-authority/quote-create-canary";

export function useCentralQuoteCreate(): {
  createQuote: (
    draft: CentralQuoteDraft,
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

  const createQuote = useCallback(
    async (draft: CentralQuoteDraft, options?: { id?: string }) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const { createQuoteWithCentralCanary } =
        await import("@/lib/central-business-authority/quote-create-canary");
      return createQuoteWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addDocumentFallback: addDocument,
          addCentralDocumentDurably: addCentralBusinessNumberedDocumentDurably,
          createId: options?.id ? () => options.id as string : undefined,
          syncEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
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
