import {
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type {
  AdministrativeActV1,
  AdministrativeEntityV1,
  DebtClaimV1,
  EntityEvidenceV1,
  PartyV1,
  PaymentEventV1,
  TaxProcedureV1,
} from "./domain.v1";
import {
  createDocumentSegmentV1,
  type DocumentSegmentV1,
} from "./document-segment.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import {
  createMonetaryComponentV1,
  type MonetaryComponentTypeV1,
  type MonetaryComponentV1,
} from "./monetary-component.v1";
import {
  createProceduralDateV1,
  type ProceduralDateV1,
} from "./procedural-date.v1";
import {
  normalizeReferenceV1,
  type ReferenceTypeV1,
  type ReferenceV1,
} from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const PAYMENT_ORDER_EXTRACTOR_VERSION_V1 = "1.0.0" as const;

export const PAYMENT_ORDER_EXTRACTOR_LIMITS_V1 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxTextFactChars: 1_000,
  maxHeaderLines: 50,
} as const);

export type PaymentOrderDocumentKindV1 =
  "CARTA_DE_PAGO" | "DOCUMENTO_DE_INGRESO" | "DOCUMENTO_DE_PAGO";

export type PaymentOrderMoneyRoleV1 =
  | "PRINCIPAL"
  | "SURCHARGE"
  | "EXECUTIVE_SURCHARGE"
  | "LATE_INTEREST"
  | "COSTS"
  | "TOTAL_DUE";

export interface PaymentOrderTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly extractionMethod: "CLOSED_LABEL";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface PaymentOrderMoneyFactV1 {
  readonly role: PaymentOrderMoneyRoleV1;
  readonly printedValue: string;
  readonly amountCents: number;
  readonly sign: "POSITIVE" | "NEGATIVE";
  readonly sourcePage: number;
  readonly sourceLabel: string;
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface PaymentOrderMaskedAccountFactV1 {
  readonly maskedValue: string;
  readonly sourcePage: number;
  readonly sourceLabel: "Cuenta de cargo";
  readonly extractionMethod: "CLOSED_LABEL_REDACTED";
  readonly disclosurePolicy: "MASKED_LAST_FOUR_ONLY";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface PaymentOrderFactsV1 {
  readonly documentKind: PaymentOrderDocumentKindV1 | null;
  readonly paymentState: "ORDERED_NOT_CONFIRMED" | null;
  readonly paymentReference: PaymentOrderTextFactV1 | null;
  readonly liquidationKey: PaymentOrderTextFactV1 | null;
  readonly debtKey: PaymentOrderTextFactV1 | null;
  readonly expediente: PaymentOrderTextFactV1 | null;
  readonly model: PaymentOrderTextFactV1 | null;
  readonly fiscalYear: PaymentOrderTextFactV1 | null;
  readonly period: PaymentOrderTextFactV1 | null;
  readonly taxId: PaymentOrderTextFactV1 | null;
  readonly recipient: PaymentOrderTextFactV1 | null;
  readonly taxConcept: PaymentOrderTextFactV1 | null;
  readonly moneyFacts: readonly PaymentOrderMoneyFactV1[];
  readonly rawPaymentDeadline: PaymentOrderTextFactV1 | null;
  readonly paymentChannel: PaymentOrderTextFactV1 | null;
  readonly collaboratingEntity: PaymentOrderTextFactV1 | null;
  readonly maskedBankAccount: PaymentOrderMaskedAccountFactV1 | null;
  readonly barcodeReference: PaymentOrderTextFactV1 | null;
  readonly csv: PaymentOrderTextFactV1 | null;
  readonly explicitPaymentProof: null;
}

export interface PaymentOrderExtractorOutputV1 extends ExtractorOutputV1 {
  readonly paymentOrderFacts: PaymentOrderFactsV1;
  readonly retainedSourceContent: "NONE";
  readonly paymentProofPolicy: "ORDER_DOCUMENT_NEVER_CONFIRMS_PAYMENT";
  readonly legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS";
}

export interface ExtractPaymentOrderInputV1 {
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
  readonly segments: readonly DocumentSegmentV1[];
  readonly paymentSegments: readonly DocumentSegmentV1[];
  readonly pageToFactSegment: ReadonlyMap<number, DocumentSegmentV1>;
}

interface ParsedPaymentOrderV1 {
  readonly facts: PaymentOrderFactsV1;
  readonly references: readonly ReferenceV1[];
  readonly money: readonly MonetaryComponentV1[];
  readonly dates: readonly ProceduralDateV1[];
  readonly warnings: readonly string[];
}

const LABELS = Object.freeze({
  paymentReference: [
    "numero de justificante",
    "justificante del ingreso",
    "referencia de pago",
  ],
  liquidationKey: ["clave de liquidacion"],
  debtKey: ["clave de deuda"],
  expediente: ["numero de expediente", "expediente"],
  model: ["modelo"],
  fiscalYear: ["ejercicio fiscal", "ejercicio"],
  period: ["periodo fiscal", "periodo"],
  taxId: ["n.i.f.", "nif"],
  recipient: [
    "nombre y apellidos / razon social",
    "nombre o razon social",
    "obligado al pago",
  ],
  taxConcept: ["concepto tributario", "concepto"],
  paymentDeadline: [
    "fecha limite de pago",
    "fecha de finalizacion del periodo voluntario",
    "fecha fin del periodo voluntario",
    "fin del plazo de ingreso",
    "vencimiento",
    "plazo de ingreso",
  ],
  paymentChannel: [
    "medio de pago",
    "forma de pago",
    "modalidad de pago",
    "lugar de pago",
  ],
  collaboratingEntity: ["entidad colaboradora", "entidad financiera"],
  bankAccount: ["cuenta de cargo", "iban"],
  barcodeReference: [
    "referencia del codigo de barras",
    "codigo de barras",
    "referencia bancaria",
  ],
  csv: [
    "codigo seguro de verificacion (csv)",
    "codigo seguro de verificacion",
    "csv",
  ],
  issueDate: ["fecha de emision", "fecha de expedicion"],
  nrc: [
    "numero de referencia completo (nrc)",
    "numero de referencia completo",
    "nrc",
  ],
} as const);

const MONEY_LABELS = Object.freeze({
  PRINCIPAL: ["importe principal", "principal", "importe de la deuda"],
  SURCHARGE: ["recargo", "recargos"],
  EXECUTIVE_SURCHARGE: ["recargo de apremio", "recargo ejecutivo"],
  LATE_INTEREST: ["intereses de demora", "intereses"],
  COSTS: ["costas del procedimiento", "costas"],
  TOTAL_DUE: [
    "importe total",
    "total a ingresar",
    "importe a ingresar",
    "importe del ingreso",
    "importe pendiente",
    "total",
  ],
} as const satisfies Readonly<
  Record<PaymentOrderMoneyRoleV1, readonly string[]>
>);

const ALL_LABEL_LITERALS = Object.freeze([
  ...Object.values(LABELS).flat(),
  ...Object.values(MONEY_LABELS).flat(),
]);

const OFFICIAL_AEAT_DOMAINS = new Set([
  "sede.agenciatributaria.gob.es",
  "https://sede.agenciatributaria.gob.es",
  "www.agenciatributaria.es",
  "https://www.agenciatributaria.es",
  "http://www.agenciatributaria.es",
]);

const CONFLICTING_AUTHORITY_MARKERS = Object.freeze([
  "tesoreria general de la seguridad social",
  "agencia tributaria canaria",
  "agencia tributaria de cataluna",
  "agencia tributaria de catalunya",
  "hacienda foral",
  "diputacion foral",
  "hacienda tributaria de navarra",
  "impuesto general indirecto canario",
  "igic",
  "ipsi",
]);

const NON_DOCUMENT_HEADER_PREFIXES = Object.freeze([
  "manual",
  "guia",
  "documento de ejemplo",
  "tutorial",
  "especificacion",
]);

export function extractPaymentOrderV1(
  input: ExtractPaymentOrderInputV1,
): PaymentOrderExtractorOutputV1 {
  assertExactDataRecordV1(input, "paymentOrderInput", ["document", "segments"]);
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const validated = validateSegments(input.document, input.segments);
  if (validated.paymentSegments.length === 0) return emptyOutput("UNKNOWN");
  const paymentPages = new Set(
    validated.paymentSegments.flatMap((segment) =>
      range(segment.pageFrom, segment.pageTo),
    ),
  );
  const lines = collectLines(input.document, paymentPages);
  const recognition = recognizePaymentOrder(lines, validated.paymentSegments);
  if (recognition.status !== "RECOGNIZED") {
    return emptyOutput(
      recognition.status === "BLOCKED" ? "BLOCKED" : "UNKNOWN",
      recognition.warning,
    );
  }

  const parsed = parsePaymentOrder(
    input.document.documentId,
    recognition.documentKind,
    lines,
  );
  const evidencePages = uniqueNumbers([...paymentPages]);
  const evidence = createEvidence(
    input.document,
    validated.pageToFactSegment,
    evidencePages,
  );
  const actId = entityId(input.document, "act", 0);
  const act: AdministrativeActV1 = Object.freeze({
    entityId: actId,
    ownerScope: input.document.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence,
    familyId: "payment.payment_form",
    actSubtype: recognition.documentKind,
    references: parsed.references,
    dates: parsed.dates,
  });
  const procedure: TaxProcedureV1 = Object.freeze({
    entityId: entityId(input.document, "procedure", 0),
    ownerScope: input.document.ownerScope,
    entityKind: "TAX_PROCEDURE",
    evidence,
    procedureType: "DEBT_PAYMENT_INSTRUCTION",
    referenceIds: Object.freeze([]),
    actIds: Object.freeze([actId]),
  });
  const paymentEvent: PaymentEventV1 = Object.freeze({
    entityId: entityId(input.document, "payment-order", 0),
    ownerScope: input.document.ownerScope,
    entityKind: "PAYMENT_EVENT",
    evidence,
    paymentStatus: "ORDERED",
    monetaryComponents: parsed.money,
    referenceIds: Object.freeze([]),
  });
  const entities: AdministrativeEntityV1[] = [act, procedure, paymentEvent];
  const positiveTotal = parsed.facts.moneyFacts.find(
    (fact) =>
      fact.role === "TOTAL_DUE" &&
      fact.sign === "POSITIVE" &&
      fact.amountCents > 0,
  );
  if (positiveTotal) {
    const positiveDebtMoney = Object.freeze(
      parsed.money.filter((component) => component.sign === "POSITIVE"),
    );
    const debt: DebtClaimV1 = Object.freeze({
      entityId: entityId(input.document, "debt", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "DEBT_CLAIM",
      evidence,
      creationBasis: "EXPLICITLY_PRINTED_DEBT",
      monetaryComponents: positiveDebtMoney,
      referenceIds: Object.freeze([]),
    });
    entities.push(debt);
  }
  if (parsed.facts.recipient) {
    const party: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party-taxpayer", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence: createEvidence(
        input.document,
        validated.pageToFactSegment,
        parsed.facts.recipient.pageNumbers,
      ),
      displayName: parsed.facts.recipient.printedValue,
      taxIdReferenceId: null,
      roles: Object.freeze(["PRIMARY_DEBTOR"] as const),
    });
    entities.push(party);
  }
  if (parsed.facts.collaboratingEntity) {
    const entity: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party-financial-entity", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence: createEvidence(
        input.document,
        validated.pageToFactSegment,
        parsed.facts.collaboratingEntity.pageNumbers,
      ),
      displayName: parsed.facts.collaboratingEntity.printedValue,
      taxIdReferenceId: null,
      roles: Object.freeze(["FINANCIAL_ENTITY"] as const),
    });
    entities.push(entity);
  }

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "payment-order",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status: "REVIEW_REQUIRED",
    familyCandidates: Object.freeze([
      Object.freeze({
        familyId: "payment.payment_form",
        confidence: 1,
        matchingEvidenceIds: Object.freeze(
          validated.paymentSegments.map((segment) => segment.segmentId),
        ),
        contradictoryEvidenceIds: Object.freeze([]),
      }),
    ]),
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
    paymentOrderFacts: parsed.facts,
    retainedSourceContent: "NONE",
    paymentProofPolicy: "ORDER_DOCUMENT_NEVER_CONFIRMS_PAYMENT",
    legalInterpretationPolicy:
      "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function recognizePaymentOrder(
  lines: readonly PrivateLineV1[],
  paymentSegments: readonly DocumentSegmentV1[],
):
  | {
      readonly status: "RECOGNIZED";
      readonly documentKind: PaymentOrderDocumentKindV1;
    }
  | {
      readonly status: "UNKNOWN" | "BLOCKED";
      readonly warning: string | null;
    } {
  const firstPage = Math.min(
    ...paymentSegments.map((segment) => segment.pageFrom),
  );
  const headerLines = lines.filter(
    (line) =>
      line.pageNumber === firstPage &&
      line.lineIndex < PAYMENT_ORDER_EXTRACTOR_LIMITS_V1.maxHeaderLines,
  );
  if (
    headerLines.some((line) =>
      NON_DOCUMENT_HEADER_PREFIXES.some((prefix) =>
        line.folded.startsWith(prefix),
      ),
    )
  ) {
    return { status: "BLOCKED", warning: "CONFLICTING_NON_DOCUMENT_GUIDE" };
  }
  if (
    lines.some((line) =>
      CONFLICTING_AUTHORITY_MARKERS.some((marker) =>
        containsTokenSequence(line.folded, marker),
      ),
    )
  ) {
    return { status: "BLOCKED", warning: "CONFLICTING_AUTHORITY_OR_TERRITORY" };
  }
  const officialAuthorityPrinted = headerLines.some(
    (line) =>
      OFFICIAL_AEAT_DOMAINS.has(line.folded) ||
      line.folded === "agencia tributaria" ||
      line.folded === "agencia estatal de administracion tributaria" ||
      containsTokenSequence(line.folded, "agencia tributaria") ||
      containsTokenSequence(
        line.folded,
        "agencia estatal de administracion tributaria",
      ),
  );
  const trustedSegmentAuthority = paymentSegments.every(
    (segment) =>
      segment.detectedAuthority === "AEAT" &&
      segment.classificationConfidence >= 0.9,
  );
  if (!officialAuthorityPrinted && !trustedSegmentAuthority)
    return { status: "UNKNOWN", warning: null };

  const titles = new Set<PaymentOrderDocumentKindV1>();
  paymentSegments.forEach((segment) => {
    const title = fold(segment.detectedTitle ?? "");
    if (title === "carta de pago" || title.startsWith("carta de pago "))
      titles.add("CARTA_DE_PAGO");
    if (
      title === "documento de ingreso" ||
      title.startsWith("documento de ingreso ")
    )
      titles.add("DOCUMENTO_DE_INGRESO");
    if (title === "documento de pago" || title.startsWith("documento de pago "))
      titles.add("DOCUMENTO_DE_PAGO");
  });
  lines.forEach((line) => {
    if (line.folded === "carta de pago") titles.add("CARTA_DE_PAGO");
    if (line.folded === "documento de ingreso")
      titles.add("DOCUMENTO_DE_INGRESO");
    if (containsTokenSequence(line.folded, "documento de pago"))
      titles.add("DOCUMENTO_DE_PAGO");
  });
  const foldedPaymentText = lines.map((line) => line.folded).join(" ");
  if (containsTokenSequence(foldedPaymentText, "documento de pago"))
    titles.add("DOCUMENTO_DE_PAGO");
  if (
    containsTokenSequence(foldedPaymentText, "modelo 010") &&
    containsTokenSequence(foldedPaymentText, "justificante del ingreso")
  )
    titles.add("DOCUMENTO_DE_PAGO");
  if (
    /\b010\b/u.test(foldedPaymentText) &&
    paymentSegments.some((segment) =>
      fold(segment.detectedTitle ?? "").startsWith("justificante del ingreso"),
    )
  )
    titles.add("DOCUMENTO_DE_PAGO");
  if (titles.size > 1)
    return { status: "BLOCKED", warning: "CONFLICTING_PAYMENT_ORDER_KIND" };
  const documentKind = [...titles][0];
  return documentKind
    ? { status: "RECOGNIZED", documentKind }
    : { status: "UNKNOWN", warning: null };
}

function parsePaymentOrder(
  documentId: string,
  documentKind: PaymentOrderDocumentKindV1,
  lines: readonly PrivateLineV1[],
): ParsedPaymentOrderV1 {
  const warnings: string[] = [];
  const paymentReference = uniqueLabelFact(
    lines,
    LABELS.paymentReference,
    "Número de justificante",
    warnings,
    "CONFLICTING_PAYMENT_REFERENCE",
  );
  const liquidationKey = uniqueLabelFact(
    lines,
    LABELS.liquidationKey,
    "Clave de liquidación",
    warnings,
    "CONFLICTING_LIQUIDATION_KEY",
  );
  const debtKey = uniqueLabelFact(
    lines,
    LABELS.debtKey,
    "Clave de deuda",
    warnings,
    "CONFLICTING_DEBT_KEY",
  );
  const expediente = uniqueLabelFact(
    lines,
    LABELS.expediente,
    "Expediente",
    warnings,
    "CONFLICTING_EXPEDIENTE",
  );
  const model = uniqueLabelFact(
    lines,
    LABELS.model,
    "Modelo",
    warnings,
    "CONFLICTING_MODEL",
  );
  const fiscalYear = uniqueLabelFact(
    lines,
    LABELS.fiscalYear,
    "Ejercicio",
    warnings,
    "CONFLICTING_FISCAL_YEAR",
  );
  const period = uniqueLabelFact(
    lines,
    LABELS.period,
    "Periodo",
    warnings,
    "CONFLICTING_TAX_PERIOD",
  );
  const taxId = uniqueLabelFact(
    lines,
    LABELS.taxId,
    "NIF",
    warnings,
    "CONFLICTING_TAX_ID",
  );
  const recipient = uniqueLabelFact(
    lines,
    LABELS.recipient,
    "Obligado al pago",
    warnings,
    "CONFLICTING_RECIPIENT",
  );
  const taxConcept = uniqueLabelFact(
    lines,
    LABELS.taxConcept,
    "Concepto tributario",
    warnings,
    "CONFLICTING_TAX_CONCEPT",
  );
  const rawPaymentDeadline = uniqueLabelFact(
    lines,
    LABELS.paymentDeadline,
    "Vencimiento de pago",
    warnings,
    "CONFLICTING_PAYMENT_DEADLINE",
  );
  const paymentChannel = uniqueLabelFact(
    lines,
    LABELS.paymentChannel,
    "Medio de pago",
    warnings,
    "CONFLICTING_PAYMENT_CHANNEL",
  );
  const collaboratingEntity = uniqueLabelFact(
    lines,
    LABELS.collaboratingEntity,
    "Entidad colaboradora",
    warnings,
    "CONFLICTING_COLLABORATING_ENTITY",
  );
  const barcodeReference = uniqueLabelFact(
    lines,
    LABELS.barcodeReference,
    "Referencia bancaria",
    warnings,
    "CONFLICTING_BARCODE_REFERENCE",
  );
  const csv = uniqueLabelFact(
    lines,
    LABELS.csv,
    "CSV",
    warnings,
    "CONFLICTING_CSV",
  );
  const maskedBankAccount = extractMaskedBankAccount(lines, warnings);
  const moneyFacts = extractMoneyFacts(lines, warnings);
  const explicitNrc = uniqueLabelFact(
    lines,
    LABELS.nrc,
    "NRC",
    warnings,
    "CONFLICTING_NRC",
  );
  if (
    explicitNrc &&
    /^[A-Za-z0-9]{22}$/u.test(explicitNrc.printedValue.replaceAll(" ", ""))
  ) {
    warnings.push("PAYMENT_EVIDENCE_PRESENT_REQUIRES_SEPARATE_EXTRACTOR");
  }
  if (!paymentReference && !liquidationKey)
    warnings.push("MISSING_EXPLICIT_PAYMENT_REFERENCE");
  if (!moneyFacts.some((fact) => fact.role === "TOTAL_DUE"))
    warnings.push("MISSING_EXPLICIT_TOTAL_DUE");
  if (!rawPaymentDeadline) warnings.push("MISSING_EXPLICIT_PAYMENT_DEADLINE");

  const references: ReferenceV1[] = [];
  addReference(
    references,
    documentId,
    "OTHER_OFFICIAL_REFERENCE",
    paymentReference,
  );
  addReference(references, documentId, "LIQUIDATION_KEY", liquidationKey);
  addReference(references, documentId, "DEBT_KEY", debtKey);
  addReference(references, documentId, "EXPEDIENTE_ID", expediente);
  addReference(references, documentId, "MODEL", model);
  addReference(references, documentId, "FISCAL_YEAR", fiscalYear);
  addReference(references, documentId, "TAX_PERIOD", period);
  addReference(references, documentId, "NIF", taxId);
  addReference(references, documentId, "BANK_REFERENCE", barcodeReference);
  addReference(references, documentId, "CSV", csv);

  const money = Object.freeze(
    moneyFacts.map((fact, index) =>
      createMonetaryComponentV1({
        componentId: `${stablePrefix(documentId)}-money-${index}`,
        componentType: moneyComponentType(fact.role),
        amountCents: fact.amountCents,
        currency: "EUR",
        sign: fact.sign,
        sourceDocumentId: documentId,
        sourcePage: fact.sourcePage,
        sourceLabel: fact.sourceLabel,
        sourceCoordinates: null,
        extractionConfidence: 1,
        explicitlyPrinted: true,
        calculated: false,
        calculationFormula: null,
        relatedDebtKey: null,
        requiresHumanReview: true,
      }),
    ),
  );

  const dates: ProceduralDateV1[] = [];
  addPrintedDate(
    dates,
    documentId,
    lines,
    LABELS.issueDate,
    "ISSUE_DATE",
    "Fecha de emisión",
    warnings,
  );
  if (rawPaymentDeadline) {
    dates.push(
      createProceduralDateV1({
        proceduralDateId: `${stablePrefix(documentId)}-date-voluntary-payment-deadline`,
        dateType: "VOLUNTARY_PAYMENT_DEADLINE",
        rawText: rawPaymentDeadline.printedValue,
        rawDeadlineText: rawPaymentDeadline.printedValue,
        parsedDate: parsePrintedDate(rawPaymentDeadline.printedValue),
        timezone: null,
        sourceDocumentId: documentId,
        sourcePage: rawPaymentDeadline.pageNumbers[0]!,
        sourceLabel: rawPaymentDeadline.sourceLabel,
        sourceCoordinates: null,
        extractionConfidence: 1,
        explicitlyPrinted: true,
        legallyComputed: false,
        computationRuleId: null,
        requiresReview: true,
      }),
    );
  }

  return Object.freeze({
    facts: Object.freeze({
      documentKind,
      paymentState: "ORDERED_NOT_CONFIRMED",
      paymentReference,
      liquidationKey,
      debtKey,
      expediente,
      model,
      fiscalYear,
      period,
      taxId,
      recipient,
      taxConcept,
      moneyFacts,
      rawPaymentDeadline,
      paymentChannel,
      collaboratingEntity,
      maskedBankAccount,
      barcodeReference,
      csv,
      explicitPaymentProof: null,
    }),
    references: Object.freeze(references),
    money,
    dates: Object.freeze(dates),
    warnings: Object.freeze([...new Set(warnings)].sort()),
  });
}

function uniqueLabelFact(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  conflictWarning: string,
): PaymentOrderTextFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    if (!labels.some((label) => matchesLabel(line.folded, label))) return [];
    const value = extractLabelValue(lines, line, index);
    return value ? [{ value, pageNumber: line.pageNumber }] : [];
  });
  const byValue = new Map<string, { value: string; pages: number[] }>();
  observations.forEach((item) => {
    const key = fold(item.value);
    const current = byValue.get(key) ?? { value: item.value, pages: [] };
    current.pages.push(item.pageNumber);
    byValue.set(key, current);
  });
  if (byValue.size > 1) {
    warnings.push(conflictWarning);
    return null;
  }
  const only = [...byValue.values()][0];
  return only ? textFact(only.value, only.pages, sourceLabel) : null;
}

function extractMoneyFacts(
  lines: readonly PrivateLineV1[],
  warnings: string[],
): readonly PaymentOrderMoneyFactV1[] {
  const facts: PaymentOrderMoneyFactV1[] = [];
  (
    Object.entries(MONEY_LABELS) as readonly [
      PaymentOrderMoneyRoleV1,
      readonly string[],
    ][]
  ).forEach(([role, labels]) => {
    const observations: {
      raw: string;
      cents: number;
      sign: "POSITIVE" | "NEGATIVE";
      page: number;
    }[] = [];
    lines.forEach((line, index) => {
      if (!labels.some((label) => matchesLabel(line.folded, label))) return;
      const value = extractLabelValue(lines, line, index);
      if (!value) return;
      const parsed = parsePrintedEuro(value);
      if (!parsed) {
        if (looksLikePrintedMoney(value))
          warnings.push(`INVALID_PRINTED_AMOUNT_${role}`);
        return;
      }
      observations.push({
        raw: value,
        cents: parsed.amountCents,
        sign: parsed.sign,
        page: line.pageNumber,
      });
    });
    const distinct = new Map(
      observations.map((item) => [`${item.sign}|${item.cents}`, item]),
    );
    if (distinct.size > 1) {
      warnings.push(`CONFLICTING_PRINTED_AMOUNT_${role}`);
      return;
    }
    const only = [...distinct.values()][0];
    if (!only) return;
    if (
      role === "TOTAL_DUE" &&
      (only.sign !== "POSITIVE" || only.cents === 0)
    ) {
      warnings.push("NON_POSITIVE_TOTAL_DUE");
    }
    facts.push(
      Object.freeze({
        role,
        printedValue: only.raw,
        amountCents: only.cents,
        sign: only.sign,
        sourcePage: only.page,
        sourceLabel: role,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        reviewStatus: "REVIEW_REQUIRED",
      }),
    );
  });
  return Object.freeze(facts);
}

function extractMaskedBankAccount(
  lines: readonly PrivateLineV1[],
  warnings: string[],
): PaymentOrderMaskedAccountFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    if (!LABELS.bankAccount.some((label) => matchesLabel(line.folded, label)))
      return [];
    const value = extractLabelValue(lines, line, index);
    return value ? [{ value: maskAccount(value), page: line.pageNumber }] : [];
  });
  const distinct = new Map(observations.map((item) => [item.value, item]));
  if (distinct.size > 1) {
    warnings.push("CONFLICTING_MASKED_BANK_ACCOUNT");
    return null;
  }
  const only = [...distinct.values()][0];
  return only
    ? Object.freeze({
        maskedValue: only.value,
        sourcePage: only.page,
        sourceLabel: "Cuenta de cargo",
        extractionMethod: "CLOSED_LABEL_REDACTED",
        disclosurePolicy: "MASKED_LAST_FOUR_ONLY",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        reviewStatus: "REVIEW_REQUIRED",
      })
    : null;
}

function maskAccount(value: string): string {
  const compact = value.normalize("NFKC").replace(/[^A-Za-z0-9]/gu, "");
  if (compact.length < 4) return "****";
  return `****${compact.slice(-4).toUpperCase()}`;
}

function extractLabelValue(
  lines: readonly PrivateLineV1[],
  line: PrivateLineV1,
  index: number,
): string | null {
  const separator = line.raw.search(/[:\-]/u);
  const sameLine = separator >= 0 ? line.raw.slice(separator + 1).trim() : "";
  if (
    sameLine.length > 0 &&
    sameLine.length <= PAYMENT_ORDER_EXTRACTOR_LIMITS_V1.maxTextFactChars
  )
    return sameLine;
  const next = lines[index + 1];
  if (
    next &&
    next.pageNumber === line.pageNumber &&
    next.raw.length <= PAYMENT_ORDER_EXTRACTOR_LIMITS_V1.maxTextFactChars &&
    !ALL_LABEL_LITERALS.some((label) => matchesLabel(next.folded, label))
  )
    return next.raw;
  return null;
}

function addReference(
  target: ReferenceV1[],
  documentId: string,
  referenceType: ReferenceTypeV1,
  fact: PaymentOrderTextFactV1 | null,
): void {
  if (!fact) return;
  target.push(
    normalizeReferenceV1({
      referenceType,
      rawValue: fact.printedValue,
      sourceDocumentId: documentId,
      sourcePage: fact.pageNumbers[0]!,
      sourceLabel: fact.sourceLabel,
      sourceCoordinates: null,
      confidence: 1,
    }),
  );
}

function addPrintedDate(
  target: ProceduralDateV1[],
  documentId: string,
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  dateType: "ISSUE_DATE",
  sourceLabel: string,
  warnings: string[],
): void {
  const fact = uniqueLabelFact(
    lines,
    labels,
    sourceLabel,
    warnings,
    `CONFLICTING_${dateType}`,
  );
  if (!fact) return;
  const parsedDate = parsePrintedDate(fact.printedValue);
  if (!parsedDate) warnings.push(`INVALID_PRINTED_${dateType}`);
  target.push(
    createProceduralDateV1({
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
    }),
  );
}

function textFact(
  printedValue: string,
  pageNumbers: readonly number[],
  sourceLabel: string,
): PaymentOrderTextFactV1 {
  if (
    printedValue.length === 0 ||
    printedValue.length > PAYMENT_ORDER_EXTRACTOR_LIMITS_V1.maxTextFactChars
  ) {
    throw new FiscalNotificationInputError(
      "INVALID_INPUT",
      "paymentOrder.textFact",
    );
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

function validateSegments(
  document: BoundedDocumentInput,
  rawSegments: readonly DocumentSegmentV1[],
): ValidatedSegmentsV1 {
  if (
    !Array.isArray(rawSegments) ||
    rawSegments.length === 0 ||
    rawSegments.length > document.pages.length
  ) {
    throw new FiscalNotificationInputError(
      "COLLECTION_LIMIT_EXCEEDED",
      "paymentOrder.segments",
    );
  }
  const segments = rawSegments.map((segment) =>
    createDocumentSegmentV1(segment),
  );
  const covered = new Set<number>();
  const ids = new Set<string>();
  const pageToFactSegment = new Map<number, DocumentSegmentV1>();
  for (const segment of segments) {
    if (
      segment.documentId !== document.documentId ||
      ids.has(segment.segmentId)
    ) {
      throw new FiscalNotificationInputError(
        "INVALID_INPUT",
        "paymentOrder.segments.identity",
      );
    }
    ids.add(segment.segmentId);
    for (let page = segment.pageFrom; page <= segment.pageTo; page += 1) {
      if (covered.has(page) || page > document.pages.length) {
        throw new FiscalNotificationInputError(
          "INVALID_INPUT",
          "paymentOrder.segments.coverage",
        );
      }
      covered.add(page);
      if (segment.canGenerateAdministrativeFacts)
        pageToFactSegment.set(page, segment);
    }
  }
  if (covered.size !== document.pages.length) {
    throw new FiscalNotificationInputError(
      "INVALID_INPUT",
      "paymentOrder.segments.coverage",
    );
  }
  return Object.freeze({
    segments: Object.freeze(segments),
    paymentSegments: Object.freeze(
      segments.filter((segment) => segment.segmentType === "PAYMENT_DOCUMENT"),
    ),
    pageToFactSegment,
  });
}

function collectLines(
  document: BoundedDocumentInput,
  factualPages: ReadonlySet<number>,
): readonly PrivateLineV1[] {
  const lines: PrivateLineV1[] = [];
  for (const page of document.pages) {
    if (!factualPages.has(page.pageNumber)) continue;
    const pageLines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    for (let index = 0; index < pageLines.length; index += 1) {
      assertNotAborted(document.signal);
      const raw = pageLines[index]!.trim();
      if (raw.length === 0) continue;
      if (raw.length > PAYMENT_ORDER_EXTRACTOR_LIMITS_V1.maxLineChars) {
        throw new FiscalNotificationInputError(
          "INVALID_INPUT",
          `paymentOrder.pages[${page.pageNumber}].line`,
        );
      }
      lines.push(
        Object.freeze({
          pageNumber: page.pageNumber,
          lineIndex: index,
          raw,
          folded: fold(raw),
        }),
      );
      if (lines.length > PAYMENT_ORDER_EXTRACTOR_LIMITS_V1.maxLines) {
        throw new FiscalNotificationInputError(
          "COLLECTION_LIMIT_EXCEEDED",
          "paymentOrder.lines",
        );
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
    if (!segment)
      throw new FiscalNotificationInputError(
        "INVALID_INPUT",
        "paymentOrder.evidence.segment",
      );
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

function parsePrintedEuro(value: string): {
  readonly amountCents: number;
  readonly sign: "POSITIVE" | "NEGATIVE";
} | null {
  const match =
    /^([+-])?\s*((?:\d{1,3}(?:\.\d{3})+)|\d+),(\d{2})(?:\s*(?:€|euros?))?$/iu.exec(
      value.trim(),
    );
  if (!match) return null;
  const euros = match[2]!.replaceAll(".", "");
  if (euros.length > 13) return null;
  const amountCents = Number(euros) * 100 + Number(match[3]);
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) return null;
  return Object.freeze({
    amountCents,
    sign: match[1] === "-" ? "NEGATIVE" : "POSITIVE",
  });
}

function looksLikePrintedMoney(value: string): boolean {
  return /(?:€|\beuros?\b|\d+[.,]\d{2}\b)/iu.test(value);
}

function parsePrintedDate(value: string): string | null {
  const matches = [
    ...value.matchAll(/(?:^|\D)(\d{2})([/-])(\d{2})\2(\d{4})(?=\D|$)/gu),
  ];
  if (matches.length !== 1) return null;
  const match = matches[0]!;
  const day = Number(match[1]);
  const month = Number(match[3]);
  const year = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    : null;
}

function moneyComponentType(
  role: PaymentOrderMoneyRoleV1,
): MonetaryComponentTypeV1 {
  switch (role) {
    case "PRINCIPAL":
      return "PRINCIPAL";
    case "SURCHARGE":
      return "SURCHARGE";
    case "EXECUTIVE_SURCHARGE":
      return "EXECUTIVE_SURCHARGE";
    case "LATE_INTEREST":
      return "LATE_INTEREST";
    case "COSTS":
      return "COSTS";
    case "TOTAL_DUE":
      return "TOTAL_CLAIMED";
  }
}

function emptyOutput(
  status: "UNKNOWN" | "BLOCKED",
  warning: string | null = null,
): PaymentOrderExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "payment-order",
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
    paymentOrderFacts: Object.freeze({
      documentKind: null,
      paymentState: null,
      paymentReference: null,
      liquidationKey: null,
      debtKey: null,
      expediente: null,
      model: null,
      fiscalYear: null,
      period: null,
      taxId: null,
      recipient: null,
      taxConcept: null,
      moneyFacts: Object.freeze([]),
      rawPaymentDeadline: null,
      paymentChannel: null,
      collaboratingEntity: null,
      maskedBankAccount: null,
      barcodeReference: null,
      csv: null,
      explicitPaymentProof: null,
    }),
    retainedSourceContent: "NONE",
    paymentProofPolicy: "ORDER_DOCUMENT_NEVER_CONFIRMS_PAYMENT",
    legalInterpretationPolicy:
      "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function matchesLabel(foldedLine: string, label: string): boolean {
  return (
    foldedLine === label ||
    foldedLine.startsWith(`${label}:`) ||
    foldedLine.startsWith(`${label} -`)
  );
}

function containsTokenSequence(foldedLine: string, marker: string): boolean {
  return ` ${foldedLine} `.includes(` ${marker} `);
}

function uniqueNumbers(values: readonly number[]): readonly number[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left - right),
  );
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
  return `fx-payment-order-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function entityId(
  document: BoundedDocumentInput,
  kind: string,
  index: number,
): string {
  return `${stablePrefix(`${document.ownerScope}|${document.documentId}`)}-${kind}-${index}`;
}

export const PAYMENT_ORDER_EXTRACTOR_RELEASE_V1 = Object.freeze({
  version: PAYMENT_ORDER_EXTRACTOR_VERSION_V1,
  familyIds: Object.freeze(["payment.payment_form"] as const),
  officialInterpretationSources: Object.freeze([
    Object.freeze({
      sourceId: "aeat.payment.nrc",
      url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/que-nrc.html",
    }),
    Object.freeze({
      sourceId: "aeat.payment.liquidations.card",
      url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/pago-liquidaciones-deudas-mediante-tarjeta.html",
    }),
    Object.freeze({
      sourceId: "boe.rgr.article.41",
      url: "https://www.boe.es/buscar/act.php?id=BOE-A-2005-14803",
    }),
    Object.freeze({
      sourceId: "boe.order.eha-2027-2007",
      url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-13223",
    }),
  ]),
  sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
  paymentProofPolicy: "PAYMENT_ORDER_IS_NOT_PAYMENT_EVIDENCE",
  deadlinePolicy: "NO_COMPUTED_DEADLINE",
  accountPolicy: "MASK_LAST_FOUR_AND_DISCARD_RAW_VALUE",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
});
