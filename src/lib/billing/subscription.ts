import { isPaidPlan, PLANS, type PaidPlanId, type PlanId } from "./plans";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "past_due"
  | "inactive";

export interface UserSubscription {
  userId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  promotionalPlan?: PaidPlanId | null;
  promotionalPlanEndsAt?: string | null;
}

export function resolveEffectivePlan(
  subscription: UserSubscription | null,
  now = new Date(),
): PlanId {
  if (!subscription) return "free";

  const {
    plan,
    status,
    trialEndsAt,
    currentPeriodEnd,
    promotionalPlan,
    promotionalPlanEndsAt,
  } = subscription;

  if (isPaidPlan(plan) && (status === "active" || status === "trialing")) {
    if (!currentPeriodEnd || new Date(currentPeriodEnd) >= now) {
      return plan;
    }
  }

  if (
    promotionalPlan &&
    promotionalPlanEndsAt &&
    new Date(promotionalPlanEndsAt) >= now
  ) {
    return promotionalPlan;
  }

  if (plan === "trial" || status === "trialing") {
    if (trialEndsAt && new Date(trialEndsAt) >= now) {
      return "trial";
    }
    return "free";
  }

  return "free";
}

export function trialDaysRemaining(
  subscription: UserSubscription | null,
  now = new Date(),
): number | null {
  if (!subscription?.trialEndsAt) return null;
  const end = new Date(subscription.trialEndsAt);
  if (end <= now) return 0;
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function subscriptionLabel(plan: PlanId): string {
  return PLANS[plan].name;
}

export function defaultTrialEndIso(
  days = PLANS.trial.trialDays,
  from = new Date(),
): string {
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end.toISOString();
}
