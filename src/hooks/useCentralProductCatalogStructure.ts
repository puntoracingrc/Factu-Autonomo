"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
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
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const applyCatalogStructure = useCallback(
    async (operation: ProductCatalogStructureOperation) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return applyProductCatalogBatchWithCentralCanary({
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
      });
    },
    [
      applyProductCatalogStructure,
      commitPreparedAppDataDurably,
      getCurrentData,
      planGate.mode,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { applyCatalogStructure };
}
