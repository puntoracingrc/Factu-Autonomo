import type { FiscalNotificationDocumentFamilyIdV3 } from "./knowledge/document-families.v3";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertNonNegativeIntegerCents,
} from "./input-contract";
import type { PartyRoleV1 } from "./extractor-core/domain.v1";
import type { ExtractorOutputV1 } from "./extractor-core/extractor-contract.v1";
import type { MonetaryComponentTypeV1 } from "./extractor-core/monetary-component.v1";
import type { ProceduralDateTypeV1 } from "./extractor-core/procedural-date.v1";
import type { ReferenceTypeV1 } from "./extractor-core/reference.v1";
import type { PaymentEvidenceStateV1 } from "./extractor-core/payment-evidence-extractor.v1";
import type {
  FiscalNotificationVerticalSliceAnalysisV1,
  FiscalNotificationVerticalSliceExtractorIdV1,
} from "./extractor-core/vertical-slice-orchestrator.v1";

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1 =
  "1.0.0" as const;

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1 =
  Object.freeze({
    maxDocuments: 4,
    maxFieldsPerDocument: 256,
    maxWarningsPerDocument: 64,
    maxLabelChars: 160,
    maxDisplayValueChars: 1_000,
    maxNormalizedValueChars: 500,
    maxSourceLabelChars: 240,
  } as const);

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_FIELD_SEMANTICS_V1 =
  Object.freeze([
    "REFERENCE",
    "MONEY",
    "DATE",
    "PARTY",
    "STATUS",
    "DETAIL",
    "OBLIGATION",
    "MASKED_VALUE",
  ] as const);
export type FiscalNotificationVerticalSliceFieldSemanticV1 =
  (typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_FIELD_SEMANTICS_V1)[number];

const DETAIL_CANONICAL_TYPES = Object.freeze([
  "DOCUMENT_STATUS",
  "REASON",
  "OBLIGATION",
  "RESPONSE_CHANNEL",
  "DOCUMENTATION_REQUIRED",
  "EXPLICIT_CONSEQUENCE",
  "FACT_OR_GROUND",
  "APPEAL_INFORMATION",
  "COLLABORATING_ENTITY",
  "PAYMENT_MEDIUM",
  "PAYMENT_RESULT",
  "REJECTION_REASON",
  "PAYMENT_SCOPE",
  "PAYMENT_TIME",
  "MASKED_ACCOUNT",
  "BARCODE_REFERENCE",
] as const);

export type FiscalNotificationVerticalSliceCanonicalFieldTypeV1 =
  | ReferenceTypeV1
  | MonetaryComponentTypeV1
  | ProceduralDateTypeV1
  | PartyRoleV1
  | (typeof DETAIL_CANONICAL_TYPES)[number];

export interface FiscalNotificationVerticalSliceReviewFieldV1 {
  readonly fieldId: string;
  readonly semantic: FiscalNotificationVerticalSliceFieldSemanticV1;
  readonly canonicalType: FiscalNotificationVerticalSliceCanonicalFieldTypeV1;
  readonly label: string;
  readonly displayValue: string;
  readonly normalizedValue: string | null;
  readonly amountCents: number | null;
  readonly currency: "EUR" | null;
  readonly sourcePageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly confidence: number;
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface FiscalNotificationVerticalSliceReviewDocumentV1 {
  readonly reviewDocumentId: string;
  readonly extractorId: FiscalNotificationVerticalSliceExtractorIdV1;
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly title: string;
  readonly subtitle: string;
  readonly pageFrom: number;
  readonly pageTo: number;
  readonly confidence: number;
  readonly fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[];
  readonly warnings: readonly string[];
  readonly requiresHumanReview: true;
}

export interface FiscalNotificationVerticalSliceReviewV1 {
  readonly schemaVersion: 1;
  readonly reviewVersion: typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING" | "BLOCKED";
  readonly documents: readonly FiscalNotificationVerticalSliceReviewDocumentV1[];
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
}

const FAMILY_TITLE: Readonly<
  Partial<Record<FiscalNotificationDocumentFamilyIdV3, string>>
> = Object.freeze({
  "compliance.formal_filing_requirement": "Requerimiento formal de presentación",
  "assessment.allegations_and_proposal": "Propuesta de liquidación provisional",
  "assessment.final_provisional_assessment": "Liquidación provisional",
  "payment.payment_form": "Carta o documento de pago",
  "payment.receipt": "Justificante de pago",
  "payment.failed_or_reversed": "Incidencia de pago",
});

const REFERENCE_LABEL: Readonly<Record<ReferenceTypeV1, string>> = Object.freeze({
  PROCEDURE_ID: "Procedimiento",
  EXPEDIENTE_ID: "Expediente",
  ACT_ID: "Acto o requerimiento",
  NOTIFICATION_ID: "Notificación",
  LIQUIDATION_KEY: "Clave de liquidación",
  DEBT_KEY: "Clave de deuda",
  SEIZURE_ORDER_ID: "Diligencia de embargo",
  AGREEMENT_ID: "Acuerdo",
  REGISTRY_ID: "Registro",
  FILING_RECEIPT_ID: "Justificante de presentación",
  PAYMENT_RECEIPT_ID: "Justificante de pago",
  NRC: "NRC",
  CSV: "CSV",
  NIF: "NIF",
  MODEL: "Modelo",
  FISCAL_YEAR: "Ejercicio",
  TAX_PERIOD: "Periodo",
  BANK_REFERENCE: "Referencia bancaria",
  THIRD_PARTY_RESPONSE_ID: "Contestación de tercero",
  OTHER_OFFICIAL_REFERENCE: "Referencia oficial",
});

const MONEY_LABEL: Readonly<Record<MonetaryComponentTypeV1, string>> = Object.freeze({
  PRINCIPAL: "Principal",
  TAX_QUOTA: "Cuota",
  PENALTY: "Sanción",
  SURCHARGE: "Recargo",
  EXECUTIVE_SURCHARGE: "Recargo ejecutivo",
  LATE_INTEREST: "Intereses",
  COSTS: "Costas",
  PAYMENT_ON_ACCOUNT: "Ingreso a cuenta",
  TOTAL_CLAIMED: "Total reclamado",
  TOTAL_PAID: "Total pagado",
  PARTIAL_PAYMENT: "Pago parcial",
  TOTAL_PENDING: "Total pendiente",
  REFUND_REQUESTED: "Devolución solicitada",
  REFUND_RECOGNIZED: "Devolución reconocida",
  REFUND_PAID: "Devolución pagada",
  CREDIT_APPLIED: "Crédito aplicado",
  COMPENSATED_AMOUNT: "Importe compensado",
  SEIZED_AMOUNT: "Importe embargado",
  RELEASED_AMOUNT: "Importe liberado",
  OTHER: "Importe",
});

const DATE_LABEL: Readonly<Record<ProceduralDateTypeV1, string>> = Object.freeze({
  ISSUE_DATE: "Fecha de emisión",
  SIGNING_DATE: "Fecha de firma",
  AVAILABILITY_DATE: "Puesta a disposición",
  ACCESS_DATE: "Fecha de acceso",
  REJECTION_DATE: "Fecha de rechazo",
  EXPIRATION_DATE: "Fecha de caducidad",
  EFFECTIVE_NOTIFICATION_DATE: "Fecha de notificación",
  ACTION_DATE: "Fecha del acto",
  VOLUNTARY_PAYMENT_DEADLINE: "Límite de pago",
  RESPONSE_DEADLINE: "Plazo de respuesta",
  APPEAL_DEADLINE: "Plazo de recurso",
  INSTALLMENT_DUE_DATE: "Vencimiento del plazo",
  PAYMENT_DATE: "Fecha de pago",
  SEIZURE_DATE: "Fecha de embargo",
  RELEASE_DATE: "Fecha de levantamiento",
});

const PARTY_LABEL: Readonly<Record<PartyRoleV1, string>> = Object.freeze({
  TAXPAYER: "Obligado tributario",
  PRIMARY_DEBTOR: "Deudor principal",
  LIABLE_PARTY: "Responsable",
  SUCCESSOR: "Sucesor",
  PAYER: "Pagador",
  GARNISHED_THIRD_PARTY: "Tercero embargado",
  TENANT: "Arrendatario",
  FINANCIAL_ENTITY: "Entidad financiera",
  REPRESENTATIVE: "Representante",
  ISSUING_AUTHORITY: "Órgano emisor",
});

const FAMILY_IDS = new Set<FiscalNotificationDocumentFamilyIdV3>(
  Object.keys(FAMILY_TITLE) as FiscalNotificationDocumentFamilyIdV3[],
);
const EXTRACTOR_IDS = new Set<FiscalNotificationVerticalSliceExtractorIdV1>([
  "requirement",
  "assessment",
  "payment-order",
  "payment-evidence",
]);
const REFERENCE_TYPES = new Set(Object.keys(REFERENCE_LABEL));
const MONEY_TYPES = new Set(Object.keys(MONEY_LABEL));
const DATE_TYPES = new Set(Object.keys(DATE_LABEL));
const PARTY_TYPES = new Set(Object.keys(PARTY_LABEL));
const DETAIL_TYPES = new Set<string>(DETAIL_CANONICAL_TYPES);
const FIELD_SEMANTICS = new Set<string>(
  FISCAL_NOTIFICATION_VERTICAL_SLICE_FIELD_SEMANTICS_V1,
);

export function projectFiscalNotificationVerticalSliceReviewV1(
  analysis: FiscalNotificationVerticalSliceAnalysisV1,
): FiscalNotificationVerticalSliceReviewV1 {
  const documents: FiscalNotificationVerticalSliceReviewDocumentV1[] = [];
  const { extractions } = analysis;
  if (extractions.formalFilingRequirement) {
    documents.push(projectRequirement(extractions.formalFilingRequirement));
  }
  if (extractions.assessment) {
    documents.push(projectAssessment(extractions.assessment));
  }
  if (extractions.paymentOrder) {
    documents.push(projectPaymentOrder(extractions.paymentOrder));
  }
  if (extractions.paymentEvidence) {
    documents.push(projectPaymentEvidence(extractions.paymentEvidence));
  }
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1,
    status: analysis.status,
    documents,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

export function createEmptyFiscalNotificationVerticalSliceReviewV1(
  status: "INFORMATION_PENDING" | "BLOCKED" = "INFORMATION_PENDING",
): FiscalNotificationVerticalSliceReviewV1 {
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1,
    status,
    documents: [],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

export function parseFiscalNotificationVerticalSliceReviewV1(
  value: unknown,
): FiscalNotificationVerticalSliceReviewV1 {
  try {
    const root = snapshotRecord(value);
    assertKeys(root, [
      "schemaVersion", "reviewVersion", "status", "documents", "sourceContentPolicy",
      "retainedSourceContent", "requiresHumanReview", "materializationPolicy",
      "permitsDebtCreation", "permitsDeadlineCreation", "permitsPaymentAction",
      "permitsAccountingAction",
    ]);
    if (
      root.schemaVersion !== 1 ||
      root.reviewVersion !== FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1 ||
      !["REVIEW_REQUIRED", "INFORMATION_PENDING", "BLOCKED"].includes(String(root.status)) ||
      root.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
      root.retainedSourceContent !== "NONE" ||
      root.requiresHumanReview !== true ||
      root.materializationPolicy !== "PROHIBITED_UNTIL_HUMAN_REVIEW" ||
      root.permitsDebtCreation !== false ||
      root.permitsDeadlineCreation !== false ||
      root.permitsPaymentAction !== false ||
      root.permitsAccountingAction !== false
    ) throw invalidReview();
    const documentValues = snapshotArray(
      root.documents,
      FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxDocuments,
    );
    if ((root.status === "REVIEW_REQUIRED") !== (documentValues.length > 0)) {
      throw invalidReview();
    }
    const seenDocuments = new Set<string>();
    const seenExtractors = new Set<string>();
    const documents = documentValues.map((item) => {
      const document = parseReviewDocument(item);
      if (
        seenDocuments.has(document.reviewDocumentId) ||
        seenExtractors.has(document.extractorId)
      ) throw invalidReview();
      seenDocuments.add(document.reviewDocumentId);
      seenExtractors.add(document.extractorId);
      return document;
    });
    return Object.freeze({
      schemaVersion: 1,
      reviewVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1,
      status: root.status as FiscalNotificationVerticalSliceReviewV1["status"],
      documents: Object.freeze(documents),
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  } catch (error) {
    if (error instanceof FiscalNotificationVerticalSliceReviewErrorV1) throw error;
    throw invalidReview();
  }
}

export class FiscalNotificationVerticalSliceReviewErrorV1 extends Error {
  constructor() {
    super("FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_INVALID");
    this.name = "FiscalNotificationVerticalSliceReviewErrorV1";
  }
}

function projectRequirement(
  output: NonNullable<FiscalNotificationVerticalSliceAnalysisV1["extractions"]["formalFilingRequirement"]>,
) {
  const fields = commonFields(output);
  addStatus(fields, "Requerimiento pendiente de revisión", pagesForOutput(output));
  addTextFact(fields, "REASON", "Motivo", output.requirementFacts.reason);
  output.requirementFacts.obligations.forEach((item, index) => {
    fields.push(field({
      fieldId: `obligation:${index + 1}`,
      semantic: "OBLIGATION",
      canonicalType: "OBLIGATION",
      label: "Obligación solicitada",
      displayValue: `Modelo ${item.model} · ${item.fiscalYear} · ${item.period}`,
      sourcePageNumbers: [item.sourcePage],
      sourceLabel: item.sourceLabel,
    }));
  });
  addTextFact(fields, "RESPONSE_CHANNEL", "Canal de respuesta", output.requirementFacts.responseChannel);
  output.requirementFacts.documentationRequired.forEach((item, index) =>
    addTextFact(fields, "DOCUMENTATION_REQUIRED", `Documentación ${index + 1}`, item),
  );
  output.requirementFacts.explicitConsequences.forEach((item, index) =>
    addTextFact(fields, "EXPLICIT_CONSEQUENCE", `Consecuencia indicada ${index + 1}`, item),
  );
  return documentProjection("requirement", output, fields, "Requerimiento formal de presentación");
}

function projectAssessment(
  output: NonNullable<FiscalNotificationVerticalSliceAnalysisV1["extractions"]["assessment"]>,
) {
  const fields = commonFields(output);
  const stage = output.assessmentFacts.stage === "FINAL_PROVISIONAL_ASSESSMENT"
    ? "Liquidación provisional emitida"
    : "Propuesta de liquidación y alegaciones";
  addStatus(fields, stage, pagesForOutput(output));
  addTextFact(fields, "REASON", "Motivo", output.assessmentFacts.reason);
  output.assessmentFacts.factsAndGrounds.forEach((item, index) =>
    addTextFact(fields, "FACT_OR_GROUND", `Hecho o fundamento ${index + 1}`, item),
  );
  output.assessmentFacts.printedAppealInformation.forEach((item, index) =>
    addTextFact(fields, "APPEAL_INFORMATION", `Recurso indicado ${index + 1}`, item),
  );
  return documentProjection("assessment", output, fields, stage);
}

function projectPaymentOrder(
  output: NonNullable<FiscalNotificationVerticalSliceAnalysisV1["extractions"]["paymentOrder"]>,
) {
  const fields = commonFields(output);
  addStatus(fields, "Orden de pago · pago no confirmado", pagesForOutput(output));
  addTextFact(fields, "PAYMENT_MEDIUM", "Medio o lugar de pago", output.paymentOrderFacts.paymentChannel);
  addTextFact(fields, "COLLABORATING_ENTITY", "Entidad colaboradora", output.paymentOrderFacts.collaboratingEntity);
  addMaskedFact(fields, output.paymentOrderFacts.maskedBankAccount);
  addTextFact(fields, "BARCODE_REFERENCE", "Código de barras o referencia", output.paymentOrderFacts.barcodeReference);
  return documentProjection("payment-order", output, fields, "Orden de pago · no acredita pago");
}

function projectPaymentEvidence(
  output: NonNullable<FiscalNotificationVerticalSliceAnalysisV1["extractions"]["paymentEvidence"]>,
) {
  const fields = commonFields(output);
  addStatus(fields, paymentStateLabel(output.paymentEvidenceFacts.paymentState), pagesForOutput(output));
  addTextFact(fields, "PAYMENT_TIME", "Hora del pago", output.paymentEvidenceFacts.paymentTime);
  addTextFact(fields, "COLLABORATING_ENTITY", "Entidad", output.paymentEvidenceFacts.collaboratingEntity);
  addTextFact(fields, "PAYMENT_MEDIUM", "Medio de pago", output.paymentEvidenceFacts.paymentMedium);
  addTextFact(fields, "PAYMENT_RESULT", "Resultado", output.paymentEvidenceFacts.result);
  addTextFact(fields, "REJECTION_REASON", "Motivo del rechazo", output.paymentEvidenceFacts.rejectionReason);
  addMaskedFact(fields, output.paymentEvidenceFacts.maskedBankAccount);
  addTextFact(fields, "PAYMENT_SCOPE", "Alcance del pago", output.paymentEvidenceFacts.paymentScope);
  return documentProjection("payment-evidence", output, fields, paymentStateLabel(output.paymentEvidenceFacts.paymentState));
}

function commonFields(output: ExtractorOutputV1): FiscalNotificationVerticalSliceReviewFieldV1[] {
  const fields: FiscalNotificationVerticalSliceReviewFieldV1[] = [];
  output.references.forEach((item, index) => fields.push(field({
    fieldId: `reference:${index + 1}:${item.referenceType}`,
    semantic: "REFERENCE",
    canonicalType: item.referenceType,
    label: REFERENCE_LABEL[item.referenceType],
    displayValue: item.rawValue,
    normalizedValue: item.normalizedValue,
    sourcePageNumbers: [item.sourcePage],
    sourceLabel: item.sourceLabel ?? REFERENCE_LABEL[item.referenceType],
    confidence: item.confidence,
  })));
  output.monetaryComponents.forEach((item) => fields.push(field({
    fieldId: `money:${item.componentId}`,
    semantic: "MONEY",
    canonicalType: item.componentType,
    label: MONEY_LABEL[item.componentType],
    displayValue: formatCents(item.amountCents, item.sign),
    amountCents: item.amountCents,
    currency: "EUR",
    sourcePageNumbers: [item.sourcePage],
    sourceLabel: item.sourceLabel ?? MONEY_LABEL[item.componentType],
    confidence: item.extractionConfidence,
  })));
  output.proceduralDates.forEach((item) => fields.push(field({
    fieldId: `date:${item.proceduralDateId}`,
    semantic: "DATE",
    canonicalType: item.dateType,
    label: DATE_LABEL[item.dateType],
    displayValue: item.rawText,
    normalizedValue: item.parsedDate,
    sourcePageNumbers: [item.sourcePage],
    sourceLabel: item.sourceLabel ?? DATE_LABEL[item.dateType],
    confidence: item.extractionConfidence,
  })));
  output.entities.forEach((entity, entityIndex) => {
    if (entity.entityKind !== "PARTY" || entity.displayName === null) return;
    entity.roles.forEach((role, roleIndex) => fields.push(field({
      fieldId: `party:${entityIndex + 1}:${roleIndex + 1}`,
      semantic: "PARTY",
      canonicalType: role,
      label: PARTY_LABEL[role],
      displayValue: entity.displayName!,
      sourcePageNumbers: pagesFromEvidence(entity.evidence.sourceSegmentIds, output),
      sourceLabel: PARTY_LABEL[role],
      confidence: entity.evidence.confidence,
    })));
  });
  return fields;
}

function documentProjection(
  extractorId: FiscalNotificationVerticalSliceExtractorIdV1,
  output: ExtractorOutputV1,
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  subtitle: string,
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const candidate = output.familyCandidates[0];
  if (!candidate || !FAMILY_TITLE[candidate.familyId]) throw invalidReview();
  const pages = Object.freeze(
    [...new Set([
      ...pagesForOutput(output),
      ...fields.flatMap((item) => item.sourcePageNumbers),
    ])].sort((left, right) => left - right),
  );
  return Object.freeze({
    reviewDocumentId: `review-document:${extractorId}`,
    extractorId,
    familyId: candidate.familyId,
    title: FAMILY_TITLE[candidate.familyId]!,
    subtitle,
    pageFrom: pages[0]!,
    pageTo: pages.at(-1)!,
    confidence: candidate.confidence,
    fields: Object.freeze(fields),
    warnings: Object.freeze([...output.warnings]),
    requiresHumanReview: true,
  });
}

function addStatus(
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  value: string,
  pages: readonly number[],
): void {
  fields.unshift(field({
    fieldId: "status:document",
    semantic: "STATUS",
    canonicalType: "DOCUMENT_STATUS",
    label: "Estado del documento",
    displayValue: value,
    sourcePageNumbers: pages,
    sourceLabel: "Estado extraído del documento",
  }));
}

type PrintedTextFact = Readonly<{
  printedValue: string;
  pageNumbers: readonly number[];
  sourceLabel: string;
}>;

function addTextFact(
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  canonicalType: Extract<(typeof DETAIL_CANONICAL_TYPES)[number], string>,
  label: string,
  fact: PrintedTextFact | null,
): void {
  if (!fact) return;
  fields.push(field({
    fieldId: `detail:${canonicalType}:${fields.length + 1}`,
    semantic: "DETAIL",
    canonicalType,
    label,
    displayValue: fact.printedValue,
    sourcePageNumbers: fact.pageNumbers,
    sourceLabel: fact.sourceLabel,
  }));
}

function addMaskedFact(
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  fact: Readonly<{ maskedValue: string; sourcePage: number; sourceLabel: string }> | null,
): void {
  if (!fact) return;
  fields.push(field({
    fieldId: `masked-account:${fields.length + 1}`,
    semantic: "MASKED_VALUE",
    canonicalType: "MASKED_ACCOUNT",
    label: "Cuenta enmascarada",
    displayValue: fact.maskedValue,
    sourcePageNumbers: [fact.sourcePage],
    sourceLabel: fact.sourceLabel,
  }));
}

function field(input: {
  fieldId: string;
  semantic: FiscalNotificationVerticalSliceFieldSemanticV1;
  canonicalType: FiscalNotificationVerticalSliceCanonicalFieldTypeV1;
  label: string;
  displayValue: string;
  normalizedValue?: string | null;
  amountCents?: number | null;
  currency?: "EUR" | null;
  sourcePageNumbers: readonly number[];
  sourceLabel: string;
  confidence?: number;
}): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    ...input,
    normalizedValue: input.normalizedValue ?? null,
    amountCents: input.amountCents ?? null,
    currency: input.currency ?? null,
    sourcePageNumbers: Object.freeze([...input.sourcePageNumbers]),
    confidence: input.confidence ?? 1,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function pagesForOutput(output: ExtractorOutputV1): readonly number[] {
  const pages = new Set<number>();
  output.familyCandidates.forEach((candidate) => {
    candidate.matchingEvidenceIds.forEach((segmentId) => {
      const match = /:(\d+)-(\d+)$/u.exec(segmentId);
      if (!match) return;
      for (let page = Number(match[1]); page <= Number(match[2]); page += 1) {
        pages.add(page);
      }
    });
  });
  output.references.forEach((item) => pages.add(item.sourcePage));
  output.monetaryComponents.forEach((item) => pages.add(item.sourcePage));
  output.proceduralDates.forEach((item) => pages.add(item.sourcePage));
  output.entities.forEach((entity) => {
    entity.evidence.sourceSegmentIds.forEach((segmentId) => {
      const match = /:(\d+)-(\d+)$/u.exec(segmentId);
      if (!match) return;
      for (let page = Number(match[1]); page <= Number(match[2]); page += 1) pages.add(page);
    });
  });
  if (pages.size === 0) throw invalidReview();
  return Object.freeze([...pages].sort((left, right) => left - right));
}

function pagesFromEvidence(
  segmentIds: readonly string[],
  output: ExtractorOutputV1,
): readonly number[] {
  const pages = new Set<number>();
  segmentIds.forEach((segmentId) => {
    const match = /:(\d+)-(\d+)$/u.exec(segmentId);
    if (!match) return;
    for (let page = Number(match[1]); page <= Number(match[2]); page += 1) pages.add(page);
  });
  return pages.size > 0 ? Object.freeze([...pages].sort((a, b) => a - b)) : pagesForOutput(output);
}

function formatCents(amountCents: number, sign: "POSITIVE" | "NEGATIVE"): string {
  const euros = Math.floor(amountCents / 100).toLocaleString("es-ES");
  const cents = String(amountCents % 100).padStart(2, "0");
  return `${sign === "NEGATIVE" ? "−" : ""}${euros},${cents} €`;
}

function paymentStateLabel(state: PaymentEvidenceStateV1): string {
  const labels: Readonly<Record<PaymentEvidenceStateV1, string>> = Object.freeze({
    CONFIRMED: "Pago confirmado en el justificante",
    PARTIAL: "Pago parcial confirmado en el justificante",
    ATTEMPTED: "Intento de pago",
    REJECTED: "Pago rechazado",
    CANCELLED: "Pago anulado",
    RETURNED: "Pago devuelto",
    UNKNOWN: "Resultado de pago pendiente de revisión",
  });
  return labels[state];
}

function parseReviewDocument(value: unknown): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const item = snapshotRecord(value);
  assertKeys(item, [
    "reviewDocumentId", "extractorId", "familyId", "title", "subtitle", "pageFrom",
    "pageTo", "confidence", "fields", "warnings", "requiresHumanReview",
  ]);
  assertBoundedString(item.reviewDocumentId, 160);
  if (!EXTRACTOR_IDS.has(item.extractorId as FiscalNotificationVerticalSliceExtractorIdV1)) throw invalidReview();
  if (!FAMILY_IDS.has(item.familyId as FiscalNotificationDocumentFamilyIdV3)) throw invalidReview();
  assertBoundedString(item.title, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars);
  assertBoundedString(item.subtitle, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars);
  assertPage(item.pageFrom);
  assertPage(item.pageTo);
  if (Number(item.pageTo) < Number(item.pageFrom)) throw invalidReview();
  assertConfidence(item.confidence);
  if (item.requiresHumanReview !== true) throw invalidReview();
  const fieldValues = snapshotArray(item.fields, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxFieldsPerDocument);
  if (fieldValues.length === 0) throw invalidReview();
  const seenFields = new Set<string>();
  const fields = fieldValues.map((fieldValue) => {
    const reviewField = parseReviewField(fieldValue, Number(item.pageFrom), Number(item.pageTo));
    if (seenFields.has(reviewField.fieldId)) throw invalidReview();
    seenFields.add(reviewField.fieldId);
    return reviewField;
  });
  const warnings = snapshotArray(item.warnings, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxWarningsPerDocument)
    .map((warning) => {
      assertBoundedString(warning, 240);
      return warning as string;
    });
  return Object.freeze({
    reviewDocumentId: item.reviewDocumentId as string,
    extractorId: item.extractorId as FiscalNotificationVerticalSliceExtractorIdV1,
    familyId: item.familyId as FiscalNotificationDocumentFamilyIdV3,
    title: item.title as string,
    subtitle: item.subtitle as string,
    pageFrom: Number(item.pageFrom),
    pageTo: Number(item.pageTo),
    confidence: Number(item.confidence),
    fields: Object.freeze(fields),
    warnings: Object.freeze(warnings),
    requiresHumanReview: true,
  });
}

function parseReviewField(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const item = snapshotRecord(value);
  assertKeys(item, [
    "fieldId", "semantic", "canonicalType", "label", "displayValue", "normalizedValue",
    "amountCents", "currency", "sourcePageNumbers", "sourceLabel", "confidence", "reviewStatus",
  ]);
  assertBoundedString(item.fieldId, 160);
  if (!FIELD_SEMANTICS.has(String(item.semantic))) throw invalidReview();
  if (!isCanonicalTypeValid(String(item.semantic), item.canonicalType)) throw invalidReview();
  assertBoundedString(item.label, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars);
  assertBoundedString(item.displayValue, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxDisplayValueChars);
  if (item.normalizedValue !== null) {
    assertBoundedString(item.normalizedValue, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxNormalizedValueChars);
  }
  const money = item.semantic === "MONEY";
  if (money) {
    assertNonNegativeIntegerCents(item.amountCents, "verticalSliceReview.amountCents");
    if (item.currency !== "EUR") throw invalidReview();
  } else if (item.amountCents !== null || item.currency !== null) {
    throw invalidReview();
  }
  const pageValues = snapshotArray(item.sourcePageNumbers, FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages);
  if (pageValues.length === 0) throw invalidReview();
  const seenPages = new Set<number>();
  const sourcePageNumbers = pageValues.map((page) => {
    assertPage(page);
    const pageNumber = Number(page);
    if (pageNumber < pageFrom || pageNumber > pageTo || seenPages.has(pageNumber)) throw invalidReview();
    seenPages.add(pageNumber);
    return pageNumber;
  });
  assertBoundedString(item.sourceLabel, FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxSourceLabelChars);
  assertConfidence(item.confidence);
  if (item.reviewStatus !== "REVIEW_REQUIRED") throw invalidReview();
  return Object.freeze({
    fieldId: item.fieldId as string,
    semantic: item.semantic as FiscalNotificationVerticalSliceFieldSemanticV1,
    canonicalType: item.canonicalType as FiscalNotificationVerticalSliceCanonicalFieldTypeV1,
    label: item.label as string,
    displayValue: item.displayValue as string,
    normalizedValue: item.normalizedValue as string | null,
    amountCents: money ? Number(item.amountCents) : null,
    currency: money ? "EUR" : null,
    sourcePageNumbers: Object.freeze(sourcePageNumbers),
    sourceLabel: item.sourceLabel as string,
    confidence: Number(item.confidence),
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function isCanonicalTypeValid(semantic: string, value: unknown): boolean {
  if (typeof value !== "string") return false;
  switch (semantic) {
    case "REFERENCE": return REFERENCE_TYPES.has(value);
    case "MONEY": return MONEY_TYPES.has(value);
    case "DATE": return DATE_TYPES.has(value);
    case "PARTY": return PARTY_TYPES.has(value);
    case "STATUS": return value === "DOCUMENT_STATUS";
    case "OBLIGATION": return value === "OBLIGATION";
    case "MASKED_VALUE": return value === "MASKED_ACCOUNT";
    case "DETAIL": return DETAIL_TYPES.has(value);
    default: return false;
  }
}

function snapshotRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw invalidReview();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw invalidReview();
  const copy: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw invalidReview();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw invalidReview();
    copy[key] = descriptor.value;
  }
  return copy;
}

function snapshotArray(value: unknown, max: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) throw invalidReview();
  return [...value];
}

function assertKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const allowed = new Set(keys);
  if (Reflect.ownKeys(value).length !== allowed.size) throw invalidReview();
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.has(key)) throw invalidReview();
  }
}

function assertBoundedString(value: unknown, max: number): void {
  if (
    typeof value !== "string" || value.length === 0 || value.length > max ||
    value !== value.trim() || /[\u0000-\u001f\u007f-\u009f]/u.test(value)
  ) throw invalidReview();
}

function assertPage(value: unknown): void {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages) {
    throw invalidReview();
  }
}

function assertConfidence(value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw invalidReview();
}

function invalidReview(): FiscalNotificationVerticalSliceReviewErrorV1 {
  return new FiscalNotificationVerticalSliceReviewErrorV1();
}
