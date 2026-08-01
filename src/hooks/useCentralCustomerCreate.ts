"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  resolveCentralBusinessUserId,
  useCentralBusinessResolvedUserId,
} from "@/hooks/useCentralBusinessUserId";
import {
  createCustomerWithCentralCanary,
  type CentralCustomerCreateResult,
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
      const resolvedUserId = await resolveCentralBusinessUserId(userId);
      return createCustomerWithCentralCanary({
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
