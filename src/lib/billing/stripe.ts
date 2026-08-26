import Stripe from "stripe";
import { getStripePriceIds } from "./config";
import type { PaidPlanId } from "./plans";
import type { BillingQuotaPackKey } from "./quotas";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function priceIdForInterval(
  interval: "monthly" | "yearly",
): string | null {
  return priceIdForPlanInterval("pro", interval);
}

export function priceIdForPlanInterval(
  plan: PaidPlanId,
  interval: "monthly" | "yearly",
): string | null {
  const ids = getStripePriceIds();
  if (plan === "pro_plus") {
    return interval === "yearly"
      ? ids.proPlusYearly ?? null
      : ids.proPlusMonthly ?? null;
  }
  return interval === "yearly" ? ids.yearly ?? null : ids.monthly ?? null;
}

export function planFromStripePriceId(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  const ids = getStripePriceIds();
  if (priceId === ids.proPlusMonthly || priceId === ids.proPlusYearly) {
    return "pro_plus";
  }
  if (priceId === ids.monthly || priceId === ids.yearly) {
    return "pro";
  }
  return null;
}

export function scanPackPriceId(): string | null {
  return getStripePriceIds().scanPack ?? null;
}

export function quotaPackPriceId(pack: BillingQuotaPackKey): string | null {
  const ids = getStripePriceIds();
  if (pack === "documents_5") return ids.documentPack ?? null;
  if (pack === "manual_expenses_10") return ids.manualExpensePack ?? null;
  return ids.contactPack ?? null;
}
