"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BillingQuotaDialog } from "@/components/billing/BillingQuotaDialog";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { isBillingEnforced } from "@/lib/billing/config";
import {
  getPlanLimits,
  isProPlan,
  type PaidPlanId,
  type PlanId,
} from "@/lib/billing/plans";
import {
  BILLING_QUOTA_PACKS,
  buildBillingQuotaReconciliation,
  emptyBillingQuotaSnapshot,
  type BillingQuotaBlock,
  type BillingQuotaMetric,
  type BillingQuotaPackKey,
  type BillingQuotaReconciliationInput,
  type BillingQuotaReserveResult,
  type BillingQuotaSnapshot,
  type BillingQuotaSource,
} from "@/lib/billing/quotas";
import { ensureFreeSubscription } from "@/lib/billing/repository";
import { getActiveWorkspaceAccessToken } from "@/lib/cloud/active-workspace-session";
import {
  resolveEffectivePlan,
  trialDaysRemaining,
  type UserSubscription,
} from "@/lib/billing/subscription";

export interface BillingQuotaReservationHandle {
  claimId: string | null;
  metric: BillingQuotaMetric;
}

interface BillingContextValue {
  billingEnabled: boolean;
  plan: PlanId;
  isPro: boolean;
  limits: ReturnType<typeof getPlanLimits>;
  documentsThisMonth: number;
  showUsageWarning: boolean;
  trialDaysLeft: number | null;
  loading: boolean;
  quotaLoading: boolean;
  quotaSnapshot: BillingQuotaSnapshot;
  checkout: (
    interval: "monthly" | "yearly",
    plan?: PaidPlanId,
  ) => Promise<string | null>;
  checkoutScanPack: () => Promise<string | null>;
  checkoutQuotaPack: (pack: BillingQuotaPackKey) => Promise<string | null>;
  openPortal: () => Promise<string | null>;
  reserveQuota: (input: {
    metric: BillingQuotaMetric;
    operationKey: string;
    subjectId?: string;
    source?: BillingQuotaSource;
  }) => Promise<BillingQuotaReserveResult>;
  commitQuota: (
    reservation: BillingQuotaReservationHandle,
    subjectId: string,
  ) => Promise<boolean>;
  releaseQuota: (
    reservation: BillingQuotaReservationHandle,
  ) => Promise<boolean>;
  removeQuotaSubject: (
    metric: "customers" | "suppliers" | "products",
    subjectId: string,
  ) => Promise<boolean>;
}

const BillingContext = createContext<BillingContextValue | null>(null);

function quotaFailureBlock(
  snapshot: BillingQuotaSnapshot,
  metric: BillingQuotaMetric,
  code: "account_required" | "service_unavailable",
): BillingQuotaBlock {
  return {
    ...snapshot.metrics[metric],
    code,
    message:
      code === "account_required"
        ? "Inicia sesión o crea tu cuenta gratuita para confirmar el límite antes de guardar. Puedes conservar el borrador mientras tanto."
        : "No hemos podido confirmar tu límite con el servidor. No se ha consumido ninguna cuota; conserva el borrador y vuelve a intentarlo.",
  };
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { data, ready } = useAppStore();
  const { user } = useCloudSync();
  const billingEnabled = isBillingEnforced();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(billingEnabled);
  const [quotaLoading, setQuotaLoading] = useState(billingEnabled);
  const [quotaSnapshot, setQuotaSnapshot] = useState<BillingQuotaSnapshot>(() =>
    emptyBillingQuotaSnapshot(billingEnabled ? "free" : "pro"),
  );
  const [activeQuotaBlock, setActiveQuotaBlock] =
    useState<BillingQuotaBlock | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!billingEnabled) {
      setLoading(false);
      return;
    }
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const sub = await ensureFreeSubscription(user.id);
    setSubscription(sub);
    setLoading(false);
  }, [billingEnabled, user]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    const refresh = () => void loadSubscription();
    window.addEventListener("fa-billing-refresh", refresh);
    return () => window.removeEventListener("fa-billing-refresh", refresh);
  }, [loadSubscription]);

  const plan = useMemo(() => {
    if (!billingEnabled) return "pro" as PlanId;
    if (!user) return "free" as PlanId;
    return resolveEffectivePlan(subscription);
  }, [billingEnabled, subscription, user]);

  const limits = getPlanLimits(plan);
  const isPro = isProPlan(plan);
  const trialDaysLeft = trialDaysRemaining(subscription);

  const getAccessToken = useCallback(async () => {
    return getActiveWorkspaceAccessToken(user?.id);
  }, [user?.id]);

  const quotaReconciliation = useMemo(() => {
    if (!ready) return null;
    const input = buildBillingQuotaReconciliation({
      documents: data.documents,
      expenses: data.expenses,
      customers: data.customers,
      suppliers: data.suppliers,
      products: data.products,
      monthKey: quotaSnapshot.monthKey,
    });
    input.documents.sort();
    input.manualExpenses.sort();
    input.customers.sort();
    input.suppliers.sort();
    input.products.sort();
    return input;
  }, [
    data.customers,
    data.documents,
    data.expenses,
    data.products,
    data.suppliers,
    quotaSnapshot.monthKey,
    ready,
  ]);
  const quotaReconciliationKey = useMemo(
    () => (quotaReconciliation ? JSON.stringify(quotaReconciliation) : ""),
    [quotaReconciliation],
  );

  useEffect(() => {
    if (!billingEnabled || loading || !ready) return;
    if (!user) {
      setQuotaSnapshot(emptyBillingQuotaSnapshot(plan));
      setQuotaLoading(false);
      return;
    }
    if (isPro) {
      setQuotaSnapshot(emptyBillingQuotaSnapshot(plan));
      setQuotaLoading(false);
      return;
    }
    if (!quotaReconciliationKey) return;
    const claims = JSON.parse(
      quotaReconciliationKey,
    ) as BillingQuotaReconciliationInput;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setQuotaLoading(true);
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) setQuotaLoading(false);
          return;
        }
        const response = await fetch("/api/billing/quota", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "reconcile", claims }),
        }).catch(() => null);
        const body = response
          ? ((await response.json().catch(() => ({}))) as {
              snapshot?: BillingQuotaSnapshot;
            })
          : {};
        if (!cancelled) {
          if (response?.ok && body.snapshot) setQuotaSnapshot(body.snapshot);
          setQuotaLoading(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    billingEnabled,
    getAccessToken,
    isPro,
    loading,
    plan,
    quotaReconciliationKey,
    ready,
    user,
  ]);

  const checkout = useCallback(
    async (
      interval: "monthly" | "yearly",
      planToBuy: PaidPlanId = "pro",
    ): Promise<string | null> => {
      const token = await getAccessToken();
      if (!token) return "Inicia sesión para suscribirte";
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interval, plan: planToBuy }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) return body.error ?? "No se pudo iniciar el pago";
      if (body.url) window.location.href = body.url;
      return null;
    },
    [getAccessToken],
  );

  const checkoutScanPack = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) return "Inicia sesión para comprar escaneos extra";
    const res = await fetch("/api/billing/checkout-scan-pack", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) return body.error ?? "No se pudo iniciar el pago";
    if (body.url) window.location.href = body.url;
    return null;
  }, [getAccessToken]);

  const checkoutQuotaPack = useCallback(
    async (pack: BillingQuotaPackKey): Promise<string | null> => {
      if (!BILLING_QUOTA_PACKS[pack]) return "Pack no disponible";
      const token = await getAccessToken();
      if (!token) return "Inicia sesión para comprar un extra";
      const res = await fetch("/api/billing/checkout-quota-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pack }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) return body.error ?? "No se pudo iniciar el pago";
      if (body.url) window.location.href = body.url;
      return null;
    },
    [getAccessToken],
  );

  const openPortal = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) return "Inicia sesión para gestionar tu suscripción";
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) return body.error ?? "No se pudo abrir el portal";
    if (body.url) window.location.href = body.url;
    return null;
  }, [getAccessToken]);

  const reserveQuota = useCallback(
    async (input: {
      metric: BillingQuotaMetric;
      operationKey: string;
      subjectId?: string;
      source?: BillingQuotaSource;
    }): Promise<BillingQuotaReserveResult> => {
      if (!billingEnabled || isPro) {
        return {
          allowed: true,
          claimId: null,
          metric: input.metric,
          snapshot: quotaSnapshot.metrics[input.metric],
        };
      }
      if (!user) {
        const block = quotaFailureBlock(
          quotaSnapshot,
          input.metric,
          "account_required",
        );
        setActiveQuotaBlock(block);
        return { allowed: false, block };
      }
      const token = await getAccessToken();
      if (!token) {
        const block = quotaFailureBlock(
          quotaSnapshot,
          input.metric,
          "account_required",
        );
        setActiveQuotaBlock(block);
        return { allowed: false, block };
      }
      const response = await fetch("/api/billing/quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reserve", ...input }),
      }).catch(() => null);
      const result = response
        ? ((await response.json().catch(() => null)) as BillingQuotaReserveResult | null)
        : null;
      if (
        result &&
        typeof result === "object" &&
        "allowed" in result &&
        typeof result.allowed === "boolean"
      ) {
        if (result.allowed) {
          setQuotaSnapshot((current) => ({
            ...current,
            generatedAt: new Date().toISOString(),
            metrics: {
              ...current.metrics,
              [input.metric]: result.snapshot,
            },
          }));
          return result;
        }
        setActiveQuotaBlock(result.block);
        return result;
      }
      const block = quotaFailureBlock(
        quotaSnapshot,
        input.metric,
        "service_unavailable",
      );
      setActiveQuotaBlock(block);
      return { allowed: false, block };
    },
    [billingEnabled, getAccessToken, isPro, quotaSnapshot, user],
  );

  const commitQuota = useCallback(
    async (
      reservation: BillingQuotaReservationHandle,
      subjectId: string,
    ): Promise<boolean> => {
      if (!reservation.claimId) return true;
      const token = await getAccessToken();
      if (!token) return false;
      const response = await fetch("/api/billing/quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "commit",
          claimId: reservation.claimId,
          subjectId,
        }),
      }).catch(() => null);
      const body = response
        ? ((await response.json().catch(() => ({}))) as {
            snapshot?: BillingQuotaSnapshot;
          })
        : {};
      if (response?.ok && body.snapshot) {
        setQuotaSnapshot(body.snapshot);
        return true;
      }
      return false;
    },
    [getAccessToken],
  );

  const releaseQuota = useCallback(
    async (reservation: BillingQuotaReservationHandle): Promise<boolean> => {
      if (!reservation.claimId) return true;
      const token = await getAccessToken();
      if (!token) return false;
      const response = await fetch("/api/billing/quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "release",
          claimId: reservation.claimId,
        }),
      }).catch(() => null);
      const body = response
        ? ((await response.json().catch(() => ({}))) as {
            snapshot?: BillingQuotaSnapshot;
          })
        : {};
      if (response?.ok && body.snapshot) {
        setQuotaSnapshot(body.snapshot);
        return true;
      }
      return false;
    },
    [getAccessToken],
  );

  const removeQuotaSubject = useCallback(
    async (
      metric: "customers" | "suppliers" | "products",
      subjectId: string,
    ): Promise<boolean> => {
      if (!billingEnabled) return true;
      const token = await getAccessToken();
      if (!token) return false;
      const response = await fetch("/api/billing/quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "remove_subject", metric, subjectId }),
      }).catch(() => null);
      const body = response
        ? ((await response.json().catch(() => ({}))) as {
            snapshot?: BillingQuotaSnapshot;
          })
        : {};
      if (response?.ok && body.snapshot) {
        setQuotaSnapshot(body.snapshot);
        return true;
      }
      return false;
    },
    [billingEnabled, getAccessToken],
  );

  const documentsThisMonth = quotaSnapshot.metrics.documents.used;
  const documentRemaining = quotaSnapshot.metrics.documents.remaining;
  const showUsageWarning =
    billingEnabled &&
    !isPro &&
    documentRemaining !== null &&
    documentRemaining <= 2;

  const value = useMemo<BillingContextValue>(
    () => ({
      billingEnabled,
      plan,
      isPro,
      limits,
      documentsThisMonth,
      showUsageWarning,
      trialDaysLeft,
      loading,
      quotaLoading,
      quotaSnapshot,
      checkout,
      checkoutScanPack,
      checkoutQuotaPack,
      openPortal,
      reserveQuota,
      commitQuota,
      releaseQuota,
      removeQuotaSubject,
    }),
    [
      billingEnabled,
      checkout,
      checkoutQuotaPack,
      checkoutScanPack,
      commitQuota,
      documentsThisMonth,
      isPro,
      limits,
      loading,
      openPortal,
      plan,
      quotaLoading,
      quotaSnapshot,
      removeQuotaSubject,
      releaseQuota,
      reserveQuota,
      showUsageWarning,
      trialDaysLeft,
    ],
  );

  return (
    <BillingContext.Provider value={value}>
      {children}
      <BillingQuotaDialog
        block={activeQuotaBlock}
        signedIn={Boolean(user)}
        onClose={() => setActiveQuotaBlock(null)}
        onSubscribe={checkout}
        onBuyPack={checkoutQuotaPack}
      />
    </BillingContext.Provider>
  );
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling debe usarse dentro de BillingProvider");
  }
  return ctx;
}
