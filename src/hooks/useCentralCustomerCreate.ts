"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type { CentralCustomerCreateResult } from "@/lib/central-business-authority/customer-create-canary";
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
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const createCustomer = useCallback(
    async (draft: CustomerDraft) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      try {
        const { createCustomerWithCentralCanary } =
          await import("@/lib/central-business-authority/customer-create-canary");
        return await createCustomerWithCentralCanary({
          userId,
          draft,
          dependencies: {
            getCurrentData,
            addCustomerFallback: addCustomer,
            addCustomerDurably,
            syncEventsBeforeWrite: userId
              ? () => syncCentralBusinessEvents(userId)
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
      planGate.mode,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createCustomer };
}
