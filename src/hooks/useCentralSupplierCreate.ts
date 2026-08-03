"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
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
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const createSupplier = useCallback(
    async (draft: SupplierDraft) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return createSupplierWithCentralCanary({
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
      });
    },
    [
      addSupplier,
      addSupplierDurably,
      getCurrentData,
      planGate.mode,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createSupplier };
}
