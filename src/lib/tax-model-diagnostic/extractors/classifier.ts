import {
  detectAeatCensusScreenshotKind,
  parseAeatTaxFormText,
  parseCensusCertificateText,
  parseSupportingDocumentText,
} from "@/lib/fiscal-profile";
import type {
  DocumentAuthority,
  FiscalDocumentType,
  TaxDocumentModelCode,
} from "./contracts";
import { getExtractorDefinition, type ExtractorDefinition } from "./registry";

export const FISCAL_DOCUMENT_CLASSIFIER_VERSION =
  "fiscal-document-classifier.2026-07.v2" as const;

export interface DocumentClassification {
  classifierVersion: typeof FISCAL_DOCUMENT_CLASSIFIER_VERSION;
  status: "RESOLVED" | "MANUAL_REVIEW" | "BLOCKED";
  authority: DocumentAuthority;
  documentType: FiscalDocumentType | null;
  model: TaxDocumentModelCode | null;
  definition: ExtractorDefinition | null;
  confidence: number;
  warnings: readonly string[];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function resolved(
  documentType: FiscalDocumentType,
  confidence: number,
  warnings: readonly string[] = [],
): DocumentClassification {
  const definition = getExtractorDefinition(documentType) ?? null;
  return {
    classifierVersion: FISCAL_DOCUMENT_CLASSIFIER_VERSION,
    status: definition ? "RESOLVED" : "MANUAL_REVIEW",
    authority: definition?.authority ?? "UNKNOWN",
    documentType,
    model: definition?.model ?? null,
    definition,
    confidence,
    warnings,
  };
}

function blocked(
  authority: DocumentAuthority,
  warning: string,
): DocumentClassification {
  return {
    classifierVersion: FISCAL_DOCUMENT_CLASSIFIER_VERSION,
    status: "BLOCKED",
    authority,
    documentType: null,
    model: null,
    definition: null,
    confidence: 0,
    warnings: [warning],
  };
}

const SUPPORTING_TYPE_MAP = {
  RETA_CURRENT_STATUS_REPORT: "TGSS_CURRENT_STATUS_REPORT",
  WORK_LIFE_REPORT: "TGSS_EMPLOYMENT_HISTORY",
  SELF_EMPLOYED_ACTIVITY_REPORT: "TGSS_SELF_EMPLOYED_ACTIVITIES",
  INTRACOMMUNITY_OPERATOR_CERTIFICATE: "ROI_CERTIFICATE",
  LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE:
    "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
} as const satisfies Record<string, FiscalDocumentType>;

/**
 * Clasificador cerrado. Prioriza vistas actuales inequívocas para evitar que
 * el texto auxiliar "Modelo 036" de una pantalla de actividad se confunda con
 * una declaración censal presentada.
 */
export function classifyFiscalDocumentText(
  text: string,
): DocumentClassification {
  const bounded = text.slice(0, 250_000);
  const normalized = normalize(bounded);
  if (!normalized) {
    return blocked("UNKNOWN", "El archivo no contiene texto legible.");
  }

  if (
    /HACIENDA FORAL|DIPUTACION FORAL|NAFARROAKO FORU OGASUNA/.test(normalized)
  ) {
    return blocked(
      "FORAL",
      "El documento pertenece a una autoridad foral y no se procesará como AEAT.",
    );
  }
  if (
    /AGENCIA TRIBUTARIA CANARIA|GOBIERNO DE CANARIAS/.test(normalized) &&
    !normalized.includes("AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA")
  ) {
    return blocked(
      "CANARY_TAX_AUTHORITY",
      "El documento pertenece a la Administración Tributaria Canaria y necesita un extractor territorial propio.",
    );
  }

  const screenshotKind = detectAeatCensusScreenshotKind(bounded);
  if (screenshotKind === "ACTIVITIES") {
    return resolved("AEAT_ECONOMIC_ACTIVITIES_VIEW", 0.96);
  }

  const census = parseCensusCertificateText(bounded);
  if (census.documentKind === "AEAT_CENSUS_CERTIFICATE") {
    return resolved("CURRENT_CENSUS_CERTIFICATE", 0.96, census.warnings);
  }
  if (census.documentKind === "MODEL_036") {
    return resolved("MODEL_036", 0.9, census.warnings);
  }
  if (census.documentKind === "MODEL_037") {
    return resolved("MODEL_037", 0.9, census.warnings);
  }

  const taxForm = parseAeatTaxFormText(bounded);
  if (taxForm.modelCode !== "UNKNOWN") {
    return resolved(
      `MODEL_${taxForm.modelCode}`,
      taxForm.status === "RESOLVED" ? 0.95 : 0.82,
      taxForm.warnings,
    );
  }

  if (screenshotKind === "TAX_STATUS") {
    return resolved("AEAT_TAX_STATUS_VIEW", 0.96);
  }
  if (screenshotKind === "OBLIGATIONS") {
    return resolved("AEAT_OBLIGATIONS_VIEW", 0.96);
  }

  const supporting = parseSupportingDocumentText(bounded);
  if (supporting.documentType !== "UNKNOWN") {
    return resolved(
      SUPPORTING_TYPE_MAP[supporting.documentType],
      supporting.status === "RESOLVED" ? 0.94 : 0.8,
      supporting.warnings,
    );
  }

  return blocked(
    "UNKNOWN",
    "El archivo no coincide con ninguno de los 39 tipos del registro cerrado.",
  );
}
