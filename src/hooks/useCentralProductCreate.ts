"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import {
  createProductWithCentralCanary,
  type CentralProductCreateResult,
} from "@/lib/central-business-authority/product-create-canary";
import type { Product } from "@/lib/types";

type ProductDraft = Omit<Product, "id" | "createdAt" | "updatedAt">;

export function useCentralProductCreate(): {
  createProduct: (draft: ProductDraft) => Promise<CentralProductCreateResult>;
} {
  const {
    addProduct,
    addProductDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const { reserveQuota, commitQuota, releaseQuota } = useBilling();
  const userId = planGate.centralUserId;

  const createProduct = useCallback(
    async (draft: ProductDraft) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const productId = crypto.randomUUID();
      const reservation = draft.hidden
        ? null
        : await reserveQuota({
            metric: "products",
            operationKey: `product:${productId}`,
            subjectId: productId,
          });
      if (reservation && !reservation.allowed) {
        return { ok: false as const, error: reservation.block.message };
      }
      const result = await createProductWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addProductFallback: addProduct,
          addProductDurably,
          createId: () => productId,
          syncEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
            : undefined,
        },
      });
      if (!result.ok) {
        if (reservation?.allowed) await releaseQuota(reservation);
        return result;
      }
      if (reservation?.allowed) {
        await commitQuota(reservation, result.product.id);
      }
      return result;
    },
    [
      addProduct,
      addProductDurably,
      getCurrentData,
      planGate.mode,
      commitQuota,
      releaseQuota,
      reserveQuota,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createProduct };
}
