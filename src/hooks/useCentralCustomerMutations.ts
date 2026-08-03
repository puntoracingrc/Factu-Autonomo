"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import type { Customer } from "@/lib/types";

export function useCentralCustomerMutations(): {
  updateCustomer: (
    customer: Customer,
  ) => Promise<CentralBusinessEntityMutationResult<Customer>>;
  deleteCustomer: (
    customerId: string,
  ) => Promise<CentralBusinessEntityMutationResult<string>>;
  isCentralCustomer: (customerId: string) => Promise<boolean>;
} {
  const {
    deleteCustomer: deleteCustomerFallback,
    deleteCustomerDurably,
    getCurrentData,
    syncCentralBusinessEvents,
    updateCustomer: updateCustomerFallback,
    updateCustomerDurably,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const baseDependencies = useMemo(
    () => ({
      getCurrentData,
      updateCustomerFallback,
      deleteCustomerFallback,
      updateCustomerDurably,
      deleteCustomerDurably,
    }),
    [
      deleteCustomerDurably,
      deleteCustomerFallback,
      getCurrentData,
      updateCustomerDurably,
      updateCustomerFallback,
    ],
  );

  const updateCustomer = useCallback(
    async (customer: Customer) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      try {
        const { updateCustomerWithCentralCanary } =
          await import("@/lib/central-business-authority/customer-mutation-canary");
        return await updateCustomerWithCentralCanary({
          userId,
          customer,
          dependencies: {
            ...baseDependencies,
            syncEventsBeforeWrite: userId
              ? () => syncCentralBusinessEvents(userId)
              : undefined,
          },
        });
      } catch {
        return {
          ok: false as const,
          error:
            "No se pudo preparar la actualizacion segura del cliente. No se ha cambiado ninguna ficha. Recarga y vuelve a intentarlo.",
        };
      }
    },
    [baseDependencies, planGate.mode, syncCentralBusinessEvents, userId],
  );

  const deleteCustomer = useCallback(
    async (customerId: string) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      try {
        const { deleteCustomerWithCentralCanary } =
          await import("@/lib/central-business-authority/customer-mutation-canary");
        return await deleteCustomerWithCentralCanary({
          userId,
          customerId,
          dependencies: {
            ...baseDependencies,
            syncEventsBeforeWrite: userId
              ? () => syncCentralBusinessEvents(userId)
              : undefined,
          },
        });
      } catch {
        return {
          ok: false as const,
          error:
            "No se pudo preparar el borrado seguro del cliente. No se ha cambiado ninguna ficha. Recarga y vuelve a intentarlo.",
        };
      }
    },
    [baseDependencies, planGate.mode, syncCentralBusinessEvents, userId],
  );

  const isCentralCustomer = useCallback(
    async (customerId: string) => {
      if (planGate.mode === "loading") return true;
      if (!userId) {
        return false;
      }
      try {
        const [customerCanary, durableQueue] = await Promise.all([
          import("@/lib/central-business-authority/customer-create-canary"),
          import("@/lib/central-business-authority/durable-queue"),
        ]);
        if (
          !customerCanary.isCentralCustomerCreateCanaryEnabledForUser(userId)
        ) {
          return false;
        }
        return Boolean(
          durableQueue.loadCentralBusinessDurableQueue(userId).entityVersions[
            `customer:${customerId}`
          ],
        );
      } catch {
        return true;
      }
    },
    [planGate.mode, userId],
  );

  return { updateCustomer, deleteCustomer, isCentralCustomer };
}
