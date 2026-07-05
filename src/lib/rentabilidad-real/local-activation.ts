import { canActivateRentabilidadRealProduct } from "./access-policy";
import { getRentabilidadRealProductById } from "./catalog";
import { buildRentabilidadRealSwitchImpact } from "./module-switching";
import type {
  RentabilidadRealActivationDecision,
  RentabilidadRealCapabilityKey,
  RentabilidadRealProductId,
  RentabilidadRealSwitchImpact,
  RentabilidadRealUsageSummary,
  RentabilidadRealUserAccessContext,
} from "./types";

const ACTIVE_PRODUCTS_STORAGE_KEY = "fa_rentabilidad_real_active_products";

const PROFILE_ENGINE_PRODUCT_IDS = [
  "RR_TRADES_JOBS",
  "RR_HOURS_PROJECTS",
] as const satisfies readonly RentabilidadRealProductId[];

export const EMPTY_RENTABILIDAD_REAL_USAGE_SUMMARY: RentabilidadRealUsageSummary =
  {
    usedProductIds: [],
    usedCapabilityKeys: [],
    hasHistoricalCalculations: false,
    hasAssetsConfigured: false,
    hasAdvancedFixedCostsConfigured: false,
    hasHoursProjectsCalculations: false,
    hasJobsCalculations: false,
    hasPriceSimulatorScenarios: false,
  };

export interface RentabilidadRealLocalActivationContext {
  accessContext: RentabilidadRealUserAccessContext;
  usageSummary?: RentabilidadRealUsageSummary;
}

export interface RentabilidadRealLocalActivationResult {
  allowed: boolean;
  changed: boolean;
  previousProductIds: readonly RentabilidadRealProductId[];
  activeProductIds: readonly RentabilidadRealProductId[];
  decision?: RentabilidadRealActivationDecision;
  impact: RentabilidadRealSwitchImpact;
  message: string;
}

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function uniqueProductIds(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealProductId[] {
  return Array.from(new Set(productIds));
}

function isKnownProductId(value: unknown): value is RentabilidadRealProductId {
  return (
    typeof value === "string" &&
    Boolean(getRentabilidadRealProductById(value as RentabilidadRealProductId))
  );
}

function isProfileEngine(productId: RentabilidadRealProductId): boolean {
  return (
    PROFILE_ENGINE_PRODUCT_IDS as readonly RentabilidadRealProductId[]
  ).includes(productId);
}

function productCapabilities(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealCapabilityKey[] {
  return Array.from(
    new Set(
      productIds.flatMap(
        (productId) =>
          getRentabilidadRealProductById(productId)?.capabilities ?? [],
      ),
    ),
  );
}

function normalizeActiveProducts(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealProductId[] {
  const knownIds = uniqueProductIds(productIds).filter((productId) => {
    const product = getRentabilidadRealProductById(productId);
    return product?.status === "available";
  });
  const lastProfileEngine = [...knownIds].reverse().find(isProfileEngine);
  const withoutDuplicateEngines = knownIds.filter(
    (productId) => !isProfileEngine(productId) || productId === lastProfileEngine,
  );
  const hasNonBase = withoutDuplicateEngines.some(
    (productId) => productId !== "RR_BASE",
  );

  if (hasNonBase && !withoutDuplicateEngines.includes("RR_BASE")) {
    return ["RR_BASE", ...withoutDuplicateEngines];
  }

  return withoutDuplicateEngines;
}

function accessContextWithProducts(
  accessContext: RentabilidadRealUserAccessContext,
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealUserAccessContext {
  return {
    ...accessContext,
    activeProductIds: productIds,
    activeCapabilityKeys: productCapabilities(productIds),
  };
}

function buildResult(params: {
  allowed: boolean;
  previousProductIds: readonly RentabilidadRealProductId[];
  activeProductIds: readonly RentabilidadRealProductId[];
  usageSummary: RentabilidadRealUsageSummary;
  decision?: RentabilidadRealActivationDecision;
  message: string;
}): RentabilidadRealLocalActivationResult {
  const impact = buildRentabilidadRealSwitchImpact({
    currentProductIds: params.previousProductIds,
    nextProductIds: params.activeProductIds,
    usageSummary: params.usageSummary,
  });

  return {
    allowed: params.allowed,
    changed:
      params.previousProductIds.join("|") !== params.activeProductIds.join("|"),
    previousProductIds: params.previousProductIds,
    activeProductIds: params.activeProductIds,
    decision: params.decision,
    impact,
    message: params.message,
  };
}

export function getStoredRentabilidadRealActiveProducts(): RentabilidadRealProductId[] {
  if (!storageAvailable()) return [];

  try {
    const raw = localStorage.getItem(ACTIVE_PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeActiveProducts(parsed.filter(isKnownProductId));
  } catch {
    return [];
  }
}

export function setStoredRentabilidadRealActiveProducts(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealProductId[] {
  const normalized = normalizeActiveProducts(productIds);
  if (storageAvailable()) {
    localStorage.setItem(ACTIVE_PRODUCTS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearRentabilidadRealLocalActivationForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(ACTIVE_PRODUCTS_STORAGE_KEY);
}

export function planActivateRentabilidadRealProduct(
  productId: RentabilidadRealProductId,
  context: RentabilidadRealLocalActivationContext,
): RentabilidadRealLocalActivationResult {
  const previousProductIds = getStoredRentabilidadRealActiveProducts();
  const usageSummary =
    context.usageSummary ?? EMPTY_RENTABILIDAD_REAL_USAGE_SUMMARY;
  const decision = canActivateRentabilidadRealProduct(
    productId,
    accessContextWithProducts(context.accessContext, previousProductIds),
  );

  if (!decision.canActivate) {
    return buildResult({
      allowed: false,
      previousProductIds,
      activeProductIds: previousProductIds,
      usageSummary,
      decision,
      message: decision.message,
    });
  }

  const product = getRentabilidadRealProductById(productId);
  const withoutCurrentProfile = isProfileEngine(productId)
    ? previousProductIds.filter((id) => !isProfileEngine(id))
    : previousProductIds;
  const nextProductIds = normalizeActiveProducts([
    ...withoutCurrentProfile,
    ...(product?.productKind === "core" ? [] : ["RR_BASE" as const]),
    productId,
  ]);

  return buildResult({
    allowed: true,
    previousProductIds,
    activeProductIds: nextProductIds,
    usageSummary,
    decision,
    message: decision.message,
  });
}

export function activateRentabilidadRealProduct(
  productId: RentabilidadRealProductId,
  context: RentabilidadRealLocalActivationContext,
): RentabilidadRealLocalActivationResult {
  const result = planActivateRentabilidadRealProduct(productId, context);
  if (result.allowed) {
    setStoredRentabilidadRealActiveProducts(result.activeProductIds);
  }
  return result;
}

export function planDeactivateRentabilidadRealProduct(
  productId: RentabilidadRealProductId,
  context: RentabilidadRealLocalActivationContext,
): RentabilidadRealLocalActivationResult {
  const previousProductIds = getStoredRentabilidadRealActiveProducts();
  const usageSummary =
    context.usageSummary ?? EMPTY_RENTABILIDAD_REAL_USAGE_SUMMARY;
  const hasOtherModules = previousProductIds.some((id) => id !== "RR_BASE");

  if (productId === "RR_BASE" && hasOtherModules) {
    return buildResult({
      allowed: false,
      previousProductIds,
      activeProductIds: previousProductIds,
      usageSummary,
      message:
        "Rentabilidad Real Base debe seguir activo mientras haya otros módulos activos.",
    });
  }

  const nextProductIds = normalizeActiveProducts(
    previousProductIds.filter((id) => id !== productId),
  );

  return buildResult({
    allowed: true,
    previousProductIds,
    activeProductIds: nextProductIds,
    usageSummary,
    message: "El módulo se desactivará sin borrar datos.",
  });
}

export function deactivateRentabilidadRealProduct(
  productId: RentabilidadRealProductId,
  context: RentabilidadRealLocalActivationContext,
): RentabilidadRealLocalActivationResult {
  const result = planDeactivateRentabilidadRealProduct(productId, context);
  if (result.allowed) {
    setStoredRentabilidadRealActiveProducts(result.activeProductIds);
  }
  return result;
}

export function planSwitchRentabilidadRealProfileEngine(
  nextProductId: RentabilidadRealProductId,
  context: RentabilidadRealLocalActivationContext,
): RentabilidadRealLocalActivationResult {
  if (!isProfileEngine(nextProductId)) {
    const previousProductIds = getStoredRentabilidadRealActiveProducts();
    return buildResult({
      allowed: false,
      previousProductIds,
      activeProductIds: previousProductIds,
      usageSummary: context.usageSummary ?? EMPTY_RENTABILIDAD_REAL_USAGE_SUMMARY,
      message: "Este producto no es un motor principal de perfil.",
    });
  }

  return planActivateRentabilidadRealProduct(nextProductId, context);
}

export function switchRentabilidadRealProfileEngine(
  nextProductId: RentabilidadRealProductId,
  context: RentabilidadRealLocalActivationContext,
): RentabilidadRealLocalActivationResult {
  const result = planSwitchRentabilidadRealProfileEngine(nextProductId, context);
  if (result.allowed) {
    setStoredRentabilidadRealActiveProducts(result.activeProductIds);
  }
  return result;
}

export function getRentabilidadRealActiveCapabilityKeys(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealCapabilityKey[] {
  return productCapabilities(productIds);
}
