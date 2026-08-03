"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  resolveCentralBusinessUserId,
  useCentralBusinessResolvedUserId,
} from "@/hooks/useCentralBusinessUserId";
import type {
  CentralCustomerCreateResult,
} from "@/lib/central-business-authority/customer-create-canary";
import type { Customer } from "@/lib/types";

type CustomerDraft = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export function useCentralCustomerCreate(): {
  createCustomer: (
    draft: CustomerDraft,
  ) => Promise<CentralCustomerCreateResult>;
} {
  const {
    addCustomer,
    addCustomerDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = useCentralBusinessResolvedUserId(user?.id);

  const createCustomer = useCallback(
    async (draft: CustomerDraft) => {
      try {
        const resolvedUserId = await resolveCentralBusinessUserId(userId);
        const { createCustomerWithCentralCanary } = await import(
          "@/lib/central-business-authority/customer-create-canary"
        );
        return await createCustomerWithCentralCanary({
          userId: resolvedUserId,
          draft,
          dependencies: {
            getCurrentData,
            addCustomerFallback: addCustomer,
            addCustomerDurably,
            syncEventsBeforeWrite: resolvedUserId
              ? () => syncCentralBusinessEvents(resolvedUserId)
              : undefined,
          },
        });
      } catch {
        return {
          ok: false as const,
          error:
            "No se pudo preparar el guardado seguro del cliente. No se ha cambiado ninguna ficha. Recarga y vuelve a intentarlo.",
        };
      }
    },
    [
      addCustomer,
      addCustomerDurably,
      getCurrentData,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createCustomer };
}
