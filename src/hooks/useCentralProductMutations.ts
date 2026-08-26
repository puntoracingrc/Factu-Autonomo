"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
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
  const { commitQuota, releaseQuota, removeQuotaSubject, reserveQuota } =
    useBilling();
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
      const current = getCurrentData().products.find(
        (candidate) => candidate.id === product.id,
      );
      const restoring = current?.hidden === true && product.hidden === false;
      const archiving = current?.hidden !== true && product.hidden === true;
      const reservation = restoring
        ? await reserveQuota({
            metric: "products",
            operationKey: `product:${product.id}`,
            subjectId: product.id,
          })
        : null;
      if (reservation && !reservation.allowed) {
        return { ok: false as const, error: reservation.block.message };
      }
      const result = await updateProductWithCentralCanary({
        userId,
        product,
        dependencies: commonDependencies,
      });
      if (!result.ok) {
        if (reservation?.allowed) await releaseQuota(reservation);
        return result;
      }
      if (reservation?.allowed) await commitQuota(reservation, product.id);
      if (archiving) await removeQuotaSubject("products", product.id);
      return result;
    },
    [
      commitQuota,
      commonDependencies,
      getCurrentData,
      planGate.mode,
      releaseQuota,
      removeQuotaSubject,
      reserveQuota,
      userId,
    ],
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const result = await deleteProductWithCentralCanary({
        userId,
        productId,
        dependencies: commonDependencies,
      });
      if (result.ok) {
        await removeQuotaSubject("products", productId);
      }
      return result;
    },
    [commonDependencies, planGate.mode, removeQuotaSubject, userId],
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
