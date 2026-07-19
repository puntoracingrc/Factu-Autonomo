import type {
  AeatDeferralMoneyFactV1,
  AeatDeferralPrintedDateFactV1,
  AeatDeferralTextFactV1,
} from "../aeat-deferral-grant-facts.v1";
import { parseAeatDeferralGrantFactsContractV1 } from "../aeat-deferral-grant-facts.v1-contract";
import type { AeatEnforcementMoneyFactsResult } from "../aeat-enforcement-money-facts";
import {
  parseAeatEnforcementExplicitFieldsV2,
  type AeatEnforcementPrintedDateFactV2,
  type AeatEnforcementReferenceFactV2,
} from "../aeat-enforcement-explicit-fields.v2";
import {
  parseAeatEnforcementPartyFactsV1,
} from "../aeat-enforcement-party-facts.v1";
import type {
  AeatOffsetAgreementFactsResultV1,
  AeatOffsetMoneyFactV1,
  AeatOffsetPrintedDateFactV1,
  AeatOffsetTextFactV1,
} from "../aeat-offset-agreement-facts.v1";
import { parseAeatOffsetAgreementFactsContractV1 } from "../aeat-offset-agreement-facts.v1-contract";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
  assertNotAborted,
} from "../input-contract";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import type {
  AdministrativeActV1,
  AdministrativeEntityV1,
  DebtClaimV1,
  EntityEvidenceV1,
  PartyRoleV1,
  PartyV1,
} from "./domain.v1";
import { createDocumentSegmentV1, type DocumentSegmentV1 } from "./document-segment.v1";
import type { BaseExtractorIdV1, ExtractorOutputV1 } from "./extractor-contract.v1";
import { createMonetaryComponentV1, type MonetaryComponentTypeV1, type MonetaryComponentV1 } from "./monetary-component.v1";
import { createProceduralDateV1, type ProceduralDateTypeV1, type ProceduralDateV1 } from "./procedural-date.v1";
import { normalizeReferenceV1, type ReferenceTypeV1, type ReferenceV1 } from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
  isPlainRecordV1,
} from "./shared.v1";

const ADAPTER_VERSION = "1.1.0" as const;
const MAX_ADAPTED_ITEMS = 1_000;

interface AdapterContextV1 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly segments: readonly DocumentSegmentV1[];
  readonly signal?: AbortSignal;
}

export interface AdaptAeatEnforcementFactsInputV1 extends AdapterContextV1 {
  readonly explicitFields: unknown;
  readonly moneyFacts: unknown;
  readonly partyFacts: unknown;
  readonly familyId?:
    | "collection.enforcement_order"
    | "collection.external_debt";
}

export interface AdaptAeatDeferralGrantFactsInputV1 extends AdapterContextV1 {
  readonly facts: unknown;
  readonly familyId?:
    | "collection.deferral_grant"
    | "collection.deferral_modification";
}

export interface AdaptAeatOffsetAgreementFactsInputV1 extends AdapterContextV1 {
  readonly facts: unknown;
}

interface ValidatedContextV1 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly segments: readonly DocumentSegmentV1[];
  readonly pageToSegment: ReadonlyMap<number, DocumentSegmentV1>;
  readonly pageCount: number;
  readonly primaryEvidencePages: readonly number[];
  readonly idPrefix: string;
  readonly signal?: AbortSignal;
}

interface MutableProjectionV1 {
  readonly references: ReferenceV1[];
  readonly money: MonetaryComponentV1[];
  readonly dates: ProceduralDateV1[];
  readonly entities: AdministrativeEntityV1[];
  readonly warnings: string[];
  nextReference: number;
  nextMoney: number;
  nextDate: number;
  nextEntity: number;
}

const ENFORCEMENT_REFERENCE_TYPES = Object.freeze({
  LIQUIDATION_KEY: "LIQUIDATION_KEY",
  DOCUMENT_REFERENCE: "ACT_ID",
  PAYMENT_JUSTIFICANTE: "PAYMENT_RECEIPT_ID",
  CSV: "CSV",
  VTO_RAW: "OTHER_OFFICIAL_REFERENCE",
} as const satisfies Readonly<Record<AeatEnforcementReferenceFactV2["kind"], ReferenceTypeV1>>);

const ENFORCEMENT_DATE_TYPES = Object.freeze({
  PRINTED_ISSUE_DATE: "ISSUE_DATE",
  PRINTED_SIGNATURE_DATE: "SIGNING_DATE",
  PRINTED_VOLUNTARY_PERIOD_END_DATE: "VOLUNTARY_PAYMENT_DEADLINE",
} as const satisfies Readonly<Record<AeatEnforcementPrintedDateFactV2["kind"], ProceduralDateTypeV1>>);

const ENFORCEMENT_MONEY_TYPES = Object.freeze({
  OUTSTANDING_PRINCIPAL: "PRINCIPAL",
  ORDINARY_ENFORCEMENT_SURCHARGE: "EXECUTIVE_SURCHARGE",
  PAYMENT_ON_ACCOUNT: "PAYMENT_ON_ACCOUNT",
  DOCUMENT_TOTAL: "TOTAL_CLAIMED",
} as const satisfies Readonly<Record<AeatEnforcementMoneyFactsResult["facts"][number]["kind"], MonetaryComponentTypeV1>>);

const ENFORCEMENT_MONEY_EVIDENCE_LABELS = Object.freeze({
  OUTSTANDING_PRINCIPAL: "OUTSTANDING_PRINCIPAL_LABEL",
  ORDINARY_ENFORCEMENT_SURCHARGE: "ORDINARY_ENFORCEMENT_SURCHARGE_LABEL",
  PAYMENT_ON_ACCOUNT: "PAYMENT_ON_ACCOUNT_LABEL",
  DOCUMENT_TOTAL: "DOCUMENT_TOTAL_LABEL",
} as const);

const ENFORCEMENT_MONEY_ISSUE_CODES = new Set<AeatEnforcementMoneyFactsResult["issues"][number]["code"]>([
  "FAMILY_GATE_NOT_SATISFIED",
  "NO_AMOUNT_SECTION",
  "NO_CLOSED_LABEL_MATCH",
  "LABEL_WITHOUT_AMOUNT",
  "INVALID_AMOUNT_FORMAT",
  "DUPLICATE_AMOUNT_SECTION",
  "DUPLICATE_MONEY_LABEL",
  "UNSUPPORTED_SECTION_PREAMBLE",
  "SECTION_SCAN_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);

export function adaptAeatEnforcementFactsV1(
  input: AdaptAeatEnforcementFactsInputV1,
): ExtractorOutputV1 {
  const hasFamilyId = Object.prototype.hasOwnProperty.call(input, "familyId");
  const context = validateContext(input, [
    "ownerScope",
    "documentId",
    "segments",
    "explicitFields",
    "moneyFacts",
    "partyFacts",
    ...(hasFamilyId ? ["familyId"] : []),
  ]);
  const familyId = input.familyId ?? "collection.enforcement_order";
  if (
    familyId !== "collection.enforcement_order" &&
    familyId !== "collection.external_debt"
  ) {
    throw new FiscalNotificationInputError(
      "INVALID_INPUT",
      "adapterInput.familyId",
    );
  }
  const fields = parseAeatEnforcementExplicitFieldsV2(input.explicitFields, context.pageCount);
  const moneyFacts = parseEnforcementMoneyFacts(input.moneyFacts, context.pageCount);
  const partyFacts = parseAeatEnforcementPartyFactsV1(input.partyFacts, context.pageCount);
  const projection = emptyProjection();

  for (const fact of fields.referenceFacts) {
    addReference(context, projection, ENFORCEMENT_REFERENCE_TYPES[fact.kind], fact.printedValue, fact.pageNumbers[0]!, fact.evidenceLabel, 1);
  }
  for (const fact of fields.printedDateFacts) {
    addDate(context, projection, ENFORCEMENT_DATE_TYPES[fact.kind], fact.printedValue, fact.calendarDate, fact.pageNumbers[0]!, fact.evidenceLabel, 1);
  }
  for (const fact of moneyFacts.facts) {
    if (fact.currency !== "EUR") {
      projection.warnings.push(`enforcement.money.${fact.kind}.currency-review-required`);
      continue;
    }
    addMoney(context, projection, ENFORCEMENT_MONEY_TYPES[fact.kind], fact.amountCents, fact.evidence[0]!.pageNumber, fact.evidence[0]!.label, 1);
  }

  const exactFamily = [fields.documentType, moneyFacts.documentType, partyFacts.documentType]
    .some((value) => value === "AEAT_ENFORCEMENT_ORDER");
  if (exactFamily) {
    projection.entities.push(createAct(
      context,
      projection,
      familyId,
      familyId === "collection.external_debt"
        ? "PROVIDENCIA_DE_APREMIO_DEUDA_EXTERNA"
        : "PROVIDENCIA_DE_APREMIO",
      1,
    ));
    if (projection.money.length > 0) {
      projection.entities.push(createDebt(context, projection, projection.money, context.primaryEvidencePages, 1));
    }
    if (partyFacts.identifiedSubject) {
      projection.entities.push(createParty(
        context,
        projection,
        partyFacts.identifiedSubject.printedName,
        ["PRIMARY_DEBTOR"],
        partyFacts.identifiedSubject.pageNumbers,
        1,
      ));
      addReference(
        context,
        projection,
        "NIF",
        partyFacts.identifiedSubject.printedTaxId,
        partyFacts.identifiedSubject.pageNumbers[0]!,
        "NIF",
        1,
      );
    }
  }
  projection.warnings.push(
    ...fields.issues.map((issue) => `enforcement.fields.${issue.code}`),
    ...moneyFacts.issues.map((issue) => `enforcement.money.${issue.code}`),
    ...partyFacts.issues.map((issue) => `enforcement.party.${issue.code}`),
  );

  return finalizeOutput(
    context,
    projection,
    "payment-order",
    exactFamily ? familyId : null,
    combinedStatus([fields.outcome, moneyFacts.outcome, partyFacts.outcome], exactFamily),
  );
}

export function adaptAeatDeferralGrantFactsV1(
  input: AdaptAeatDeferralGrantFactsInputV1,
): ExtractorOutputV1 {
  const hasFamilyId = Object.prototype.hasOwnProperty.call(input, "familyId");
  const context = validateContext(input, [
    "ownerScope",
    "documentId",
    "segments",
    "facts",
    ...(hasFamilyId ? ["familyId"] : []),
  ]);
  const facts = parseAeatDeferralGrantFactsContractV1(input.facts, context.pageCount);
  const projection = emptyProjection();
  const scheduleMoney = new Map<number, MonetaryComponentV1[]>();
  const familyId = input.familyId ?? "collection.deferral_grant";
  if (
    familyId !== "collection.deferral_grant" &&
    familyId !== "collection.deferral_modification"
  ) {
    throw new FiscalNotificationInputError(
      "INVALID_INPUT",
      "adapterInput.familyId",
    );
  }

  addOptionalTextReference(context, projection, "EXPEDIENTE_ID", facts.header.expediente, "Número de expediente");
  addOptionalTextReference(context, projection, "NIF", facts.header.subjectTaxId, "NIF");
  if (facts.header.grantedTotal) {
    addLegacyMoney(context, projection, facts.header.grantedTotal, "OTHER", "Importe concedido");
  }

  facts.debtSchedules.forEach((schedule, scheduleIndex) => {
    assertNotAborted(context.signal);
    addLegacyTextReference(context, projection, "LIQUIDATION_KEY", schedule.liquidationKey, "Clave de liquidación");
    if (schedule.interestStartDate) {
      addLegacyDate(context, projection, schedule.interestStartDate, "ACTION_DATE", "Fecha de inicio de intereses");
    }
    const components: MonetaryComponentV1[] = [];
    if (schedule.listedDebtAmount) {
      components.push(addLegacyMoney(context, projection, schedule.listedDebtAmount, "TOTAL_CLAIMED", "Importe de deuda listado"));
    }
    schedule.installments.forEach((installment) => {
      if (installment.layout === "COMPONENT_BREAKDOWN") {
        components.push(addLegacyMoney(context, projection, installment.principal, "PRINCIPAL", "Principal"));
        components.push(addLegacyMoney(context, projection, installment.enforcementSurcharge, "EXECUTIVE_SURCHARGE", "Recargo de apremio"));
        components.push(addLegacyMoney(context, projection, installment.debtTotal, "TOTAL_CLAIMED", "Total de deuda"));
        components.push(addLegacyMoney(context, projection, installment.interest, "LATE_INTEREST", "Intereses"));
      }
      components.push(addLegacyMoney(context, projection, installment.installmentTotal, "OTHER", "Importe del plazo"));
      addLegacyDate(context, projection, installment.dueDate, "INSTALLMENT_DUE_DATE", "Fecha de vencimiento");
    });
    scheduleMoney.set(scheduleIndex, components);
  });

  const exactFamily = facts.documentType === "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT";
  if (exactFamily) {
    projection.entities.push(createAct(
      context,
      projection,
      familyId,
      familyId === "collection.deferral_modification"
        ? "MODIFICACION_APLAZAMIENTO_FRACCIONAMIENTO"
        : "CONCESION_APLAZAMIENTO_FRACCIONAMIENTO",
      1,
    ));
    facts.debtSchedules.forEach((schedule, index) => {
      const pages = uniquePages([
        ...schedule.liquidationKey.pageNumbers,
        ...schedule.installments.flatMap((item) => item.dueDate.pageNumbers),
      ]);
      projection.entities.push(createDebt(context, projection, scheduleMoney.get(index) ?? [], pages, 1));
    });
    if (facts.header.subjectName) {
      projection.entities.push(createParty(context, projection, facts.header.subjectName.printedValue, ["TAXPAYER"], facts.header.subjectName.pageNumbers, 1));
    }
  }
  projection.warnings.push(...facts.issues.map((issue) => `deferral.${issue.code}`));

  return finalizeOutput(
    context,
    projection,
    "deferral",
    exactFamily ? familyId : null,
    combinedStatus([facts.outcome], exactFamily),
  );
}

export function adaptAeatOffsetAgreementFactsV1(
  input: AdaptAeatOffsetAgreementFactsInputV1,
): ExtractorOutputV1 {
  const context = validateContext(input, ["ownerScope", "documentId", "segments", "facts"]);
  const facts = parseAeatOffsetAgreementFactsContractV1(input.facts, context.pageCount);
  const projection = emptyProjection();
  const debtMoney = new Map<number, MonetaryComponentV1[]>();

  addOptionalTextReference(context, projection, "AGREEMENT_ID", facts.header.agreementNumber, "Número de acuerdo");
  addOptionalTextReference(context, projection, "NIF", facts.header.subjectTaxId, "NIF");
  if (facts.header.requestDate) {
    addLegacyDate(context, projection, facts.header.requestDate, "ACTION_DATE", "Fecha de solicitud");
  }

  facts.credits.forEach((credit) => {
    addLegacyTextReference(context, projection, "OTHER_OFFICIAL_REFERENCE", credit.reference, "Referencia del crédito");
    addLegacyDate(context, projection, credit.recognitionDate, "ACTION_DATE", "Fecha de reconocimiento del crédito");
    addLegacyMoney(context, projection, credit.creditAmount, "REFUND_RECOGNIZED", "Importe del crédito");
    addLegacyMoney(context, projection, credit.delayInterest, "LATE_INTEREST", "Intereses del crédito");
    addLegacyMoney(context, projection, credit.totalCredit, "OTHER", "Total del crédito");
    addLegacyMoney(context, projection, credit.compensatedAmount, "COMPENSATED_AMOUNT", "Crédito compensado");
  });
  facts.debts.forEach((debt, debtIndex) => {
    addLegacyTextReference(context, projection, "LIQUIDATION_KEY", debt.liquidationKey, "Clave de liquidación");
    addLegacyDate(context, projection, debt.effectDate, "ACTION_DATE", "Fecha de efectos");
    const components = [
      addLegacyMoney(context, projection, debt.principalPending, "PRINCIPAL", "Principal pendiente"),
      addLegacyMoney(context, projection, debt.enforcementSurcharge, "EXECUTIVE_SURCHARGE", "Recargo ejecutivo"),
      ...(debt.delayInterest ? [addLegacyMoney(context, projection, debt.delayInterest, "LATE_INTEREST", "Intereses de demora")] : []),
      addLegacyMoney(context, projection, debt.paymentsOnAccount, "PAYMENT_ON_ACCOUNT", "Ingresos a cuenta"),
      addLegacyMoney(context, projection, debt.totalBeforeOffset, "TOTAL_CLAIMED", "Pendiente antes de compensar"),
      addLegacyMoney(context, projection, debt.compensatedAmount, "COMPENSATED_AMOUNT", "Importe compensado"),
      addLegacyMoney(context, projection, debt.remainingAfterOffset, "TOTAL_PENDING", "Pendiente después de compensar"),
    ];
    debtMoney.set(debtIndex, components);
  });

  const familyId = offsetFamilyId(facts);
  if (familyId) {
    projection.entities.push(createAct(context, projection, familyId, facts.agreementMode === "REQUESTED" ? "COMPENSACION_A_INSTANCIA" : "COMPENSACION_DE_OFICIO", 1));
    facts.debts.forEach((debt, index) => {
      projection.entities.push(createDebt(context, projection, debtMoney.get(index) ?? [], debt.liquidationKey.pageNumbers, 1));
    });
    if (facts.header.subjectName) {
      projection.entities.push(createParty(context, projection, facts.header.subjectName.printedValue, ["TAXPAYER"], facts.header.subjectName.pageNumbers, 1));
    }
  }
  projection.warnings.push(...facts.issues.map((issue) => `offset.${issue.code}`));

  return finalizeOutput(
    context,
    projection,
    "compensation",
    familyId,
    combinedStatus([facts.outcome], familyId !== null),
  );
}

function validateContext(
  input: AdapterContextV1,
  requiredKeys: readonly string[],
): ValidatedContextV1 {
  const hasSignal = Object.prototype.hasOwnProperty.call(input, "signal");
  assertExactDataRecordV1(input, "adapterInput", hasSignal ? [...requiredKeys, "signal"] : requiredKeys);
  assertBoundedOwnerScope(input.ownerScope, "adapterInput.ownerScope");
  assertBoundedId(input.documentId, "adapterInput.documentId");
  if (input.signal !== undefined && !isAbortSignal(input.signal)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "adapterInput.signal");
  }
  assertNotAborted(input.signal);
  if (!Array.isArray(input.segments) || input.segments.length === 0 || input.segments.length > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages) {
    throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "adapterInput.segments");
  }
  const segments = Object.freeze(input.segments.map((segment) => createDocumentSegmentV1(segment)));
  const ids = new Set<string>();
  const pageToSegment = new Map<number, DocumentSegmentV1>();
  let pageCount = 0;
  for (const segment of segments) {
    assertNotAborted(input.signal);
    if (segment.documentId !== input.documentId) {
      throw new FiscalNotificationInputError("OWNER_SCOPE_MISMATCH", "adapterInput.segments.documentId");
    }
    if (ids.has(segment.segmentId)) {
      throw new FiscalNotificationInputError("INVALID_ID", "adapterInput.segments.segmentId");
    }
    ids.add(segment.segmentId);
    for (let page = segment.pageFrom; page <= segment.pageTo; page += 1) {
      if (pageToSegment.has(page)) {
        throw new FiscalNotificationInputError("INVALID_INPUT", "adapterInput.segments.pageRange");
      }
      pageToSegment.set(page, segment);
      pageCount = Math.max(pageCount, page);
    }
  }
  for (let page = 1; page <= pageCount; page += 1) {
    if (!pageToSegment.has(page)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", "adapterInput.segments.pageCoverage");
    }
  }
  const primaryEvidencePages = Object.freeze(segments
    .filter((segment) => segment.segmentType === "MAIN_ADMINISTRATIVE_ACT")
    .flatMap((segment) => range(segment.pageFrom, segment.pageTo)));
  if (primaryEvidencePages.length === 0) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "adapterInput.segments.primaryAct");
  }
  return Object.freeze({
    ownerScope: input.ownerScope,
    documentId: input.documentId,
    segments,
    pageToSegment,
    pageCount,
    primaryEvidencePages,
    idPrefix: `fx-${stableToken(`${input.ownerScope}|${input.documentId}`)}`,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

function emptyProjection(): MutableProjectionV1 {
  return { references: [], money: [], dates: [], entities: [], warnings: [], nextReference: 0, nextMoney: 0, nextDate: 0, nextEntity: 0 };
}

function addReference(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  referenceType: ReferenceTypeV1,
  rawValue: string,
  page: number,
  sourceLabel: string,
  confidence: number,
): ReferenceV1 {
  requireFactPage(context, page);
  const reference = normalizeReferenceV1({
    referenceType,
    rawValue,
    sourceDocumentId: context.documentId,
    sourcePage: page,
    sourceLabel,
    sourceCoordinates: null,
    confidence,
  });
  projection.nextReference += 1;
  projection.references.push(reference);
  return reference;
}

function addMoney(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  componentType: MonetaryComponentTypeV1,
  amountCents: number,
  page: number,
  sourceLabel: string,
  confidence: number,
): MonetaryComponentV1 {
  requireFactPage(context, page);
  const component = createMonetaryComponentV1({
    componentId: `${context.idPrefix}-money-${projection.nextMoney++}`,
    componentType,
    amountCents,
    currency: "EUR",
    sign: "POSITIVE",
    sourceDocumentId: context.documentId,
    sourcePage: page,
    sourceLabel,
    sourceCoordinates: null,
    extractionConfidence: confidence,
    explicitlyPrinted: true,
    calculated: false,
    calculationFormula: null,
    relatedDebtKey: null,
    requiresHumanReview: true,
  });
  projection.money.push(component);
  return component;
}

function addDate(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  dateType: ProceduralDateTypeV1,
  rawText: string,
  parsedDate: string,
  page: number,
  sourceLabel: string,
  confidence: number,
): ProceduralDateV1 {
  requireFactPage(context, page);
  const isDeadline = ["VOLUNTARY_PAYMENT_DEADLINE", "RESPONSE_DEADLINE", "APPEAL_DEADLINE", "INSTALLMENT_DUE_DATE"].includes(dateType);
  const date = createProceduralDateV1({
    proceduralDateId: `${context.idPrefix}-date-${projection.nextDate++}`,
    dateType,
    rawText,
    rawDeadlineText: isDeadline ? rawText : null,
    parsedDate,
    timezone: null,
    sourceDocumentId: context.documentId,
    sourcePage: page,
    sourceLabel,
    sourceCoordinates: null,
    extractionConfidence: confidence,
    explicitlyPrinted: true,
    legallyComputed: false,
    computationRuleId: null,
    requiresReview: true,
  });
  projection.dates.push(date);
  return date;
}

function addLegacyTextReference(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  referenceType: ReferenceTypeV1,
  fact: AeatDeferralTextFactV1 | AeatOffsetTextFactV1,
  label: string,
): ReferenceV1 {
  return addReference(context, projection, referenceType, fact.printedValue, fact.pageNumbers[0]!, label, 1);
}

function addOptionalTextReference(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  referenceType: ReferenceTypeV1,
  fact: AeatDeferralTextFactV1 | AeatOffsetTextFactV1 | null,
  label: string,
): void {
  if (fact) addLegacyTextReference(context, projection, referenceType, fact, label);
}

function addLegacyMoney(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  fact: AeatDeferralMoneyFactV1 | AeatOffsetMoneyFactV1,
  componentType: MonetaryComponentTypeV1,
  label: string,
): MonetaryComponentV1 {
  return addMoney(context, projection, componentType, fact.amountCents, fact.pageNumbers[0]!, label, 1);
}

function addLegacyDate(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  fact: AeatDeferralPrintedDateFactV1 | AeatOffsetPrintedDateFactV1,
  dateType: ProceduralDateTypeV1,
  label: string,
): ProceduralDateV1 {
  return addDate(context, projection, dateType, fact.printedValue, fact.calendarDate, fact.pageNumbers[0]!, label, 1);
}

function createAct(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  familyId: FiscalNotificationDocumentFamilyIdV3,
  actSubtype: string,
  confidence: number,
): AdministrativeActV1 {
  return Object.freeze({
    entityId: `${context.idPrefix}-act-${projection.nextEntity++}`,
    ownerScope: context.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence: evidence(context, context.primaryEvidencePages, confidence),
    familyId,
    actSubtype,
    references: Object.freeze([...projection.references]),
    dates: Object.freeze([...projection.dates]),
  });
}

function createDebt(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  components: readonly MonetaryComponentV1[],
  pages: readonly number[],
  confidence: number,
): DebtClaimV1 {
  return Object.freeze({
    entityId: `${context.idPrefix}-debt-${projection.nextEntity++}`,
    ownerScope: context.ownerScope,
    entityKind: "DEBT_CLAIM",
    evidence: evidence(context, pages.length > 0 ? pages : context.primaryEvidencePages, confidence),
    creationBasis: "EXPLICITLY_PRINTED_DEBT",
    monetaryComponents: Object.freeze([...components]),
    referenceIds: Object.freeze([]),
  });
}

function createParty(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  displayName: string,
  roles: readonly PartyRoleV1[],
  pages: readonly number[],
  confidence: number,
): PartyV1 {
  return Object.freeze({
    entityId: `${context.idPrefix}-party-${projection.nextEntity++}`,
    ownerScope: context.ownerScope,
    entityKind: "PARTY",
    evidence: evidence(context, pages, confidence),
    displayName,
    taxIdReferenceId: null,
    roles: Object.freeze([...roles]),
  });
}

function evidence(context: ValidatedContextV1, pages: readonly number[], confidence: number): EntityEvidenceV1 {
  const segmentIds = new Set<string>();
  for (const page of uniquePages(pages)) segmentIds.add(requireFactPage(context, page).segmentId);
  return Object.freeze({
    sourceDocumentIds: Object.freeze([context.documentId]),
    sourceSegmentIds: Object.freeze([...segmentIds]),
    evidenceBasis: "EXPLICIT_DOCUMENT_TEXT",
    confidence,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
  });
}

function finalizeOutput(
  context: ValidatedContextV1,
  projection: MutableProjectionV1,
  extractorId: BaseExtractorIdV1,
  familyId: FiscalNotificationDocumentFamilyIdV3 | null,
  status: ExtractorOutputV1["status"],
): ExtractorOutputV1 {
  assertNotAborted(context.signal);
  const evidenceIds = Object.freeze(context.segments
    .filter((segment) => segment.segmentType === "MAIN_ADMINISTRATIVE_ACT")
    .map((segment) => segment.segmentId));
  const warnings = Object.freeze([...new Set(projection.warnings)].sort());
  if (familyId && projection.entities.length === 0 && projection.references.length === 0 && projection.money.length === 0 && projection.dates.length === 0) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "adapterOutput.emptyRecognizedFamily");
  }
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId,
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status,
    familyCandidates: familyId ? Object.freeze([Object.freeze({
      familyId,
      confidence: 1,
      matchingEvidenceIds: evidenceIds,
      contradictoryEvidenceIds: Object.freeze([]),
    })]) : Object.freeze([]),
    entities: Object.freeze([...projection.entities]),
    references: Object.freeze([...projection.references]),
    monetaryComponents: Object.freeze([...projection.money]),
    proceduralDates: Object.freeze([...projection.dates]),
    warnings,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
  });
}

function combinedStatus(outcomes: readonly string[], exactFamily: boolean): ExtractorOutputV1["status"] {
  if (outcomes.includes("PROCESSING_BLOCKED")) return "BLOCKED";
  if (!exactFamily) return "UNKNOWN";
  return "REVIEW_REQUIRED";
}

function offsetFamilyId(facts: AeatOffsetAgreementFactsResultV1): FiscalNotificationDocumentFamilyIdV3 | null {
  if (facts.documentType !== "AEAT_OFFSET_AGREEMENT") return null;
  if (facts.agreementMode === "REQUESTED") return "collection.offset_requested";
  if (facts.agreementMode === "EX_OFFICIO") return "collection.offset_ex_officio";
  return null;
}

function parseEnforcementMoneyFacts(value: unknown, pageCount: number): AeatEnforcementMoneyFactsResult {
  assertExactDataRecordV1(value, "moneyFacts", [
    "schemaVersion", "engineId", "engineVersion", "documentType", "status", "outcome", "facts", "issues",
    "selectedPaymentAmountKind", "semanticPolicy", "legalRuleStatus", "requiresHumanReview",
    "materializationPolicy", "retainedSourceContent",
  ]);
  if (
    value.schemaVersion !== 1 || value.engineId !== "aeat-enforcement-money-facts" ||
    (value.engineVersion !== "1.0.0" &&
      value.engineVersion !== "1.1.0" &&
      value.engineVersion !== "1.2.0") ||
    (value.documentType !== null && value.documentType !== "AEAT_ENFORCEMENT_ORDER") ||
    (value.status !== "REVIEW_REQUIRED" && value.status !== "INFORMATION_PENDING") ||
    !["FACTS_AVAILABLE", "INFORMATION_PENDING", "AMBIGUOUS", "PROCESSING_BLOCKED"].includes(String(value.outcome)) ||
    value.selectedPaymentAmountKind !== null || value.semanticPolicy !== "EXPLICIT_DOCUMENT_FACTS_ONLY" ||
    value.legalRuleStatus !== "NOT_APPLIED" || value.requiresHumanReview !== true ||
    value.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" || value.retainedSourceContent !== "NONE"
  ) throw new FiscalNotificationInputError("INVALID_INPUT", "moneyFacts.$contract");

  const factValues = dataArray(value.facts, "moneyFacts.facts", 4);
  const seenKinds = new Set<string>();
  const facts = factValues.map((raw, index) => {
    assertExactDataRecordV1(raw, `moneyFacts.facts[${index}]`, ["kind", "amountCents", "currency", "evidence", "reviewStatus"]);
    if (!Object.keys(ENFORCEMENT_MONEY_TYPES).includes(String(raw.kind)) || seenKinds.has(String(raw.kind))) {
      throw new FiscalNotificationInputError("INVALID_INPUT", `moneyFacts.facts[${index}].kind`);
    }
    seenKinds.add(String(raw.kind));
    assertNonNegativeIntegerCents(raw.amountCents, `moneyFacts.facts[${index}].amountCents`);
    if ((raw.currency !== "EUR" && raw.currency !== "UNKNOWN") || raw.reviewStatus !== "REVIEW_REQUIRED") {
      throw new FiscalNotificationInputError("INVALID_INPUT", `moneyFacts.facts[${index}].contract`);
    }
    const evidenceValues = dataArray(raw.evidence, `moneyFacts.facts[${index}].evidence`, FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds);
    if (evidenceValues.length === 0) throw new FiscalNotificationInputError("INVALID_INPUT", `moneyFacts.facts[${index}].evidence`);
    const factEvidence = evidenceValues.map((item, evidenceIndex) => {
      assertExactDataRecordV1(item, `moneyFacts.facts[${index}].evidence[${evidenceIndex}]`, ["pageNumber", "label", "extractionMethod", "assertionType"]);
      if (!Number.isSafeInteger(item.pageNumber) || Number(item.pageNumber) < 1 || Number(item.pageNumber) > pageCount || item.extractionMethod !== "RULE" || item.assertionType !== "EXPLICIT_IN_DOCUMENT") {
        throw new FiscalNotificationInputError("INVALID_INPUT", `moneyFacts.facts[${index}].evidence[${evidenceIndex}]`);
      }
      if (item.label !== ENFORCEMENT_MONEY_EVIDENCE_LABELS[raw.kind as keyof typeof ENFORCEMENT_MONEY_EVIDENCE_LABELS]) {
        throw new FiscalNotificationInputError("INVALID_INPUT", `moneyFacts.facts[${index}].evidence[${evidenceIndex}].label`);
      }
      return Object.freeze({
        pageNumber: Number(item.pageNumber),
        label: item.label as AeatEnforcementMoneyFactsResult["facts"][number]["evidence"][number]["label"],
        extractionMethod: "RULE" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      });
    });
    return Object.freeze({
      kind: raw.kind as AeatEnforcementMoneyFactsResult["facts"][number]["kind"],
      amountCents: Number(raw.amountCents),
      currency: raw.currency as "EUR" | "UNKNOWN",
      evidence: Object.freeze(factEvidence),
      reviewStatus: "REVIEW_REQUIRED" as const,
    });
  });
  const issueValues = dataArray(value.issues, "moneyFacts.issues", MAX_ADAPTED_ITEMS);
  const issues = issueValues.map((raw, index) => {
    assertExactDataRecordV1(raw, `moneyFacts.issues[${index}]`, ["code", "kind", "pageNumbers"]);
    if (!ENFORCEMENT_MONEY_ISSUE_CODES.has(raw.code as AeatEnforcementMoneyFactsResult["issues"][number]["code"]) || (raw.kind !== null && !Object.keys(ENFORCEMENT_MONEY_TYPES).includes(String(raw.kind)))) {
      throw new FiscalNotificationInputError("INVALID_INPUT", `moneyFacts.issues[${index}]`);
    }
    const pageNumbers = dataArray(raw.pageNumbers, `moneyFacts.issues[${index}].pageNumbers`, FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages).map((page) => {
      if (!Number.isSafeInteger(page) || Number(page) < 1 || Number(page) > pageCount) throw new FiscalNotificationInputError("INVALID_INPUT", `moneyFacts.issues[${index}].pageNumbers`);
      return Number(page);
    });
    return Object.freeze({
      code: raw.code as AeatEnforcementMoneyFactsResult["issues"][number]["code"],
      kind: raw.kind as AeatEnforcementMoneyFactsResult["issues"][number]["kind"],
      pageNumbers: Object.freeze(pageNumbers),
    });
  });
  if ((facts.length > 0) !== (value.outcome === "FACTS_AVAILABLE") || (facts.length > 0 && value.documentType !== "AEAT_ENFORCEMENT_ORDER")) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "moneyFacts.$semantics");
  }
  return Object.freeze({
    schemaVersion: 1,
    engineId: "aeat-enforcement-money-facts",
    engineVersion: value.engineVersion as "1.0.0" | "1.1.0" | "1.2.0",
    documentType: value.documentType as "AEAT_ENFORCEMENT_ORDER" | null,
    status: value.status as "REVIEW_REQUIRED" | "INFORMATION_PENDING",
    outcome: value.outcome as AeatEnforcementMoneyFactsResult["outcome"],
    facts: Object.freeze(facts),
    issues: Object.freeze(issues),
    selectedPaymentAmountKind: null,
    semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY",
    legalRuleStatus: "NOT_APPLIED",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function dataArray(value: unknown, path: string, max: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", path);
  if (Object.keys(value).some((key, index) => key !== String(index))) {
    throw new FiscalNotificationInputError("INVALID_INPUT", `${path}.$shape`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new FiscalNotificationInputError("INVALID_INPUT", `${path}[${index}]`);
    }
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

function requirePage(context: ValidatedContextV1, page: number): DocumentSegmentV1 {
  const segment = context.pageToSegment.get(page);
  if (!segment) throw new FiscalNotificationInputError("INVALID_INPUT", "adapterFacts.pageNumber");
  return segment;
}

function requireFactPage(context: ValidatedContextV1, page: number): DocumentSegmentV1 {
  return requirePage(context, page);
}

function uniquePages(pages: readonly number[]): readonly number[] {
  return Object.freeze([...new Set(pages)].sort((left, right) => left - right));
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function stableToken(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isAbortSignal(value: unknown): value is AbortSignal {
  return (
    (isPlainRecordV1(value) || (typeof value === "object" && value !== null)) &&
    typeof (value as AbortSignal).aborted === "boolean" &&
    typeof (value as AbortSignal).addEventListener === "function"
  );
}

export const EXISTING_EXTRACTOR_ADAPTERS_RELEASE_V1 = Object.freeze({
  version: ADAPTER_VERSION,
  adaptedFamilies: Object.freeze([
    "collection.enforcement_order",
    "collection.external_debt",
    "collection.deferral_grant",
    "collection.offset_requested",
    "collection.offset_ex_officio",
  ] as const),
  semanticPolicy: "EXPLICIT_LEGACY_FACTS_TO_REVIEW_ONLY_CORE",
  persistencePolicy: "NO_PERSISTENCE_PERFORMED_BY_ADAPTER",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
});
