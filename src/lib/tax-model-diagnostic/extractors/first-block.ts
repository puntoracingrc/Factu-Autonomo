import {
  parseAeatCensusScreenshotText,
  parseCensusCertificateText,
  parseSupportingDocumentText,
  type AeatCensusScreenshotKind,
} from "@/lib/fiscal-profile";
import type {
  DocumentKind,
  EvidenceStatus,
  ExtractedFact,
  FilingStatus,
  FiscalDocumentType,
  JsonValue,
  StructuredExtractionMethod,
  TemporalScope,
} from "./contracts";
import {
  createExtractedFact,
  extractDateAfterLabel,
  extractFiscalYear,
  extractPeriod,
  maskSpanishTaxId,
  normalizeDocumentText,
} from "./normalization";

export interface DeepTextExtraction {
  facts: readonly ExtractedFact[];
  documentKind: DocumentKind;
  filingStatus: FilingStatus;
  fiscalYear: number | null;
  period: string | null;
  taxpayerNifMasked: string | null;
  issueDate: string | null;
  filingDate: string | null;
  effectiveDate: string | null;
  csvDetected: boolean;
  isComplete: boolean;
  confidence: number;
  warnings: readonly string[];
}

interface FirstBlockInput {
  documentId: string;
  documentType: FiscalDocumentType;
  text: string;
  extractionMethod: StructuredExtractionMethod;
  totalPages?: number;
  detectedPages?: readonly number[];
  pages?: readonly { page: number; text: string }[];
}

function sourcePage(
  input: FirstBlockInput,
  anchors: readonly string[] = [],
): number | null {
  if (input.pages && anchors.length > 0) {
    const normalizedAnchors = anchors.map(normalizeDocumentText);
    const matching = input.pages.filter((page) => {
      const text = normalizeDocumentText(page.text);
      return normalizedAnchors.some((anchor) => text.includes(anchor));
    });
    if (matching.length === 1) return matching[0].page;
  }
  return input.detectedPages?.length === 1 ? input.detectedPages[0] : null;
}

function factAnchors(factType: string): readonly string[] {
  if (factType === "SUBJECT.TAXPAYER_TYPE") {
    return ["TIPO DE CONTRIBUYENTE", "IDENTIFICACION"];
  }
  if (factType === "SUBJECT.TAX_TERRITORY") return ["TERRITORIO FISCAL"];
  if (factType.startsWith("ACTIVITY.")) {
    return ["ACTIVIDADES ECONOMICAS", "RELACION DE ACTIVIDADES"];
  }
  if (factType === "IRPF.METHOD") {
    return ["ESTIMACION DIRECTA", "IMPUESTO SOBRE LA RENTA"];
  }
  if (factType === "VAT.REGIMES") {
    return ["IMPUESTO SOBRE EL VALOR ANADIDO", "REGIMEN GENERAL"];
  }
  if (factType === "CENSUS.PERIODIC_OBLIGATIONS") {
    return ["OBLIGACIONES TRIBUTARIAS", "DESCRIPCION DE LA OBLIGACION"];
  }
  if (factType === "CENSUS.CURRENT_STATUS") {
    return ["CERTIFICADO DE SITUACION CENSAL"];
  }
  if (factType === "CENSUS.EVENT") return ["CAUSAS DE PRESENTACION"];
  if (factType === "IRPF.RETA_PERIODS") {
    return ["REGIMEN ESPECIAL", "TRABAJO AUTONOMO", "VIDA LABORAL"];
  }
  return [];
}

function statusForScope(scope: TemporalScope): EvidenceStatus {
  return scope === "HISTORICAL"
    ? "HISTORICAL_ONLY"
    : "PREFILLED_NEEDS_CONFIRMATION";
}

function isApparentlyFiled(text: string): boolean {
  const value = normalizeDocumentText(text);
  return (
    /(?:FECHA DE PRESENTACION|PRESENTACION REALIZADA EL)[^0-9]{0,30}\d{1,2}[/.\-]\d{1,2}[/.\-]20\d{2}/.test(
      value,
    ) ||
    /\bJUSTIFICANTE\s*[:.\-]?\s*\d{10,16}\b/.test(value) ||
    /\b(?:CODIGO SEGURO DE VERIFICACION|CSV)\b/.test(value)
  );
}

function censusExtraction(input: FirstBlockInput): DeepTextExtraction {
  const candidate = parseCensusCertificateText(input.text);
  const current = input.documentType === "CURRENT_CENSUS_CERTIFICATE";
  const historical = input.documentType === "MODEL_037";
  const temporalScope: TemporalScope = current
    ? "CURRENT_AS_OF_DATE"
    : historical
      ? "HISTORICAL"
      : "SPECIFIC_PERIOD";
  const factStatus = statusForScope(temporalScope);
  const facts: ExtractedFact[] = [];
  const add = (
    factType: string,
    value: JsonValue,
    sourceLabel: string,
    effectiveFrom: string | null = candidate.documentDate ?? null,
  ) => {
    facts.push(
      createExtractedFact({
        documentId: input.documentId,
        index: facts.length,
        factType,
        value,
        temporalScope,
        effectiveFrom,
        sourcePage: sourcePage(input, factAnchors(factType)),
        sourceLabel,
        extractionMethod: input.extractionMethod,
        extractionConfidence: current ? 0.9 : 0.78,
        filingVerified: false,
        status: factStatus,
      }),
    );
  };

  if (candidate.taxpayerType === "SELF_EMPLOYED_IRPF") {
    add("SUBJECT.TAXPAYER_TYPE", "NATURAL_PERSON", "Tipo de contribuyente");
  } else if (candidate.taxpayerType === "COMPANY_IS") {
    add("SUBJECT.TAXPAYER_TYPE", "COMPANY", "Tipo de contribuyente");
  }
  const territory = {
    ES_COMMON: "ES_COMMON",
    ES_CANARY_IGIC: "ES_CANARY",
    ES_NAVARRA: "ES_NAVARRA",
    ES_BASQUE_COUNTRY: "UNKNOWN",
    ES_CEUTA_MELILLA: "UNKNOWN",
    UNKNOWN: null,
  }[candidate.jurisdiction];
  if (territory) add("SUBJECT.TAX_TERRITORY", territory, "Territorio fiscal");

  if (candidate.activities.length > 0) {
    add(
      "ACTIVITY.LIST",
      candidate.activities.map((activity) => ({
        ...(activity.code ? { code: activity.code } : {}),
        description: activity.description,
      })) as JsonValue,
      "Actividades económicas",
    );
  }
  const incomeTaxRegime = {
    DIRECT_ESTIMATION_NORMAL: "DIRECT_NORMAL",
    DIRECT_ESTIMATION_SIMPLIFIED: "DIRECT_SIMPLIFIED",
    UNKNOWN: null,
  }[candidate.directTaxRegime];
  if (incomeTaxRegime) {
    add("IRPF.METHOD", incomeTaxRegime, "Método de estimación en IRPF");
  }
  const vatRegimes = {
    GENERAL: ["GENERAL"],
    EXEMPT: ["EXEMPT"],
    PRORATA: ["GENERAL"],
    UNKNOWN: [],
  }[candidate.vatRegime];
  if (vatRegimes.length > 0) {
    add("VAT.REGIMES", vatRegimes, "Régimen de IVA");
  }
  if (current) {
    add(
      "CENSUS.CURRENT_STATUS",
      "REVIEWED",
      "Certificado de situación censal",
    );
  }
  if (!current) {
    add(
      "CENSUS.EVENT",
      {
        cause: "UNKNOWN",
        changedFields: facts.map((fact) => fact.factType),
      },
      "Declaración censal",
    );
  }

  const filed = current || isApparentlyFiled(input.text);
  const isComplete =
    current &&
    candidate.documentKind === "AEAT_CENSUS_CERTIFICATE" &&
    facts.length > 0 &&
    (input.totalPages == null ||
      input.detectedPages?.length === input.totalPages);
  return {
    facts,
    documentKind: current
      ? "CURRENT_CERTIFICATE"
      : filed
        ? "FILED_DECLARATION_COPY"
        : "DRAFT",
    filingStatus: current
      ? "APPARENTLY_FILED"
      : filed
        ? "APPARENTLY_FILED"
        : "DRAFT",
    fiscalYear: extractFiscalYear(input.text),
    period: extractPeriod(input.text),
    taxpayerNifMasked: maskSpanishTaxId(candidate.detectedNif),
    issueDate: candidate.documentDate ?? null,
    filingDate: extractDateAfterLabel(input.text, [
      "FECHA DE PRESENTACION",
      "PRESENTACION REALIZADA EL",
    ]),
    effectiveDate: extractDateAfterLabel(input.text, ["FECHA EFECTIVA", "FECHA DE EFECTO"]),
    csvDetected: Boolean(candidate.csv),
    isComplete,
    confidence: facts.length > 0 ? (current ? 0.9 : 0.78) : 0.55,
    warnings: [
      ...candidate.warnings,
      ...(historical
        ? ["El modelo 037 solo se conserva como evidencia histórica."]
        : []),
      ...(!current && !filed
        ? ["No se ha acreditado que la declaración estuviera presentada."]
        : []),
    ],
  };
}

function screenshotExtraction(input: FirstBlockInput): DeepTextExtraction {
  const kinds = {
    AEAT_ECONOMIC_ACTIVITIES_VIEW: "ACTIVITIES",
    AEAT_TAX_STATUS_VIEW: "TAX_STATUS",
    AEAT_OBLIGATIONS_VIEW: "OBLIGATIONS",
  } as const satisfies Record<string, AeatCensusScreenshotKind>;
  const kind = kinds[input.documentType as
    | "AEAT_ECONOMIC_ACTIVITIES_VIEW"
    | "AEAT_TAX_STATUS_VIEW"
    | "AEAT_OBLIGATIONS_VIEW"];
  const candidate = parseAeatCensusScreenshotText(input.text, kind);
  const facts: ExtractedFact[] = [];
  const add = (factType: string, value: JsonValue, sourceLabel: string) => {
    facts.push(
      createExtractedFact({
        documentId: input.documentId,
        index: facts.length,
        factType,
        value,
        temporalScope: "CURRENT_AS_OF_DATE",
        effectiveFrom: extractDateAfterLabel(input.text, [
          "FECHA Y HORA OFICIAL",
          "FECHA DE CONSULTA",
        ]),
        sourcePage: sourcePage(input, factAnchors(factType)),
        sourceLabel,
        extractionMethod: input.extractionMethod,
        extractionConfidence:
          input.extractionMethod === "OCR_LOCAL" ? 0.76 : 0.9,
        status: "PREFILLED_NEEDS_CONFIRMATION",
      }),
    );
  };

  if (kind === "ACTIVITIES") {
    const active = candidate.activities.filter((row) => row.state === "ACTIVE");
    if (active.length > 0) {
      add(
        "ACTIVITY.LIST",
        active.map((row) => ({
          section: row.section,
          code: row.code,
          description: row.description,
          state: row.state,
          ...(row.startDate ? { startDate: row.startDate } : {}),
        })) as JsonValue,
        "Relación de actividades",
      );
    }
    if (candidate.activityKinds.length > 0) {
      add("ACTIVITY.NATURE", candidate.activityKinds, "Sección de la actividad");
    }
    const dates = active
      .map((row) => row.startDate)
      .filter((date): date is string => Boolean(date));
    if (dates.length > 0) add("ACTIVITY.DATES", [...new Set(dates)], "F. Inicio");
  }
  if (kind === "TAX_STATUS") {
    if (candidate.incomeTaxRegime !== "UNKNOWN") {
      add("IRPF.METHOD", candidate.incomeTaxRegime, "Método de estimación en IRPF");
    }
    if (candidate.vatRegimes.length > 0) {
      add("VAT.REGIMES", candidate.vatRegimes, "Regímenes aplicables de IVA");
    }
  }
  if (kind === "OBLIGATIONS") {
    if (candidate.activeTaxModels.length > 0 || candidate.isComplete) {
      add(
        "CENSUS.PERIODIC_OBLIGATIONS",
        candidate.activeTaxModels,
        "Obligaciones tributarias en alta",
      );
    }
  }

  return {
    facts,
    documentKind:
      input.extractionMethod === "OCR_LOCAL" ? "SCREENSHOT" : "CURRENT_AEAT_VIEW",
    filingStatus: "NOT_VERIFIED",
    fiscalYear: extractFiscalYear(input.text),
    period: null,
    taxpayerNifMasked: maskSpanishTaxId(
      normalizeDocumentText(input.text).match(
        /\b(?:NIF|NIE)\s*[:.\-]?\s*([XYZ]?\d{7,8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b/,
      )?.[1],
    ),
    issueDate: extractDateAfterLabel(input.text, [
      "FECHA Y HORA OFICIAL",
      "FECHA DE CONSULTA",
    ]),
    filingDate: null,
    effectiveDate: null,
    csvDetected: false,
    isComplete: candidate.isComplete,
    confidence: facts.length > 0 ? 0.86 : 0.55,
    warnings: candidate.warnings,
  };
}

function tgssExtraction(input: FirstBlockInput): DeepTextExtraction {
  const candidate = parseSupportingDocumentText(input.text);
  const facts: ExtractedFact[] = [];
  const isHistory = input.documentType === "TGSS_EMPLOYMENT_HISTORY";
  if (candidate.retaDuringYear === "YES") {
    facts.push(
      createExtractedFact({
        documentId: input.documentId,
        index: 0,
        factType: "IRPF.RETA_PERIODS",
        value: { retaDuringObservedPeriod: true },
        temporalScope: isHistory ? "TARGET_FISCAL_YEAR" : "CURRENT_AS_OF_DATE",
        effectiveFrom: extractDateAfterLabel(input.text, ["FECHA DE ALTA"]),
        effectiveTo: extractDateAfterLabel(input.text, ["FECHA DE BAJA"]),
        sourcePage: sourcePage(input, factAnchors("IRPF.RETA_PERIODS")),
        sourceLabel: isHistory
          ? "Periodo en régimen de trabajo autónomo"
          : "Situación en trabajo autónomo",
        extractionMethod: input.extractionMethod,
        extractionConfidence: input.extractionMethod === "OCR_LOCAL" ? 0.74 : 0.9,
        status: "PREFILLED_NEEDS_CONFIRMATION",
      }),
    );
  }
  return {
    facts,
    documentKind: "SUPPORTING_DOCUMENT",
    filingStatus: "NOT_VERIFIED",
    fiscalYear: extractFiscalYear(input.text),
    period: null,
    taxpayerNifMasked: maskSpanishTaxId(
      normalizeDocumentText(input.text).match(
        /\b(?:NIF|NIE)\s*[:.\-]?\s*([XYZ]?\d{7,8}[A-Z])\b/,
      )?.[1],
    ),
    issueDate: extractDateAfterLabel(input.text, ["FECHA DE EMISION", "FECHA"]),
    filingDate: null,
    effectiveDate: null,
    csvDetected: /\b(?:CSV|CODIGO DE VERIFICACION)\b/.test(
      normalizeDocumentText(input.text),
    ),
    isComplete: facts.length > 0,
    confidence: facts.length > 0 ? 0.88 : 0.55,
    warnings: candidate.warnings,
  };
}

export function extractFirstBlockText(
  input: FirstBlockInput,
): DeepTextExtraction | null {
  if (
    input.documentType === "CURRENT_CENSUS_CERTIFICATE" ||
    input.documentType === "MODEL_036" ||
    input.documentType === "MODEL_037"
  ) {
    return censusExtraction(input);
  }
  if (
    input.documentType === "AEAT_ECONOMIC_ACTIVITIES_VIEW" ||
    input.documentType === "AEAT_TAX_STATUS_VIEW" ||
    input.documentType === "AEAT_OBLIGATIONS_VIEW"
  ) {
    return screenshotExtraction(input);
  }
  if (
    input.documentType === "TGSS_CURRENT_STATUS_REPORT" ||
    input.documentType === "TGSS_EMPLOYMENT_HISTORY" ||
    input.documentType === "TGSS_SELF_EMPLOYED_ACTIVITIES"
  ) {
    return tgssExtraction(input);
  }
  return null;
}
