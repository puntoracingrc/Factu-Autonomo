"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCloudSync } from "@/context/CloudSyncContext";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, isProPlan, PLANS, type PlanId } from "@/lib/billing/plans";
import {
  ensureTrialSubscription,
  fetchUserSubscription,
} from "@/lib/billing/repository";
import {
  resolveEffectivePlan,
  trialDaysRemaining,
  type UserSubscription,
} from "@/lib/billing/subscription";
import {
  canCreateDocument,
  getLocalDocumentUsage,
  incrementLocalDocumentUsage,
  usageWarningThreshold,
} from "@/lib/billing/usage";

interface BillingContextValue {
  billingEnabled: boolean;
  plan: PlanId;
  isPro: boolean;
  limits: ReturnType<typeof getPlanLimits>;
  documentsThisMonth: number;
  showUsageWarning: boolean;
  trialDaysLeft: number | null;
  loading: boolean;
  checkout: (interval: "monthly" | "yearly") => Promise<string | null>;
  checkoutScanPack: () => Promise<string | null>;
  openPortal: () => Promise<string | null>;
  recordDocumentCreated: () => void;
  checkCanCreateDocument: (customerCount?: number) => {
    allowed: boolean;
    reason?: string;
  };
  checkCanAddCustomer: (customerCount: number) => {
    allowed: boolean;
    reason?: string;
  };
}

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useCloudSync();
  const billingEnabled = isBillingEnforced();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [documentsThisMonth, setDocumentsThisMonth] = useState(0);
  const [loading, setLoading] = useState(billingEnabled);

  const refreshUsage = useCallback(() => {
    setDocumentsThisMonth(getLocalDocumentUsage());
  }, []);

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
    let sub = await fetchUserSubscription(user.id);
    if (!sub) {
      sub = await ensureTrialSubscription(user.id);
    }
    setSubscription(sub);
    setLoading(false);
  }, [billingEnabled, user]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const plan = useMemo(() => {
    if (!billingEnabled) return "pro" as PlanId;
    if (!user) return "free" as PlanId;
    return resolveEffectivePlan(subscription);
  }, [billingEnabled, subscription, user]);

  const limits = getPlanLimits(plan);
  const isPro = isProPlan(plan);
  const threshold = usageWarningThreshold(plan);
  const showUsageWarning =
    billingEnabled &&
    !isPro &&
    threshold !== null &&
    documentsThisMonth >= threshold;

  const trialDaysLeft = trialDaysRemaining(subscription);

  const getAccessToken = useCallback(async () => {
    const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const checkout = useCallback(
    async (interval: "monthly" | "yearly"): Promise<string | null> => {
      const token = await getAccessToken();
      if (!token) return "Inicia sesión para suscribirte a Pro";
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interval }),
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) return body.error ?? "No se pudo iniciar el pago";
    if (body.url) window.location.href = body.url;
    return null;
  }, [getAccessToken]);

  const openPortal = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) return "Inicia sesión para gestionar tu suscripción";
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) return body.error ?? "No se pudo abrir el portal";
    if (body.url) window.location.href = body.url;
    return null;
  }, [getAccessToken]);

  const checkCanCreateDocument = useCallback(
    (customerCount?: number) =>
      canCreateDocument(plan, documentsThisMonth, customerCount),
    [documentsThisMonth, plan],
  );

  const checkCanAddCustomer = useCallback(
    (customerCount: number) => {
      if (!billingEnabled || isPro) return { allowed: true };
      const max = PLANS.free.limits.maxCustomers;
      if (max !== null && customerCount >= max) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de ${max} clientes en el plan Gratis. Pasa a Pro para añadir más.`,
        };
      }
      return { allowed: true };
    },
    [billingEnabled, isPro],
  );

  const recordDocumentCreated = useCallback(() => {
    const snapshot = incrementLocalDocumentUsage();
    setDocumentsThisMonth(snapshot.documentsCreated);
  }, []);

  const value = useMemo(
    () => ({
      billingEnabled,
      plan,
      isPro,
      limits,
      documentsThisMonth,
      showUsageWarning,
      trialDaysLeft,
      loading,
      checkout,
      checkoutScanPack,
      openPortal,
      recordDocumentCreated,
      checkCanCreateDocument,
      checkCanAddCustomer,
    }),
    [
      billingEnabled,
      plan,
      isPro,
      limits,
      documentsThisMonth,
      showUsageWarning,
      trialDaysLeft,
      loading,
      checkout,
      checkoutScanPack,
      openPortal,
      recordDocumentCreated,
      checkCanCreateDocument,
      checkCanAddCustomer,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling debe usarse dentro de BillingProvider");
  }
  return ctx;
}
