import { isProPlusPlan, type PlanId } from "@/lib/billing/plans";
import {
  getAvailableRentabilidadRealProducts,
  getRentabilidadRealProductById,
} from "./catalog";
import type {
  RentabilidadRealAccessStatus,
  RentabilidadRealActivationDecision,
  RentabilidadRealPlanKey,
  RentabilidadRealProduct,
  RentabilidadRealProductId,
  RentabilidadRealUserAccessContext,
} from "./types";

const PRO_PLUS_INCLUDED_PRODUCT_IDS = [
  "RR_BASE",
  "RR_TRADES_JOBS",
  "RR_HOURS_PROJECTS",
  "RR_FIXED_COSTS_PRO",
  "RR_ASSETS_LIGHT",
  "RR_PRICE_SIMULATOR",
  "RR_ADVISOR_REVIEW",
] as const satisfies readonly RentabilidadRealProductId[];

export type RentabilidadRealRuntimeEnvironment =
  | "development"
  | "preview"
  | "production"
  | "test"
  | "unknown";

export type RentabilidadRealEnvLike = Record<string, string | undefined>;

export interface RentabilidadRealBillingAccessInput {
  billingEnabled: boolean;
  planKey: PlanId;
  env?: RentabilidadRealEnvLike;
  hostname?: string;
}

export interface RentabilidadRealBillingAccess {
  planKey: RentabilidadRealPlanKey;
  isProPlus: boolean;
  localProPlusFallback: boolean;
  runtimeEnvironment: RentabilidadRealRuntimeEnvironment;
}

function readRuntimeEnv(): RentabilidadRealEnvLike {
  if (typeof process === "undefined") return {};
  return process.env;
}

function readRuntimeHostname(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.hostname;
}

function normalizeHostname(hostname: string | undefined): string {
  return hostname?.trim().toLowerCase() ?? "";
}

function isLocalDevelopmentHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isKnownProductionHostname(hostname: string): boolean {
  return [
    "facturacion-autonomos.app",
    "www.facturacion-autonomos.app",
    "factu-autonomo.vercel.app",
  ].includes(hostname);
}

function isVercelPreviewHostname(hostname: string): boolean {
  return hostname.endsWith(".vercel.app") && !isKnownProductionHostname(hostname);
}

export function getRentabilidadRealRuntimeEnvironment(
  env: RentabilidadRealEnvLike = readRuntimeEnv(),
  hostname = readRuntimeHostname(),
): RentabilidadRealRuntimeEnvironment {
  if (env.NODE_ENV === "development") return "development";
  if (env.NODE_ENV === "test") return "test";

  const deployEnv =
    env.NEXT_PUBLIC_VERCEL_ENV ??
    env.VERCEL_ENV ??
    env.APP_ENV ??
    env.DEPLOY_ENV;

  if (deployEnv === "production") return "production";
  if (deployEnv === "preview" || deployEnv === "staging") return "preview";
  if (deployEnv === "development") return "development";

  const normalizedHostname = normalizeHostname(hostname);
  if (isLocalDevelopmentHostname(normalizedHostname)) return "development";
  if (isKnownProductionHostname(normalizedHostname)) return "production";
  if (isVercelPreviewHostname(normalizedHostname)) return "preview";

  if (env.NODE_ENV === "production") return "production";
  return "unknown";
}

export function shouldUseRentabilidadRealProPlusFallback({
  billingEnabled,
  env,
  hostname,
}: {
  billingEnabled: boolean;
  env?: RentabilidadRealEnvLike;
  hostname?: string;
}): boolean {
  if (billingEnabled) return false;
  const runtimeEnvironment = getRentabilidadRealRuntimeEnvironment(env, hostname);
  return (
    runtimeEnvironment === "development" ||
    runtimeEnvironment === "preview" ||
    runtimeEnvironment === "test"
  );
}

export function resolveRentabilidadRealBillingAccess({
  billingEnabled,
  planKey,
  env,
  hostname,
}: RentabilidadRealBillingAccessInput): RentabilidadRealBillingAccess {
  const runtimeEnvironment = getRentabilidadRealRuntimeEnvironment(env, hostname);
  const localProPlusFallback = shouldUseRentabilidadRealProPlusFallback({
    billingEnabled,
    env,
    hostname,
  });
  const effectivePlanKey = billingEnabled
    ? planKey
    : localProPlusFallback
      ? "pro_plus"
      : planKey;

  return {
    planKey: effectivePlanKey,
    isProPlus: billingEnabled
      ? isProPlusPlan(planKey)
      : localProPlusFallback,
    localProPlusFallback,
    runtimeEnvironment,
  };
}

export function getProPlusIncludedRentabilidadRealProductIds(): RentabilidadRealProductId[] {
  return [...PRO_PLUS_INCLUDED_PRODUCT_IDS];
}

export function isRentabilidadRealProductIncludedInProPlus(
  productId: RentabilidadRealProductId,
): boolean {
  return (
    PRO_PLUS_INCLUDED_PRODUCT_IDS as readonly RentabilidadRealProductId[]
  ).includes(productId);
}

export function getRentabilidadRealAccessStatusForProduct(
  product: RentabilidadRealProduct,
  accessContext: RentabilidadRealUserAccessContext,
): RentabilidadRealAccessStatus {
  if (product.status === "coming_soon") return "coming_soon";

  if (product.includedInProPlus && accessContext.isProPlus) {
    return "included_in_pro_plus";
  }

  if (product.status === "available" && product.includedInProPlus) {
    return "requires_pro_plus";
  }

  return "unavailable";
}

export function getAvailableProductsForAccessContext(
  accessContext: RentabilidadRealUserAccessContext,
): RentabilidadRealProduct[] {
  return getAvailableRentabilidadRealProducts().filter(
    (product) =>
      canActivateRentabilidadRealProduct(product.id, accessContext).canActivate,
  );
}

export function canActivateRentabilidadRealProduct(
  productId: RentabilidadRealProductId,
  accessContext: RentabilidadRealUserAccessContext,
): RentabilidadRealActivationDecision {
  const product = getRentabilidadRealProductById(productId);

  if (!product) {
    return {
      productId,
      accessStatus: "unavailable",
      canActivate: false,
      message: "Este módulo no está disponible.",
    };
  }

  const accessStatus = getRentabilidadRealAccessStatusForProduct(
    product,
    accessContext,
  );

  if (accessStatus === "included_in_pro_plus") {
    return {
      productId,
      accessStatus,
      canActivate: true,
      message:
        "Incluido en tu plan Pro+ IA. Puedes activarlo sin coste adicional.",
    };
  }

  if (accessStatus === "requires_pro_plus") {
    return {
      productId,
      accessStatus,
      canActivate: false,
      message:
        "Este módulo está incluido en Pro+ IA. Mejora a Pro+ para activarlo sin coste adicional.",
    };
  }

  if (accessStatus === "coming_soon") {
    return {
      productId,
      accessStatus,
      canActivate: false,
      message: "Este módulo está reservado para una fase futura.",
    };
  }

  return {
    productId,
    accessStatus,
    canActivate: false,
    message: "Este módulo no se puede activar en esta fase.",
  };
}
