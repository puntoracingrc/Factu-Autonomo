"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  applyProductCatalogBatchWithCentralCanary,
  type CentralProductCatalogBatchResult,
} from "@/lib/central-business-authority/product-catalog-batch-canary";
import type { ProductCatalogStructureOperation } from "@/lib/product-catalog-structure";

export function useCentralProductCatalogStructure(): {
  applyCatalogStructure: (
    operation: ProductCatalogStructureOperation,
  ) => Promise<CentralProductCatalogBatchResult>;
} {
  const {
    applyProductCatalogStructure,
    commitPreparedAppDataDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = user?.id;

  const applyCatalogStructure = useCallback(
    (operation: ProductCatalogStructureOperation) =>
      applyProductCatalogBatchWithCentralCanary({
        userId,
        operation,
        dependencies: {
          getCurrentData,
          fallback: applyProductCatalogStructure,
          commitLocal: commitPreparedAppDataDurably,
          syncEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
            : undefined,
        },
      }),
    [
      applyProductCatalogStructure,
      commitPreparedAppDataDurably,
      getCurrentData,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { applyCatalogStructure };
}
