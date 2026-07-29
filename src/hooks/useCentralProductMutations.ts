"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
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
  const { user } = useCloudSync();
  const userId = user?.id;

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
    (product: Product) =>
      updateProductWithCentralCanary({
        userId,
        product,
        dependencies: commonDependencies,
      }),
    [commonDependencies, userId],
  );

  const deleteProduct = useCallback(
    (productId: string) =>
      deleteProductWithCentralCanary({
        userId,
        productId,
        dependencies: commonDependencies,
      }),
    [commonDependencies, userId],
  );

  const isCentralProduct = useCallback(
    (productId: string) => {
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
    [userId],
  );

  return { updateProduct, deleteProduct, isCentralProduct };
}
