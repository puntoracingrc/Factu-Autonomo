import { parseAeatTaxFormText } from "@/lib/fiscal-profile";
import { classifyFiscalDocumentText } from "./classifier";
import type {
  DocumentEnvelope,
  FiscalDocumentExtractionResult,
  TextDocumentInput,
} from "./contracts";
import {
  FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
  FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
} from "./contracts";
import { extractFirstBlockText } from "./first-block";
import { extractPriorityModelText } from "./priority-models";
import { extractRemainingModelText } from "./remaining-models";
import {
  extractDateAfterLabel,
  extractFiscalYear,
  extractPeriod,
  maskReference,
  maskSpanishTaxId,
  normalizeDocumentText,
} from "./normalization";
import { reconcileExtractedFacts } from "./reconciliation";
import { resolveQuestionsFromFacts } from "./question-mapping";
import { validateDocumentEnvelope, validateExtractedFacts } from "./validation";

function genericEnvelope(
  input: TextDocumentInput,
  classification: ReturnType<typeof classifyFiscalDocumentText>,
): DocumentEnvelope {
  const normalized = normalizeDocumentText(input.text);
  const genericTaxForm = parseAeatTaxFormText(input.text);
  const submitted = genericTaxForm.isSubmitted;
  const detectedNif = normalized.match(
    /\b(?:NIF|NIE)\s*[:.\-]?\s*([XYZ]?\d{7,8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b/,
  )?.[1];
  const receipt = normalized.match(
    /\b(?:N(?:UMERO|O)?\.?\s+DE\s+)?JUSTIFICANTE\s*[:.\-]?\s*(\d{10,16})\b/,
  )?.[1];
  const csvDetected = /\b(?:CODIGO SEGURO DE VERIFICACION|CSV)\b/.test(
    normalized,
  );
  return {
    contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
    catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
    documentId: input.documentId,
    authority: classification.authority,
    territory: classification.definition?.territory ?? "UNKNOWN",
    detectedModel: classification.model,
    detectedDocumentType: classification.documentType,
    modelVersion: classification.definition?.extractorId ?? null,
    fiscalYear: genericTaxForm.taxYear ?? extractFiscalYear(input.text),
    period: genericTaxForm.period ?? extractPeriod(input.text),
    documentKind: submitted ? "FILED_DECLARATION_COPY" : "UNKNOWN",
    filingStatus: submitted ? "APPARENTLY_FILED" : "UNKNOWN",
    originalOrCorrection: /\bCOMPLEMENTARIA\b/.test(normalized)
      ? "COMPLEMENTARY"
      : /\bSUSTITUTIVA\b/.test(normalized)
        ? "SUBSTITUTE"
        : /\bRECTIFICATIVA\b/.test(normalized)
          ? "RECTIFICATION"
          : submitted
            ? "ORIGINAL"
            : "UNKNOWN",
    taxpayerNifMasked: maskSpanishTaxId(detectedNif),
    taxpayerNameMasked: null,
    issueDate: extractDateAfterLabel(input.text, [
      "FECHA DE EXPEDICION",
      "FECHA DE EMISION",
    ]),
    filingDate: extractDateAfterLabel(input.text, [
      "FECHA DE PRESENTACION",
      "PRESENTACION REALIZADA EL",
    ]),
    effectiveDate: extractDateAfterLabel(input.text, [
      "FECHA EFECTIVA",
      "FECHA DE EFECTO",
    ]),
    receiptNumberMasked: maskReference(receipt),
    csv: csvDetected
      ? { detected: true, verificationStatus: "CSV_DETECTED" }
      : null,
    nrcDetected: /\bNRC\b/.test(normalized),
    totalPages: input.totalPages ?? null,
    detectedPages: input.detectedPages ?? [],
    isComplete: false,
    extractionMethods: [input.extractionMethod],
    overallConfidence: classification.confidence,
    warnings: classification.warnings,
  };
}

export function extractFiscalDocumentText(
  input: TextDocumentInput,
): FiscalDocumentExtractionResult {
  const classification = classifyFiscalDocumentText(input.text);
  const baseEnvelope = genericEnvelope(input, classification);
  if (classification.status === "BLOCKED" || !classification.documentType) {
    return {
      contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
      catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
      status: "BLOCKED",
      envelope: baseEnvelope,
      facts: [],
      questionResolutions: [],
      warnings: classification.warnings,
    };
  }
  if (classification.definition?.implementationStatus !== "DEEP_SUPPORTED") {
    const warning =
      "El tipo de documento se reconoce, pero su extractor estructurado profundo aún no está disponible.";
    return {
      contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
      catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
      status: "UNSUPPORTED_DOCUMENT",
      envelope: {
        ...baseEnvelope,
        warnings: [...baseEnvelope.warnings, warning],
      },
      facts: [],
      questionResolutions: [],
      warnings: [...classification.warnings, warning],
    };
  }

  const extractionInput = {
    documentId: input.documentId,
    documentType: classification.documentType,
    text: input.text,
    extractionMethod: input.extractionMethod,
    ...(input.totalPages == null ? {} : { totalPages: input.totalPages }),
    ...(input.detectedPages == null
      ? {}
      : { detectedPages: input.detectedPages }),
    ...(input.pages == null ? {} : { pages: input.pages }),
  };
  const extraction =
    extractFirstBlockText(extractionInput) ??
    extractPriorityModelText(extractionInput) ??
    extractRemainingModelText(extractionInput);
  if (!extraction) {
    return {
      contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
      catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
      status: "UNSUPPORTED_DOCUMENT",
      envelope: baseEnvelope,
      facts: [],
      questionResolutions: [],
      warnings: ["No existe un extractor profundo para este documento."],
    };
  }

  const facts = reconcileExtractedFacts(extraction.facts);
  const envelope: DocumentEnvelope = {
    ...baseEnvelope,
    documentKind: extraction.documentKind,
    filingStatus: extraction.filingStatus,
    fiscalYear: extraction.fiscalYear ?? baseEnvelope.fiscalYear,
    period: extraction.period ?? baseEnvelope.period,
    taxpayerNifMasked:
      extraction.taxpayerNifMasked ?? baseEnvelope.taxpayerNifMasked,
    issueDate: extraction.issueDate ?? baseEnvelope.issueDate,
    filingDate: extraction.filingDate ?? baseEnvelope.filingDate,
    effectiveDate: extraction.effectiveDate ?? baseEnvelope.effectiveDate,
    csv: extraction.csvDetected
      ? { detected: true, verificationStatus: "CSV_DETECTED" }
      : baseEnvelope.csv,
    isComplete: extraction.isComplete,
    overallConfidence: extraction.confidence,
    warnings: extraction.warnings,
  };
  const questionResolutions = resolveQuestionsFromFacts(
    facts,
    envelope.isComplete,
  );
  const validationIssues = [
    ...validateDocumentEnvelope(envelope),
    ...validateExtractedFacts(facts),
  ];
  const validationWarnings = validationIssues.map((issue) => issue.message);
  const hasHardFailure = validationIssues.some(
    (issue) => issue.severity === "HARD_VALIDATION",
  );
  return {
    contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
    catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
    status: hasHardFailure
      ? "BLOCKED"
      : facts.length > 0
        ? "RESOLVED"
        : "MANUAL_REVIEW",
    envelope: {
      ...envelope,
      warnings: [...envelope.warnings, ...validationWarnings],
    },
    facts,
    questionResolutions: hasHardFailure ? [] : questionResolutions,
    warnings: [...extraction.warnings, ...validationWarnings],
  };
}
