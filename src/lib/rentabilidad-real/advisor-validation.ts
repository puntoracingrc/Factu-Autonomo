import { getRentabilidadRealProductById } from "./catalog";
import type {
  RentabilidadRealProductId,
  RentabilidadRealScoringResult,
  RentabilidadRealWizardAnswers,
} from "./types";

const ADVISOR_VALIDATION_STATUS_STORAGE_KEY =
  "fa_rentabilidad_real_advisor_validation_status";

export type RentabilidadRealAdvisorValidationStatus =
  | "not_started"
  | "pending_review"
  | "validated"
  | "corrected";

export interface RentabilidadRealAdvisorValidationSummaryInput {
  answers: RentabilidadRealWizardAnswers | null;
  scoringResult: RentabilidadRealScoringResult | null;
}

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

export function getStoredRentabilidadRealAdvisorValidationStatus(): RentabilidadRealAdvisorValidationStatus {
  if (!storageAvailable()) return "not_started";
  const value = localStorage.getItem(ADVISOR_VALIDATION_STATUS_STORAGE_KEY);
  if (
    value === "pending_review" ||
    value === "validated" ||
    value === "corrected"
  ) {
    return value;
  }
  return "not_started";
}

export function setStoredRentabilidadRealAdvisorValidationStatus(
  status: RentabilidadRealAdvisorValidationStatus,
): void {
  if (!storageAvailable()) return;
  if (status === "not_started") {
    localStorage.removeItem(ADVISOR_VALIDATION_STATUS_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ADVISOR_VALIDATION_STATUS_STORAGE_KEY, status);
}

export function clearRentabilidadRealAdvisorValidationForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(ADVISOR_VALIDATION_STATUS_STORAGE_KEY);
}

function yesNo(value: boolean | undefined): string {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "Pendiente";
}

function isRentabilidadRealProductId(
  value: string,
): value is RentabilidadRealProductId {
  return Boolean(getRentabilidadRealProductById(value as RentabilidadRealProductId));
}

function productNames(ids: readonly RentabilidadRealProductId[]): string {
  const names = ids
    .filter(isRentabilidadRealProductId)
    .map((id) => getRentabilidadRealProductById(id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : "Pendiente";
}

export function buildRentabilidadRealAdvisorValidationSummary({
  answers,
  scoringResult,
}: RentabilidadRealAdvisorValidationSummaryInput): string {
  if (!answers || !scoringResult) {
    return [
      "Resumen de Rentabilidad Real",
      "",
      "Estado: test guiado pendiente.",
      "Tipo detectado: Pendiente",
      "Nivel detectado: Pendiente",
      "Productos recomendados: Pendiente",
      "Preguntas pendientes: forma jurídica, empleados, módulos, stock o comercio.",
      "",
      "Aviso: esta función no es un portal de gestoría, no presenta impuestos y no sustituye el asesoramiento profesional.",
    ].join("\n");
  }

  return [
    "Resumen de Rentabilidad Real",
    "",
    `Tipo detectado: ${scoringResult.profileLabel}`,
    `Nivel detectado: ${scoringResult.level}`,
    `Explicación: ${scoringResult.explanation}`,
    `Productos recomendados: ${productNames(scoringResult.recommendedProductIds)}`,
    `Productos opcionales: ${productNames(scoringResult.optionalProductIds)}`,
    `Forma jurídica: ${answers.legalForm ?? "Pendiente"}`,
    `Empleados en nómina: ${yesNo(answers.hasPayrollEmployees)}`,
    `Régimen de módulos: ${yesNo(answers.isInModulesRegime)}`,
    `IVA normal: ${yesNo(answers.appliesNormalVat)}`,
    `Retención en facturas: ${yesNo(answers.hasProfessionalWithholding)}`,
    `Stock o comercio: ${yesNo(
      answers.hasStockOrCommerce ?? answers.sellsProductsWithStock,
    )}`,
    `Vehículo de trabajo: ${yesNo(answers.hasWorkVehicle)}`,
    `Local, oficina o taller: ${yesNo(
      answers.hasRelevantPremises ?? answers.hasOffice ?? answers.hasWorkshop,
    )}`,
    `Herramientas o equipos relevantes: ${yesNo(
      answers.hasRelevantToolsOrEquipment,
    )}`,
    `Preguntas pendientes: ${
      scoringResult.pendingQuestions.length > 0
        ? scoringResult.pendingQuestions.join(", ")
        : "Ninguna"
    }`,
    scoringResult.outOfPhase
      ? "Advertencia: este caso queda reservado para una fase futura; no conviene activar un motor de nivel 1-4."
      : "Advertencia: el resultado orienta el motor de rentabilidad, pero no es un cálculo fiscal.",
    "",
    "Aviso: esta función no es un portal de gestoría, no presenta impuestos y no sustituye el asesoramiento profesional.",
  ].join("\n");
}
