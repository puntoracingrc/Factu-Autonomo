"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import { loadCentralBusinessDurableQueue } from "@/lib/central-business-authority/durable-queue";
import {
  deleteProductWithCentralCanary,
  updateProductWithCentralCanary,
} from "@/lib/central-business-authority/product-mutation-canary";
import { isCentralProductCreateCanaryEnabledForUser } from "@/lib/central-business-authority/product-create-canary";
import type { Product } from "@/lib/types";

export function useCentralProductMutations(): {
  updateProduct: (
    product: Product,
  ) => Promise<CentralBusinessEntityMutationResult<Product>>;
  deleteProduct: (
    productId: string,
  ) => Promise<CentralBusinessEntityMutationResult<string>>;
  isCentralProduct: (productId: string) => boolean;
} {
  const {
    deleteProduct: deleteProductFallback,
    deleteProductDurably,
    getCurrentData,
    syncCentralBusinessEvents,
    updateProduct: updateProductFallback,
    updateProductDurably,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const commonDependencies = useMemo(
    () => ({
      getCurrentData,
      updateProductFallback,
      deleteProductFallback,
      updateProductDurably,
      deleteProductDurably,
      syncEventsBeforeWrite: userId
        ? () => syncCentralBusinessEvents(userId)
        : undefined,
    }),
    [
      deleteProductDurably,
      deleteProductFallback,
      getCurrentData,
      syncCentralBusinessEvents,
      updateProductDurably,
      updateProductFallback,
      userId,
    ],
  );

  const updateProduct = useCallback(
    async (product: Product) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return updateProductWithCentralCanary({
        userId,
        product,
        dependencies: commonDependencies,
      });
    },
    [commonDependencies, planGate.mode, userId],
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return deleteProductWithCentralCanary({
        userId,
        productId,
        dependencies: commonDependencies,
      });
    },
    [commonDependencies, planGate.mode, userId],
  );

  const isCentralProduct = useCallback(
    (productId: string) => {
      if (planGate.mode === "loading") return true;
      if (!userId || !isCentralProductCreateCanaryEnabledForUser(userId)) {
        return false;
      }
      try {
        return Boolean(
          loadCentralBusinessDurableQueue(userId).entityVersions[
            `product:${productId}`
          ],
        );
      } catch {
        return true;
      }
    },
    [planGate.mode, userId],
  );

  return { updateProduct, deleteProduct, isCentralProduct };
}
