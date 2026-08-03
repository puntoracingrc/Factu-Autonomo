"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import { loadCentralBusinessDurableQueue } from "@/lib/central-business-authority/durable-queue";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import { isCentralSupplierCreateCanaryEnabledForUser } from "@/lib/central-business-authority/supplier-create-canary";
import {
  deleteSupplierWithCentralCanary,
  updateSupplierWithCentralCanary,
} from "@/lib/central-business-authority/supplier-mutation-canary";
import type { Supplier } from "@/lib/types";

export function useCentralSupplierMutations(): {
  updateSupplier: (
    supplier: Supplier,
  ) => Promise<CentralBusinessEntityMutationResult<Supplier>>;
  deleteSupplier: (
    supplierId: string,
  ) => Promise<CentralBusinessEntityMutationResult<string>>;
  isCentralSupplier: (supplierId: string) => boolean;
} {
  const {
    deleteSupplier: deleteSupplierFallback,
    deleteSupplierDurably,
    getCurrentData,
    syncCentralBusinessEvents,
    updateSupplier: updateSupplierFallback,
    updateSupplierDurably,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const commonDependencies = useMemo(
    () => ({
      getCurrentData,
      updateSupplierFallback,
      deleteSupplierFallback,
      updateSupplierDurably,
      deleteSupplierDurably,
      syncEventsBeforeWrite: userId
        ? () => syncCentralBusinessEvents(userId)
        : undefined,
    }),
    [
      deleteSupplierDurably,
      deleteSupplierFallback,
      getCurrentData,
      syncCentralBusinessEvents,
      updateSupplierDurably,
      updateSupplierFallback,
      userId,
    ],
  );

  const updateSupplier = useCallback(
    async (supplier: Supplier) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return updateSupplierWithCentralCanary({
        userId,
        supplier,
        dependencies: commonDependencies,
      });
    },
    [commonDependencies, planGate.mode, userId],
  );

  const deleteSupplier = useCallback(
    async (supplierId: string) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return deleteSupplierWithCentralCanary({
        userId,
        supplierId,
        dependencies: commonDependencies,
      });
    },
    [commonDependencies, planGate.mode, userId],
  );

  const isCentralSupplier = useCallback(
    (supplierId: string) => {
      if (planGate.mode === "loading") return true;
      if (!userId || !isCentralSupplierCreateCanaryEnabledForUser(userId)) {
        return false;
      }
      try {
        return Boolean(
          loadCentralBusinessDurableQueue(userId).entityVersions[
            `supplier:${supplierId}`
          ],
        );
      } catch {
        return true;
      }
    },
    [planGate.mode, userId],
  );

  return { updateSupplier, deleteSupplier, isCentralSupplier };
}
