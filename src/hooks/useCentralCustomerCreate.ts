"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type { CentralCustomerCreateResult } from "@/lib/central-business-authority/customer-create-canary";
import type { Customer } from "@/lib/types";
import type { BillingQuotaSource } from "@/lib/billing/quotas";

type CustomerDraft = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export function useCentralCustomerCreate(): {
  createCustomer: (
    draft: CustomerDraft,
    options?: { quotaSource?: BillingQuotaSource },
  ) => Promise<CentralCustomerCreateResult>;
} {
  const {
    addCustomer,
    addCustomerDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const { reserveQuota, commitQuota, releaseQuota } = useBilling();
  const userId = planGate.centralUserId;

  const createCustomer = useCallback(
    async (
      draft: CustomerDraft,
      options?: { quotaSource?: BillingQuotaSource },
    ) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const customerId = crypto.randomUUID();
      const reservation = await reserveQuota({
        metric: "customers",
        operationKey: `customer:${customerId}`,
        subjectId: customerId,
        source: options?.quotaSource ?? "app",
      });
      if (!reservation.allowed) {
        return { ok: false as const, error: reservation.block.message };
      }
      try {
        const { createCustomerWithCentralCanary } =
          await import("@/lib/central-business-authority/customer-create-canary");
        const result = await createCustomerWithCentralCanary({
          userId,
          draft,
          dependencies: {
            getCurrentData,
            addCustomerFallback: addCustomer,
            addCustomerDurably,
            createId: () => customerId,
            syncEventsBeforeWrite: userId
              ? () => syncCentralBusinessEvents(userId)
              : undefined,
          },
        });
        if (!result.ok) {
          await releaseQuota(reservation);
          return result;
        }
        await commitQuota(reservation, result.customer.id);
        return result;
      } catch {
        await releaseQuota(reservation);
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
      commitQuota,
      releaseQuota,
      reserveQuota,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createCustomer };
}
