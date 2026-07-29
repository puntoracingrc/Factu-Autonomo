"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
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
  const userId = user?.id;

  const createCustomer = useCallback(
    (draft: CustomerDraft) =>
      createCustomerWithCentralCanary({
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
      }),
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
