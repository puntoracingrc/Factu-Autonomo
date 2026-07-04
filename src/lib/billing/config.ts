export function isBillingEnforced(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

export function getStripePriceIds(): {
  monthly: string | undefined;
  yearly: string | undefined;
  proPlusMonthly: string | undefined;
  proPlusYearly: string | undefined;
  scanPack: string | undefined;
} {
  return {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_YEARLY,
    proPlusMonthly: process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY,
    proPlusYearly: process.env.STRIPE_PRICE_PRO_PLUS_YEARLY,
    scanPack: process.env.STRIPE_PRICE_SCAN_PACK,
  };
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
