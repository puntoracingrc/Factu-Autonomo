"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getRentabilidadRealProductById } from "@/lib/rentabilidad-real/catalog";
import {
  getRentabilidadRealActiveCapabilityKeys,
  getStoredRentabilidadRealActiveProducts,
  planActivateRentabilidadRealProduct,
  planDeactivateRentabilidadRealProduct,
  planSwitchRentabilidadRealProfileEngine,
  setStoredRentabilidadRealActiveProducts,
  type RentabilidadRealLocalActivationContext,
  type RentabilidadRealLocalActivationResult,
} from "@/lib/rentabilidad-real/local-activation";
import type {
  RentabilidadRealPlanKey,
  RentabilidadRealProductId,
  RentabilidadRealSwitchImpact,
  RentabilidadRealUserAccessContext,
  RentabilidadRealUsageSummary,
} from "@/lib/rentabilidad-real/types";

interface UseRentabilidadRealActivationParams {
  planKey: RentabilidadRealPlanKey;
  isProPlus: boolean;
  usageSummary?: RentabilidadRealUsageSummary;
}

export interface RentabilidadRealActivationNotice {
  tone: "success" | "warning" | "info";
  message: string;
  impact?: RentabilidadRealSwitchImpact;
}

export function useRentabilidadRealActivation({
  planKey,
  isProPlus,
  usageSummary,
}: UseRentabilidadRealActivationParams) {
  const [activeProductIds, setActiveProductIds] = useState<
    RentabilidadRealProductId[]
  >([]);
  const [notice, setNotice] = useState<RentabilidadRealActivationNotice | null>(
    null,
  );

  const refresh = useCallback(() => {
    setActiveProductIds(getStoredRentabilidadRealActiveProducts());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeCapabilityKeys = useMemo(
    () => getRentabilidadRealActiveCapabilityKeys(activeProductIds),
    [activeProductIds],
  );

  const accessContext = useMemo<RentabilidadRealUserAccessContext>(
    () => ({
      planKey,
      isProPlus,
      activeProductIds,
      activeCapabilityKeys,
    }),
    [activeCapabilityKeys, activeProductIds, isProPlus, planKey],
  );

  const activationContext = useMemo<RentabilidadRealLocalActivationContext>(
    () => ({
      accessContext,
      usageSummary,
    }),
    [accessContext, usageSummary],
  );

  const commitResult = useCallback(
    (result: RentabilidadRealLocalActivationResult) => {
      if (!result.allowed) {
        setNotice({ tone: "warning", message: result.message });
        return result;
      }

      if (result.impact.requiresConfirmation) {
        const confirmed = window.confirm(result.impact.userMessages.join("\n"));
        if (!confirmed) {
          setNotice({
            tone: "info",
            message: "Cambio cancelado. No se ha modificado ningún módulo.",
          });
          return { ...result, allowed: false, changed: false };
        }
      }

      const stored = setStoredRentabilidadRealActiveProducts(
        result.activeProductIds,
      );
      setActiveProductIds(stored);
      setNotice({
        tone: result.impact.disabledCapabilities.length > 0 ? "info" : "success",
        message: result.changed
          ? "Módulos actualizados. No se ha borrado ningún dato."
          : "La configuración ya estaba al día.",
        impact: result.impact,
      });
      return result;
    },
    [],
  );

  const activate = useCallback(
    (productId: RentabilidadRealProductId) => {
      const product = getRentabilidadRealProductById(productId);
      const result =
        product?.productKind === "profile_engine"
          ? planSwitchRentabilidadRealProfileEngine(
              productId,
              activationContext,
            )
          : planActivateRentabilidadRealProduct(productId, activationContext);
      return commitResult(result);
    },
    [activationContext, commitResult],
  );

  const deactivate = useCallback(
    (productId: RentabilidadRealProductId) =>
      commitResult(
        planDeactivateRentabilidadRealProduct(productId, activationContext),
      ),
    [activationContext, commitResult],
  );

  const activateMany = useCallback(
    (productIds: readonly RentabilidadRealProductId[]) => {
      let lastResult: RentabilidadRealLocalActivationResult | null = null;
      for (const productId of productIds) {
        lastResult = activate(productId);
        if (!lastResult.allowed) break;
      }
      return lastResult;
    },
    [activate],
  );

  return {
    activeProductIds,
    activeCapabilityKeys,
    accessContext,
    notice,
    setNotice,
    refresh,
    activate,
    deactivate,
    activateMany,
  };
}
