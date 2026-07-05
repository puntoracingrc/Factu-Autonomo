import { getRentabilidadRealProductById } from "./catalog";
import type {
  RentabilidadRealAffectedHistoricalItem,
  RentabilidadRealCapabilityKey,
  RentabilidadRealProductId,
  RentabilidadRealSwitchImpact,
  RentabilidadRealUsageSummary,
} from "./types";

export interface BuildRentabilidadRealSwitchImpactParams {
  currentProductIds: readonly RentabilidadRealProductId[];
  nextProductIds: readonly RentabilidadRealProductId[];
  usageSummary: RentabilidadRealUsageSummary;
}

const CAPABILITY_LABELS: Record<RentabilidadRealCapabilityKey, string> = {
  basic_profitability: "rentabilidad básica",
  jobs_profitability: "obras, oficios, materiales y desplazamientos",
  hours_projects_profitability: "horas, proyectos, clientes e igualas",
  fixed_costs_pro: "reparto avanzado de costes fijos",
  assets_light: "vehículo, local, herramientas, equipos y amortizaciones simples",
  price_simulator: "simulaciones de precio mínimo",
  advisor_review: "validación de configuración con gestor",
  stock_commerce: "stock y comercio",
  modules_special_regimes: "módulos y regímenes especiales",
  simple_sl: "S.L. simple",
  sl_employees_partners: "S.L. con empleados y socios",
  advanced_company: "empresa avanzada",
};

const DISABLED_CAPABILITY_MESSAGES: Record<
  RentabilidadRealCapabilityKey,
  string
> = {
  basic_profitability:
    "Dejarás de poder crear o editar cálculos básicos de rentabilidad mientras este módulo no esté activo.",
  jobs_profitability:
    "Dejarás de poder crear o editar cálculos por obras, oficios, materiales o desplazamientos mientras este módulo no esté activo.",
  hours_projects_profitability:
    "Dejarás de poder crear o editar cálculos por horas, proyectos, clientes o igualas mientras este módulo no esté activo.",
  fixed_costs_pro:
    "Dejarás de poder crear o editar repartos avanzados de costes fijos mientras este módulo no esté activo.",
  assets_light:
    "Dejarás de poder crear o editar cálculos que usen vehículo, local, herramientas o equipos mientras este módulo no esté activo.",
  price_simulator:
    "Dejarás de poder crear o editar escenarios de precio mínimo mientras este módulo no esté activo.",
  advisor_review:
    "Dejarás de poder marcar la configuración como revisada con tu gestor mientras este módulo no esté activo.",
  stock_commerce:
    "Dejarás de poder crear o editar cálculos de stock o comercio mientras este módulo no esté activo.",
  modules_special_regimes:
    "Dejarás de poder crear o editar cálculos de módulos o regímenes especiales mientras este módulo no esté activo.",
  simple_sl:
    "Dejarás de poder crear o editar cálculos de S.L. simple mientras este módulo no esté activo.",
  sl_employees_partners:
    "Dejarás de poder crear o editar cálculos de S.L. con empleados y socios mientras este módulo no esté activo.",
  advanced_company:
    "Dejarás de poder crear o editar cálculos de empresa avanzada mientras este módulo no esté activo.",
};

const REACTIVATION_MESSAGES: Record<RentabilidadRealCapabilityKey, string> = {
  basic_profitability:
    "Si vuelves a activar Rentabilidad Real Base, recuperarás el acceso a esas capacidades.",
  jobs_profitability:
    "Si vuelves a activar Rentabilidad por Obras y Oficios, recuperarás el acceso a esas capacidades.",
  hours_projects_profitability:
    "Si vuelves a activar Rentabilidad por Horas y Proyectos, recuperarás el acceso a esas capacidades.",
  fixed_costs_pro:
    "Si vuelves a activar Costes Fijos Pro, recuperarás el acceso a esas capacidades.",
  assets_light:
    "Si vuelves a activar el módulo de Vehículo, Herramientas, Local y Equipos, recuperarás el acceso a esas capacidades.",
  price_simulator:
    "Si vuelves a activar el Simulador de Precio Mínimo, recuperarás el acceso a esas capacidades.",
  advisor_review:
    "Si vuelves a activar Validar configuración con mi gestor, recuperarás el acceso a esas capacidades.",
  stock_commerce:
    "Si vuelves a activar Stock y Comercio, recuperarás el acceso a esas capacidades.",
  modules_special_regimes:
    "Si vuelves a activar Módulos y Regímenes Especiales, recuperarás el acceso a esas capacidades.",
  simple_sl:
    "Si vuelves a activar S.L. Simple, recuperarás el acceso a esas capacidades.",
  sl_employees_partners:
    "Si vuelves a activar S.L. con Empleados y Socios, recuperarás el acceso a esas capacidades.",
  advanced_company:
    "Si vuelves a activar Empresa Avanzada, recuperarás el acceso a esas capacidades.",
};

function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function productCapabilities(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealCapabilityKey[] {
  return unique(
    productIds.flatMap(
      (productId) => getRentabilidadRealProductById(productId)?.capabilities ?? [],
    ),
  );
}

function missingProductWarnings(
  productIds: readonly RentabilidadRealProductId[],
): string[] {
  return unique(productIds)
    .filter((productId) => !getRentabilidadRealProductById(productId))
    .map((productId) => `Producto desconocido en el cambio: ${productId}.`);
}

function usedCapabilitiesFromSummary(
  usageSummary: RentabilidadRealUsageSummary,
): Set<RentabilidadRealCapabilityKey> {
  const usedCapabilities = new Set<RentabilidadRealCapabilityKey>(
    usageSummary.usedCapabilityKeys,
  );

  for (const capability of productCapabilities(usageSummary.usedProductIds)) {
    usedCapabilities.add(capability);
  }

  if (usageSummary.hasAssetsConfigured) usedCapabilities.add("assets_light");
  if (usageSummary.hasAdvancedFixedCostsConfigured) {
    usedCapabilities.add("fixed_costs_pro");
  }
  if (usageSummary.hasHoursProjectsCalculations) {
    usedCapabilities.add("hours_projects_profitability");
  }
  if (usageSummary.hasJobsCalculations) {
    usedCapabilities.add("jobs_profitability");
  }
  if (usageSummary.hasPriceSimulatorScenarios) {
    usedCapabilities.add("price_simulator");
  }

  return usedCapabilities;
}

function affectedHistoricalItems(
  disabledCapabilities: readonly RentabilidadRealCapabilityKey[],
  usageSummary: RentabilidadRealUsageSummary,
): RentabilidadRealAffectedHistoricalItem[] {
  const usedCapabilities = usedCapabilitiesFromSummary(usageSummary);

  return disabledCapabilities
    .filter((capability) => usedCapabilities.has(capability))
    .map((capability) => ({
      capabilityKey: capability,
      label: CAPABILITY_LABELS[capability],
      reason: `Los datos asociados a ${CAPABILITY_LABELS[capability]} se conservarán como histórico.`,
    }));
}

function unlockMessages(
  enabledCapabilities: readonly RentabilidadRealCapabilityKey[],
): string[] {
  if (enabledCapabilities.length === 0) return [];

  if (enabledCapabilities.includes("assets_light")) {
    return [
      "Se desbloquearán nuevas capacidades relacionadas con vehículo, local, herramientas, equipos y amortizaciones simples.",
    ];
  }

  return [
    `Se desbloquearán nuevas capacidades: ${enabledCapabilities
      .map((capability) => CAPABILITY_LABELS[capability])
      .join(", ")}.`,
  ];
}

export function buildRentabilidadRealSwitchImpact({
  currentProductIds,
  nextProductIds,
  usageSummary,
}: BuildRentabilidadRealSwitchImpactParams): RentabilidadRealSwitchImpact {
  const nextProductIdSet = new Set(nextProductIds);
  const disabledProductIds = unique(
    currentProductIds.filter((productId) => !nextProductIdSet.has(productId)),
  );

  const currentCapabilities = productCapabilities(currentProductIds);
  const nextCapabilities = productCapabilities(nextProductIds);
  const nextCapabilitySet = new Set(nextCapabilities);
  const currentCapabilitySet = new Set(currentCapabilities);
  const disabledCapabilities = currentCapabilities.filter(
    (capability) => !nextCapabilitySet.has(capability),
  );
  const enabledCapabilities = nextCapabilities.filter(
    (capability) => !currentCapabilitySet.has(capability),
  );

  const affectedItems = affectedHistoricalItems(
    disabledCapabilities,
    usageSummary,
  );
  const userMessages = new Set<string>();

  if (disabledCapabilities.length > 0) {
    userMessages.add("No se borrará ningún dato.");
    for (const capability of disabledCapabilities) {
      userMessages.add(DISABLED_CAPABILITY_MESSAGES[capability]);
    }
    if (affectedItems.length > 0 || usageSummary.hasHistoricalCalculations) {
      userMessages.add(
        "Los cálculos históricos que ya usaban esos datos seguirán conservados.",
      );
    } else {
      userMessages.add(
        "Los datos ya creados se conservan; simplemente no tendrás esas capacidades activas hasta volver a añadir el módulo.",
      );
    }
    for (const capability of disabledCapabilities) {
      userMessages.add(REACTIVATION_MESSAGES[capability]);
    }
  } else if (enabledCapabilities.length > 0) {
    userMessages.add("No perderás ningún dato.");
  } else {
    userMessages.add("No se borrará ningún dato.");
  }

  for (const message of unlockMessages(enabledCapabilities)) {
    userMessages.add(message);
  }

  return {
    fromProductIds: [...currentProductIds],
    toProductIds: [...nextProductIds],
    disabledProductIds,
    disabledCapabilities,
    affectedHistoricalItems: affectedItems,
    willDeleteData: false,
    requiresConfirmation: affectedItems.length > 0,
    userMessages: [...userMessages],
    technicalWarnings: [
      ...missingProductWarnings(currentProductIds),
      ...missingProductWarnings(nextProductIds),
    ],
  };
}
