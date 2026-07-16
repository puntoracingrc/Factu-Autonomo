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
  TaxProcedureV1,
} from "./domain.v1";
import type { DocumentSegmentV1 } from "./document-segment.v1";
import { CLOSED_DEFERRAL_DENIAL_MAIN_ACT_TITLES_V1 } from "./document-segmenter.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import {
  createMonetaryComponentV1,
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

export const DEFERRAL_DENIAL_EXTRACTOR_VERSION_V1 = "1.0.0" as const;

export const DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxFactChars: 1_000,
  maxSectionFacts: 8,
  maxReferences: 64,
  maxHeaderLines: 50,
} as const);

export interface DeferralDenialTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly extractionMethod:
    "CLOSED_LABEL" | "CLOSED_SECTION" | "CLOSED_SENTENCE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface DeferralDenialMoneyFactV1 {
  readonly role: "REQUESTED_AMOUNT_DENIED";
  readonly printedValue: string;
  readonly amountCents: number;
  readonly sourcePage: number;
  readonly sourceLabel: "Importe de la solicitud denegada";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface DeferralDenialFactsV1 {
  readonly stage: "DENIED";
  readonly expediente: DeferralDenialTextFactV1 | null;
  readonly taxId: DeferralDenialTextFactV1 | null;
  readonly debtor: DeferralDenialTextFactV1 | null;
  readonly requestedAmountDenied: DeferralDenialMoneyFactV1 | null;
  readonly reason: DeferralDenialTextFactV1 | null;
  readonly debtDescriptions: readonly DeferralDenialTextFactV1[];
  readonly originalDebtDueDates: readonly DeferralDenialTextFactV1[];
  readonly rawPaymentDeadline: DeferralDenialTextFactV1 | null;
  readonly rawAppealDeadline: DeferralDenialTextFactV1 | null;
  readonly paymentChannel: DeferralDenialTextFactV1 | null;
  readonly explicitConsequences: readonly DeferralDenialTextFactV1[];
  readonly printedAppealInformation: DeferralDenialTextFactV1 | null;
}

export interface DeferralDenialExtractorOutputV1 extends ExtractorOutputV1 {
  readonly deferralDenialFacts: DeferralDenialFactsV1;
  readonly retainedSourceContent: "NONE";
  readonly deadlinePolicy: "PRINTED_RELATIVE_RULE_NOT_COMPUTED";
  readonly paymentPolicy: "NO_PAYMENT_OR_DEBT_ACTION_CREATED";
  readonly legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS";
}

export interface ExtractDeferralDenialInputV1 {
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
  readonly mainSegments: readonly DocumentSegmentV1[];
  readonly factSegments: readonly DocumentSegmentV1[];
  readonly pageToFactSegment: ReadonlyMap<number, DocumentSegmentV1>;
}

const LABELS = Object.freeze({
  expediente: ["numero de expediente", "expediente"],
  taxId: ["n.i.f.", "nif"],
  debtor: ["deudor", "obligado al pago"],
} as const);

const SECTION_HEADINGS = new Set([
  "acuerdo",
  "motivacion",
  "efectos de la denegacion para solicitudes en periodo voluntario",
  "plazos de ingreso",
  "consecuencias de la falta de pago",
  "liquidacion de intereses",
  "efectos de la denegacion para solicitudes en periodo ejecutivo",
  "informacion adicional",
  "lugar de pago",
  "recursos y reclamaciones",
  "normas aplicables",
  "identificacion del documento",
  "anexo i",
  "deudas que se relacionan",
]);

const OFFICIAL_AEAT_DOMAINS = new Set([
  "sede.agenciatributaria.gob.es",
  "https://sede.agenciatributaria.gob.es",
  "www.agenciatributaria.es",
  "http://www.agenciatributaria.es",
  "https://www.agenciatributaria.es",
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

const MONEY_TOKEN = /(?:\d{1,3}(?:[.\u00a0 ]\d{3})+|\d+),\d{2}/u;
const LIQUIDATION_KEY = /\b[A-Z]\d{16}\b/gu;
const DATE_TOKEN = /\b\d{2}[-/]\d{2}[-/]\d{4}\b/gu;

export function extractDeferralDenialV1(
  input: ExtractDeferralDenialInputV1,
): DeferralDenialExtractorOutputV1 {
  assertExactDataRecordV1(input, "deferralDenialInput", [
    "document",
    "segments",
  ]);
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const validated = validateSegments(input.document, input.segments);
  if (validated.mainSegments.length === 0) return emptyOutput("UNKNOWN");
  const factPages = new Set(validated.pageToFactSegment.keys());
  const lines = collectLines(input.document, factPages);
  const recognition = recognizeDenial(lines, validated.mainSegments);
  if (recognition.status !== "RECOGNIZED") {
    return emptyOutput(
      recognition.status === "BLOCKED" ? "BLOCKED" : "UNKNOWN",
      recognition.warning,
    );
  }

  const warnings: string[] = [];
  const expediente = uniqueLabelFact(
    lines,
    LABELS.expediente,
    "Número de expediente",
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
  const debtor = uniqueLabelFact(
    lines,
    LABELS.debtor,
    "Deudor",
    warnings,
    "CONFLICTING_DEBTOR",
  );
  const requestedAmountDenied = extractRequestedAmount(lines, warnings);
  const reason = uniqueSectionFact(
    lines,
    "motivacion",
    "Motivación de la denegación",
    warnings,
  );
  const explicitConsequences = sectionFacts(
    lines,
    "consecuencias de la falta de pago",
    "Consecuencia de la falta de pago",
  );
  const paymentChannel = uniqueSectionFact(
    lines,
    "lugar de pago",
    "Lugar de pago",
    warnings,
    true,
  );
  const printedAppealInformation = uniqueSectionFact(
    lines,
    "recursos y reclamaciones",
    "Recursos y reclamaciones",
    warnings,
  );
  const rawPaymentDeadline = extractRelativeDeadline(
    lines,
    [
      "el plazo de ingreso finaliza el dia 20",
      "el plazo de ingreso finaliza el dia 5",
    ],
    "Plazo de ingreso impreso",
  );
  const rawAppealDeadline = extractRelativeDeadline(
    lines,
    ["en el plazo de un mes contado desde el dia siguiente al de la recepcion"],
    "Plazo de recurso impreso",
  );
  const debtRows = extractDebtRows(lines);
  if (!expediente) warnings.push("MISSING_EXPEDIENTE");
  if (!requestedAmountDenied) warnings.push("MISSING_REQUESTED_AMOUNT_DENIED");
  if (!reason) warnings.push("MISSING_DENIAL_REASON");
  if (!rawPaymentDeadline) warnings.push("MISSING_PRINTED_PAYMENT_DEADLINE");

  const references: ReferenceV1[] = [];
  addReference(
    references,
    input.document.documentId,
    "EXPEDIENTE_ID",
    expediente,
  );
  addReference(references, input.document.documentId, "NIF", taxId);
  addCsvReference(references, input.document.documentId, lines, warnings);
  debtRows.forEach((row) =>
    references.push(
      normalizeReferenceV1({
        referenceType: "LIQUIDATION_KEY",
        rawValue: row.liquidationKey,
        sourceDocumentId: input.document.documentId,
        sourcePage: row.pageNumber,
        sourceLabel: "Número de liquidación",
        sourceCoordinates: null,
        confidence: 1,
      }),
    ),
  );
  if (references.length > DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxReferences) {
    throw new FiscalNotificationInputError(
      "COLLECTION_LIMIT_EXCEEDED",
      "deferralDenial.references",
    );
  }

  const monetaryComponents: MonetaryComponentV1[] = [];
  if (requestedAmountDenied) {
    monetaryComponents.push(
      createMonetaryComponentV1({
        componentId: `${stablePrefix(input.document.documentId)}-money-requested-denied`,
        componentType: "TOTAL_CLAIMED",
        amountCents: requestedAmountDenied.amountCents,
        currency: "EUR",
        sign: "POSITIVE",
        sourceDocumentId: input.document.documentId,
        sourcePage: requestedAmountDenied.sourcePage,
        sourceLabel: requestedAmountDenied.sourceLabel,
        sourceCoordinates: null,
        extractionConfidence: 1,
        explicitlyPrinted: true,
        calculated: false,
        calculationFormula: null,
        relatedDebtKey: null,
        requiresHumanReview: true,
      }),
    );
  }

  const dates: ProceduralDateV1[] = [];
  const issueDate = extractStandaloneSpanishDate(lines, warnings);
  if (issueDate) {
    dates.push(
      createProceduralDateV1({
        proceduralDateId: `${stablePrefix(input.document.documentId)}-date-issue`,
        dateType: "ISSUE_DATE",
        rawText: issueDate.raw,
        rawDeadlineText: null,
        parsedDate: issueDate.parsed,
        timezone: null,
        sourceDocumentId: input.document.documentId,
        sourcePage: issueDate.pageNumber,
        sourceLabel: "Fecha del acuerdo",
        sourceCoordinates: null,
        extractionConfidence: 1,
        explicitlyPrinted: true,
        legallyComputed: false,
        computationRuleId: null,
        requiresReview: true,
      }),
    );
  } else {
    warnings.push("MISSING_ISSUE_DATE");
  }
  addRelativeDate(
    dates,
    input.document.documentId,
    rawPaymentDeadline,
    "VOLUNTARY_PAYMENT_DEADLINE",
    "voluntary-payment",
  );
  addRelativeDate(
    dates,
    input.document.documentId,
    rawAppealDeadline,
    "APPEAL_DEADLINE",
    "appeal",
  );

  const evidence = createEvidence(
    input.document,
    validated,
    uniqueNumbers(
      validated.factSegments.flatMap((segment) =>
        range(segment.pageFrom, segment.pageTo),
      ),
    ),
  );
  const actId = `${stablePrefix(input.document.documentId)}-act-denial`;
  const act: AdministrativeActV1 = Object.freeze({
    entityId: actId,
    ownerScope: input.document.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence,
    familyId: "collection.deferral_denial",
    actSubtype: "DENEGACION_APLAZAMIENTO_FRACCIONAMIENTO",
    references: Object.freeze(references),
    dates: Object.freeze(dates),
  });
  const procedure: TaxProcedureV1 = Object.freeze({
    entityId: `${stablePrefix(input.document.documentId)}-procedure-deferral`,
    ownerScope: input.document.ownerScope,
    entityKind: "TAX_PROCEDURE",
    evidence,
    procedureType: "DEFERRAL_OR_INSTALLMENT_REQUEST",
    referenceIds: Object.freeze([]),
    actIds: Object.freeze([actId]),
  });
  const entities: AdministrativeEntityV1[] = [act, procedure];
  if (debtor) {
    const party: PartyV1 = Object.freeze({
      entityId: `${stablePrefix(input.document.documentId)}-party-debtor`,
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence: createEvidence(input.document, validated, debtor.pageNumbers),
      displayName: debtor.printedValue,
      taxIdReferenceId: null,
      roles: Object.freeze(["PRIMARY_DEBTOR"] as const),
    });
    entities.push(party);
  }

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "deferral",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status: "REVIEW_REQUIRED",
    familyCandidates: Object.freeze([
      Object.freeze({
        familyId: "collection.deferral_denial",
        confidence: 1,
        matchingEvidenceIds: Object.freeze(
          validated.mainSegments.map((segment) => segment.segmentId),
        ),
        contradictoryEvidenceIds: Object.freeze([]),
      }),
    ]),
    entities: Object.freeze(entities),
    references: Object.freeze(references),
    monetaryComponents: Object.freeze(monetaryComponents),
    proceduralDates: Object.freeze(dates),
    warnings: Object.freeze([...new Set(warnings)].sort()),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
    deferralDenialFacts: Object.freeze({
      stage: "DENIED",
      expediente,
      taxId,
      debtor,
      requestedAmountDenied,
      reason,
      debtDescriptions: Object.freeze(
        debtRows.flatMap((row) =>
          row.description
            ? [
                textFact(
                  row.description,
                  [row.pageNumber],
                  "Descripción de la deuda",
                  "CLOSED_SENTENCE",
                ),
              ]
            : [],
        ),
      ),
      originalDebtDueDates: Object.freeze(
        debtRows.flatMap((row) =>
          row.dueDate
            ? [
                textFact(
                  row.dueDate,
                  [row.pageNumber],
                  "Vencimiento original de la deuda",
                  "CLOSED_LABEL",
                ),
              ]
            : [],
        ),
      ),
      rawPaymentDeadline,
      rawAppealDeadline,
      paymentChannel,
      explicitConsequences,
      printedAppealInformation,
    }),
    retainedSourceContent: "NONE",
    deadlinePolicy: "PRINTED_RELATIVE_RULE_NOT_COMPUTED",
    paymentPolicy: "NO_PAYMENT_OR_DEBT_ACTION_CREATED",
    legalInterpretationPolicy:
      "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function recognizeDenial(
  lines: readonly PrivateLineV1[],
  mainSegments: readonly DocumentSegmentV1[],
):
  | { readonly status: "RECOGNIZED" }
  | {
      readonly status: "UNKNOWN" | "BLOCKED";
      readonly warning: string | null;
    } {
  const firstPage = Math.min(
    ...mainSegments.map((segment) => segment.pageFrom),
  );
  const headerLines = lines.filter(
    (line) =>
      line.pageNumber === firstPage &&
      line.lineIndex < DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxHeaderLines,
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
  const officialDomainPrinted = headerLines.some((line) =>
    OFFICIAL_AEAT_DOMAINS.has(line.folded),
  );
  const trustedAuthority = mainSegments.every(
    (segment) =>
      segment.detectedAuthority === "AEAT" &&
      segment.classificationConfidence >= 0.9,
  );
  if (!officialDomainPrinted && !trustedAuthority)
    return { status: "UNKNOWN", warning: null };
  const titleMatches = mainSegments.some((segment) => {
    const title = fold(segment.detectedTitle ?? "");
    return CLOSED_DEFERRAL_DENIAL_MAIN_ACT_TITLES_V1.some(
      (literal) => title === literal || title.startsWith(`${literal} `),
    );
  });
  const boundedDocumentText = fold(lines.map((line) => line.raw).join(" "));
  const denialSentence = boundedDocumentText.includes(
    "se acuerda denegar la peticion formulada",
  );
  return titleMatches && denialSentence
    ? { status: "RECOGNIZED" }
    : { status: "UNKNOWN", warning: null };
}

function validateSegments(
  document: BoundedDocumentInput,
  segments: readonly DocumentSegmentV1[],
): ValidatedSegmentsV1 {
  if (
    !Array.isArray(segments) ||
    segments.length === 0 ||
    segments.length > document.pages.length
  ) {
    throw new FiscalNotificationInputError(
      "INVALID_INPUT",
      "deferralDenial.segments",
    );
  }
  const mainSegments = segments.filter(
    (segment) => segment.segmentType === "MAIN_ADMINISTRATIVE_ACT",
  );
  const factSegments = segments.filter(
    (segment) =>
      segment.segmentType === "MAIN_ADMINISTRATIVE_ACT" ||
      segment.segmentType === "DEBT_LIST" ||
      segment.segmentType === "APPEAL_INFORMATION",
  );
  const pageToFactSegment = new Map<number, DocumentSegmentV1>();
  for (const segment of factSegments) {
    if (segment.documentId !== document.documentId) {
      throw new FiscalNotificationInputError(
        "INVALID_INPUT",
        "deferralDenial.segment.documentId",
      );
    }
    for (const page of range(segment.pageFrom, segment.pageTo)) {
      if (pageToFactSegment.has(page))
        throw new FiscalNotificationInputError(
          "INVALID_INPUT",
          "deferralDenial.segment.overlap",
        );
      pageToFactSegment.set(page, segment);
    }
  }
  return Object.freeze({
    mainSegments: Object.freeze(mainSegments),
    factSegments: Object.freeze(factSegments),
    pageToFactSegment,
  });
}

function collectLines(
  document: BoundedDocumentInput,
  pages: ReadonlySet<number>,
): readonly PrivateLineV1[] {
  const result: PrivateLineV1[] = [];
  for (const page of document.pages) {
    if (!pages.has(page.pageNumber)) continue;
    const source = page.text.split(/\r\n|\n|\r/u);
    if (
      result.length + source.length >
      DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxLines
    ) {
      throw new FiscalNotificationInputError(
        "COLLECTION_LIMIT_EXCEEDED",
        "deferralDenial.lines",
      );
    }
    source.forEach((raw, lineIndex) => {
      if (raw.length > DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxLineChars) {
        throw new FiscalNotificationInputError(
          "INVALID_INPUT",
          "deferralDenial.line",
        );
      }
      result.push(
        Object.freeze({
          pageNumber: page.pageNumber,
          lineIndex,
          raw: raw.trim(),
          folded: fold(raw),
        }),
      );
    });
  }
  return Object.freeze(result);
}

function uniqueLabelFact(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  conflictWarning: string,
): DeferralDenialTextFactV1 | null {
  const observations = lines.flatMap((line, index) => {
    if (!labels.some((label) => matchesLabel(line.folded, label))) return [];
    const value = extractLabelValue(lines, line, index);
    return value ? [{ value, page: line.pageNumber }] : [];
  });
  const distinct = new Map<string, { value: string; pages: number[] }>();
  observations.forEach(({ value, page }) => {
    const key = fold(value);
    const current = distinct.get(key) ?? { value, pages: [] };
    current.pages.push(page);
    distinct.set(key, current);
  });
  if (distinct.size > 1) {
    warnings.push(conflictWarning);
    return null;
  }
  const value = [...distinct.values()][0];
  return value
    ? textFact(value.value, value.pages, sourceLabel, "CLOSED_LABEL")
    : null;
}

function sectionFacts(
  lines: readonly PrivateLineV1[],
  heading: string,
  sourceLabel: string,
  stopAtPageBoundary = false,
): readonly DeferralDenialTextFactV1[] {
  const facts: DeferralDenialTextFactV1[] = [];
  lines.forEach((line, index) => {
    if (line.folded !== heading) return;
    const parts: string[] = [];
    const pages: number[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const next = lines[cursor]!;
      if (stopAtPageBoundary && next.pageNumber !== line.pageNumber) break;
      if (next.folded && SECTION_HEADINGS.has(next.folded)) break;
      if (!next.raw) continue;
      const nextLength = parts.join(" ").length + next.raw.length + 1;
      if (nextLength > DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxFactChars) break;
      parts.push(next.raw);
      pages.push(next.pageNumber);
    }
    const value = parts.join(" ").replace(/\s+/gu, " ").trim();
    if (value)
      facts.push(textFact(value, pages, sourceLabel, "CLOSED_SECTION"));
  });
  return Object.freeze(
    facts.slice(0, DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxSectionFacts),
  );
}

function uniqueSectionFact(
  lines: readonly PrivateLineV1[],
  heading: string,
  sourceLabel: string,
  warnings: string[],
  stopAtPageBoundary = false,
): DeferralDenialTextFactV1 | null {
  const facts = sectionFacts(lines, heading, sourceLabel, stopAtPageBoundary);
  const distinct = new Map(
    facts.map((fact) => [fold(fact.printedValue), fact]),
  );
  if (distinct.size > 1) {
    warnings.push(`CONFLICTING_${heading.toUpperCase().replace(/\W+/gu, "_")}`);
    return null;
  }
  return [...distinct.values()][0] ?? null;
}

function extractRequestedAmount(
  lines: readonly PrivateLineV1[],
  warnings: string[],
): DeferralDenialMoneyFactV1 | null {
  const observations = lines.flatMap((line) => {
    if (!containsTokenSequence(line.folded, "por un importe de")) return [];
    const match = line.raw.match(
      new RegExp(
        `por un importe de\\s+(${MONEY_TOKEN.source})\\s+euros?`,
        "iu",
      ),
    );
    const parsed = match?.[1] ? parseEuro(match[1]) : null;
    return parsed ? [{ ...parsed, page: line.pageNumber }] : [];
  });
  const distinct = new Map(
    observations.map((item) => [String(item.cents), item]),
  );
  if (distinct.size > 1) {
    warnings.push("CONFLICTING_REQUESTED_AMOUNT_DENIED");
    return null;
  }
  const only = [...distinct.values()][0];
  return only
    ? Object.freeze({
        role: "REQUESTED_AMOUNT_DENIED",
        printedValue: only.raw,
        amountCents: only.cents,
        sourcePage: only.page,
        sourceLabel: "Importe de la solicitud denegada",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        reviewStatus: "REVIEW_REQUIRED",
      })
    : null;
}

function extractRelativeDeadline(
  lines: readonly PrivateLineV1[],
  markers: readonly string[],
  sourceLabel: string,
): DeferralDenialTextFactV1 | null {
  const matches = markers.flatMap((marker) => {
    for (let span = 1; span <= 3; span += 1) {
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]!;
        const window = lines
          .slice(index, index + span)
          .filter(
            (item) =>
              item.pageNumber === line.pageNumber && item.raw.length > 0,
          );
        if (window.length !== span) continue;
        const foldedWindow = fold(window.map((item) => item.raw).join(" "));
        if (!containsTokenSequence(foldedWindow, marker)) continue;
        const last = window.at(-1)!;
        const next = lines[index + span];
        const needsContinuation =
          /(?:\b(?:de|del|el|la|los|las|y|o)|[,;:])$/u.test(last.folded);
        const completedWindow =
          needsContinuation &&
          next &&
          next.pageNumber === line.pageNumber &&
          next.raw &&
          !SECTION_HEADINGS.has(next.folded)
            ? [...window, next]
            : window;
        return [
          {
            pageNumber: line.pageNumber,
            raw: completedWindow.map((item) => item.raw).join(" "),
          },
        ];
      }
    }
    return [];
  });
  if (matches.length === 0) return null;
  const uniqueMatches = [
    ...new Map(matches.map((item) => [fold(item.raw), item])).values(),
  ];
  const value = uniqueMatches
    .map((item) => item.raw)
    .join(" / ")
    .slice(0, DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxFactChars);
  return textFact(
    value,
    uniqueMatches.map((item) => item.pageNumber),
    sourceLabel,
    "CLOSED_SENTENCE",
  );
}

function extractStandaloneSpanishDate(
  lines: readonly PrivateLineV1[],
  warnings: string[],
): { raw: string; parsed: string; pageNumber: number } | null {
  const months: Readonly<Record<string, number>> = Object.freeze({
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  });
  const observations = lines.flatMap((line) => {
    const match = /^(\d{1,2}) de ([a-záéíóúñ]+) de ((?:19|20)\d{2})$/iu.exec(
      line.raw.trim(),
    );
    if (!match) return [];
    const month = months[fold(match[2]!)];
    const day = Number(match[1]);
    const year = Number(match[3]);
    if (!month || day < 1 || day > 31) return [];
    const parsed = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date = new Date(`${parsed}T00:00:00.000Z`);
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? [{ raw: line.raw.trim(), parsed, pageNumber: line.pageNumber }]
      : [];
  });
  const distinct = new Map(observations.map((item) => [item.parsed, item]));
  if (distinct.size > 1) {
    warnings.push("CONFLICTING_STANDALONE_ISSUE_DATES");
    return null;
  }
  return [...distinct.values()][0] ?? null;
}

function extractDebtRows(lines: readonly PrivateLineV1[]): readonly {
  liquidationKey: string;
  description: string | null;
  dueDate: string | null;
  pageNumber: number;
}[] {
  const rows = new Map<
    string,
    {
      liquidationKey: string;
      description: string | null;
      dueDate: string | null;
      pageNumber: number;
    }
  >();
  lines.forEach((line) => {
    const keys = [...line.raw.matchAll(LIQUIDATION_KEY)].map(
      (match) => match[0],
    );
    keys.forEach((key) => {
      if (rows.has(key)) return;
      const dueDate = [...line.raw.matchAll(DATE_TOKEN)][0]?.[0] ?? null;
      const afterKey = line.raw.slice(line.raw.indexOf(key) + key.length);
      const description = afterKey
        .replace(DATE_TOKEN, " ")
        .replace(new RegExp(MONEY_TOKEN.source, "gu"), " ")
        .replace(/\s+/gu, " ")
        .trim();
      rows.set(key, {
        liquidationKey: key,
        description: description || null,
        dueDate,
        pageNumber: line.pageNumber,
      });
    });
  });
  return Object.freeze([...rows.values()]);
}

function addCsvReference(
  target: ReferenceV1[],
  documentId: string,
  lines: readonly PrivateLineV1[],
  warnings: string[],
): void {
  const observations = lines.flatMap((line) => {
    const match =
      /codigo seguro (?:de )?verificacion(?: \(csv\))?\s*:?[ ]*([A-Z0-9]{8,80})/iu.exec(
        fold(line.raw),
      );
    return match?.[1]
      ? [{ value: match[1].toUpperCase(), page: line.pageNumber }]
      : [];
  });
  const distinct = new Map(observations.map((item) => [item.value, item]));
  if (distinct.size > 1) {
    warnings.push("CONFLICTING_CSV");
    return;
  }
  const only = [...distinct.values()][0];
  if (!only) return;
  target.push(
    normalizeReferenceV1({
      referenceType: "CSV",
      rawValue: only.value,
      sourceDocumentId: documentId,
      sourcePage: only.page,
      sourceLabel: "Código Seguro de Verificación",
      sourceCoordinates: null,
      confidence: 1,
    }),
  );
}

function addReference(
  target: ReferenceV1[],
  documentId: string,
  type: ReferenceTypeV1,
  fact: DeferralDenialTextFactV1 | null,
): void {
  if (!fact) return;
  target.push(
    normalizeReferenceV1({
      referenceType: type,
      rawValue: fact.printedValue,
      sourceDocumentId: documentId,
      sourcePage: fact.pageNumbers[0]!,
      sourceLabel: fact.sourceLabel,
      sourceCoordinates: null,
      confidence: 1,
    }),
  );
}

function addRelativeDate(
  target: ProceduralDateV1[],
  documentId: string,
  fact: DeferralDenialTextFactV1 | null,
  type: "VOLUNTARY_PAYMENT_DEADLINE" | "APPEAL_DEADLINE",
  suffix: string,
): void {
  if (!fact) return;
  const boundedDeadline = fact.printedValue.slice(0, 500).trim();
  target.push(
    createProceduralDateV1({
      proceduralDateId: `${stablePrefix(documentId)}-date-${suffix}`,
      dateType: type,
      rawText: boundedDeadline,
      rawDeadlineText: boundedDeadline,
      parsedDate: null,
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
    }),
  );
}

function createEvidence(
  document: BoundedDocumentInput,
  validated: ValidatedSegmentsV1,
  pages: readonly number[],
): EntityEvidenceV1 {
  const segmentIds = uniqueStrings(
    pages.flatMap((page) => {
      const segment = validated.pageToFactSegment.get(page);
      return segment ? [segment.segmentId] : [];
    }),
  );
  return Object.freeze({
    sourceDocumentIds: Object.freeze([document.documentId]),
    sourceSegmentIds: Object.freeze(segmentIds),
    evidenceBasis: "EXPLICIT_DOCUMENT_TEXT",
    confidence: 1,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
  });
}

function textFact(
  value: string,
  pages: readonly number[],
  sourceLabel: string,
  extractionMethod: DeferralDenialTextFactV1["extractionMethod"],
): DeferralDenialTextFactV1 {
  return Object.freeze({
    printedValue: value.slice(
      0,
      DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxFactChars,
    ),
    pageNumbers: Object.freeze(uniqueNumbers(pages)),
    sourceLabel,
    extractionMethod,
    assertionType: "EXPLICIT_IN_DOCUMENT",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function extractLabelValue(
  lines: readonly PrivateLineV1[],
  line: PrivateLineV1,
  index: number,
): string | null {
  const separator = line.raw.search(/[:\-]/u);
  const sameLine = separator >= 0 ? line.raw.slice(separator + 1).trim() : "";
  if (
    sameLine &&
    sameLine.length <= DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxFactChars
  )
    return sameLine;
  const next = lines[index + 1];
  if (
    next &&
    next.pageNumber === line.pageNumber &&
    next.raw &&
    next.raw.length <= DEFERRAL_DENIAL_EXTRACTOR_LIMITS_V1.maxFactChars &&
    !Object.values(LABELS)
      .flat()
      .some((label) => matchesLabel(next.folded, label))
  )
    return next.raw;
  return null;
}

function parseEuro(value: string): { raw: string; cents: number } | null {
  const compact = value.replace(/[.\u00a0 ]/gu, "");
  const match = /^(\d+),(\d{2})$/u.exec(compact);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number(match[2]);
  return Number.isSafeInteger(cents) ? { raw: value, cents } : null;
}

function matchesLabel(value: string, label: string): boolean {
  return (
    value === label ||
    value.startsWith(`${label}:`) ||
    value.startsWith(`${label} `)
  );
}

function containsTokenSequence(value: string, literal: string): boolean {
  return (
    value === literal ||
    value.startsWith(`${literal} `) ||
    value.endsWith(` ${literal}`) ||
    value.includes(` ${literal} `)
  );
}

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[‐‑‒–—−]/gu, "-")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function stablePrefix(documentId: string): string {
  let hash = 0x811c9dc5;
  for (const char of documentId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `deferral-denial-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function emptyOutput(
  status: "UNKNOWN" | "BLOCKED",
  warning: string | null = null,
): DeferralDenialExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "deferral",
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
    deferralDenialFacts: Object.freeze({
      stage: "DENIED",
      expediente: null,
      taxId: null,
      debtor: null,
      requestedAmountDenied: null,
      reason: null,
      debtDescriptions: Object.freeze([]),
      originalDebtDueDates: Object.freeze([]),
      rawPaymentDeadline: null,
      rawAppealDeadline: null,
      paymentChannel: null,
      explicitConsequences: Object.freeze([]),
      printedAppealInformation: null,
    }),
    retainedSourceContent: "NONE",
    deadlinePolicy: "PRINTED_RELATIVE_RULE_NOT_COMPUTED",
    paymentPolicy: "NO_PAYMENT_OR_DEBT_ACTION_CREATED",
    legalInterpretationPolicy:
      "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}
