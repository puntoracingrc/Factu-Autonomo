import {
  MEAL_OFFICIAL_SOURCES,
  OFFICIAL_SOURCES,
  VEHICLE_OFFICIAL_SOURCES,
} from "@/lib/tax-engine/sources";
import type {
  ExpenseInput,
  OfficialSource,
  RuleCategory,
  TaxContext,
} from "@/lib/tax-engine/types";
import { normalizeConcept } from "@/lib/tax-engine/normalizers";

export interface FiscalAiLegalFragment {
  id: string;
  sourceId: string;
  authority: "BOE" | "AEAT" | "DGT";
  legalReference: string;
  verifiedSummary: string;
  verificationStatus: "VERIFIED";
}

export interface FiscalAiExpenseContext {
  concept: string;
  paymentMethod: ExpenseInput["paymentMethod"];
  invoiceType: ExpenseInput["invoiceType"];
}

export interface FiscalAiTaxContext {
  jurisdiction: TaxContext["jurisdiction"];
  taxpayerType: TaxContext["taxpayerType"];
  directTaxRegime: TaxContext["directTaxRegime"];
  vatRegime: TaxContext["vatRegime"];
  hasFullVatDeductionRight: boolean;
  fiscalYear: number;
}

export interface FiscalAiContext {
  expense: FiscalAiExpenseContext;
  tax: FiscalAiTaxContext;
  legalContextMode: "VERIFIED_SUMMARIES_REVIEW_ONLY";
  legalFragments: readonly FiscalAiLegalFragment[];
}

const SAFE_AUTHORITIES = new Set(["BOE", "AEAT", "DGT"]);
const SECRET_PATTERN = /\b(?:sk|pk|rk|key)[-_][a-z0-9_-]{8,}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]){11,30}\b/gi;
const TAX_ID_PATTERN = /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/gi;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const PHONE_PATTERN = /(?:\+?34[\s.-]*)?(?:\d[\s.-]*){9,}/g;
const ADDRESS_PATTERN = /\b(?:calle|c\/|avenida|avda\.?|plaza|paseo|carretera)\s+[^;\n]{2,120}/gi;
const NUMBER_PATTERN = /\b\d{2,}\b/g;
const SAFE_CONCEPT_TOKENS = new Set([
  "alquiler",
  "alojamiento",
  "aparcamiento",
  "asesoria",
  "autopista",
  "banco",
  "catering",
  "cena",
  "cliente",
  "coche",
  "comida",
  "comision",
  "combustible",
  "consultoria",
  "curso",
  "desayuno",
  "diesel",
  "dominio",
  "electricidad",
  "equipo",
  "formacion",
  "furgoneta",
  "gasolina",
  "gasoil",
  "hosteleria",
  "hotel",
  "internet",
  "lavado",
  "licencia",
  "mantenimiento",
  "manutencion",
  "marketing",
  "material",
  "mensajeria",
  "neumaticos",
  "oficina",
  "parking",
  "peaje",
  "profesional",
  "proveedor",
  "publicidad",
  "reparacion",
  "restaurante",
  "restauracion",
  "seguro",
  "servicio",
  "software",
  "suscripcion",
  "taller",
  "taxi",
  "telefono",
  "transporte",
  "vehiculo",
  "viaje",
  "web",
]);

export function containsSensitiveFiscalText(value: string): boolean {
  return [
    SECRET_PATTERN,
    EMAIL_PATTERN,
    IBAN_PATTERN,
    TAX_ID_PATTERN,
    URL_PATTERN,
    PHONE_PATTERN,
    ADDRESS_PATTERN,
    NUMBER_PATTERN,
  ].some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function redactFiscalConcept(value: string): string {
  const redacted = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(SECRET_PATTERN, "[SECRETO OMITIDO]")
    .replace(EMAIL_PATTERN, "[EMAIL OMITIDO]")
    .replace(IBAN_PATTERN, "[IBAN OMITIDO]")
    .replace(TAX_ID_PATTERN, "[NIF OMITIDO]")
    .replace(URL_PATTERN, "[URL OMITIDA]")
    .replace(PHONE_PATTERN, "[TELÉFONO OMITIDO]")
    .replace(ADDRESS_PATTERN, "[DIRECCIÓN OMITIDA]")
    .replace(NUMBER_PATTERN, "[NÚMERO OMITIDO]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return redacted || "[CONCEPTO OMITIDO]";
}

export function minimizeFiscalConcept(value: string): string {
  const redacted = redactFiscalConcept(value);
  const safeTokens = normalizeConcept(redacted).tokens.filter((token) =>
    SAFE_CONCEPT_TOKENS.has(token),
  );
  return safeTokens.length > 0
    ? [...new Set(safeTokens)].slice(0, 12).join(" ")
    : "[CONCEPTO NO COMPARTIDO]";
}

function isVerifiedOfficialSource(
  source: OfficialSource,
): source is OfficialSource & { verificationStatus: "VERIFIED" } {
  return (
    source.verificationStatus === "VERIFIED" &&
    SAFE_AUTHORITIES.has(source.authority)
  );
}

export function verifiedFiscalAiSources(): readonly (
  OfficialSource & { verificationStatus: "VERIFIED" }
)[] {
  const registeredSources: readonly OfficialSource[] = Object.values(
    OFFICIAL_SOURCES,
  );
  return registeredSources.filter(isVerifiedOfficialSource);
}

export function allowedSourceIdsForCategory(
  category: RuleCategory,
): ReadonlySet<string> {
  const categorySources =
    category === "MEALS_AND_HOSPITALITY"
      ? MEAL_OFFICIAL_SOURCES
      : VEHICLE_OFFICIAL_SOURCES;
  return new Set(
    categorySources
      .filter(isVerifiedOfficialSource)
      .map((source) => source.id),
  );
}

export function buildFiscalAiContext(
  input: ExpenseInput,
  context: TaxContext,
): FiscalAiContext {
  const legalFragments = verifiedFiscalAiSources().map((source) => ({
    id: `${source.id}:verified-summary:v1`,
    sourceId: source.id,
    authority: source.authority,
    legalReference: source.legalReference,
    verifiedSummary: source.notes,
    verificationStatus: "VERIFIED" as const,
  }));

  return {
    expense: {
      concept: minimizeFiscalConcept(input.concept),
      paymentMethod: input.paymentMethod,
      invoiceType: input.invoiceType,
    },
    tax: {
      jurisdiction: context.jurisdiction,
      taxpayerType: context.taxpayerType,
      directTaxRegime: context.directTaxRegime,
      vatRegime: context.vatRegime,
      hasFullVatDeductionRight: context.hasFullVatDeductionRight,
      fiscalYear: context.fiscalYear,
    },
    legalContextMode: "VERIFIED_SUMMARIES_REVIEW_ONLY",
    legalFragments,
  };
}
