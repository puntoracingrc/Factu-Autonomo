"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { ScanQuota } from "@/lib/billing/scan-limits";
import { pendingUserReminders } from "@/lib/user-reminders";
import {
  collectAppRecommendations,
  type AppRecommendation,
} from "@/lib/recommendations";

export function useAppRecommendations(): {
  recommendations: AppRecommendation[];
  count: number;
  autoCount: number;
  taskCount: number;
  loadingScans: boolean;
  refresh: () => void;
} {
  const { data, ready } = useAppStore();
  const billing = useBilling();
  const { cloudEnabled, user, pendingChangeCount } = useCloudSync();
  const [scanQuota, setScanQuota] = useState<ScanQuota | null>(null);
  const [loadingScans, setLoadingScans] = useState(false);

  const loadScanQuota = useCallback(async () => {
    if (!billing.billingEnabled) {
      setScanQuota(null);
      return;
    }
    if (billing.billingEnabled && !user) {
      setScanQuota(null);
      return;
    }

    setLoadingScans(true);
    try {
      const headers: HeadersInit = {};
      if (user) {
        const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
        const supabase = await getSupabaseClientAsync();
        const { data: sessionData } =
          (await supabase?.auth.getSession()) ?? { data: { session: null } };
        const token = sessionData.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch("/api/expenses/scan", { headers });
      if (res.ok) {
        const body = (await res.json()) as { quota: ScanQuota };
        setScanQuota(body.quota);
      }
    } finally {
      setLoadingScans(false);
    }
  }, [billing.billingEnabled, user]);

  useEffect(() => {
    void loadScanQuota();
  }, [loadScanQuota]);

  const recommendations = useMemo(() => {
    if (!ready) return [];

    return collectAppRecommendations({
      data,
      billing: {
        billingEnabled: billing.billingEnabled,
        plan: billing.plan,
        isPro: billing.isPro,
        documentsThisMonth: billing.documentsThisMonth,
        showUsageWarning: billing.showUsageWarning,
        trialDaysLeft: billing.trialDaysLeft,
        quarterlyExport: billing.limits.quarterlyExport,
      },
      cloud: {
        cloudEnabled,
        hasUser: Boolean(user),
        pendingChangeCount,
      },
      scanQuota,
    });
  }, [
    ready,
    data,
    billing.billingEnabled,
    billing.plan,
    billing.isPro,
    billing.documentsThisMonth,
    billing.showUsageWarning,
    billing.trialDaysLeft,
    billing.limits.quarterlyExport,
    cloudEnabled,
    user,
    pendingChangeCount,
    scanQuota,
  ]);

  const taskCount = useMemo(() => {
    if (!ready) return 0;
    return pendingUserReminders(data.userReminders).length;
  }, [ready, data.userReminders]);

  return {
    recommendations,
    autoCount: recommendations.length,
    count: recommendations.length + taskCount,
    taskCount,
    loadingScans,
    refresh: loadScanQuota,
  };
}
