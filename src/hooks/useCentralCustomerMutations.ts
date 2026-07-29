"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
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
  const userId = user?.id;

  const commonDependencies = useMemo(
    () => ({
      getCurrentData,
      updateCustomerFallback,
      deleteCustomerFallback,
      updateCustomerDurably,
      deleteCustomerDurably,
      syncEventsBeforeWrite: userId
        ? () => syncCentralBusinessEvents(userId)
        : undefined,
    }),
    [
      deleteCustomerDurably,
      deleteCustomerFallback,
      getCurrentData,
      syncCentralBusinessEvents,
      updateCustomerDurably,
      updateCustomerFallback,
      userId,
    ],
  );

  const updateCustomer = useCallback(
    (customer: Customer) =>
      updateCustomerWithCentralCanary({
        userId,
        customer,
        dependencies: commonDependencies,
      }),
    [commonDependencies, userId],
  );

  const deleteCustomer = useCallback(
    (customerId: string) =>
      deleteCustomerWithCentralCanary({
        userId,
        customerId,
        dependencies: commonDependencies,
      }),
    [commonDependencies, userId],
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
