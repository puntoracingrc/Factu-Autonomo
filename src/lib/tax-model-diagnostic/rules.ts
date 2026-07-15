import type {
  TaxModelNumber,
  TaxRule,
  TaxRuleReviewStatus,
} from "./contracts";
import { TAX_MODEL_CATALOG } from "./model-catalog";
import { hasOfficialSource } from "./sources";

const VERIFIED_AT = "2026-07-15";

interface RuleBlueprint {
  modelNumber: TaxModelNumber;
  conditions: readonly string[];
  exclusions: readonly string[];
  result: string;
  officialSourceIds: readonly string[];
}

const BLUEPRINTS: readonly RuleBlueprint[] = [
  { modelNumber: "035", conditions: ["Alta, modificación o baja en un régimen OSS/IOSS"], exclusions: ["No existe alta, modificación ni baja en el régimen"], result: "Revisar comunicación censal OSS/IOSS", officialSourceIds: ["aeat.model-035.procedure", "aeat.model-369.periodicity"] },
  { modelNumber: "036", conditions: ["Alta, baja o modificación censal", "Inicio de operaciones intracomunitarias o cambio de obligación"], exclusions: ["No se ha producido ningún cambio censal"], result: "Declaración censal por evento y fecha de efecto", officialSourceIds: ["aeat.model-036.modification", "aeat.roi-intraeu"] },
  { modelNumber: "100", conditions: ["Persona física contribuyente por IRPF", "Alta en RETA en cualquier momento del ejercicio u otra causa de obligación"], exclusions: ["El sujeto analizado es solo una entidad y no se analiza a una persona"], result: "Declaración anual personal", officialSourceIds: ["boe.irpf-law.article-96", "aeat.renta-2025.obligation"] },
  { modelNumber: "111", conditions: ["Pago de rendimientos de trabajo o actividades económicas sujetos a retención"], exclusions: ["No se satisfizo ninguna renta comprendida"], result: "Autoliquidación de retenciones del pagador", officialSourceIds: ["aeat.withholding.111-190"] },
  { modelNumber: "115", conditions: ["Pago de alquiler o subarrendamiento urbano sujeto a retención"], exclusions: ["Exoneración u otra excepción acreditada"], result: "Autoliquidación de retenciones por alquiler", officialSourceIds: ["aeat.withholding.115-180"] },
  { modelNumber: "123", conditions: ["Pago de determinados rendimientos del capital mobiliario sujeto a retención"], exclusions: ["Renta encuadrada en otro modelo específico"], result: "Autoliquidación de retenciones del capital", officialSourceIds: ["aeat.withholding.123-193"] },
  { modelNumber: "130", conditions: ["Persona física o miembro de entidad en atribución en estimación directa"], exclusions: ["Estimación objetiva", "Excepción del 70 % aplicable a la clase de actividad"], result: "Pago fraccionado de IRPF en estimación directa", officialSourceIds: ["aeat.model-130.instructions", "aeat.irpf.installment-payments"] },
  { modelNumber: "131", conditions: ["Persona física o miembro de entidad en atribución en estimación objetiva"], exclusions: ["Estimación directa", "Excepción del 70 % agraria, ganadera o forestal cuando proceda"], result: "Pago fraccionado de IRPF en estimación objetiva", officialSourceIds: ["aeat.model-131.instructions", "aeat.irpf.installment-payments"] },
  { modelNumber: "180", conditions: ["Retenciones por alquiler declarables durante el ejercicio"], exclusions: ["No hubo rentas sujetas al resumen"], result: "Resumen anual de retenciones por alquiler", officialSourceIds: ["aeat.withholding.115-180"] },
  { modelNumber: "184", conditions: ["Entidad en atribución con actividad económica o rentas por encima del umbral"], exclusions: ["La entidad no está en atribución o concurre una excepción"], result: "Declaración informativa anual de la entidad", officialSourceIds: ["aeat.model-184.obligations"] },
  { modelNumber: "190", conditions: ["Retenciones de trabajo o actividades económicas durante el ejercicio"], exclusions: ["No hubo rentas comprendidas"], result: "Resumen anual del retenedor", officialSourceIds: ["aeat.withholding.111-190"] },
  { modelNumber: "193", conditions: ["Rendimientos del capital declarados por el retenedor"], exclusions: ["Renta atribuida a los modelos 188, 194 o 196 u otro específico"], result: "Resumen anual de determinadas rentas del capital", officialSourceIds: ["aeat.withholding.123-193"] },
  { modelNumber: "200", conditions: ["El sujeto que factura es contribuyente del Impuesto sobre Sociedades"], exclusions: ["La actividad factura exclusivamente como persona física o entidad en atribución", "Excepción legal de entidad parcialmente exenta debidamente comprobada"], result: "Declaración anual de la sociedad", officialSourceIds: ["aeat.is.model-200.obligation"] },
  { modelNumber: "202", conditions: ["Contribuyente del Impuesto sobre Sociedades obligado a pagos fraccionados"], exclusions: ["Excepción legal o ausencia de obligación de presentar"], result: "Pago fraccionado de la sociedad", officialSourceIds: ["aeat.is.installments"] },
  { modelNumber: "216", conditions: ["Pago de renta a no residente comprendida en la obligación del retenedor"], exclusions: ["Pago extranjero no sujeto a IRNR o encuadrado en otro modelo"], result: "Autoliquidación de retenciones de no residentes", officialSourceIds: ["aeat.irnr.withholding"] },
  { modelNumber: "296", conditions: ["Rentas de no residentes comprendidas en el resumen anual"], exclusions: ["No hubo rentas declarables o corresponde otro resumen"], result: "Resumen anual de no residentes", officialSourceIds: ["aeat.irnr.withholding"] },
  { modelNumber: "303", conditions: ["Sujeto con autoliquidación periódica de IVA"], exclusions: ["Solo operaciones exentas/no sujetas sin obligación periódica", "Solo recargo de equivalencia o régimen agrario sin otro hecho"], result: "Autoliquidación periódica de IVA", officialSourceIds: ["aeat.model-303.instructions-2026"] },
  { modelNumber: "308", conditions: ["Supuesto específico de devolución previsto por la normativa"], exclusions: ["Mera existencia de cuotas de IVA o resultado a devolver del 303"], result: "Solicitud especial de devolución a revisar", officialSourceIds: ["aeat.model-308.procedure"] },
  { modelNumber: "309", conditions: ["Sujeto sin autoliquidación periódica que realiza una operación no periódica declarable"], exclusions: ["La operación ya se liquida en 303"], result: "Autoliquidación no periódica de IVA", officialSourceIds: ["aeat.model-309.instructions", "aeat.roi-intraeu"] },
  { modelNumber: "341", conditions: ["Reintegro de compensaciones en el régimen agrario"], exclusions: ["No existe el supuesto especial"], result: "Declaración especial a revisar", officialSourceIds: ["aeat.model-341.instructions"] },
  { modelNumber: "347", conditions: ["Operaciones por tercero por encima del umbral versionado"], exclusions: ["Operaciones excluidas", "SII durante todo el ejercicio u otra exclusión del sujeto"], result: "Declaración informativa anual de terceros", officialSourceIds: ["aeat.model-347.exclusions"] },
  { modelNumber: "349", conditions: ["Operaciones intracomunitarias comprendidas realizadas en el período"], exclusions: ["Alta en ROI sin operaciones", "Operaciones excluidas del concepto informable"], result: "Declaración recapitulativa con periodicidad mensual o trimestral por confirmar", officialSourceIds: ["aeat.roi-intraeu", "aeat.model-349.periodicity"] },
  { modelNumber: "369", conditions: ["Alta efectiva en un régimen OSS/IOSS, incluso en períodos sin operaciones"], exclusions: ["No existe adhesión al régimen ni operación comprendida"], result: "Declaración periódica del régimen de ventanilla única", officialSourceIds: ["aeat.model-369.procedure", "aeat.model-369.periodicity"] },
  { modelNumber: "390", conditions: ["Autoliquidaciones periódicas de IVA y ausencia de exoneración"], exclusions: ["Exoneración del resumen anual aplicable al ejercicio"], result: "Resumen anual de IVA", officialSourceIds: ["aeat.model-390.procedure", "aeat.model-390.exemptions"] },
  { modelNumber: "714", conditions: ["Circunstancias patrimoniales que superan las reglas autonómicas y estatales"], exclusions: ["No se alcanza obligación según residencia y ejercicio"], result: "Revisión personal del Impuesto sobre el Patrimonio", officialSourceIds: ["aeat.wealth.obligation"] },
  { modelNumber: "720", conditions: ["Bienes o derechos en el extranjero dentro de categorías y límites informativos"], exclusions: ["No se alcanzan umbrales o concurre una exclusión"], result: "Revisión personal de información de bienes en el extranjero", officialSourceIds: ["aeat.model-720.frequency"] },
  { modelNumber: "721", conditions: ["Monedas virtuales custodiadas en el extranjero dentro de la obligación"], exclusions: ["No existe custodia extranjera o no se alcanza la obligación"], result: "Revisión personal de monedas virtuales en el extranjero", officialSourceIds: ["aeat.model-721.faq"] },
] as const;

const YEARS = [2025, 2026] as const;

function ruleTests(modelNumber: TaxModelNumber, fiscalYear: 2025 | 2026) {
  const prefix = `${modelNumber}.${fiscalYear}`;
  return [
    `${prefix}.positive`,
    `${prefix}.negative`,
    `${prefix}.exception`,
    `${prefix}.incomplete`,
    `${prefix}.census-mismatch`,
    `${prefix}.year-boundary`,
  ] as const;
}

export const TAX_RULES: readonly TaxRule[] = YEARS.flatMap((fiscalYear) =>
  BLUEPRINTS.map((blueprint) => ({
    ruleId: `es-common.${fiscalYear}.model-${blueprint.modelNumber}`,
    version: `es-common.${fiscalYear}.2026-07-15.v2`,
    fiscalYear,
    territory: "ES_COMMON" as const,
    effectiveFrom: `${fiscalYear}-01-01`,
    effectiveTo: `${fiscalYear}-12-31`,
    modelNumber: blueprint.modelNumber,
    conditions: blueprint.conditions,
    exclusions: blueprint.exclusions,
    result: blueprint.result,
    officialSourceIds: blueprint.officialSourceIds,
    lastVerifiedAt: VERIFIED_AT,
    reviewedBy: "fiscal-review-pending",
    reviewStatus: "PENDING_FISCAL_REVIEW" as const,
    tests: ruleTests(blueprint.modelNumber, fiscalYear),
  })),
);

const RULE_BY_YEAR_AND_MODEL = new Map(
  TAX_RULES.map((rule) => [`${rule.fiscalYear}:${rule.modelNumber}`, rule]),
);

export function getTaxRule(
  fiscalYear: 2025 | 2026,
  modelNumber: TaxModelNumber,
): TaxRule {
  const rule = RULE_BY_YEAR_AND_MODEL.get(`${fiscalYear}:${modelNumber}`);
  if (!rule) {
    throw new Error(`No existe regla para ${modelNumber} en ${fiscalYear}`);
  }
  return rule;
}

export function taxRuleSetVersion(fiscalYear: 2025 | 2026): string {
  return `es-common.${fiscalYear}.2026-07-15.v2`;
}

export function taxRuleSetReviewState(
  fiscalYear: 2025 | 2026,
): Extract<TaxRuleReviewStatus, "PENDING_FISCAL_REVIEW" | "APPROVED"> {
  const rules = TAX_RULES.filter((rule) => rule.fiscalYear === fiscalYear);
  return rules.length === TAX_MODEL_CATALOG.length &&
    rules.every((rule) => rule.reviewStatus === "APPROVED")
    ? "APPROVED"
    : "PENDING_FISCAL_REVIEW";
}

export function validateTaxRuleRegistry(
  rules: readonly TaxRule[] = TAX_RULES,
): string[] {
  const errors: string[] = [];
  const catalog = new Set(TAX_MODEL_CATALOG.map((entry) => entry.modelNumber));
  const ids = new Set<string>();
  for (const rule of rules) {
    if (ids.has(rule.ruleId)) errors.push(`${rule.ruleId}: identificador duplicado`);
    ids.add(rule.ruleId);
    if (!rule.fiscalYear) errors.push(`${rule.ruleId}: falta ejercicio`);
    if (rule.territory !== "ES_COMMON") errors.push(`${rule.ruleId}: territorio inválido`);
    if (!catalog.has(rule.modelNumber)) errors.push(`${rule.ruleId}: modelo inexistente`);
    if (!rule.effectiveFrom) errors.push(`${rule.ruleId}: falta fecha de vigencia`);
    if (!rule.lastVerifiedAt) errors.push(`${rule.ruleId}: falta verificación`);
    if (rule.tests.length < 6) errors.push(`${rule.ruleId}: casos de prueba insuficientes`);
    if (rule.officialSourceIds.length === 0) errors.push(`${rule.ruleId}: falta fuente oficial`);
    for (const sourceId of rule.officialSourceIds) {
      if (!hasOfficialSource(sourceId)) errors.push(`${rule.ruleId}: fuente desconocida ${sourceId}`);
    }
    if (rule.conditions.some((condition) => rule.exclusions.includes(condition))) {
      errors.push(`${rule.ruleId}: condición y exclusión contradictorias`);
    }
  }
  return errors;
}
