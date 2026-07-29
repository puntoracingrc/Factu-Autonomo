"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  createSupplierWithCentralCanary,
  type CentralSupplierCreateResult,
} from "@/lib/central-business-authority/supplier-create-canary";
import type { Supplier } from "@/lib/types";

type SupplierDraft = Omit<Supplier, "id" | "createdAt">;

export function useCentralSupplierCreate(): {
  createSupplier: (
    draft: SupplierDraft,
  ) => Promise<CentralSupplierCreateResult>;
} {
  const {
    addSupplier,
    addSupplierDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = user?.id;

  const createSupplier = useCallback(
    (draft: SupplierDraft) =>
      createSupplierWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addSupplierFallback: addSupplier,
          addSupplierDurably,
          syncEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
            : undefined,
        },
      }),
    [
      addSupplier,
      addSupplierDurably,
      getCurrentData,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createSupplier };
}
