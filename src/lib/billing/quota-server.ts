import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isBillingEnforced } from "./config";
import { ensureFreeSubscriptionServer } from "./server-repository";
import { resolveEffectivePlan } from "./subscription";
import {
  BILLING_QUOTA_METRICS,
  billingMonthWindow,
  billingQuotaBlockMessage,
  emptyBillingQuotaSnapshot,
  quotaLimitForPlan,
  quotaPeriodKey,
  type BillingQuotaBlock,
  type BillingQuotaMetric,
  type BillingQuotaMetricSnapshot,
  type BillingQuotaReconciliationInput,
  type BillingQuotaReserveResult,
  type BillingQuotaSnapshot,
  type BillingQuotaSource,
} from "./quotas";
import type { PlanId } from "./plans";

interface QuotaClaimRow {
  metric: string;
  period_key: string;
  state: string;
  lease_expires_at: string | null;
}

interface QuotaEntitlementRow {
  metric: string;
  credit_balance: number;
  capacity_bonus: number;
}

interface ReserveQuotaRpcRow {
  allowed?: boolean;
  result_status?: string;
  claim_id?: string | null;
  current_usage?: number;
  included_limit?: number | null;
  effective_limit?: number | null;
  credit_balance?: number;
  capacity_bonus?: number;
  reset_at?: string | null;
}

function requireAdmin() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Servidor de cuotas no disponible");
  return admin;
}

function firstRpcRow(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const row = value[0];
  return row && typeof row === "object"
    ? (row as Record<string, unknown>)
    : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

export async function resolveServerBillingPlan(userId: string): Promise<PlanId> {
  if (!isBillingEnforced()) return "pro";
  const subscription = await ensureFreeSubscriptionServer(userId);
  return resolveEffectivePlan(subscription);
}

export async function getBillingQuotaSnapshotServer(
  userId: string,
  plan: PlanId,
  reference = new Date(),
): Promise<BillingQuotaSnapshot> {
  const snapshot = emptyBillingQuotaSnapshot(plan, reference);
  const admin = requireAdmin();
  const { monthKey, resetAt } = billingMonthWindow(reference);
  const [claimsResult, entitlementsResult] = await Promise.all([
    admin
      .from("billing_quota_claims")
      .select("metric,period_key,state,lease_expires_at")
      .eq("user_id", userId)
      .in("period_key", ["lifetime", monthKey])
      .in("state", ["reserved", "committed"])
      .limit(10000),
    admin
      .from("billing_quota_entitlements")
      .select("metric,credit_balance,capacity_bonus")
      .eq("user_id", userId),
  ]);
  if (claimsResult.error) throw new Error(claimsResult.error.message);
  if (entitlementsResult.error) throw new Error(entitlementsResult.error.message);

  const now = reference.getTime();
  const claims = (claimsResult.data ?? []) as QuotaClaimRow[];
  const entitlements = new Map(
    ((entitlementsResult.data ?? []) as QuotaEntitlementRow[]).map((row) => [
      row.metric,
      row,
    ]),
  );

  for (const metric of BILLING_QUOTA_METRICS) {
    const periodKey = quotaPeriodKey(metric, monthKey);
    const used = claims.filter(
      (claim) =>
        claim.metric === metric &&
        claim.period_key === periodKey &&
        (claim.state === "committed" ||
          (claim.state === "reserved" &&
            Boolean(claim.lease_expires_at) &&
            new Date(claim.lease_expires_at as string).getTime() > now)),
    ).length;
    const entitlement = entitlements.get(metric);
    const creditBalance = numberOrZero(entitlement?.credit_balance);
    const capacityBonus = numberOrZero(entitlement?.capacity_bonus);
    const included = quotaLimitForPlan(plan, metric);
    const capacityMetric =
      metric === "customers" || metric === "suppliers" || metric === "products";
    const effectiveLimit =
      included === null
        ? null
        : included + (capacityMetric ? capacityBonus : 0);
    const remaining =
      effectiveLimit === null
        ? null
        : Math.max(0, effectiveLimit - used) +
          (capacityMetric ? 0 : creditBalance);
    snapshot.metrics[metric] = {
      metric,
      used,
      included,
      effectiveLimit,
      creditBalance,
      capacityBonus,
      remaining,
      resetAt:
        metric === "documents" || metric === "manual_expenses"
          ? resetAt
          : null,
    };
  }
  return snapshot;
}

function metricSnapshotFromRpc(
  metric: BillingQuotaMetric,
  row: ReserveQuotaRpcRow,
): BillingQuotaMetricSnapshot {
  const used = numberOrZero(row.current_usage);
  const included =
    typeof row.included_limit === "number" ? row.included_limit : null;
  const effectiveLimit =
    typeof row.effective_limit === "number" ? row.effective_limit : null;
  const creditBalance = numberOrZero(row.credit_balance);
  const capacityBonus = numberOrZero(row.capacity_bonus);
  const capacityMetric =
    metric === "customers" || metric === "suppliers" || metric === "products";
  return {
    metric,
    used,
    included,
    effectiveLimit,
    creditBalance,
    capacityBonus,
    remaining:
      effectiveLimit === null
        ? null
        : Math.max(0, effectiveLimit - used) +
          (capacityMetric ? 0 : creditBalance),
    resetAt: typeof row.reset_at === "string" ? row.reset_at : null,
  };
}

export async function reserveBillingQuotaServer(input: {
  userId: string;
  plan: PlanId;
  metric: BillingQuotaMetric;
  operationKey: string;
  subjectId?: string;
  source?: BillingQuotaSource;
  reference?: Date;
}): Promise<BillingQuotaReserveResult> {
  const reference = input.reference ?? new Date();
  const included = quotaLimitForPlan(input.plan, input.metric);
  if (included === null) {
    const snapshot = await getBillingQuotaSnapshotServer(
      input.userId,
      input.plan,
      reference,
    );
    return {
      allowed: true,
      claimId: null,
      metric: input.metric,
      snapshot: snapshot.metrics[input.metric],
    };
  }

  const admin = requireAdmin();
  const { monthKey, resetAt } = billingMonthWindow(reference);
  const { data, error } = await admin.rpc("reserve_billing_quota_claim", {
    p_user_id: input.userId,
    p_metric: input.metric,
    p_period_key: quotaPeriodKey(input.metric, monthKey),
    p_operation_key: input.operationKey,
    p_subject_id: input.subjectId ?? null,
    p_plan: input.plan,
    p_included_limit: included,
    p_reset_at:
      input.metric === "documents" || input.metric === "manual_expenses"
        ? resetAt
        : null,
    p_source: input.source ?? "app",
    p_lease_seconds: 900,
    p_now: reference.toISOString(),
  });
  if (error) throw new Error(error.message);
  const row = firstRpcRow(data) as ReserveQuotaRpcRow | null;
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("Respuesta inválida del servidor de cuotas");
  }
  const snapshot = metricSnapshotFromRpc(input.metric, row);
  if (!row.allowed) {
    const block: BillingQuotaBlock = {
      ...snapshot,
      code: "limit_reached",
      message: billingQuotaBlockMessage(
        input.metric,
        snapshot.effectiveLimit,
        snapshot.resetAt,
      ),
    };
    return { allowed: false, block };
  }
  return {
    allowed: true,
    claimId: typeof row.claim_id === "string" ? row.claim_id : null,
    metric: input.metric,
    snapshot,
  };
}

export async function commitBillingQuotaServer(input: {
  userId: string;
  claimId: string;
  subjectId: string;
}): Promise<void> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("commit_billing_quota_claim", {
    p_user_id: input.userId,
    p_claim_id: input.claimId,
    p_subject_id: input.subjectId,
    p_now: null,
  });
  if (error) throw new Error(error.message);
  const row = firstRpcRow(data);
  if (
    row?.result_status !== "committed" &&
    row?.result_status !== "already_committed"
  ) {
    throw new Error("No se pudo confirmar el consumo de cuota");
  }
}

export async function releaseBillingQuotaServer(input: {
  userId: string;
  claimId: string;
}): Promise<void> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("release_billing_quota_claim", {
    p_user_id: input.userId,
    p_claim_id: input.claimId,
    p_now: null,
  });
  if (error) throw new Error(error.message);
  if (
    data !== "released" &&
    data !== "already_released" &&
    data !== "already_committed"
  ) {
    throw new Error("No se pudo liberar la reserva de cuota");
  }
}

export async function removeBillingQuotaSubjectServer(input: {
  userId: string;
  metric: "customers" | "suppliers" | "products";
  subjectId: string;
}): Promise<void> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("release_billing_quota_subject", {
    p_user_id: input.userId,
    p_metric: input.metric,
    p_subject_id: input.subjectId,
    p_now: null,
  });
  if (error) throw new Error(error.message);
  if (data !== "released" && data !== "not_found") {
    throw new Error("No se pudo actualizar el cupo tras eliminar la ficha");
  }
}

export async function reconcileBillingQuotaServer(input: {
  userId: string;
  plan: PlanId;
  claims: BillingQuotaReconciliationInput;
  reference?: Date;
}): Promise<BillingQuotaSnapshot> {
  const reference = input.reference ?? new Date();
  if (input.plan !== "free") {
    return getBillingQuotaSnapshotServer(input.userId, input.plan, reference);
  }
  const admin = requireAdmin();
  const { monthKey } = billingMonthWindow(reference);
  const reconciliations: Array<{
    metric: BillingQuotaMetric;
    periodKey: string;
    subjectIds: string[];
    replaceMissing: boolean;
  }> = [
    {
      metric: "documents",
      periodKey: monthKey,
      subjectIds: input.claims.documents,
      replaceMissing: false,
    },
    {
      metric: "manual_expenses",
      periodKey: monthKey,
      subjectIds: input.claims.manualExpenses,
      replaceMissing: false,
    },
    {
      metric: "customers",
      periodKey: "lifetime",
      subjectIds: input.claims.customers,
      replaceMissing: false,
    },
    {
      metric: "suppliers",
      periodKey: "lifetime",
      subjectIds: input.claims.suppliers,
      replaceMissing: false,
    },
    {
      metric: "products",
      periodKey: "lifetime",
      subjectIds: input.claims.products,
      replaceMissing: false,
    },
  ];
  for (const reconciliation of reconciliations) {
    const { error } = await admin.rpc("reconcile_billing_quota_claims", {
      p_user_id: input.userId,
      p_metric: reconciliation.metric,
      p_period_key: reconciliation.periodKey,
      p_subject_ids: reconciliation.subjectIds,
      p_replace_missing: reconciliation.replaceMissing,
      p_now: reference.toISOString(),
    });
    if (error) throw new Error(error.message);
  }
  return getBillingQuotaSnapshotServer(input.userId, input.plan, reference);
}
