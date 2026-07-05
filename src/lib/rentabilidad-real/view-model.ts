import {
  getAvailableRentabilidadRealProducts,
  getRentabilidadRealAddonProductIds,
  getRentabilidadRealCalculationModeProductIds,
  getComingSoonRentabilidadRealProducts,
  getRentabilidadRealProductById,
} from "./catalog";
import {
  canActivateRentabilidadRealProduct,
  getRentabilidadRealAccessStatusForProduct,
} from "./access-policy";
import type {
  RentabilidadRealAccessStatus,
  RentabilidadRealProduct,
  RentabilidadRealProductId,
  RentabilidadRealScoringResult,
  RentabilidadRealUserAccessContext,
} from "./types";

function productsByIds(
  ids: readonly RentabilidadRealProductId[],
): RentabilidadRealProduct[] {
  return ids
    .map((id) => getRentabilidadRealProductById(id))
    .filter((product): product is RentabilidadRealProduct => Boolean(product));
}

const DEFAULT_ACCESS_CONTEXT: RentabilidadRealUserAccessContext = {
  planKey: "free",
  isProPlus: false,
  activeProductIds: [],
  activeCapabilityKeys: [],
};

export interface RentabilidadRealMarketplaceProductViewModel {
  product: RentabilidadRealProduct;
  accessStatus: RentabilidadRealAccessStatus;
  badgeLabel: string;
  ctaLabel: string;
  canActivate: boolean;
  isActive: boolean;
  isIncludedInCurrentPlan: boolean;
  commercialAccessNote: string;
}

function badgeLabelForAccessStatus(
  accessStatus: RentabilidadRealAccessStatus,
): string {
  if (accessStatus === "included_in_pro_plus") return "Incluido en Pro+";
  if (accessStatus === "requires_pro_plus") return "Requiere Pro+";
  if (accessStatus === "coming_soon") return "Próximamente";
  if (accessStatus === "decision_pending") {
    return "Decisión comercial pendiente";
  }
  if (accessStatus === "paid_addon") return "Extra de pago";
  return "No disponible";
}

function ctaLabelForAccessStatus(
  accessStatus: RentabilidadRealAccessStatus,
): string {
  if (accessStatus === "included_in_pro_plus") return "Activar incluido";
  if (accessStatus === "requires_pro_plus") return "Mejorar a Pro+";
  if (accessStatus === "coming_soon") return "Próximamente";
  if (accessStatus === "decision_pending") return "Pendiente";
  if (accessStatus === "paid_addon") return "Ver extra";
  return "No disponible";
}

function buildMarketplaceProductViewModel(
  product: RentabilidadRealProduct,
  accessContext: RentabilidadRealUserAccessContext,
): RentabilidadRealMarketplaceProductViewModel {
  const isActive = accessContext.activeProductIds.includes(product.id);
  const accessStatus = getRentabilidadRealAccessStatusForProduct(
    product,
    accessContext,
  );
  const activationDecision = canActivateRentabilidadRealProduct(
    product.id,
    accessContext,
  );

  return {
    product,
    accessStatus,
    badgeLabel: isActive ? "Activo" : badgeLabelForAccessStatus(accessStatus),
    ctaLabel: isActive
      ? product.id === "RR_PRICE_SIMULATOR"
        ? "Abrir simulador"
        : "Desactivar"
      : ctaLabelForAccessStatus(accessStatus),
    canActivate: activationDecision.canActivate,
    isActive,
    isIncludedInCurrentPlan: accessStatus === "included_in_pro_plus",
    commercialAccessNote: product.commercialAccessNote,
  };
}

export function buildMarketplaceViewModel(
  accessContext: RentabilidadRealUserAccessContext = DEFAULT_ACCESS_CONTEXT,
) {
  return {
    availableProducts: getAvailableRentabilidadRealProducts().map((product) =>
      buildMarketplaceProductViewModel(product, accessContext),
    ),
    comingSoonProducts: getComingSoonRentabilidadRealProducts().map((product) =>
      buildMarketplaceProductViewModel(product, accessContext),
    ),
    activeCalculationModes: getRentabilidadRealCalculationModeProductIds(
      accessContext.activeProductIds,
    ),
    activeAddons: getRentabilidadRealAddonProductIds(
      accessContext.activeProductIds,
    ),
  };
}

export function buildTestResultViewModel(
  scoringResult: RentabilidadRealScoringResult,
) {
  return {
    scoringResult,
    availableProducts: getAvailableRentabilidadRealProducts(),
    comingSoonProducts: getComingSoonRentabilidadRealProducts(),
    recommendedProducts: productsByIds(scoringResult.recommendedProductIds),
    recommendedCalculationModeProducts: productsByIds(
      scoringResult.recommendedCalculationModes,
    ),
    recommendedAddonProducts: productsByIds(scoringResult.recommendedAddons),
    optionalProducts: productsByIds(scoringResult.optionalProductIds),
    unavailableProducts: productsByIds(scoringResult.unavailableProductIds),
  };
}
