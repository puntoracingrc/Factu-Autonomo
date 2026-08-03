"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useCentralBusinessResolvedUserId } from "@/hooks/useCentralBusinessUserId";
import {
  CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_VERIFIED_EVENT,
  hasVerifiedCentralBusinessAutomaticBootstrap,
} from "@/lib/central-business-authority/automatic-bootstrap-state";
import { isCentralAuthorityPublicRolloutUser } from "@/lib/central-authority/rollout";
import {
  evaluateCentralAuthorityPlanGate,
  type CentralAuthorityPlanGate,
} from "@/lib/central-authority/client-plan-gate";
import { isLegacyCloudExplicitlyRetiredForUser } from "@/lib/supabase/config";

export { centralAuthorityPlanLoadingFailure } from "@/lib/central-authority/client-plan-gate";

function normalizeUserId(userId: string | null): string | null {
  const normalized = userId?.trim() ?? "";
  return normalized || null;
}

interface CentralAuthorityPlanGateContextValue {
  writeGate: CentralAuthorityPlanGate;
  bootstrapGate: CentralAuthorityPlanGate;
}

const CentralAuthorityPlanGateContext =
  createContext<CentralAuthorityPlanGateContextValue | null>(null);

export function CentralAuthorityPlanGateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useCloudSync();
  const cloudUserId = normalizeUserId(user?.id ?? null);
  const resolvedUserId = useCentralBusinessResolvedUserId(cloudUserId);
  const { loading, limits } = useBilling();
  const [bootstrapRevision, setBootstrapRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setBootstrapRevision((value) => value + 1);
    window.addEventListener(
      CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_VERIFIED_EVENT,
      refresh,
    );
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(
        CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_VERIFIED_EVENT,
        refresh,
      );
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const centralBootstrapReady = (() => {
    void bootstrapRevision;
    if (!resolvedUserId) return true;
    if (!isCentralAuthorityPublicRolloutUser(resolvedUserId)) return true;
    return (
      isLegacyCloudExplicitlyRetiredForUser(resolvedUserId) ||
      hasVerifiedCentralBusinessAutomaticBootstrap(resolvedUserId)
    );
  })();

  const value = useMemo(() => {
    const common = {
      resolvedUserId,
      cloudUserId,
      billingLoading: loading,
      cloudSyncIncluded: limits.cloudSync,
    };
    return {
      writeGate: evaluateCentralAuthorityPlanGate({
        ...common,
        centralBootstrapReady,
      }),
      bootstrapGate: evaluateCentralAuthorityPlanGate({
        ...common,
        centralBootstrapReady: true,
      }),
    };
  }, [
    centralBootstrapReady,
    cloudUserId,
    limits.cloudSync,
    loading,
    resolvedUserId,
  ]);

  return createElement(
    CentralAuthorityPlanGateContext.Provider,
    { value },
    children,
  );
}

export function useCentralAuthorityPlanGate(
  options: { requireBootstrapVerified?: boolean } = {},
): CentralAuthorityPlanGate {
  const value = useContext(CentralAuthorityPlanGateContext);
  if (!value) {
    throw new Error(
      "useCentralAuthorityPlanGate debe usarse dentro de CentralAuthorityPlanGateProvider",
    );
  }
  return options.requireBootstrapVerified === false
    ? value.bootstrapGate
    : value.writeGate;
}
