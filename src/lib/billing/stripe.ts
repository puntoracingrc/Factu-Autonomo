import Stripe from "stripe";
import { getStripePriceIds } from "./config";

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
  const ids = getStripePriceIds();
  return interval === "yearly" ? ids.yearly ?? null : ids.monthly ?? null;
}

export function scanPackPriceId(): string | null {
  return getStripePriceIds().scanPack ?? null;
}
