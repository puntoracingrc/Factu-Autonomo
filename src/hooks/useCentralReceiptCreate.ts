"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type { CentralReceiptCreateResult } from "@/lib/central-business-authority/receipt-create-canary";

export function useCentralReceiptCreate(): {
  createReceipt: (invoiceId: string) => Promise<CentralReceiptCreateResult>;
} {
  const {
    addCentralBusinessNumberedDocumentDurably,
    generateReceiptForInvoice,
    getCurrentData,
    syncCentralBusinessEvents,
    syncCentralInvoiceAuthorityEvents,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const createReceipt = useCallback(
    async (invoiceId: string) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const { createReceiptWithCentralCanary } =
        await import("@/lib/central-business-authority/receipt-create-canary");
      return createReceiptWithCentralCanary({
        userId,
        invoiceId,
        dependencies: {
          getCurrentData,
          generateReceiptFallback: generateReceiptForInvoice,
          addCentralDocumentDurably: addCentralBusinessNumberedDocumentDurably,
          syncBusinessEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
            : undefined,
          syncInvoiceEventsBeforeWrite: userId
            ? () => syncCentralInvoiceAuthorityEvents(getCurrentData())
            : undefined,
        },
      });
    },
    [
      addCentralBusinessNumberedDocumentDurably,
      generateReceiptForInvoice,
      getCurrentData,
      planGate.mode,
      syncCentralBusinessEvents,
      syncCentralInvoiceAuthorityEvents,
      userId,
    ],
  );

  return { createReceipt };
}
