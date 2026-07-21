import type { PlanId } from "@/lib/billing/plans";

export type AdminAccessState =
  | "checking"
  | "member"
  | "admin"
  | "unavailable";

export type PricingPromotion = "free" | "pro_plus" | null;

export function resolvePricingPromotion({
  plan,
  hasUser,
  billingLoading,
  adminAccess,
}: {
  plan: PlanId;
  hasUser: boolean;
  billingLoading: boolean;
  adminAccess: AdminAccessState;
}): PricingPromotion {
  if (billingLoading) return null;
  if (!hasUser) return "free";
  if (adminAccess !== "member") return null;
  if (plan === "free") return "free";
  if (plan === "pro") return "pro_plus";
  return null;
}
