import {
  resolveProductModuleAccess,
  type ProductModuleAccessDecision,
  type ProductModuleEntitlementSource,
} from "@/lib/product-modules";

export const CONSULTOR_FISCAL_FLAG =
  "NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED" as const;

export function resolveConsultorFiscalFlag(env: {
  configured: string | undefined;
  nodeEnv: string | undefined;
}): boolean {
  const { configured } = env;
  if (configured !== undefined) return configured === "true";

  return env.nodeEnv !== "production";
}

export function isConsultorFiscalEnabled(): boolean {
  return resolveConsultorFiscalModuleAccess({
    configured: process.env.NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED,
    nodeEnv: process.env.NODE_ENV,
  }).usable;
}

export function resolveConsultorFiscalModuleAccess({
  configured,
  nodeEnv,
  activated = true,
  entitlementSource = "beta_access",
}: {
  configured: string | undefined;
  nodeEnv: string | undefined;
  activated?: boolean;
  entitlementSource?: ProductModuleEntitlementSource;
}): ProductModuleAccessDecision {
  return resolveProductModuleAccess({
    releaseEnabled: resolveConsultorFiscalFlag({ configured, nodeEnv }),
    activated,
    entitlementSource,
  });
}
