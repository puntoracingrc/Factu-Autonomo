"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  resolveCentralBusinessUserId,
  useCentralBusinessResolvedUserId,
} from "@/hooks/useCentralBusinessUserId";
import {
  deleteCustomerWithCentralCanary,
  updateCustomerWithCentralCanary,
} from "@/lib/central-business-authority/customer-mutation-canary";
import { isCentralCustomerCreateCanaryEnabledForUser } from "@/lib/central-business-authority/customer-create-canary";
import { loadCentralBusinessDurableQueue } from "@/lib/central-business-authority/durable-queue";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import type { Customer } from "@/lib/types";

export function useCentralCustomerMutations(): {
  updateCustomer: (
    customer: Customer,
  ) => Promise<CentralBusinessEntityMutationResult<Customer>>;
  deleteCustomer: (
    customerId: string,
  ) => Promise<CentralBusinessEntityMutationResult<string>>;
  isCentralCustomer: (customerId: string) => boolean;
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
      const resolvedUserId = await resolveCentralBusinessUserId(userId);
      return updateCustomerWithCentralCanary({
        userId: resolvedUserId,
        customer,
        dependencies: {
          ...baseDependencies,
          syncEventsBeforeWrite: resolvedUserId
            ? () => syncCentralBusinessEvents(resolvedUserId)
            : undefined,
        },
      });
    },
    [baseDependencies, syncCentralBusinessEvents, userId],
  );

  const deleteCustomer = useCallback(
    async (customerId: string) => {
      const resolvedUserId = await resolveCentralBusinessUserId(userId);
      return deleteCustomerWithCentralCanary({
        userId: resolvedUserId,
        customerId,
        dependencies: {
          ...baseDependencies,
          syncEventsBeforeWrite: resolvedUserId
            ? () => syncCentralBusinessEvents(resolvedUserId)
            : undefined,
        },
      });
    },
    [baseDependencies, syncCentralBusinessEvents, userId],
  );

  const isCentralCustomer = useCallback(
    (customerId: string) => {
      if (!userId || !isCentralCustomerCreateCanaryEnabledForUser(userId)) {
        return false;
      }
      try {
        return Boolean(
          loadCentralBusinessDurableQueue(userId).entityVersions[
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
