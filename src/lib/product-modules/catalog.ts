import type { ProductModuleDefinition, ProductModuleId } from "./types";

const PRODUCT_MODULES = [
  {
    id: "consultor_fiscal",
    slug: "consultor-fiscal",
    name: "Consultor fiscal",
    shortDescription:
      "Analiza de forma orientativa la deducibilidad de gastos con reglas fiscales auditables.",
    route: "/consultor-fiscal",
    lifecycleStatus: "beta",
    commercialAssignment: "unassigned",
    supportedCommercialOptions: ["standalone_purchase", "plan_inclusion"],
    includedPlanIds: [],
  },
] as const satisfies readonly ProductModuleDefinition[];

export function getProductModules(): readonly ProductModuleDefinition[] {
  return PRODUCT_MODULES;
}

export function getProductModuleById(
  moduleId: ProductModuleId,
): ProductModuleDefinition | undefined {
  return PRODUCT_MODULES.find((module) => module.id === moduleId);
}
