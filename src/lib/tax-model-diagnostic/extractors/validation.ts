import type {
  DocumentEnvelope,
  ExtractedFact,
  FiscalDocumentType,
} from "./contracts";

export type ValidationSeverity = "HARD_VALIDATION" | "SOFT_RECONCILIATION";

export interface ExtractionValidationIssue {
  severity: ValidationSeverity;
  code:
    | "MODEL_TYPE_MISMATCH"
    | "UNSUPPORTED_AUTHORITY"
    | "IMPOSSIBLE_PERIOD"
    | "CRITICAL_PAGE_MISSING"
    | "LOW_CONFIDENCE"
    | "IDENTITY_REVIEW"
    | "UNVERIFIED_FILING"
    | "CONFLICTING_FACT";
  message: string;
  documentId: string;
  factId?: string;
}

function expectedModelFromType(
  documentType: FiscalDocumentType | null,
): string | null {
  return documentType?.startsWith("MODEL_")
    ? documentType.slice("MODEL_".length)
    : null;
}

export function validateDocumentEnvelope(
  envelope: DocumentEnvelope,
): readonly ExtractionValidationIssue[] {
  const issues: ExtractionValidationIssue[] = [];
  const expectedModel = expectedModelFromType(envelope.detectedDocumentType);
  if (expectedModel && expectedModel !== envelope.detectedModel) {
    issues.push({
      severity: "HARD_VALIDATION",
      code: "MODEL_TYPE_MISMATCH",
      message: "El código de modelo no coincide con el tipo documental detectado.",
      documentId: envelope.documentId,
    });
  }
  if (envelope.authority === "FORAL" || envelope.authority === "CANARY_TAX_AUTHORITY") {
    issues.push({
      severity: "HARD_VALIDATION",
      code: "UNSUPPORTED_AUTHORITY",
      message: "La autoridad del documento necesita un extractor territorial propio.",
      documentId: envelope.documentId,
    });
  }
  if (
    envelope.period &&
    !/^(0A|ANUAL|[1-4]T|0[1-9]|1[0-2])$/.test(envelope.period)
  ) {
    issues.push({
      severity: "HARD_VALIDATION",
      code: "IMPOSSIBLE_PERIOD",
      message: "El periodo fiscal leído no pertenece al vocabulario cerrado.",
      documentId: envelope.documentId,
    });
  }
  if (
    envelope.totalPages != null &&
    envelope.detectedPages.length > 0 &&
    envelope.detectedPages.length < envelope.totalPages
  ) {
    issues.push({
      severity: "SOFT_RECONCILIATION",
      code: "CRITICAL_PAGE_MISSING",
      message: "El documento parece incompleto; no permite descartar información ausente.",
      documentId: envelope.documentId,
    });
  }
  if (envelope.filingStatus === "NOT_VERIFIED" || envelope.filingStatus === "UNKNOWN") {
    issues.push({
      severity: "SOFT_RECONCILIATION",
      code: "UNVERIFIED_FILING",
      message: "La presencia del documento no acredita por sí sola su presentación oficial.",
      documentId: envelope.documentId,
    });
  }
  return issues;
}

export function validateExtractedFacts(
  facts: readonly ExtractedFact[],
): readonly ExtractionValidationIssue[] {
  return facts.flatMap((fact): ExtractionValidationIssue[] => {
    const issues: ExtractionValidationIssue[] = [];
    if (fact.extractionConfidence < 0.7) {
      issues.push({
        severity: "SOFT_RECONCILIATION",
        code: "LOW_CONFIDENCE",
        message: "El campo necesita revisión humana por baja confianza de lectura.",
        documentId: fact.sourceDocumentId,
        factId: fact.factId,
      });
    }
    if (fact.status === "CONFLICT") {
      issues.push({
        severity: "SOFT_RECONCILIATION",
        code: "CONFLICTING_FACT",
        message: "El campo se contradice con otra fuente y no debe aplicarse automáticamente.",
        documentId: fact.sourceDocumentId,
        factId: fact.factId,
      });
    }
    return issues;
  });
}

/**
 * La decisión de producto es de confianza en los documentos aportados por el
 * usuario. Una diferencia de NIF puede mostrarse, pero nunca bloquea la lectura.
 */
export function identityReviewIssue(
  documentId: string,
): ExtractionValidationIssue {
  return {
    severity: "SOFT_RECONCILIATION",
    code: "IDENTITY_REVIEW",
    message:
      "Si lo deseas, revisa la identidad del documento antes de confirmar; la aplicación no la exige.",
    documentId,
  };
}
