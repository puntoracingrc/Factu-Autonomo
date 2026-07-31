"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import type {
  CentralQuoteCreateResult,
  CentralQuoteDraft,
} from "@/lib/central-business-authority/quote-create-canary";

export function useCentralQuoteCreate(): {
  createQuote: (
    draft: CentralQuoteDraft,
  ) => Promise<CentralQuoteCreateResult>;
} {
  const {
    addDocument,
    addCentralBusinessNumberedDocumentDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = user?.id;

  const createQuote = useCallback(
    async (draft: CentralQuoteDraft) => {
      const { createQuoteWithCentralCanary } = await import(
        "@/lib/central-business-authority/quote-create-canary"
      );
      return createQuoteWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addDocumentFallback: addDocument,
          addCentralDocumentDurably:
            addCentralBusinessNumberedDocumentDurably,
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
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createQuote };
}
