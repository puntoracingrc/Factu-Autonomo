import {
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import { extractFiscalNotificationCandidates } from "../extraction-dispatcher";
import type { AdministrativeActV1, AdministrativeEntityV1, EntityEvidenceV1, PartyV1, TaxProcedureV1 } from "./domain.v1";
import { createDocumentSegmentV1, type DocumentSegmentV1 } from "./document-segment.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import { createProceduralDateV1, type ProceduralDateV1, type ProceduralDateTypeV1 } from "./procedural-date.v1";
import { normalizeReferenceV1, type ReferenceTypeV1, type ReferenceV1 } from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const FORMAL_FILING_REQUIREMENT_EXTRACTOR_VERSION_V1 = "1.0.0" as const;

export const FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxTextFactChars: 500,
  maxSectionItems: 16,
  maxObligations: 128,
  maxSectionScanLines: 40,
} as const);

export interface FormalRequirementTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly extractionMethod: "CLOSED_LABEL" | "CLOSED_SECTION";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface FormalRequirementObligationV1 {
  readonly model: string;
  readonly fiscalYear: string;
  readonly period: string;
  readonly sourcePage: number;
  readonly sourceLabel: "MODELO_EJERCICIO_PERIODO_ROW";
  readonly extractionMethod: "CLOSED_TABLE_ROW";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface FormalFilingRequirementFactsV1 {
  readonly requirementNumber: FormalRequirementTextFactV1 | null;
  readonly expediente: FormalRequirementTextFactV1 | null;
  readonly taxId: FormalRequirementTextFactV1 | null;
  readonly recipient: FormalRequirementTextFactV1 | null;
  readonly obligations: readonly FormalRequirementObligationV1[];
  readonly reason: FormalRequirementTextFactV1 | null;
  readonly rawDeadlineText: FormalRequirementTextFactV1 | null;
  readonly responseChannel: FormalRequirementTextFactV1 | null;
  readonly documentationRequired: readonly FormalRequirementTextFactV1[];
  readonly explicitConsequences: readonly FormalRequirementTextFactV1[];
  readonly csv: FormalRequirementTextFactV1 | null;
}

export interface FormalFilingRequirementExtractorOutputV1 extends ExtractorOutputV1 {
  readonly requirementFacts: FormalFilingRequirementFactsV1;
  readonly retainedSourceContent: "NONE";
  readonly legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS";
}

export interface ExtractFormalFilingRequirementInputV1 {
  readonly document: BoundedDocumentInput;
  readonly segments: readonly DocumentSegmentV1[];
}

interface PrivateLineV1 {
  readonly pageNumber: number;
  readonly lineIndex: number;
  readonly raw: string;
  readonly folded: string;
}

interface ParsedRequirementV1 {
  readonly facts: FormalFilingRequirementFactsV1;
  readonly references: readonly ReferenceV1[];
  readonly dates: readonly ProceduralDateV1[];
  readonly warnings: readonly string[];
}

type RequirementCandidateFamilyV1 =
  | "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE"
  | "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE";

const REQUIREMENT_FAMILY_CONTEXT_V1 = Object.freeze({
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE: Object.freeze({
    familyId: "compliance.formal_filing_requirement" as const,
    actSubtype:
      "REQUERIMIENTO_FORMAL_PRESENTACION_DECLARACIONES_AUTOLIQUIDACIONES",
    procedureType: "CONTROL_PRESENTACION_DECLARACIONES_AUTOLIQUIDACIONES",
    requestKind: "FORMAL_FILING" as const,
  }),
  AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE: Object.freeze({
    familyId: "compliance.document_request" as const,
    actSubtype: "REQUERIMIENTO_APORTACION_DOCUMENTACION",
    procedureType: "REQUERIMIENTO_DOCUMENTACION_TRIBUTARIA",
    requestKind: "DOCUMENTATION" as const,
  }),
});

const LABELS = Object.freeze({
  requirementNumber: ["numero de requerimiento", "nº de requerimiento", "referencia del requerimiento"],
  expediente: ["numero de expediente", "expediente"],
  taxId: ["n.i.f.", "nif"],
  recipient: [
    "nombre y apellidos / razon social",
    "nombre y apellidos o razon social",
    "nombre / razon social",
    "nombre o razon social",
    "destinatario",
  ],
  reason: ["motivo del requerimiento", "motivo"],
  deadline: ["plazo para atender el requerimiento", "plazo de contestacion", "plazo"],
  responseChannel: ["canal de respuesta", "forma de contestacion", "forma de atender el requerimiento"],
  csv: ["codigo seguro de verificacion (csv)", "codigo seguro de verificacion", "csv"],
  issueDate: ["fecha de emision", "fecha del requerimiento"],
  notificationDate: ["fecha de notificacion"],
} as const);
const ALL_LABEL_LITERALS = Object.freeze(Object.values(LABELS).flat());

const DOCUMENTATION_HEADINGS = new Set([
  "documentacion requerida",
  "documentacion a aportar",
]);
const DOCUMENT_REQUEST_HEADINGS = new Set([
  ...DOCUMENTATION_HEADINGS,
  "acuerdo",
]);
const CONSEQUENCE_HEADINGS = new Set([
  "consecuencias del incumplimiento",
  "advertencias",
  "advertencia",
]);
const DOCUMENT_REQUEST_CONSEQUENCE_HEADINGS = new Set([
  ...CONSEQUENCE_HEADINGS,
  "informacion adicional",
]);
const OBLIGATION_HEADINGS = new Set([
  "declaraciones o autoliquidaciones no presentadas",
  "declaraciones y autoliquidaciones no presentadas",
]);
const ALL_SECTION_HEADINGS = new Set([
  ...DOCUMENTATION_HEADINGS,
  ...CONSEQUENCE_HEADINGS,
  ...OBLIGATION_HEADINGS,
  "plazo y forma de atender el requerimiento",
  "plazo para atender el requerimiento",
  "acuerdo",
  "plazo",
  "informacion adicional",
  "normas aplicables",
  "recursos",
  "firma",
  "identificacion del documento",
]);

export function extractFormalFilingRequirementV1(
  input: ExtractFormalFilingRequirementInputV1,
): FormalFilingRequirementExtractorOutputV1 {
  assertExactDataRecordV1(input, "requirementInput", ["document", "segments"]);
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const segments = validateSegments(input.document, input.segments);
  const mainSegments = segments.filter((segment) => segment.segmentType === "MAIN_ADMINISTRATIVE_ACT");
  const candidateResult = extractFiscalNotificationCandidates(input.document);
  const candidate = candidateResult.candidates.find(
    (item) =>
      (item.familyId === "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE" ||
        item.familyId === "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE") &&
      item.signalStatus === "COMPLETE_REQUIRED_ANCHORS",
  );
  const familyContext = candidate
    ? REQUIREMENT_FAMILY_CONTEXT_V1[
        candidate.familyId as RequirementCandidateFamilyV1
      ]
    : null;
  if (
    !candidate ||
    !familyContext ||
    candidateResult.reason !== "SUPPORTED_FAMILY_CANDIDATE" ||
    candidateResult.candidates.length !== 1 ||
    mainSegments.length === 0
  ) {
    const blocked = [
      "AMBIGUOUS_SUPPORTED_FAMILIES",
      "CONFLICTING_AUTHORITY_OR_TERRITORY",
      "CONFLICTING_DOCUMENT_SIGNAL",
    ].includes(candidateResult.reason);
    return emptyOutput(blocked ? "BLOCKED" : "UNKNOWN", blocked ? candidateResult.reason : null);
  }

  const factualPages = new Set(segments
    .filter((segment) => segment.canGenerateAdministrativeFacts)
    .flatMap((segment) => range(segment.pageFrom, segment.pageTo)));
  const lines = collectLines(input.document, factualPages);
  const parsed = parseRequirement(
    input.document.documentId,
    lines,
    familyContext.requestKind,
  );
  const evidencePages = uniqueNumbers([
    ...mainSegments.flatMap((segment) => range(segment.pageFrom, segment.pageTo)),
    ...parsed.facts.obligations.map((item) => item.sourcePage),
  ]);
  const evidence = createEvidence(input.document, segments, evidencePages);
  const actId = entityId(input.document, "act", 0);
  const act: AdministrativeActV1 = Object.freeze({
    entityId: actId,
    ownerScope: input.document.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence,
    familyId: familyContext.familyId,
    actSubtype: familyContext.actSubtype,
    references: Object.freeze([...parsed.references]),
    dates: Object.freeze([...parsed.dates]),
  });
  const procedure: TaxProcedureV1 = Object.freeze({
    entityId: entityId(input.document, "procedure", 0),
    ownerScope: input.document.ownerScope,
    entityKind: "TAX_PROCEDURE",
    evidence,
    procedureType: familyContext.procedureType,
    referenceIds: Object.freeze([]),
    actIds: Object.freeze([actId]),
  });
  const entities: AdministrativeEntityV1[] = [act, procedure];
  if (parsed.facts.recipient) {
    const party: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence: createEvidence(input.document, segments, parsed.facts.recipient.pageNumbers),
      displayName: parsed.facts.recipient.printedValue,
      taxIdReferenceId: null,
      roles: Object.freeze(["TAXPAYER"] as const),
    });
    entities.push(party);
  }

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "requirement",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status: "REVIEW_REQUIRED",
    familyCandidates: Object.freeze([
      Object.freeze({
        familyId: familyContext.familyId,
        confidence: 1,
        matchingEvidenceIds: Object.freeze(
          mainSegments.map((segment) => segment.segmentId),
        ),
        contradictoryEvidenceIds: Object.freeze([]),
      }),
    ]),
    entities: Object.freeze(entities),
    references: parsed.references,
    monetaryComponents: Object.freeze([]),
    proceduralDates: parsed.dates,
    warnings: parsed.warnings,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
    requirementFacts: parsed.facts,
    retainedSourceContent: "NONE",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function parseRequirement(
  documentId: string,
  lines: readonly PrivateLineV1[],
  requestKind: "FORMAL_FILING" | "DOCUMENTATION",
): ParsedRequirementV1 {
  const warnings: string[] = [];
  const requirementNumber = uniqueLabelFact(
    lines,
    requestKind === "DOCUMENTATION"
      ? [...LABELS.requirementNumber, "referencia"]
      : LABELS.requirementNumber,
    "Número de requerimiento",
    warnings,
    "CONFLICTING_REQUIREMENT_NUMBER",
  );
  const expediente = uniqueLabelFact(
    lines,
    LABELS.expediente,
    "Expediente",
    warnings,
    "CONFLICTING_EXPEDIENTE",
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
    "Destinatario",
    warnings,
    "CONFLICTING_RECIPIENT",
  );
  const reason = uniqueLabelFact(
    lines,
    LABELS.reason,
    "Motivo del requerimiento",
    warnings,
    "CONFLICTING_REASON",
  );
  const rawDeadlineText = uniqueLabelFact(
    lines,
    LABELS.deadline,
    "Plazo para atender el requerimiento",
    warnings,
    "CONFLICTING_DEADLINE_TEXT",
  );
  const responseChannel = uniqueLabelFact(
    lines,
    LABELS.responseChannel,
    "Canal de respuesta",
    warnings,
    "CONFLICTING_RESPONSE_CHANNEL",
  );
  const csv = uniqueLabelFact(
    lines,
    LABELS.csv,
    "CSV",
    warnings,
    "CONFLICTING_CSV",
  );
  const obligations = extractObligations(lines, warnings);
  const documentationRequired = extractSectionItems(
    lines,
    requestKind === "DOCUMENTATION"
      ? DOCUMENT_REQUEST_HEADINGS
      : DOCUMENTATION_HEADINGS,
    "Documentación requerida",
  );
  const explicitConsequences = extractSectionItems(
    lines,
    requestKind === "DOCUMENTATION"
      ? DOCUMENT_REQUEST_CONSEQUENCE_HEADINGS
      : CONSEQUENCE_HEADINGS,
    "Consecuencias expresas",
  );
  if (requestKind === "FORMAL_FILING" && obligations.length === 0) {
    warnings.push("MISSING_EXPLICIT_OBLIGATION_ROWS");
  }
  if (!rawDeadlineText) warnings.push("MISSING_EXPLICIT_RESPONSE_DEADLINE");

  const references: ReferenceV1[] = [];
  addReference(references, documentId, "ACT_ID", requirementNumber);
  addReference(references, documentId, "EXPEDIENTE_ID", expediente);
  addReference(references, documentId, "NIF", taxId);
  addReference(references, documentId, "CSV", csv);
  obligations.forEach((obligation) => {
    references.push(normalizeReferenceV1({
      referenceType: "MODEL",
      rawValue: obligation.model,
      sourceDocumentId: documentId,
      sourcePage: obligation.sourcePage,
      sourceLabel: obligation.sourceLabel,
      sourceCoordinates: null,
      confidence: 1,
    }));
    references.push(normalizeReferenceV1({
      referenceType: "FISCAL_YEAR",
      rawValue: obligation.fiscalYear,
      sourceDocumentId: documentId,
      sourcePage: obligation.sourcePage,
      sourceLabel: obligation.sourceLabel,
      sourceCoordinates: null,
      confidence: 1,
    }));
    references.push(normalizeReferenceV1({
      referenceType: "TAX_PERIOD",
      rawValue: obligation.period,
      sourceDocumentId: documentId,
      sourcePage: obligation.sourcePage,
      sourceLabel: obligation.sourceLabel,
      sourceCoordinates: null,
      confidence: 1,
    }));
  });

  const dates: ProceduralDateV1[] = [];
  addPrintedDate(dates, documentId, lines, LABELS.issueDate, "ISSUE_DATE", "Fecha de emisión", warnings);
  addPrintedDate(dates, documentId, lines, LABELS.notificationDate, "EFFECTIVE_NOTIFICATION_DATE", "Fecha de notificación", warnings);
  if (rawDeadlineText) {
    dates.push(createProceduralDateV1({
      proceduralDateId: `${stablePrefix(documentId)}-date-response`,
      dateType: "RESPONSE_DEADLINE",
      rawText: rawDeadlineText.printedValue,
      rawDeadlineText: rawDeadlineText.printedValue,
      parsedDate: parsePrintedDate(rawDeadlineText.printedValue),
      timezone: null,
      sourceDocumentId: documentId,
      sourcePage: rawDeadlineText.pageNumbers[0]!,
      sourceLabel: rawDeadlineText.sourceLabel,
      sourceCoordinates: null,
      extractionConfidence: 1,
      explicitlyPrinted: true,
      legallyComputed: false,
      computationRuleId: null,
      requiresReview: true,
    }));
  }

  return Object.freeze({
    facts: Object.freeze({
      requirementNumber,
      expediente,
      taxId,
      recipient,
      obligations,
      reason,
      rawDeadlineText,
      responseChannel,
      documentationRequired,
      explicitConsequences,
      csv,
    }),
    references: Object.freeze(references),
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
): FormalRequirementTextFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    const matchedLabel = labels.find((label) => matchesLabel(line.folded, label));
    if (!matchedLabel) return [];
    const sameLineValue = line.raw.replace(/^[^:\-]{1,120}[:\-]\s*/u, "").trim();
    const next = lines[index + 1];
    const value = sameLineValue !== line.raw && sameLineValue.length > 0
      ? sameLineValue
      : next && next.pageNumber === line.pageNumber && next.raw.length <= FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1.maxTextFactChars && !ALL_SECTION_HEADINGS.has(next.folded)
        ? next.raw
        : null;
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

function extractObligations(lines: readonly PrivateLineV1[], warnings: string[]): readonly FormalRequirementObligationV1[] {
  const obligations: FormalRequirementObligationV1[] = [];
  for (let headingIndex = 0; headingIndex < lines.length; headingIndex += 1) {
    if (!OBLIGATION_HEADINGS.has(lines[headingIndex]!.folded)) continue;
    const page = lines[headingIndex]!.pageNumber;
    for (let index = headingIndex + 1; index < Math.min(lines.length, headingIndex + FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1.maxSectionScanLines); index += 1) {
      const line = lines[index]!;
      if (
        line.pageNumber !== page ||
        (ALL_SECTION_HEADINGS.has(line.folded) && !OBLIGATION_HEADINGS.has(line.folded)) ||
        ALL_LABEL_LITERALS.some((label) => matchesLabel(line.folded, label))
      ) break;
      if (line.folded.includes("modelo") && line.folded.includes("ejercicio") && line.folded.includes("periodo")) continue;
      const match = /^(\d{2,3}[A-Z]?)\s+(\d{4})\s+([A-Z0-9]{1,8})$/u.exec(line.raw.toUpperCase());
      if (!match) continue;
      const year = Number(match[2]);
      if (year < 1900 || year > 2100) {
        warnings.push("INVALID_PRINTED_FISCAL_YEAR");
        continue;
      }
      obligations.push(Object.freeze({
        model: match[1],
        fiscalYear: match[2],
        period: match[3],
        sourcePage: line.pageNumber,
        sourceLabel: "MODELO_EJERCICIO_PERIODO_ROW",
        extractionMethod: "CLOSED_TABLE_ROW",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        reviewStatus: "REVIEW_REQUIRED",
      }));
      if (obligations.length > FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1.maxObligations) {
        throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "requirement.obligations");
      }
    }
  }
  const unique = new Map(obligations.map((item) => [`${item.model}|${item.fiscalYear}|${item.period}`, item]));
  return Object.freeze([...unique.values()]);
}

function extractSectionItems(
  lines: readonly PrivateLineV1[],
  headings: ReadonlySet<string>,
  sourceLabel: string,
): readonly FormalRequirementTextFactV1[] {
  const items: FormalRequirementTextFactV1[] = [];
  for (let headingIndex = 0; headingIndex < lines.length; headingIndex += 1) {
    if (!headings.has(lines[headingIndex]!.folded)) continue;
    const page = lines[headingIndex]!.pageNumber;
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (
        line.pageNumber !== page ||
        ALL_SECTION_HEADINGS.has(line.folded) ||
        ALL_LABEL_LITERALS.some((label) => matchesLabel(line.folded, label))
      ) break;
      const value = line.raw.replace(/^[-•*]\s*/u, "").trim();
      if (value.length === 0) continue;
      items.push(textFact(value, [line.pageNumber], sourceLabel, "CLOSED_SECTION"));
      if (items.length >= FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1.maxSectionItems) return Object.freeze(items);
    }
  }
  return Object.freeze(items);
}

function addReference(
  target: ReferenceV1[],
  documentId: string,
  referenceType: ReferenceTypeV1,
  fact: FormalRequirementTextFactV1 | null,
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
): void {
  const fact = uniqueLabelFact(lines, labels, sourceLabel, warnings, `CONFLICTING_${dateType}`);
  if (!fact) return;
  const parsedDate = parsePrintedDate(fact.printedValue);
  if (parsedDate === null) warnings.push(`INVALID_PRINTED_${dateType}`);
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

function textFact(
  printedValue: string,
  pageNumbers: readonly number[],
  sourceLabel: string,
  extractionMethod: FormalRequirementTextFactV1["extractionMethod"],
): FormalRequirementTextFactV1 {
  if (printedValue.length === 0 || printedValue.length > FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1.maxTextFactChars) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "requirement.textFact");
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

function collectLines(document: BoundedDocumentInput, factualPages: ReadonlySet<number>): readonly PrivateLineV1[] {
  const lines: PrivateLineV1[] = [];
  for (const page of document.pages) {
    if (!factualPages.has(page.pageNumber)) continue;
    const pageLines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    for (let index = 0; index < pageLines.length; index += 1) {
      assertNotAborted(document.signal);
      const raw = pageLines[index]!.trim();
      if (raw.length === 0) continue;
      if (raw.length > FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1.maxLineChars) {
        throw new FiscalNotificationInputError("INVALID_INPUT", `requirement.pages[${page.pageNumber}].line`);
      }
      lines.push(Object.freeze({ pageNumber: page.pageNumber, lineIndex: index, raw, folded: fold(raw) }));
      if (lines.length > FORMAL_FILING_REQUIREMENT_EXTRACTOR_LIMITS_V1.maxLines) {
        throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "requirement.lines");
      }
    }
  }
  return Object.freeze(lines);
}

function validateSegments(document: BoundedDocumentInput, rawSegments: readonly DocumentSegmentV1[]): readonly DocumentSegmentV1[] {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0 || rawSegments.length > document.pages.length) {
    throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "requirement.segments");
  }
  const segments = rawSegments.map((segment) => createDocumentSegmentV1(segment));
  const covered = new Set<number>();
  const ids = new Set<string>();
  for (const segment of segments) {
    if (segment.documentId !== document.documentId || ids.has(segment.segmentId)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", "requirement.segments.identity");
    }
    ids.add(segment.segmentId);
    for (let page = segment.pageFrom; page <= segment.pageTo; page += 1) {
      if (covered.has(page) || page > document.pages.length) throw new FiscalNotificationInputError("INVALID_INPUT", "requirement.segments.coverage");
      covered.add(page);
    }
  }
  if (covered.size !== document.pages.length) throw new FiscalNotificationInputError("INVALID_INPUT", "requirement.segments.coverage");
  return Object.freeze(segments);
}

function createEvidence(
  document: BoundedDocumentInput,
  segments: readonly DocumentSegmentV1[],
  pages: readonly number[],
): EntityEvidenceV1 {
  const sourceSegmentIds = new Set<string>();
  pages.forEach((page) => {
    const segment = segments.find((item) => page >= item.pageFrom && page <= item.pageTo && item.canGenerateAdministrativeFacts);
    if (!segment) throw new FiscalNotificationInputError("INVALID_INPUT", "requirement.evidence.segment");
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

function emptyOutput(
  status: "UNKNOWN" | "BLOCKED",
  recognitionWarning: string | null = null,
): FormalFilingRequirementExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "requirement",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status,
    familyCandidates: Object.freeze([]),
    entities: Object.freeze([]),
    references: Object.freeze([]),
    monetaryComponents: Object.freeze([]),
    proceduralDates: Object.freeze([]),
    warnings: Object.freeze(recognitionWarning ? [recognitionWarning] : []),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
    requirementFacts: Object.freeze({
      requirementNumber: null, expediente: null, taxId: null, recipient: null,
      obligations: Object.freeze([]), reason: null, rawDeadlineText: null,
      responseChannel: null, documentationRequired: Object.freeze([]),
      explicitConsequences: Object.freeze([]), csv: null,
    }),
    retainedSourceContent: "NONE",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
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

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/gu, " ").trim().toLowerCase();
}

function matchesLabel(foldedLine: string, label: string): boolean {
  return foldedLine === label || foldedLine.startsWith(`${label}:`) || foldedLine.startsWith(`${label} -`);
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
  return `fx-requirement-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function entityId(document: BoundedDocumentInput, kind: string, index: number): string {
  return `${stablePrefix(`${document.ownerScope}|${document.documentId}`)}-${kind}-${index}`;
}

export const FORMAL_FILING_REQUIREMENT_EXTRACTOR_RELEASE_V1 = Object.freeze({
  version: FORMAL_FILING_REQUIREMENT_EXTRACTOR_VERSION_V1,
  familyId: "compliance.formal_filing_requirement" as const,
  supportedFamilyIds: Object.freeze([
    "compliance.formal_filing_requirement",
    "compliance.document_request",
  ] as const),
  officialInterpretationSources: Object.freeze([
    Object.freeze({ sourceId: "aeat.procedure.G223", url: "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G223.shtml" }),
    Object.freeze({ sourceId: "boe.lgt.article.123", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186" }),
    Object.freeze({ sourceId: "boe.rgat.article.153", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984" }),
  ]),
  sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
  deadlinePolicy: "NO_COMPUTED_DEADLINE",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
});
