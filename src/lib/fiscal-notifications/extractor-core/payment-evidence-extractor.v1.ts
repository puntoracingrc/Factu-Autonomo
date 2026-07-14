import {
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type {
  AdministrativeActV1,
  AdministrativeEntityV1,
  EntityEvidenceV1,
  PartyV1,
  PaymentEventV1,
  TaxProcedureV1,
} from "./domain.v1";
import { createDocumentSegmentV1, type DocumentSegmentV1 } from "./document-segment.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import { createMonetaryComponentV1, type MonetaryComponentV1 } from "./monetary-component.v1";
import { createProceduralDateV1, type ProceduralDateV1 } from "./procedural-date.v1";
import { normalizeReferenceV1, type ReferenceTypeV1, type ReferenceV1 } from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const PAYMENT_EVIDENCE_EXTRACTOR_VERSION_V1 = "1.0.0" as const;

export const PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxTextFactChars: 1_000,
  maxHeaderLines: 50,
} as const);

export type PaymentEvidenceDocumentKindV1 =
  | "JUSTIFICANTE_DE_PAGO"
  | "JUSTIFICANTE_DEL_INGRESO"
  | "RECIBO_DE_PAGO"
  | "RESULTADO_DEL_PAGO";

export type PaymentEvidenceStateV1 =
  | "CONFIRMED"
  | "PARTIAL"
  | "ATTEMPTED"
  | "REJECTED"
  | "CANCELLED"
  | "RETURNED"
  | "UNKNOWN";

export interface PaymentEvidenceTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly extractionMethod: "CLOSED_LABEL";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface PaymentEvidenceMoneyFactV1 {
  readonly printedValue: string;
  readonly amountCents: number;
  readonly sign: "POSITIVE" | "NEGATIVE";
  readonly sourcePage: number;
  readonly sourceLabel: "Importe del pago";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface PaymentEvidenceMaskedAccountFactV1 {
  readonly maskedValue: string;
  readonly sourcePage: number;
  readonly sourceLabel: "Cuenta de cargo";
  readonly extractionMethod: "CLOSED_LABEL_REDACTED";
  readonly disclosurePolicy: "MASKED_LAST_FOUR_ONLY";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface PaymentEvidenceFactsV1 {
  readonly documentKind: PaymentEvidenceDocumentKindV1 | null;
  readonly paymentState: PaymentEvidenceStateV1;
  readonly stateBasis:
    | "EXPLICIT_RESULT"
    | "EXPLICIT_RECEIPT_WITH_VALID_NRC_AND_CORE_FIELDS"
    | "EXPLICIT_RECEIPT_WITH_COMPLETE_CORE_FIELDS"
    | "UNKNOWN";
  readonly receiptNumber: PaymentEvidenceTextFactV1 | null;
  readonly nrc: PaymentEvidenceTextFactV1 | null;
  readonly paymentDate: PaymentEvidenceTextFactV1 | null;
  readonly paymentTime: PaymentEvidenceTextFactV1 | null;
  readonly taxId: PaymentEvidenceTextFactV1 | null;
  readonly model: PaymentEvidenceTextFactV1 | null;
  readonly fiscalYear: PaymentEvidenceTextFactV1 | null;
  readonly period: PaymentEvidenceTextFactV1 | null;
  readonly liquidationKey: PaymentEvidenceTextFactV1 | null;
  readonly debtKey: PaymentEvidenceTextFactV1 | null;
  readonly amountPaid: PaymentEvidenceMoneyFactV1 | null;
  readonly collaboratingEntity: PaymentEvidenceTextFactV1 | null;
  readonly paymentMedium: PaymentEvidenceTextFactV1 | null;
  readonly result: PaymentEvidenceTextFactV1 | null;
  readonly rejectionReason: PaymentEvidenceTextFactV1 | null;
  readonly maskedBankAccount: PaymentEvidenceMaskedAccountFactV1 | null;
  readonly paymentScope: PaymentEvidenceTextFactV1 | null;
  readonly returnDate: PaymentEvidenceTextFactV1 | null;
}

export interface PaymentEvidenceExtractorOutputV1 extends ExtractorOutputV1 {
  readonly paymentEvidenceFacts: PaymentEvidenceFactsV1;
  readonly retainedSourceContent: "NONE";
  readonly paymentStatePolicy: "ONLY_POSITIVE_PRINTED_EVIDENCE_CAN_CONFIRM_PAYMENT";
  readonly accountPolicy: "MASK_LAST_FOUR_AND_DISCARD_RAW_VALUE";
  readonly legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS";
}

export interface ExtractPaymentEvidenceInputV1 {
  readonly document: BoundedDocumentInput;
  readonly segments: readonly DocumentSegmentV1[];
}

interface PrivateLineV1 {
  readonly pageNumber: number;
  readonly lineIndex: number;
  readonly raw: string;
  readonly folded: string;
}

interface ValidatedSegmentsV1 {
  readonly paymentSegments: readonly DocumentSegmentV1[];
  readonly pageToFactSegment: ReadonlyMap<number, DocumentSegmentV1>;
}

interface ParsedPaymentEvidenceV1 {
  readonly facts: PaymentEvidenceFactsV1;
  readonly familyId: "payment.receipt" | "payment.failed_or_reversed";
  readonly references: readonly ReferenceV1[];
  readonly money: readonly MonetaryComponentV1[];
  readonly dates: readonly ProceduralDateV1[];
  readonly warnings: readonly string[];
}

const LABELS = Object.freeze({
  receiptNumber: ["numero de justificante", "numero de recibo", "justificante del ingreso", "referencia del pago"],
  nrc: ["numero de referencia completo (nrc)", "numero de referencia completo", "nrc"],
  paymentDate: ["fecha del pago", "fecha de pago", "fecha de la operacion", "fecha del ingreso"],
  paymentTime: ["hora del pago", "hora de pago", "hora de la operacion"],
  taxId: ["n.i.f.", "nif", "nif del obligado", "nif del pagador"],
  model: ["modelo"],
  fiscalYear: ["ejercicio", "ano"],
  period: ["periodo"],
  liquidationKey: ["clave de liquidacion"],
  debtKey: ["clave de deuda"],
  amountPaid: ["importe pagado", "importe del pago", "importe del ingreso", "importe"],
  collaboratingEntity: ["entidad colaboradora", "entidad financiera", "entidad"],
  paymentMedium: ["medio de pago", "forma de pago"],
  result: ["resultado de la operacion", "resultado del pago", "estado del pago", "resultado"],
  rejectionReason: ["motivo del rechazo", "motivo de rechazo", "causa del rechazo", "motivo"],
  bankAccount: ["cuenta de cargo", "iban de cargo", "cuenta bancaria"],
  paymentScope: ["tipo de pago", "alcance del pago"],
  returnDate: ["fecha de devolucion", "fecha del retroceso", "fecha de anulacion"],
} as const);

const ALL_LABEL_LITERALS = Object.freeze(Object.values(LABELS).flat());
const DOCUMENT_TITLES = Object.freeze([
  ["justificante de pago", "JUSTIFICANTE_DE_PAGO"],
  ["justificante del pago", "JUSTIFICANTE_DE_PAGO"],
  ["justificante del ingreso", "JUSTIFICANTE_DEL_INGRESO"],
  ["justificante de ingreso", "JUSTIFICANTE_DEL_INGRESO"],
  ["recibo de pago", "RECIBO_DE_PAGO"],
  ["resultado del pago", "RESULTADO_DEL_PAGO"],
] as const);
const PAYMENT_ORDER_TITLES = Object.freeze(["carta de pago", "documento de ingreso"] as const);
const NON_DOCUMENT_HEADER_PREFIXES = Object.freeze([
  "guia de ejemplo",
  "manual de usuario",
  "documento de prueba",
  "ejemplo de justificante",
] as const);
const CONFLICTING_AUTHORITY_MARKERS = Object.freeze([
  "agencia tributaria canaria",
  "hacienda foral",
  "bizkaia",
  "gipuzkoa",
  "araba",
  "navarra",
] as const);
const OFFICIAL_AEAT_DOMAINS = new Set(["sede.agenciatributaria.gob.es", "www.agenciatributaria.es"]);

const STATUS_LITERALS = Object.freeze({
  CONFIRMED: ["pago realizado", "operacion realizada correctamente", "pago correcto", "ingreso realizado", "pagado", "confirmado"],
  PARTIAL: ["pago parcial", "pagado parcialmente", "ingreso parcial"],
  ATTEMPTED: ["pago iniciado", "pago en tramitacion", "operacion iniciada"],
  REJECTED: ["pago rechazado", "operacion rechazada", "pago no realizado", "rechazado"],
  CANCELLED: ["pago anulado", "operacion anulada", "anulado", "cancelado"],
  RETURNED: ["pago devuelto", "operacion devuelta", "devuelto"],
} as const satisfies Readonly<Record<Exclude<PaymentEvidenceStateV1, "UNKNOWN">, readonly string[]>>);

export function extractPaymentEvidenceV1(input: ExtractPaymentEvidenceInputV1): PaymentEvidenceExtractorOutputV1 {
  assertExactDataRecordV1(input, "paymentEvidenceInput", ["document", "segments"]);
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const validated = validateSegments(input.document, input.segments);
  if (validated.paymentSegments.length === 0) return emptyOutput("UNKNOWN");
  const paymentPages = new Set(validated.paymentSegments.flatMap((segment) => range(segment.pageFrom, segment.pageTo)));
  const lines = collectLines(input.document, paymentPages);
  const recognition = recognizePaymentEvidence(lines, validated.paymentSegments);
  if (recognition.status !== "RECOGNIZED") {
    return emptyOutput(recognition.status === "BLOCKED" ? "BLOCKED" : "UNKNOWN", recognition.warning);
  }

  const parsed = parsePaymentEvidence(input.document.documentId, recognition.documentKind, lines);
  const evidence = createEvidence(input.document, validated.pageToFactSegment, uniqueNumbers([...paymentPages]));
  const actId = entityId(input.document, "act", 0);
  const act: AdministrativeActV1 = Object.freeze({
    entityId: actId,
    ownerScope: input.document.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence,
    familyId: parsed.familyId,
    actSubtype: `${recognition.documentKind}:${parsed.facts.paymentState}`,
    references: parsed.references,
    dates: parsed.dates,
  });
  const procedure: TaxProcedureV1 = Object.freeze({
    entityId: entityId(input.document, "procedure", 0),
    ownerScope: input.document.ownerScope,
    entityKind: "TAX_PROCEDURE",
    evidence,
    procedureType: "PAYMENT_EVIDENCE_REVIEW",
    referenceIds: Object.freeze([]),
    actIds: Object.freeze([actId]),
  });
  const entities: AdministrativeEntityV1[] = [act, procedure];
  const domainStatus = toDomainPaymentStatus(parsed.facts.paymentState);
  if (domainStatus) {
    const payment: PaymentEventV1 = Object.freeze({
      entityId: entityId(input.document, "payment", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PAYMENT_EVENT",
      evidence,
      paymentStatus: domainStatus,
      monetaryComponents: parsed.money,
      referenceIds: Object.freeze([]),
    });
    entities.push(payment);
  }
  if (parsed.facts.taxId) {
    const payer: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party-payer", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence: createEvidence(input.document, validated.pageToFactSegment, parsed.facts.taxId.pageNumbers),
      displayName: null,
      taxIdReferenceId: null,
      roles: Object.freeze(["PAYER"] as const),
    });
    entities.push(payer);
  }
  if (parsed.facts.collaboratingEntity) {
    const financialEntity: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party-financial-entity", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence: createEvidence(input.document, validated.pageToFactSegment, parsed.facts.collaboratingEntity.pageNumbers),
      displayName: parsed.facts.collaboratingEntity.printedValue,
      taxIdReferenceId: null,
      roles: Object.freeze(["FINANCIAL_ENTITY"] as const),
    });
    entities.push(financialEntity);
  }

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "payment-evidence",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status: "REVIEW_REQUIRED",
    familyCandidates: Object.freeze([Object.freeze({
      familyId: parsed.familyId,
      confidence: parsed.facts.paymentState === "UNKNOWN" ? 0.9 : 1,
      matchingEvidenceIds: Object.freeze(validated.paymentSegments.map((segment) => segment.segmentId)),
      contradictoryEvidenceIds: Object.freeze([]),
    })]),
    entities: Object.freeze(entities),
    references: parsed.references,
    monetaryComponents: parsed.money,
    proceduralDates: parsed.dates,
    warnings: parsed.warnings,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
    paymentEvidenceFacts: parsed.facts,
    retainedSourceContent: "NONE",
    paymentStatePolicy: "ONLY_POSITIVE_PRINTED_EVIDENCE_CAN_CONFIRM_PAYMENT",
    accountPolicy: "MASK_LAST_FOUR_AND_DISCARD_RAW_VALUE",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function recognizePaymentEvidence(
  lines: readonly PrivateLineV1[],
  paymentSegments: readonly DocumentSegmentV1[],
): { readonly status: "RECOGNIZED"; readonly documentKind: PaymentEvidenceDocumentKindV1 } |
  { readonly status: "UNKNOWN" | "BLOCKED"; readonly warning: string | null } {
  const firstPage = Math.min(...paymentSegments.map((segment) => segment.pageFrom));
  const headerLines = lines.filter((line) => line.pageNumber === firstPage && line.lineIndex < PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1.maxHeaderLines);
  if (headerLines.some((line) => NON_DOCUMENT_HEADER_PREFIXES.some((prefix) => line.folded.startsWith(prefix)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_NON_DOCUMENT_GUIDE" };
  }
  if (lines.some((line) => CONFLICTING_AUTHORITY_MARKERS.some((marker) => containsTokenSequence(line.folded, marker)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_AUTHORITY_OR_TERRITORY" };
  }
  if (headerLines.some((line) => PAYMENT_ORDER_TITLES.includes(line.folded as (typeof PAYMENT_ORDER_TITLES)[number]))) {
    return { status: "BLOCKED", warning: "PAYMENT_ORDER_IS_NOT_PAYMENT_EVIDENCE" };
  }
  const officialDomainPrinted = headerLines.some((line) => OFFICIAL_AEAT_DOMAINS.has(line.folded));
  const trustedSegmentAuthority = paymentSegments.every((segment) => segment.detectedAuthority === "AEAT" && segment.classificationConfidence >= 0.9);
  if (!officialDomainPrinted && !trustedSegmentAuthority) return { status: "UNKNOWN", warning: null };

  const titles = new Set<PaymentEvidenceDocumentKindV1>();
  for (const segment of paymentSegments) {
    const kind = titleKind(fold(segment.detectedTitle ?? ""));
    if (kind) titles.add(kind);
  }
  for (const line of headerLines) {
    const kind = titleKind(line.folded);
    if (kind) titles.add(kind);
  }
  if (titles.size > 1) return { status: "BLOCKED", warning: "CONFLICTING_PAYMENT_EVIDENCE_KIND" };
  const documentKind = [...titles][0];
  return documentKind ? { status: "RECOGNIZED", documentKind } : { status: "UNKNOWN", warning: null };
}

function titleKind(value: string): PaymentEvidenceDocumentKindV1 | null {
  const match = DOCUMENT_TITLES.find(([title]) => value === title || value.startsWith(`${title} `));
  return match?.[1] ?? null;
}

function parsePaymentEvidence(
  documentId: string,
  documentKind: PaymentEvidenceDocumentKindV1,
  lines: readonly PrivateLineV1[],
): ParsedPaymentEvidenceV1 {
  const warnings: string[] = [];
  const receiptNumber = uniqueLabelFact(lines, LABELS.receiptNumber, "Número de justificante", warnings, "CONFLICTING_RECEIPT_NUMBER");
  const nrc = uniqueLabelFact(lines, LABELS.nrc, "NRC", warnings, "CONFLICTING_NRC");
  const paymentDate = uniqueLabelFact(lines, LABELS.paymentDate, "Fecha del pago", warnings, "CONFLICTING_PAYMENT_DATE");
  const paymentTime = uniqueLabelFact(lines, LABELS.paymentTime, "Hora del pago", warnings, "CONFLICTING_PAYMENT_TIME");
  const taxId = uniqueLabelFact(lines, LABELS.taxId, "NIF", warnings, "CONFLICTING_TAX_ID");
  const model = uniqueLabelFact(lines, LABELS.model, "Modelo", warnings, "CONFLICTING_MODEL");
  const fiscalYear = uniqueLabelFact(lines, LABELS.fiscalYear, "Ejercicio", warnings, "CONFLICTING_FISCAL_YEAR");
  const period = uniqueLabelFact(lines, LABELS.period, "Periodo", warnings, "CONFLICTING_TAX_PERIOD");
  const liquidationKey = uniqueLabelFact(lines, LABELS.liquidationKey, "Clave de liquidación", warnings, "CONFLICTING_LIQUIDATION_KEY");
  const debtKey = uniqueLabelFact(lines, LABELS.debtKey, "Clave de deuda", warnings, "CONFLICTING_DEBT_KEY");
  const collaboratingEntity = uniqueLabelFact(lines, LABELS.collaboratingEntity, "Entidad colaboradora", warnings, "CONFLICTING_COLLABORATING_ENTITY");
  const paymentMedium = uniqueLabelFact(lines, LABELS.paymentMedium, "Medio de pago", warnings, "CONFLICTING_PAYMENT_MEDIUM");
  const result = uniqueLabelFact(lines, LABELS.result, "Resultado del pago", warnings, "CONFLICTING_PAYMENT_RESULT");
  const rejectionReason = uniqueLabelFact(lines, LABELS.rejectionReason, "Motivo del rechazo", warnings, "CONFLICTING_REJECTION_REASON");
  const paymentScope = uniqueLabelFact(lines, LABELS.paymentScope, "Tipo de pago", warnings, "CONFLICTING_PAYMENT_SCOPE");
  const returnDate = uniqueLabelFact(lines, LABELS.returnDate, "Fecha de devolución", warnings, "CONFLICTING_RETURN_DATE");
  const amountPaid = extractAmountPaid(lines, warnings);
  const maskedBankAccount = extractMaskedBankAccount(lines, warnings);
  const validNrc = nrc ? /^[A-Za-z0-9]{22}$/u.test(nrc.printedValue.replaceAll(" ", "")) : false;
  if (nrc && !validNrc) warnings.push("INVALID_PRINTED_NRC");

  const explicitStates = detectExplicitStates(lines, result, paymentScope);
  let paymentState: PaymentEvidenceStateV1 = "UNKNOWN";
  let stateBasis: PaymentEvidenceFactsV1["stateBasis"] = "UNKNOWN";
  if (explicitStates.size === 1) {
    paymentState = [...explicitStates][0]!;
    stateBasis = "EXPLICIT_RESULT";
  } else if (explicitStates.size > 1) {
    warnings.push("CONFLICTING_EXPLICIT_PAYMENT_STATUS");
  } else if (amountPaid?.sign === "POSITIVE" && amountPaid.amountCents > 0 && paymentDate && validNrc) {
    paymentState = "CONFIRMED";
    stateBasis = "EXPLICIT_RECEIPT_WITH_VALID_NRC_AND_CORE_FIELDS";
  } else if (
    amountPaid?.sign === "POSITIVE" && amountPaid.amountCents > 0 && paymentDate &&
    receiptNumber && collaboratingEntity && paymentMedium
  ) {
    paymentState = "CONFIRMED";
    stateBasis = "EXPLICIT_RECEIPT_WITH_COMPLETE_CORE_FIELDS";
  } else {
    warnings.push("MISSING_EXPLICIT_PAYMENT_STATUS_OR_CORE_RECEIPT_EVIDENCE");
  }
  if (paymentScope && /^parcial(?:mente)?$/u.test(fold(paymentScope.printedValue)) && paymentState === "CONFIRMED") {
    paymentState = "PARTIAL";
    stateBasis = "EXPLICIT_RESULT";
  }
  if (paymentState === "REJECTED" && !rejectionReason) warnings.push("MISSING_EXPLICIT_REJECTION_REASON");
  if (paymentState === "RETURNED" && !returnDate) warnings.push("MISSING_EXPLICIT_RETURN_DATE");

  const references: ReferenceV1[] = [];
  addReference(references, documentId, "PAYMENT_RECEIPT_ID", receiptNumber);
  if (validNrc) addReference(references, documentId, "NRC", nrc);
  addReference(references, documentId, "NIF", taxId);
  addReference(references, documentId, "MODEL", model);
  addReference(references, documentId, "FISCAL_YEAR", fiscalYear);
  addReference(references, documentId, "TAX_PERIOD", period);
  addReference(references, documentId, "LIQUIDATION_KEY", liquidationKey);
  addReference(references, documentId, "DEBT_KEY", debtKey);

  const money = amountPaid && amountPaid.sign === "POSITIVE" && amountPaid.amountCents > 0 &&
    ["CONFIRMED", "PARTIAL"].includes(paymentState)
    ? Object.freeze([createMonetaryComponentV1({
        componentId: `${stablePrefix(documentId)}-money-0`,
        componentType: paymentState === "PARTIAL" ? "PARTIAL_PAYMENT" : "TOTAL_PAID",
        amountCents: amountPaid.amountCents,
        currency: "EUR",
        sign: amountPaid.sign,
        sourceDocumentId: documentId,
        sourcePage: amountPaid.sourcePage,
        sourceLabel: amountPaid.sourceLabel,
        sourceCoordinates: null,
        extractionConfidence: 1,
        explicitlyPrinted: true,
        calculated: false,
        calculationFormula: null,
        relatedDebtKey: debtKey?.printedValue ?? liquidationKey?.printedValue ?? null,
        requiresHumanReview: true,
      })])
    : Object.freeze([]);
  const dates: ProceduralDateV1[] = [];
  addPrintedDate(dates, documentId, paymentDate, "PAYMENT_DATE", "Fecha del pago", warnings, "INVALID_PRINTED_PAYMENT_DATE");
  addPrintedDate(dates, documentId, returnDate, "ACTION_DATE", "Fecha de devolución", warnings, "INVALID_PRINTED_RETURN_DATE");

  const familyId = ["REJECTED", "CANCELLED", "RETURNED"].includes(paymentState)
    ? "payment.failed_or_reversed"
    : "payment.receipt";
  return Object.freeze({
    facts: Object.freeze({
      documentKind,
      paymentState,
      stateBasis,
      receiptNumber,
      nrc,
      paymentDate,
      paymentTime,
      taxId,
      model,
      fiscalYear,
      period,
      liquidationKey,
      debtKey,
      amountPaid,
      collaboratingEntity,
      paymentMedium,
      result,
      rejectionReason,
      maskedBankAccount,
      paymentScope,
      returnDate,
    }),
    familyId,
    references: Object.freeze(references),
    money,
    dates: Object.freeze(dates),
    warnings: Object.freeze([...new Set(warnings)]),
  });
}

function detectExplicitStates(
  lines: readonly PrivateLineV1[],
  result: PaymentEvidenceTextFactV1 | null,
  paymentScope: PaymentEvidenceTextFactV1 | null,
): Set<Exclude<PaymentEvidenceStateV1, "UNKNOWN">> {
  const values = [result?.printedValue, paymentScope?.printedValue]
    .filter((value): value is string => Boolean(value))
    .map(fold);
  for (const line of lines.slice(0, PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1.maxHeaderLines)) {
    values.push(line.folded);
    if ([...LABELS.result, ...LABELS.paymentScope].some((label) => matchesLabel(line.folded, label))) {
      const separator = line.raw.search(/[:\-]/u);
      if (separator >= 0) values.push(fold(line.raw.slice(separator + 1)));
    }
  }
  const states = new Set<Exclude<PaymentEvidenceStateV1, "UNKNOWN">>();
  for (const [state, literals] of Object.entries(STATUS_LITERALS) as [Exclude<PaymentEvidenceStateV1, "UNKNOWN">, readonly string[]][]) {
    if (values.some((value) => literals.some((literal) => value === literal || value.startsWith(`${literal} `)))) states.add(state);
  }
  return states;
}

function uniqueLabelFact(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  conflictWarning: string,
): PaymentEvidenceTextFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    if (!labels.some((label) => matchesLabel(line.folded, label))) return [];
    const value = extractLabelValue(lines, line, index);
    return value ? [{ value, page: line.pageNumber }] : [];
  });
  const distinct = new Map(observations.map((item) => [fold(item.value), item]));
  if (distinct.size > 1) {
    warnings.push(conflictWarning);
    return null;
  }
  const only = [...distinct.values()][0];
  return only ? textFact(only.value, [only.page], sourceLabel) : null;
}

function extractAmountPaid(lines: readonly PrivateLineV1[], warnings: string[]): PaymentEvidenceMoneyFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    if (!LABELS.amountPaid.some((label) => matchesLabel(line.folded, label))) return [];
    const value = extractLabelValue(lines, line, index);
    const parsed = value ? parsePrintedEuro(value) : null;
    if (value && !parsed && looksLikePrintedMoney(value)) warnings.push("INVALID_PRINTED_AMOUNT_PAID");
    return value && parsed ? [{ value, ...parsed, page: line.pageNumber }] : [];
  });
  const distinct = new Map(observations.map((item) => [`${item.sign}|${item.amountCents}`, item]));
  if (distinct.size > 1) {
    warnings.push("CONFLICTING_PRINTED_AMOUNT_PAID");
    return null;
  }
  const only = [...distinct.values()][0];
  if (!only) return null;
  if (only.sign !== "POSITIVE" || only.amountCents === 0) warnings.push("NON_POSITIVE_PAYMENT_AMOUNT");
  return Object.freeze({
    printedValue: only.value,
    amountCents: only.amountCents,
    sign: only.sign,
    sourcePage: only.page,
    sourceLabel: "Importe del pago",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function extractMaskedBankAccount(
  lines: readonly PrivateLineV1[],
  warnings: string[],
): PaymentEvidenceMaskedAccountFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    if (!LABELS.bankAccount.some((label) => matchesLabel(line.folded, label))) return [];
    const value = extractLabelValue(lines, line, index);
    return value ? [{ value: maskAccount(value), page: line.pageNumber }] : [];
  });
  const distinct = new Map(observations.map((item) => [item.value, item]));
  if (distinct.size > 1) {
    warnings.push("CONFLICTING_MASKED_BANK_ACCOUNT");
    return null;
  }
  const only = [...distinct.values()][0];
  return only ? Object.freeze({
    maskedValue: only.value,
    sourcePage: only.page,
    sourceLabel: "Cuenta de cargo",
    extractionMethod: "CLOSED_LABEL_REDACTED",
    disclosurePolicy: "MASKED_LAST_FOUR_ONLY",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    reviewStatus: "REVIEW_REQUIRED",
  }) : null;
}

function maskAccount(value: string): string {
  const compact = value.normalize("NFKC").replace(/[^A-Za-z0-9]/gu, "");
  return compact.length < 4 ? "****" : `****${compact.slice(-4).toUpperCase()}`;
}

function extractLabelValue(lines: readonly PrivateLineV1[], line: PrivateLineV1, index: number): string | null {
  const separator = line.raw.search(/[:\-]/u);
  const sameLine = separator >= 0 ? line.raw.slice(separator + 1).trim() : "";
  if (sameLine.length > 0 && sameLine.length <= PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1.maxTextFactChars) return sameLine;
  const next = lines[index + 1];
  if (
    next && next.pageNumber === line.pageNumber &&
    next.raw.length <= PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1.maxTextFactChars &&
    !ALL_LABEL_LITERALS.some((label) => matchesLabel(next.folded, label))
  ) return next.raw;
  return null;
}

function addReference(
  target: ReferenceV1[],
  documentId: string,
  referenceType: ReferenceTypeV1,
  fact: PaymentEvidenceTextFactV1 | null,
): void {
  if (!fact) return;
  target.push(normalizeReferenceV1({
    referenceType,
    rawValue: fact.printedValue,
    sourceDocumentId: documentId,
    sourcePage: fact.pageNumbers[0]!,
    sourceLabel: fact.sourceLabel,
    sourceCoordinates: null,
    confidence: 1,
  }));
}

function addPrintedDate(
  target: ProceduralDateV1[],
  documentId: string,
  fact: PaymentEvidenceTextFactV1 | null,
  dateType: "PAYMENT_DATE" | "ACTION_DATE",
  sourceLabel: string,
  warnings: string[],
  invalidWarning: string,
): void {
  if (!fact) return;
  const parsedDate = parsePrintedDate(fact.printedValue);
  if (!parsedDate) warnings.push(invalidWarning);
  target.push(createProceduralDateV1({
    proceduralDateId: `${stablePrefix(documentId)}-date-${dateType.toLowerCase()}`,
    dateType,
    rawText: fact.printedValue,
    rawDeadlineText: null,
    parsedDate,
    timezone: null,
    sourceDocumentId: documentId,
    sourcePage: fact.pageNumbers[0]!,
    sourceLabel,
    sourceCoordinates: null,
    extractionConfidence: 1,
    explicitlyPrinted: true,
    legallyComputed: false,
    computationRuleId: null,
    requiresReview: true,
  }));
}

function textFact(printedValue: string, pageNumbers: readonly number[], sourceLabel: string): PaymentEvidenceTextFactV1 {
  if (printedValue.length === 0 || printedValue.length > PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1.maxTextFactChars) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "paymentEvidence.textFact");
  }
  return Object.freeze({
    printedValue,
    pageNumbers: uniqueNumbers(pageNumbers),
    sourceLabel,
    extractionMethod: "CLOSED_LABEL",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function validateSegments(document: BoundedDocumentInput, rawSegments: readonly DocumentSegmentV1[]): ValidatedSegmentsV1 {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0 || rawSegments.length > document.pages.length) {
    throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "paymentEvidence.segments");
  }
  const segments = rawSegments.map((segment) => createDocumentSegmentV1(segment));
  const covered = new Set<number>();
  const ids = new Set<string>();
  const pageToFactSegment = new Map<number, DocumentSegmentV1>();
  for (const segment of segments) {
    if (segment.documentId !== document.documentId || ids.has(segment.segmentId)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", "paymentEvidence.segments.identity");
    }
    ids.add(segment.segmentId);
    for (let page = segment.pageFrom; page <= segment.pageTo; page += 1) {
      if (covered.has(page) || page > document.pages.length) {
        throw new FiscalNotificationInputError("INVALID_INPUT", "paymentEvidence.segments.coverage");
      }
      covered.add(page);
      if (segment.canGenerateAdministrativeFacts) pageToFactSegment.set(page, segment);
    }
  }
  if (covered.size !== document.pages.length) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "paymentEvidence.segments.coverage");
  }
  return Object.freeze({
    paymentSegments: Object.freeze(segments.filter((segment) => segment.segmentType === "PAYMENT_DOCUMENT")),
    pageToFactSegment,
  });
}

function collectLines(document: BoundedDocumentInput, factualPages: ReadonlySet<number>): readonly PrivateLineV1[] {
  const lines: PrivateLineV1[] = [];
  for (const page of document.pages) {
    if (!factualPages.has(page.pageNumber)) continue;
    const pageLines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    for (let index = 0; index < pageLines.length; index += 1) {
      assertNotAborted(document.signal);
      const raw = pageLines[index]!.trim();
      if (raw.length === 0) continue;
      if (raw.length > PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1.maxLineChars) {
        throw new FiscalNotificationInputError("INVALID_INPUT", `paymentEvidence.pages[${page.pageNumber}].line`);
      }
      lines.push(Object.freeze({ pageNumber: page.pageNumber, lineIndex: index, raw, folded: fold(raw) }));
      if (lines.length > PAYMENT_EVIDENCE_EXTRACTOR_LIMITS_V1.maxLines) {
        throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "paymentEvidence.lines");
      }
    }
  }
  return Object.freeze(lines);
}

function createEvidence(
  document: BoundedDocumentInput,
  pageToFactSegment: ReadonlyMap<number, DocumentSegmentV1>,
  pages: readonly number[],
): EntityEvidenceV1 {
  const sourceSegmentIds = new Set<string>();
  pages.forEach((page) => {
    const segment = pageToFactSegment.get(page);
    if (!segment) throw new FiscalNotificationInputError("INVALID_INPUT", "paymentEvidence.evidence.segment");
    sourceSegmentIds.add(segment.segmentId);
  });
  return Object.freeze({
    sourceDocumentIds: Object.freeze([document.documentId]),
    sourceSegmentIds: Object.freeze([...sourceSegmentIds]),
    evidenceBasis: "EXPLICIT_DOCUMENT_TEXT",
    confidence: 1,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
  });
}

function parsePrintedEuro(value: string): { readonly amountCents: number; readonly sign: "POSITIVE" | "NEGATIVE" } | null {
  const match = /^([+-])?\s*((?:\d{1,3}(?:\.\d{3})+)|\d+),(\d{2})(?:\s*(?:€|euros?))?$/iu.exec(value.trim());
  if (!match) return null;
  const euros = match[2]!.replaceAll(".", "");
  if (euros.length > 13) return null;
  const amountCents = Number(euros) * 100 + Number(match[3]);
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) return null;
  return Object.freeze({ amountCents, sign: match[1] === "-" ? "NEGATIVE" : "POSITIVE" });
}

function looksLikePrintedMoney(value: string): boolean {
  return /(?:€|\beuros?\b|\d+[.,]\d{2}\b)/iu.test(value);
}

function parsePrintedDate(value: string): string | null {
  const matches = [...value.matchAll(/(?:^|\D)(\d{2})([/-])(\d{2})\2(\d{4})(?=\D|$)/gu)];
  if (matches.length !== 1) return null;
  const match = matches[0]!;
  const day = Number(match[1]);
  const month = Number(match[3]);
  const year = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    : null;
}

function toDomainPaymentStatus(state: PaymentEvidenceStateV1): PaymentEventV1["paymentStatus"] | null {
  switch (state) {
    case "CONFIRMED": return "PAID";
    case "PARTIAL": return "PARTIALLY_PAID";
    case "ATTEMPTED": return "ATTEMPTED";
    case "REJECTED": return "REJECTED";
    case "CANCELLED": return "ANNULLED";
    case "RETURNED": return "RETURNED";
    case "UNKNOWN": return null;
  }
}

function emptyOutput(
  status: "UNKNOWN" | "BLOCKED",
  warning: string | null = null,
): PaymentEvidenceExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "payment-evidence",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status,
    familyCandidates: Object.freeze([]),
    entities: Object.freeze([]),
    references: Object.freeze([]),
    monetaryComponents: Object.freeze([]),
    proceduralDates: Object.freeze([]),
    warnings: Object.freeze(warning ? [warning] : []),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
    paymentEvidenceFacts: Object.freeze({
      documentKind: null,
      paymentState: "UNKNOWN",
      stateBasis: "UNKNOWN",
      receiptNumber: null,
      nrc: null,
      paymentDate: null,
      paymentTime: null,
      taxId: null,
      model: null,
      fiscalYear: null,
      period: null,
      liquidationKey: null,
      debtKey: null,
      amountPaid: null,
      collaboratingEntity: null,
      paymentMedium: null,
      result: null,
      rejectionReason: null,
      maskedBankAccount: null,
      paymentScope: null,
      returnDate: null,
    }),
    retainedSourceContent: "NONE",
    paymentStatePolicy: "ONLY_POSITIVE_PRINTED_EVIDENCE_CAN_CONFIRM_PAYMENT",
    accountPolicy: "MASK_LAST_FOUR_AND_DISCARD_RAW_VALUE",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/gu, " ").trim().toLowerCase();
}

function matchesLabel(foldedLine: string, label: string): boolean {
  return foldedLine === label || foldedLine.startsWith(`${label}:`) || foldedLine.startsWith(`${label} -`);
}

function containsTokenSequence(foldedLine: string, marker: string): boolean {
  return ` ${foldedLine} `.includes(` ${marker} `);
}

function uniqueNumbers(values: readonly number[]): readonly number[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left - right));
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function stablePrefix(documentId: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < documentId.length; index += 1) {
    hash ^= documentId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fx-payment-evidence-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function entityId(document: BoundedDocumentInput, kind: string, index: number): string {
  return `${stablePrefix(`${document.ownerScope}|${document.documentId}`)}-${kind}-${index}`;
}

export const PAYMENT_EVIDENCE_EXTRACTOR_RELEASE_V1 = Object.freeze({
  version: PAYMENT_EVIDENCE_EXTRACTOR_VERSION_V1,
  familyIds: Object.freeze(["payment.receipt", "payment.failed_or_reversed"] as const),
  officialInterpretationSources: Object.freeze([
    Object.freeze({ sourceId: "aeat.payment.nrc", url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/que-nrc.html" }),
    Object.freeze({ sourceId: "aeat.payment.previous", url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/consulta-pago-anterior-liquidaciones.html" }),
    Object.freeze({ sourceId: "aeat.payment.history", url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/consultar-deudas/pagos.html" }),
    Object.freeze({ sourceId: "boe.rgr.article.41", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2005-14803" }),
    Object.freeze({ sourceId: "boe.order.eha-2027-2007", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-13223" }),
  ]),
  sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
  confirmationPolicy: "VALID_NRC_OR_COMPLETE_RECEIPT_CORE_OR_EXPLICIT_RESULT_REQUIRED",
  negativeEvidencePolicy: "ABSENCE_OF_RECEIPT_NEVER_MEANS_NONPAYMENT",
  accountPolicy: "MASK_LAST_FOUR_AND_DISCARD_RAW_VALUE",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
});
