"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
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
  const userId = planGate.centralUserId;

  const createProduct = useCallback(
    async (draft: ProductDraft) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return createProductWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addProductFallback: addProduct,
          addProductDurably,
          syncEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
            : undefined,
        },
      });
    },
    [
      addProduct,
      addProductDurably,
      getCurrentData,
      planGate.mode,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createProduct };
}
