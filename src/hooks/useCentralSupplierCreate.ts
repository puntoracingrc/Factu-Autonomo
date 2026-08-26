"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import {
  createSupplierWithCentralCanary,
  type CentralSupplierCreateResult,
} from "@/lib/central-business-authority/supplier-create-canary";
import type { Supplier } from "@/lib/types";
import type { BillingQuotaSource } from "@/lib/billing/quotas";

type SupplierDraft = Omit<Supplier, "id" | "createdAt">;

export function useCentralSupplierCreate(): {
  createSupplier: (
    draft: SupplierDraft,
    options?: { quotaSource?: BillingQuotaSource },
  ) => Promise<CentralSupplierCreateResult>;
} {
  const {
    addSupplier,
    addSupplierDurably,
    getCurrentData,
    syncCentralBusinessEvents,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const { reserveQuota, commitQuota, releaseQuota } = useBilling();
  const userId = planGate.centralUserId;

  const createSupplier = useCallback(
    async (
      draft: SupplierDraft,
      options?: { quotaSource?: BillingQuotaSource },
    ) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const supplierId = crypto.randomUUID();
      const reservation = await reserveQuota({
        metric: "suppliers",
        operationKey: `supplier:${supplierId}`,
        subjectId: supplierId,
        source: options?.quotaSource ?? "app",
      });
      if (!reservation.allowed) {
        return { ok: false as const, error: reservation.block.message };
      }
      const result = await createSupplierWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addSupplierFallback: addSupplier,
          addSupplierDurably,
          createId: () => supplierId,
          syncEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
            : undefined,
        },
      });
      if (!result.ok) {
        await releaseQuota(reservation);
        return result;
      }
      await commitQuota(reservation, result.supplier.id);
      return result;
    },
    [
      addSupplier,
      addSupplierDurably,
      getCurrentData,
      planGate.mode,
      commitQuota,
      releaseQuota,
      reserveQuota,
      syncCentralBusinessEvents,
      userId,
    ],
  );

  return { createSupplier };
}
