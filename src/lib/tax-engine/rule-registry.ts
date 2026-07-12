import { TaxEngineConfigurationError } from "./errors";
import { evaluateMealRule } from "./evaluators/meal";
import { evaluateVehicleRule } from "./evaluators/vehicle";
import {
  CLIENT_ATTENTION_QUESTIONS,
  DOCUMENT_TYPE_QUESTION,
  MEAL_PURPOSE_QUESTION,
  SELF_MAINTENANCE_QUESTIONS,
  SIMPLIFIED_INVOICE_QUESTION,
  VEHICLE_QUESTIONS,
} from "./questions";
import { MEAL_OFFICIAL_SOURCES, VEHICLE_OFFICIAL_SOURCES } from "./sources";
import type { RuleDefinition } from "./types";

const mealRule: RuleDefinition = {
  id: "es-common.irpf-vat.meals-hospitality",
  version: "1.0.0",
  effectiveFrom: "2018-01-01",
  supportedJurisdictions: ["ES_COMMON"],
  supportedTaxpayerTypes: ["SELF_EMPLOYED_IRPF"],
  category: "MEALS_AND_HOSPITALITY",
  canonicalConcept: "restauración y manutención",
  aliases: [
    "comida",
    "restaurante",
    "comida restaurante",
    "cena",
    "cena empresa",
    "menú",
    "menú diario",
    "cafetería",
    "bar",
    "almuerzo",
    "desayuno",
    "comida cliente",
    "comida proveedor",
    "manutención",
    "dieta",
  ],
  conditionalQuestions: [
    MEAL_PURPOSE_QUESTION,
    ...SELF_MAINTENANCE_QUESTIONS,
    ...CLIENT_ATTENTION_QUESTIONS,
    DOCUMENT_TYPE_QUESTION,
    SIMPLIFIED_INVOICE_QUESTION,
  ],
  evaluator: evaluateMealRule,
  officialSources: MEAL_OFFICIAL_SOURCES,
  legalReviewStatus: "PENDING_REVIEW",
};

const vehicleRunningCostsRule: RuleDefinition = {
  id: "es-common.irpf-vat.vehicle-running-costs",
  version: "1.0.0",
  effectiveFrom: "2018-01-01",
  supportedJurisdictions: ["ES_COMMON"],
  supportedTaxpayerTypes: ["SELF_EMPLOYED_IRPF"],
  category: "VEHICLE_RUNNING_COSTS",
  canonicalConcept: "gastos corrientes de vehículo",
  aliases: [
    "gasolina",
    "gasóleo",
    "diésel",
    "combustible",
    "repostaje",
    "estación de servicio",
    "taller",
    "taller mecánico",
    "reparación coche",
    "reparación vehículo",
    "mantenimiento vehículo",
    "neumáticos",
    "peaje",
    "parking",
    "aparcamiento",
    "lavado coche",
  ],
  conditionalQuestions: [
    ...VEHICLE_QUESTIONS,
    DOCUMENT_TYPE_QUESTION,
    SIMPLIFIED_INVOICE_QUESTION,
  ],
  evaluator: evaluateVehicleRule,
  officialSources: VEHICLE_OFFICIAL_SOURCES,
  legalReviewStatus: "PENDING_REVIEW",
};

function rangesOverlap(left: RuleDefinition, right: RuleDefinition): boolean {
  const leftEnd = left.effectiveTo ?? "9999-12-31";
  const rightEnd = right.effectiveTo ?? "9999-12-31";
  return left.effectiveFrom <= rightEnd && right.effectiveFrom <= leftEnd;
}

export function createRuleRegistry(
  definitions: readonly RuleDefinition[],
): readonly RuleDefinition[] {
  const seenVersions = new Set<string>();
  for (const definition of definitions) {
    if (definition.officialSources.length === 0) {
      throw new TaxEngineConfigurationError(
        `La regla ${definition.id}@${definition.version} no tiene fuentes oficiales.`,
      );
    }
    const executable =
      definition.legalReviewStatus !== "DRAFT" &&
      definition.legalReviewStatus !== "RETIRED";
    const unverifiedSource = definition.officialSources.find(
      (source) => source.verificationStatus !== "VERIFIED",
    );
    if (executable && unverifiedSource) {
      throw new TaxEngineConfigurationError(
        `La regla ejecutable ${definition.id}@${definition.version} usa la fuente sin verificar ${unverifiedSource.id}.`,
      );
    }
    const key = `${definition.id}@${definition.version}`;
    if (seenVersions.has(key)) {
      throw new TaxEngineConfigurationError(`Regla duplicada: ${key}.`);
    }
    seenVersions.add(key);
  }
  for (let leftIndex = 0; leftIndex < definitions.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < definitions.length;
      rightIndex += 1
    ) {
      const left = definitions[leftIndex];
      const right = definitions[rightIndex];
      if (
        left.id === right.id &&
        left.legalReviewStatus !== "RETIRED" &&
        right.legalReviewStatus !== "RETIRED" &&
        rangesOverlap(left, right)
      ) {
        throw new TaxEngineConfigurationError(
          `Versiones solapadas para la regla ${left.id}.`,
        );
      }
    }
  }
  return [...definitions].sort((left, right) =>
    left.id === right.id
      ? left.effectiveFrom.localeCompare(right.effectiveFrom)
      : left.id.localeCompare(right.id),
  );
}

export const EXPENSE_RULES = createRuleRegistry([
  mealRule,
  vehicleRunningCostsRule,
]);
