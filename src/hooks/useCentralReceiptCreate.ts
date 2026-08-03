"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
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
  const { user } = useCloudSync();
  const userId = user?.id;

  const createReceipt = useCallback(
    async (invoiceId: string) => {
      const { createReceiptWithCentralCanary } = await import(
        "@/lib/central-business-authority/receipt-create-canary"
      );
      return createReceiptWithCentralCanary({
        userId,
        invoiceId,
        dependencies: {
          getCurrentData,
          generateReceiptFallback: generateReceiptForInvoice,
          addCentralDocumentDurably:
            addCentralBusinessNumberedDocumentDurably,
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
      syncCentralBusinessEvents,
      syncCentralInvoiceAuthorityEvents,
      userId,
    ],
  );

  return { createReceipt };
}
