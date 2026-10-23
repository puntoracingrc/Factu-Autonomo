export interface QuickStripeConfig {
  companyId: string;
  accountId: string;
  secretKey: string;
  webhookSecret: string;
  origin: string;
  livemode: boolean;
}

export function quickStripeConfig(env: Readonly<Record<string, string | undefined>> = process.env, allowDisabled = false): QuickStripeConfig | null {
  if (!allowDisabled && env.QUICK_STRIPE_ENABLED !== "true") return null;
  const companyId = env.QUICK_STRIPE_COMPANY_ID ?? "";
  const accountId = env.QUICK_STRIPE_ACCOUNT_ID ?? "";
  const secretKey = env.QUICK_STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY || "";
  const webhookSecret = env.QUICK_STRIPE_WEBHOOK_SECRET ?? "";
  const mode = env.QUICK_STRIPE_MODE;
  if (!/^[0-9a-f-]{36}$/i.test(companyId) || !/^acct_[A-Za-z0-9]+$/.test(accountId)
    || !webhookSecret.startsWith("whsec_") || (mode !== "test" && mode !== "live")
    || !new RegExp(`^(sk|rk)_${mode}_`).test(secretKey)
    || (mode === "live" && env.VERCEL_ENV && env.VERCEL_ENV !== "production")) return null;
  try {
    const url = new URL(env.QUICK_STRIPE_RETURN_ORIGIN || "https://fast.facturacion-autonomos.app");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash
      || (url.protocol !== "https:" && !(mode === "test" && local && url.protocol === "http:"))
      || (mode === "live" && local)) return null;
    return { companyId, accountId, secretKey, webhookSecret, origin: url.origin, livemode: mode === "live" };
  } catch { return null; }
}
