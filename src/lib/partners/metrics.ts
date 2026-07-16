import { PLANS, type PlanId } from "@/lib/billing/plans";
import {
  isPayingPartnerSubscription,
  PARTNER_PAYOUT_THRESHOLD_CENTS,
  type PartnerCommissionStatus,
  type PartnerCommissionSummary,
  type PartnerPlanCount,
} from "./contracts";

export interface PartnerSubscriptionMetricRow {
  userId: string;
  plan: unknown;
  status: unknown;
  currentPeriodEnd?: unknown;
}

export interface PartnerCommissionMetricRow {
  status: unknown;
  commissionCents: unknown;
}

const PLAN_ORDER: readonly PlanId[] = ["free", "trial", "pro", "pro_plus"];

function safeCents(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

export function buildPartnerPlanCounts(
  referredUserIds: readonly string[],
  subscriptions: readonly PartnerSubscriptionMetricRow[],
  now = new Date(),
): {
  registeredCount: number;
  payingCount: number;
  inactiveCount: number;
  planCounts: readonly PartnerPlanCount[];
} {
  const uniqueReferrals = Array.from(new Set(referredUserIds.filter(Boolean)));
  const referredSet = new Set(uniqueReferrals);
  const subscriptionByUser = new Map(
    subscriptions
      .filter((row) => referredSet.has(row.userId))
      .map((row) => [row.userId, row] as const),
  );

  const buckets = new Map<PlanId, { registered: number; paying: number }>(
    PLAN_ORDER.map((plan) => [plan, { registered: 0, paying: 0 }]),
  );
  let payingCount = 0;

  for (const userId of uniqueReferrals) {
    const subscription = subscriptionByUser.get(userId);
    const plan: PlanId =
      subscription?.plan === "trial" ||
      subscription?.plan === "pro" ||
      subscription?.plan === "pro_plus"
        ? subscription.plan
        : "free";
    const bucket = buckets.get(plan)!;
    bucket.registered += 1;
    if (subscription && isPayingPartnerSubscription(subscription, now)) {
      bucket.paying += 1;
      payingCount += 1;
    }
  }

  return {
    registeredCount: uniqueReferrals.length,
    payingCount,
    inactiveCount: uniqueReferrals.length - payingCount,
    planCounts: PLAN_ORDER.map((plan) => ({
      plan,
      label: PLANS[plan].name,
      registered: buckets.get(plan)!.registered,
      paying: buckets.get(plan)!.paying,
    })),
  };
}

export function buildPartnerCommissionSummary(
  entries: readonly PartnerCommissionMetricRow[],
  input: {
    thresholdCents?: number;
    payoutConfigured: boolean;
  },
): PartnerCommissionSummary {
  const totals: Record<PartnerCommissionStatus, number> = {
    pending: 0,
    available: 0,
    paid: 0,
    reversed: 0,
  };
  for (const entry of entries) {
    if (
      entry.status === "pending" ||
      entry.status === "available" ||
      entry.status === "paid" ||
      entry.status === "reversed"
    ) {
      totals[entry.status] += safeCents(entry.commissionCents);
    }
  }

  const thresholdCents =
    Number.isSafeInteger(input.thresholdCents) && Number(input.thresholdCents) >= 0
      ? Number(input.thresholdCents)
      : PARTNER_PAYOUT_THRESHOLD_CENTS;

  return {
    pendingCents: totals.pending,
    availableCents: totals.available,
    paidCents: totals.paid,
    reversedCents: totals.reversed,
    thresholdCents,
    eligibleForPayout:
      input.payoutConfigured && totals.available >= thresholdCents,
    automaticAccrualEnabled: false,
  };
}
