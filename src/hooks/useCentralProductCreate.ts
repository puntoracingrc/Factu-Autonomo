"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
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
  const { user } = useCloudSync();
  const userId = user?.id;

  const createProduct = useCallback(
    (draft: ProductDraft) =>
      createProductWithCentralCanary({
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
      }),
    [
      addProduct,
      addProductDurably,
      getCurrentData,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createProduct };
}
