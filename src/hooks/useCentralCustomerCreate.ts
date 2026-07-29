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
  createCustomer: (draft: CustomerDraft) => Promise<CentralCustomerCreateResult>;
} {
  const {
    addCustomer,
    addCustomerDurably,
    getCurrentData,
  } = useAppStore();
  const { user } = useCloudSync();

  const createCustomer = useCallback(
    (draft: CustomerDraft) =>
      createCustomerWithCentralCanary({
        userId: user?.id,
        draft,
        dependencies: {
          getCurrentData,
          addCustomerFallback: addCustomer,
          addCustomerDurably,
        },
      }),
    [addCustomer, addCustomerDurably, getCurrentData, user?.id],
  );

  return { createCustomer };
}
