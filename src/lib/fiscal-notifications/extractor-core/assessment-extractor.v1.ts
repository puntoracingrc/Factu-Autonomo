import {
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import type {
  AdministrativeActV1,
  AdministrativeEntityV1,
  DebtClaimV1,
  EntityEvidenceV1,
  PartyV1,
  TaxProcedureV1,
} from "./domain.v1";
import { createDocumentSegmentV1, type DocumentSegmentV1 } from "./document-segment.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import {
  createMonetaryComponentV1,
  type MonetaryComponentTypeV1,
  type MonetaryComponentV1,
} from "./monetary-component.v1";
import {
  createProceduralDateV1,
  type ProceduralDateTypeV1,
  type ProceduralDateV1,
} from "./procedural-date.v1";
import { normalizeReferenceV1, type ReferenceTypeV1, type ReferenceV1 } from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const ASSESSMENT_EXTRACTOR_VERSION_V1 = "1.1.0" as const;

export const ASSESSMENT_EXTRACTOR_LIMITS_V1 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxTextFactChars: 1_000,
  maxSectionItems: 32,
  maxHeaderLines: 50,
} as const);

export type AssessmentStageV1 =
  | "ALLEGATIONS_AND_PROVISIONAL_ASSESSMENT_PROPOSAL"
  | "FINAL_PROVISIONAL_ASSESSMENT";

export type AssessmentMoneyRoleV1 =
  | "DECLARED_AMOUNT"
  | "CONSIDERED_AMOUNT"
  | "PROPOSED_BASE"
  | "LIQUIDATED_BASE"
  | "TAX_QUOTA"
  | "LATE_INTEREST"
  | "SURCHARGE"
  | "RESULT";

export interface AssessmentTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly extractionMethod: "CLOSED_LABEL" | "CLOSED_SECTION";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AssessmentMoneyFactV1 {
  readonly role: AssessmentMoneyRoleV1;
  readonly printedValue: string;
  readonly amountCents: number;
  readonly sign: "POSITIVE" | "NEGATIVE";
  readonly sourcePage: number;
  readonly sourceLabel: string;
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AssessmentFactsV1 {
  readonly stage: AssessmentStageV1 | null;
  readonly expediente: AssessmentTextFactV1 | null;
  readonly taxConcept: AssessmentTextFactV1 | null;
  readonly model: AssessmentTextFactV1 | null;
  readonly fiscalYear: AssessmentTextFactV1 | null;
  readonly period: AssessmentTextFactV1 | null;
  readonly taxId: AssessmentTextFactV1 | null;
  readonly recipient: AssessmentTextFactV1 | null;
  readonly reason: AssessmentTextFactV1 | null;
  readonly factsAndGrounds: readonly AssessmentTextFactV1[];
  readonly moneyFacts: readonly AssessmentMoneyFactV1[];
  readonly rawAllegationDeadline: AssessmentTextFactV1 | null;
  readonly rawPaymentDeadline: AssessmentTextFactV1 | null;
  readonly printedAppealInformation: readonly AssessmentTextFactV1[];
  readonly liquidationKey: AssessmentTextFactV1 | null;
  readonly debtKey: AssessmentTextFactV1 | null;
  readonly priorRequirementReference: AssessmentTextFactV1 | null;
  readonly csv: AssessmentTextFactV1 | null;
}

export interface AssessmentExtractorOutputV1 extends ExtractorOutputV1 {
  readonly assessmentFacts: AssessmentFactsV1;
  readonly retainedSourceContent: "NONE";
  readonly legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS";
}

export interface ExtractAssessmentInputV1 {
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
  readonly mainSegments: readonly DocumentSegmentV1[];
  readonly pageToFactSegment: ReadonlyMap<number, DocumentSegmentV1>;
}

interface ParsedAssessmentV1 {
  readonly facts: AssessmentFactsV1;
  readonly references: readonly ReferenceV1[];
  readonly money: readonly MonetaryComponentV1[];
  readonly dates: readonly ProceduralDateV1[];
  readonly warnings: readonly string[];
}

const LABELS = Object.freeze({
  expediente: ["numero de expediente", "expediente"],
  taxConcept: ["concepto tributario", "impuesto"],
  model: ["modelo relacionado", "modelo"],
  fiscalYear: ["ejercicio fiscal", "ejercicio"],
  period: ["periodo fiscal", "periodo"],
  taxId: ["n.i.f.", "nif"],
  recipient: ["nombre y apellidos / razon social", "nombre o razon social", "destinatario"],
  reason: ["motivo de la propuesta", "motivo de la liquidacion", "motivo"],
  allegationDeadline: ["plazo de alegaciones", "plazo para formular alegaciones"],
  paymentDeadline: ["plazo de pago", "fecha limite de pago", "vencimiento de pago"],
  liquidationKey: ["clave de liquidacion"],
  debtKey: ["clave de deuda"],
  priorRequirement: ["requerimiento anterior", "numero de requerimiento anterior"],
  csv: ["codigo seguro de verificacion (csv)", "codigo seguro de verificacion", "csv"],
  issueDate: ["fecha de emision", "fecha de la resolucion", "fecha de la propuesta"],
  notificationDate: ["fecha de notificacion"],
} as const);

const MONEY_LABELS = Object.freeze({
  DECLARED_AMOUNT: ["importe declarado"],
  CONSIDERED_AMOUNT: ["importe considerado", "importe calculado por la administracion"],
  PROPOSED_BASE: ["base propuesta", "base imponible propuesta"],
  LIQUIDATED_BASE: ["base liquidada", "base imponible liquidada"],
  TAX_QUOTA: ["cuota propuesta", "cuota liquidada", "cuota"],
  LATE_INTEREST: ["total intereses de demora", "intereses de demora"],
  SURCHARGE: ["recargos", "recargo"],
  RESULT: ["resultado a ingresar", "resultado de la liquidacion", "resultado"],
} as const satisfies Readonly<Record<AssessmentMoneyRoleV1, readonly string[]>>);

const ALL_LABEL_LITERALS = Object.freeze([
  ...Object.values(LABELS).flat(),
  ...Object.values(MONEY_LABELS).flat(),
]);

const FACTS_HEADINGS = new Set([
  "hechos y fundamentos de derecho que motivan la resolucion",
  "hechos y fundamentos de derecho",
  "hechos y motivacion",
  "motivacion",
]);
const APPEAL_HEADINGS = new Set(["recursos y reclamaciones", "recursos", "recursos impresos"]);
const ALL_SECTION_HEADINGS = new Set([
  ...FACTS_HEADINGS,
  ...APPEAL_HEADINGS,
  "identificacion del documento",
  "puesta de manifiesto del expediente",
  "resultado de la propuesta de liquidacion",
  "resultado de la liquidacion provisional",
  "intereses de demora",
  "plazos para el pago",
  "normativa",
  "firma",
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
  "instrucciones para",
  "especificacion",
]);

export function extractAssessmentV1(input: ExtractAssessmentInputV1): AssessmentExtractorOutputV1 {
  assertExactDataRecordV1(input, "assessmentInput", ["document", "segments"]);
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const validated = validateSegments(input.document, input.segments);
  if (validated.mainSegments.length === 0) return emptyOutput("UNKNOWN");
  const factualPages = new Set(validated.pageToFactSegment.keys());
  const lines = collectLines(input.document, factualPages);
  const recognition = recognizeAssessment(lines, validated.mainSegments);
  if (recognition.status !== "RECOGNIZED") {
    return emptyOutput(
      recognition.status === "BLOCKED" ? "BLOCKED" : "UNKNOWN",
      recognition.warning,
    );
  }

  const parsed = parseAssessment(input.document.documentId, recognition.stage, lines);
  const primaryPages = uniqueNumbers(validated.mainSegments.flatMap((segment) => range(segment.pageFrom, segment.pageTo)));
  const evidence = createEvidence(input.document, validated.pageToFactSegment, primaryPages);
  const familyId = familyForStage(recognition.stage);
  const actId = entityId(input.document, "act", 0);
  const act: AdministrativeActV1 = Object.freeze({
    entityId: actId,
    ownerScope: input.document.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence,
    familyId,
    actSubtype: recognition.stage,
    references: parsed.references,
    dates: parsed.dates,
  });
  const procedure: TaxProcedureV1 = Object.freeze({
    entityId: entityId(input.document, "procedure", 0),
    ownerScope: input.document.ownerScope,
    entityKind: "TAX_PROCEDURE",
    evidence,
    procedureType: "TAX_ASSESSMENT_REVIEW",
    referenceIds: Object.freeze([]),
    actIds: Object.freeze([actId]),
  });
  const entities: AdministrativeEntityV1[] = [act, procedure];
  if (parsed.facts.recipient) {
    const party: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence: createEvidence(input.document, validated.pageToFactSegment, parsed.facts.recipient.pageNumbers),
      displayName: parsed.facts.recipient.printedValue,
      taxIdReferenceId: null,
      roles: Object.freeze(["TAXPAYER"] as const),
    });
    entities.push(party);
  }
  const positiveResult = parsed.facts.moneyFacts.find((fact) =>
    fact.role === "RESULT" && fact.sign === "POSITIVE" && fact.amountCents > 0
  );
  const debtMoney = parsed.money.filter((component) => [
    "TAX_QUOTA", "LATE_INTEREST", "SURCHARGE", "TOTAL_CLAIMED",
  ].includes(component.componentType));
  if (recognition.stage === "FINAL_PROVISIONAL_ASSESSMENT" && positiveResult && debtMoney.length > 0) {
    const debt: DebtClaimV1 = Object.freeze({
      entityId: entityId(input.document, "debt", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "DEBT_CLAIM",
      evidence,
      creationBasis: "EXPLICITLY_PRINTED_DEBT",
      monetaryComponents: Object.freeze(debtMoney),
      referenceIds: Object.freeze([]),
    });
    entities.push(debt);
  }

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "assessment",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status: "REVIEW_REQUIRED",
    familyCandidates: Object.freeze([Object.freeze({
      familyId,
      confidence: 1,
      matchingEvidenceIds: Object.freeze(validated.mainSegments.map((segment) => segment.segmentId)),
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
    assessmentFacts: parsed.facts,
    retainedSourceContent: "NONE",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function recognizeAssessment(
  lines: readonly PrivateLineV1[],
  mainSegments: readonly DocumentSegmentV1[],
): { readonly status: "RECOGNIZED"; readonly stage: AssessmentStageV1 } |
  { readonly status: "UNKNOWN" | "BLOCKED"; readonly warning: string | null } {
  const mainPages = new Set(mainSegments.flatMap((segment) => range(segment.pageFrom, segment.pageTo)));
  const mainLines = lines.filter((line) => mainPages.has(line.pageNumber));
  const headerPage = Math.min(...mainSegments.map((segment) => segment.pageFrom));
  const headerLines = mainLines.filter((line) =>
    line.pageNumber === headerPage && line.lineIndex < ASSESSMENT_EXTRACTOR_LIMITS_V1.maxHeaderLines
  );
  if (headerLines.some((line) => NON_DOCUMENT_HEADER_PREFIXES.some((prefix) => line.folded.startsWith(prefix)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_NON_DOCUMENT_GUIDE" };
  }
  if (mainLines.some((line) => CONFLICTING_AUTHORITY_MARKERS.some((marker) => containsTokenSequence(line.folded, marker)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_AUTHORITY_OR_TERRITORY" };
  }
  const officialDomainPrinted = headerLines.some((line) => OFFICIAL_AEAT_DOMAINS.has(line.folded));
  const trustedSegmentAuthority = mainSegments.every((segment) =>
    segment.detectedAuthority === "AEAT" &&
    (segment.classificationConfidence >= 0.9 ||
      (segment.detectedTitle !== null &&
        segment.classificationConfidence >= 0.55))
  );
  if (!officialDomainPrinted && !trustedSegmentAuthority) {
    return { status: "UNKNOWN", warning: null };
  }
  const proposalTitle = mainLines.some((line, index) =>
    line.folded === "notificacion del tramite de alegaciones y propuesta de liquidacion provisional" ||
    (
      line.folded === "notificacion del tramite de alegaciones y" &&
      mainLines.slice(index + 1, index + 4).some((next) =>
        next.pageNumber === line.pageNumber && next.folded === "propuesta de liquidacion provisional"
      )
    )
  );
  const finalTitle = mainLines.some((line) =>
    line.folded === "notificacion de resolucion con liquidacion provisional" ||
    line.folded === "resolucion con liquidacion provisional"
  );
  if (proposalTitle && finalTitle) return { status: "BLOCKED", warning: "CONFLICTING_ASSESSMENT_STAGE" };
  if (proposalTitle) return { status: "RECOGNIZED", stage: "ALLEGATIONS_AND_PROVISIONAL_ASSESSMENT_PROPOSAL" };
  if (finalTitle) return { status: "RECOGNIZED", stage: "FINAL_PROVISIONAL_ASSESSMENT" };
  return { status: "UNKNOWN", warning: null };
}

function parseAssessment(
  documentId: string,
  stage: AssessmentStageV1,
  lines: readonly PrivateLineV1[],
): ParsedAssessmentV1 {
  const warnings: string[] = [];
  const expediente = uniqueLabelFact(lines, LABELS.expediente, "Expediente", warnings, "CONFLICTING_EXPEDIENTE");
  const taxConcept = uniqueLabelFact(lines, LABELS.taxConcept, "Concepto tributario", warnings, "CONFLICTING_TAX_CONCEPT");
  const model = uniqueLabelFact(lines, LABELS.model, "Modelo", warnings, "CONFLICTING_MODEL");
  const fiscalYear = uniqueLabelFact(lines, LABELS.fiscalYear, "Ejercicio", warnings, "CONFLICTING_FISCAL_YEAR");
  const period = uniqueLabelFact(lines, LABELS.period, "Periodo", warnings, "CONFLICTING_TAX_PERIOD");
  const taxId = uniqueLabelFact(lines, LABELS.taxId, "NIF", warnings, "CONFLICTING_TAX_ID");
  const recipient = uniqueLabelFact(lines, LABELS.recipient, "Destinatario", warnings, "CONFLICTING_RECIPIENT");
  const reason = uniqueLabelFact(lines, LABELS.reason, "Motivo", warnings, "CONFLICTING_REASON");
  const rawAllegationDeadline = uniqueLabelFact(lines, LABELS.allegationDeadline, "Plazo de alegaciones", warnings, "CONFLICTING_ALLEGATION_DEADLINE");
  const rawPaymentDeadline = uniqueLabelFact(lines, LABELS.paymentDeadline, "Plazo de pago", warnings, "CONFLICTING_PAYMENT_DEADLINE");
  const liquidationKey = uniqueLabelFact(lines, LABELS.liquidationKey, "Clave de liquidación", warnings, "CONFLICTING_LIQUIDATION_KEY");
  const debtKey = uniqueLabelFact(lines, LABELS.debtKey, "Clave de deuda", warnings, "CONFLICTING_DEBT_KEY");
  const priorRequirementReference = uniqueLabelFact(lines, LABELS.priorRequirement, "Requerimiento anterior", warnings, "CONFLICTING_PRIOR_REQUIREMENT");
  const csv = uniqueLabelFact(lines, LABELS.csv, "CSV", warnings, "CONFLICTING_CSV");
  const factsAndGrounds = extractSectionItems(lines, FACTS_HEADINGS, "Hechos y fundamentos");
  const printedAppealInformation = extractSectionItems(lines, APPEAL_HEADINGS, "Recursos impresos");
  const moneyFacts = extractMoneyFacts(lines, warnings);

  const references: ReferenceV1[] = [];
  addReference(references, documentId, "EXPEDIENTE_ID", expediente);
  addReference(references, documentId, "MODEL", model);
  addReference(references, documentId, "FISCAL_YEAR", fiscalYear);
  addReference(references, documentId, "TAX_PERIOD", period);
  addReference(references, documentId, "NIF", taxId);
  addReference(references, documentId, "LIQUIDATION_KEY", liquidationKey);
  addReference(references, documentId, "DEBT_KEY", debtKey);
  addReference(references, documentId, "ACT_ID", priorRequirementReference);
  addReference(references, documentId, "CSV", csv);

  const money = Object.freeze(moneyFacts.map((fact, index) => createMonetaryComponentV1({
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
  })));

  const dates: ProceduralDateV1[] = [];
  addPrintedDate(dates, documentId, lines, LABELS.issueDate, "ISSUE_DATE", "Fecha de emisión", warnings, true);
  addPrintedDate(dates, documentId, lines, LABELS.notificationDate, "EFFECTIVE_NOTIFICATION_DATE", "Fecha de notificación", warnings, true);
  addDeadline(dates, documentId, rawAllegationDeadline, "RESPONSE_DEADLINE", "assessment-allegation");
  addDeadline(dates, documentId, rawPaymentDeadline, "VOLUNTARY_PAYMENT_DEADLINE", "assessment-payment");
  if (stage === "ALLEGATIONS_AND_PROVISIONAL_ASSESSMENT_PROPOSAL" && !rawAllegationDeadline) {
    warnings.push("MISSING_EXPLICIT_ALLEGATION_DEADLINE");
  }
  if (stage === "FINAL_PROVISIONAL_ASSESSMENT" && !moneyFacts.some((fact) => fact.role === "RESULT")) {
    warnings.push("MISSING_EXPLICIT_ASSESSMENT_RESULT");
  }

  return Object.freeze({
    facts: Object.freeze({
      stage,
      expediente,
      taxConcept,
      model,
      fiscalYear,
      period,
      taxId,
      recipient,
      reason,
      factsAndGrounds,
      moneyFacts,
      rawAllegationDeadline,
      rawPaymentDeadline,
      printedAppealInformation,
      liquidationKey,
      debtKey,
      priorRequirementReference,
      csv,
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
): AssessmentTextFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    const matched = labels.find((label) => matchesLabel(line.folded, label));
    if (!matched) return [];
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
  return only ? textFact(only.value, only.pages, sourceLabel, "CLOSED_LABEL") : null;
}

function extractMoneyFacts(lines: readonly PrivateLineV1[], warnings: string[]): readonly AssessmentMoneyFactV1[] {
  const facts: AssessmentMoneyFactV1[] = [];
  (Object.entries(MONEY_LABELS) as readonly [AssessmentMoneyRoleV1, readonly string[]][]).forEach(([role, labels]) => {
    const observations: { raw: string; cents: number; sign: "POSITIVE" | "NEGATIVE"; page: number }[] = [];
    lines.forEach((line) => {
      if (!labels.some((label) => matchesLabel(line.folded, label))) return;
      const value = extractInlineLabelValue(line);
      if (!value) return;
      const parsed = parsePrintedEuro(value);
      if (!parsed) {
        if (looksLikePrintedMoney(value)) warnings.push(`INVALID_PRINTED_AMOUNT_${role}`);
        return;
      }
      observations.push({ raw: value, cents: parsed.amountCents, sign: parsed.sign, page: line.pageNumber });
    });
    if (role === "RESULT") {
      lines.forEach((line, index) => {
        const next = lines[index + 1];
        const combined = next?.pageNumber === line.pageNumber ? `${line.raw} ${next.raw}` : line.raw;
        const narrative = /^como consecuencia de la (?:propuesta de liquidacion provisional|liquidacion provisional) realizada por la administracion resulta una cuota a pagar de\s+([+-]?(?:(?:\d{1,3}(?:\.\d{3})+)|\d+),\d{2}(?:\s*(?:€|euros?))?)/iu.exec(fold(combined));
        if (!narrative) return;
        const parsed = parsePrintedEuro(narrative[1]!);
        if (!parsed) return;
        observations.push({
          raw: narrative[1]!,
          cents: parsed.amountCents,
          sign: parsed.sign,
          page: line.pageNumber,
        });
      });
    }
    const distinct = new Map(observations.map((item) => [`${item.sign}|${item.cents}`, item]));
    if (distinct.size > 1) {
      warnings.push(`CONFLICTING_PRINTED_AMOUNT_${role}`);
      return;
    }
    const only = [...distinct.values()][0];
    if (!only) return;
    facts.push(Object.freeze({
      role,
      printedValue: only.raw,
      amountCents: only.cents,
      sign: only.sign,
      sourcePage: only.page,
      sourceLabel: role,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      reviewStatus: "REVIEW_REQUIRED",
    }));
  });
  return Object.freeze(facts);
}

function extractSectionItems(
  lines: readonly PrivateLineV1[],
  headings: ReadonlySet<string>,
  sourceLabel: string,
): readonly AssessmentTextFactV1[] {
  const items: AssessmentTextFactV1[] = [];
  for (let headingIndex = 0; headingIndex < lines.length; headingIndex += 1) {
    if (!headings.has(lines[headingIndex]!.folded)) continue;
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (
        ALL_SECTION_HEADINGS.has(line.folded) ||
        ALL_LABEL_LITERALS.some((label) => matchesLabel(line.folded, label))
      ) break;
      const value = line.raw.replace(/^[-•*]\s*/u, "").trim();
      if (value.length === 0) continue;
      items.push(textFact(value, [line.pageNumber], sourceLabel, "CLOSED_SECTION"));
      if (items.length >= ASSESSMENT_EXTRACTOR_LIMITS_V1.maxSectionItems) return Object.freeze(items);
    }
  }
  return Object.freeze(items);
}

function extractLabelValue(
  lines: readonly PrivateLineV1[],
  line: PrivateLineV1,
  index: number,
): string | null {
  const separator = line.raw.search(/[:\-]/u);
  const sameLine = separator >= 0 ? line.raw.slice(separator + 1).trim() : "";
  if (sameLine.length > 0 && sameLine.length <= ASSESSMENT_EXTRACTOR_LIMITS_V1.maxTextFactChars) return sameLine;
  const next = lines[index + 1];
  if (
    next &&
    next.pageNumber === line.pageNumber &&
    next.raw.length <= ASSESSMENT_EXTRACTOR_LIMITS_V1.maxTextFactChars &&
    !ALL_SECTION_HEADINGS.has(next.folded) &&
    !ALL_LABEL_LITERALS.some((label) => matchesLabel(next.folded, label))
  ) return next.raw;
  return null;
}

function extractInlineLabelValue(line: PrivateLineV1): string | null {
  const separator = line.raw.search(/[:\-]/u);
  if (separator < 0) return null;
  const value = line.raw.slice(separator + 1).trim();
  return value.length > 0 && value.length <= ASSESSMENT_EXTRACTOR_LIMITS_V1.maxTextFactChars
    ? value
    : null;
}

function addReference(
  target: ReferenceV1[],
  documentId: string,
  referenceType: ReferenceTypeV1,
  fact: AssessmentTextFactV1 | null,
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
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  dateType: ProceduralDateTypeV1,
  sourceLabel: string,
  warnings: string[],
  warnIfInvalid: boolean,
): void {
  const fact = uniqueLabelFact(lines, labels, sourceLabel, warnings, `CONFLICTING_${dateType}`);
  if (!fact) return;
  const parsedDate = parsePrintedDate(fact.printedValue);
  if (warnIfInvalid && parsedDate === null) warnings.push(`INVALID_PRINTED_${dateType}`);
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

function addDeadline(
  target: ProceduralDateV1[],
  documentId: string,
  fact: AssessmentTextFactV1 | null,
  dateType: "RESPONSE_DEADLINE" | "VOLUNTARY_PAYMENT_DEADLINE",
  suffix: string,
): void {
  if (!fact) return;
  target.push(createProceduralDateV1({
    proceduralDateId: `${stablePrefix(documentId)}-date-${suffix}`,
    dateType,
    rawText: fact.printedValue,
    rawDeadlineText: fact.printedValue,
    parsedDate: parsePrintedDate(fact.printedValue),
    timezone: null,
    sourceDocumentId: documentId,
    sourcePage: fact.pageNumbers[0]!,
    sourceLabel: fact.sourceLabel,
    sourceCoordinates: null,
    extractionConfidence: 1,
    explicitlyPrinted: true,
    legallyComputed: false,
    computationRuleId: null,
    requiresReview: true,
  }));
}

function textFact(
  printedValue: string,
  pageNumbers: readonly number[],
  sourceLabel: string,
  extractionMethod: AssessmentTextFactV1["extractionMethod"],
): AssessmentTextFactV1 {
  if (printedValue.length === 0 || printedValue.length > ASSESSMENT_EXTRACTOR_LIMITS_V1.maxTextFactChars) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "assessment.textFact");
  }
  return Object.freeze({
    printedValue,
    pageNumbers: uniqueNumbers(pageNumbers),
    sourceLabel,
    extractionMethod,
    assertionType: "EXPLICIT_IN_DOCUMENT",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function validateSegments(document: BoundedDocumentInput, rawSegments: readonly DocumentSegmentV1[]): ValidatedSegmentsV1 {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0 || rawSegments.length > document.pages.length) {
    throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "assessment.segments");
  }
  const segments = rawSegments.map((segment) => createDocumentSegmentV1(segment));
  const covered = new Set<number>();
  const ids = new Set<string>();
  const pageToFactSegment = new Map<number, DocumentSegmentV1>();
  for (const segment of segments) {
    if (segment.documentId !== document.documentId || ids.has(segment.segmentId)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", "assessment.segments.identity");
    }
    ids.add(segment.segmentId);
    for (let page = segment.pageFrom; page <= segment.pageTo; page += 1) {
      if (covered.has(page) || page > document.pages.length) {
        throw new FiscalNotificationInputError("INVALID_INPUT", "assessment.segments.coverage");
      }
      covered.add(page);
      if (segment.canGenerateAdministrativeFacts) pageToFactSegment.set(page, segment);
    }
  }
  if (covered.size !== document.pages.length) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "assessment.segments.coverage");
  }
  return Object.freeze({
    segments: Object.freeze(segments),
    mainSegments: Object.freeze(segments.filter((segment) => segment.segmentType === "MAIN_ADMINISTRATIVE_ACT")),
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
      if (raw.length > ASSESSMENT_EXTRACTOR_LIMITS_V1.maxLineChars) {
        throw new FiscalNotificationInputError("INVALID_INPUT", `assessment.pages[${page.pageNumber}].line`);
      }
      lines.push(Object.freeze({ pageNumber: page.pageNumber, lineIndex: index, raw, folded: fold(raw) }));
      if (lines.length > ASSESSMENT_EXTRACTOR_LIMITS_V1.maxLines) {
        throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "assessment.lines");
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
    if (!segment) throw new FiscalNotificationInputError("INVALID_INPUT", "assessment.evidence.segment");
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
  const match = /^(\d{2})([/-])(\d{2})\2(\d{4})$/u.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[3]);
  const year = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    : null;
}

function moneyComponentType(role: AssessmentMoneyRoleV1): MonetaryComponentTypeV1 {
  switch (role) {
    case "TAX_QUOTA": return "TAX_QUOTA";
    case "LATE_INTEREST": return "LATE_INTEREST";
    case "SURCHARGE": return "SURCHARGE";
    case "RESULT": return "TOTAL_CLAIMED";
    default: return "OTHER";
  }
}

function familyForStage(stage: AssessmentStageV1): FiscalNotificationDocumentFamilyIdV3 {
  return stage === "ALLEGATIONS_AND_PROVISIONAL_ASSESSMENT_PROPOSAL"
    ? "assessment.allegations_and_proposal"
    : "assessment.final_provisional_assessment";
}

function emptyOutput(
  status: "UNKNOWN" | "BLOCKED",
  warning: string | null = null,
): AssessmentExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "assessment",
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
    assessmentFacts: Object.freeze({
      stage: null,
      expediente: null,
      taxConcept: null,
      model: null,
      fiscalYear: null,
      period: null,
      taxId: null,
      recipient: null,
      reason: null,
      factsAndGrounds: Object.freeze([]),
      moneyFacts: Object.freeze([]),
      rawAllegationDeadline: null,
      rawPaymentDeadline: null,
      printedAppealInformation: Object.freeze([]),
      liquidationKey: null,
      debtKey: null,
      priorRequirementReference: null,
      csv: null,
    }),
    retainedSourceContent: "NONE",
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
  return `fx-assessment-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function entityId(document: BoundedDocumentInput, kind: string, index: number): string {
  return `${stablePrefix(`${document.ownerScope}|${document.documentId}`)}-${kind}-${index}`;
}

export const ASSESSMENT_EXTRACTOR_RELEASE_V1 = Object.freeze({
  version: ASSESSMENT_EXTRACTOR_VERSION_V1,
  familyIds: Object.freeze([
    "assessment.allegations_and_proposal",
    "assessment.final_provisional_assessment",
  ] as const),
  officialInterpretationSources: Object.freeze([
    Object.freeze({ sourceId: "aeat.procedure.G214", url: "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G214.shtml" }),
    Object.freeze({ sourceId: "boe.lgt.articles.132-133", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186" }),
    Object.freeze({ sourceId: "boe.rgat.procedure", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984" }),
  ]),
  sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
  deadlinePolicy: "NO_COMPUTED_DEADLINE",
  proposalPolicy: "PROPOSAL_NEVER_CREATES_DEBT_CLAIM",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
});
