"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  resolveCentralBusinessUserId,
  useCentralBusinessResolvedUserId,
} from "@/hooks/useCentralBusinessUserId";
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
  const { user } = useCloudSync();
  const userId = useCentralBusinessResolvedUserId(user?.id);

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
      try {
        const resolvedUserId = await resolveCentralBusinessUserId(userId);
        const { updateCustomerWithCentralCanary } = await import(
          "@/lib/central-business-authority/customer-mutation-canary"
        );
        return await updateCustomerWithCentralCanary({
          userId: resolvedUserId,
          customer,
          dependencies: {
            ...baseDependencies,
            syncEventsBeforeWrite: resolvedUserId
              ? () => syncCentralBusinessEvents(resolvedUserId)
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
    [baseDependencies, syncCentralBusinessEvents, userId],
  );

  const deleteCustomer = useCallback(
    async (customerId: string) => {
      try {
        const resolvedUserId = await resolveCentralBusinessUserId(userId);
        const { deleteCustomerWithCentralCanary } = await import(
          "@/lib/central-business-authority/customer-mutation-canary"
        );
        return await deleteCustomerWithCentralCanary({
          userId: resolvedUserId,
          customerId,
          dependencies: {
            ...baseDependencies,
            syncEventsBeforeWrite: resolvedUserId
              ? () => syncCentralBusinessEvents(resolvedUserId)
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
    [baseDependencies, syncCentralBusinessEvents, userId],
  );

  const isCentralCustomer = useCallback(
    async (customerId: string) => {
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
    [userId],
  );

  return { updateCustomer, deleteCustomer, isCentralCustomer };
}
