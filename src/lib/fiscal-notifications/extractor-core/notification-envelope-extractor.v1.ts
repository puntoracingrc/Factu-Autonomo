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
  NotificationEventV1,
  PartyV1,
  TaxProcedureV1,
} from "./domain.v1";
import { createDocumentSegmentV1, type DocumentSegmentV1 } from "./document-segment.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import { createProceduralDateV1, type ProceduralDateTypeV1, type ProceduralDateV1 } from "./procedural-date.v1";
import { normalizeReferenceV1, type ReferenceTypeV1, type ReferenceV1 } from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const NOTIFICATION_ENVELOPE_EXTRACTOR_VERSION_V1 = "1.0.0" as const;

export const NOTIFICATION_ENVELOPE_EXTRACTOR_LIMITS_V1 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxTextFactChars: 1_000,
  maxHeaderLines: 60,
} as const);

export type NotificationEnvelopeDocumentKindV1 =
  | "DEHU_NOTIFICATION_ENVELOPE"
  | "ELECTRONIC_NOTIFICATION_RECEIPT"
  | "DELIVERY_ATTEMPT"
  | "PUBLICATION_OR_APPEARANCE";

export type NotificationEnvelopeStateV1 =
  | "AVAILABLE"
  | "ACCESSED"
  | "REJECTED"
  | "EXPIRED"
  | "ATTEMPTED"
  | "DELIVERED"
  | "PUBLISHED"
  | "UNKNOWN";

export interface NotificationEnvelopeTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly extractionMethod: "CLOSED_LABEL";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface NotificationEnvelopeDateFactV1 extends NotificationEnvelopeTextFactV1 {
  readonly parsedDate: string | null;
  readonly parsedTime: string | null;
}

export interface NotificationEnvelopeFactsV1 {
  readonly documentKind: NotificationEnvelopeDocumentKindV1 | null;
  readonly notificationState: NotificationEnvelopeStateV1;
  readonly stateBasis: "EXPLICIT_PRINTED_STATE" | "EXPLICIT_EVENT_DATE" | "UNKNOWN";
  readonly printedState: NotificationEnvelopeTextFactV1 | null;
  readonly notificationReference: NotificationEnvelopeTextFactV1 | null;
  readonly actReference: NotificationEnvelopeTextFactV1 | null;
  readonly expediente: NotificationEnvelopeTextFactV1 | null;
  readonly csv: NotificationEnvelopeTextFactV1 | null;
  readonly subject: NotificationEnvelopeTextFactV1 | null;
  readonly issuer: NotificationEnvelopeTextFactV1 | null;
  readonly recipientName: NotificationEnvelopeTextFactV1 | null;
  readonly recipientTaxId: NotificationEnvelopeTextFactV1 | null;
  readonly channel: NotificationEnvelopeTextFactV1 | null;
  readonly availabilityDate: NotificationEnvelopeDateFactV1 | null;
  readonly accessDate: NotificationEnvelopeDateFactV1 | null;
  readonly rejectionDate: NotificationEnvelopeDateFactV1 | null;
  readonly expirationDate: NotificationEnvelopeDateFactV1 | null;
  readonly effectiveNotificationDate: NotificationEnvelopeDateFactV1 | null;
}

export interface NotificationEnvelopeExtractorOutputV1 extends ExtractorOutputV1 {
  readonly notificationEnvelopeFacts: NotificationEnvelopeFactsV1;
  readonly retainedSourceContent: "NONE";
  readonly familyDecisionPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AUTHORITY_REQUIRED";
  readonly stateDecisionPolicy: "PRINTED_STATE_OR_PRINTED_EVENT_DATE_ONLY";
  readonly legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS";
  readonly legalDateComputationPolicy: "PROHIBITED";
}

export interface ExtractNotificationEnvelopeInputV1 {
  readonly document: BoundedDocumentInput;
  readonly segments: readonly DocumentSegmentV1[];
}

interface PrivateLineV1 {
  readonly pageNumber: number;
  readonly lineIndex: number;
  readonly raw: string;
  readonly folded: string;
}

interface ParsedNotificationEnvelopeV1 {
  readonly facts: NotificationEnvelopeFactsV1;
  readonly familyId:
    | "notification.delivery_attempt"
    | "notification.publication_or_appearance"
    | "notification.dehu_envelope";
  readonly references: readonly ReferenceV1[];
  readonly dates: readonly ProceduralDateV1[];
  readonly warnings: readonly string[];
}

const LABELS = Object.freeze({
  state: ["estado de la notificacion", "estado", "situacion de la notificacion", "situacion"],
  notificationReference: [
    "identificador de la notificacion", "id de la notificacion", "numero de notificacion",
    "referencia de la notificacion", "referencia notificacion",
  ],
  actReference: ["identificador del acto", "id del acto", "referencia del acto", "codigo del acto"],
  expediente: ["numero de expediente", "expediente"],
  csv: ["codigo seguro de verificacion (csv)", "codigo seguro de verificacion", "csv"],
  subject: ["asunto", "acto notificado", "descripcion", "concepto"],
  issuer: ["organismo emisor", "organo emisor", "emisor"],
  recipientName: ["nombre del destinatario", "destinatario", "titular"],
  recipientTaxId: ["nif del destinatario", "nif del titular", "n.i.f.", "nif"],
  channel: ["canal de notificacion", "medio de notificacion", "canal"],
  availabilityDate: [
    "fecha y hora de puesta a disposicion", "fecha de puesta a disposicion",
    "puesta a disposicion de la notificacion", "puesta a disposicion",
  ],
  accessDate: [
    "fecha y hora de acceso", "fecha de acceso", "fecha y hora de comparecencia",
    "fecha de comparecencia", "fecha de aceptacion",
  ],
  rejectionDate: ["fecha y hora de rechazo", "fecha de rechazo expreso", "fecha de rechazo"],
  expirationDate: ["fecha y hora de expiracion", "fecha de expiracion", "fecha de caducidad"],
  effectiveNotificationDate: ["fecha de efectos de la notificacion", "fecha efectiva de notificacion", "fecha de notificacion"],
} as const);

const ALL_LABEL_LITERALS = Object.freeze(Object.values(LABELS).flat());

const TITLE_KINDS = Object.freeze([
  ["acuse de recibo", "ELECTRONIC_NOTIFICATION_RECEIPT"],
  ["justificante de recepcion", "ELECTRONIC_NOTIFICATION_RECEIPT"],
  ["certificacion de notificacion", "ELECTRONIC_NOTIFICATION_RECEIPT"],
  ["evidencia de entrega", "ELECTRONIC_NOTIFICATION_RECEIPT"],
  ["aviso de puesta a disposicion", "DELIVERY_ATTEMPT"],
  ["intento de notificacion", "DELIVERY_ATTEMPT"],
  ["notificacion por comparecencia", "PUBLICATION_OR_APPEARANCE"],
  ["anuncio de citacion", "PUBLICATION_OR_APPEARANCE"],
  ["anuncio de notificacion", "PUBLICATION_OR_APPEARANCE"],
  ["publicacion en el tablon edictal unico", "PUBLICATION_OR_APPEARANCE"],
  ["datos de la notificacion", "DEHU_NOTIFICATION_ENVELOPE"],
  ["caratula de notificacion", "DEHU_NOTIFICATION_ENVELOPE"],
  ["notificacion electronica", "DEHU_NOTIFICATION_ENVELOPE"],
] as const satisfies readonly (readonly [string, NotificationEnvelopeDocumentKindV1])[]);

const OFFICIAL_DOMAINS = new Set([
  "sede.agenciatributaria.gob.es",
  "www.agenciatributaria.es",
  "dehu.redsara.es",
]);
const NON_DOCUMENT_HEADER_PREFIXES = Object.freeze([
  "guia de ejemplo", "manual de usuario", "documento de prueba", "ejemplo de notificacion",
] as const);
const CONFLICTING_AUTHORITY_MARKERS = Object.freeze([
  "agencia tributaria canaria", "hacienda foral", "bizkaia", "gipuzkoa", "araba", "navarra", "seguridad social",
] as const);

const STATE_LITERALS = Object.freeze({
  AVAILABLE: ["disponible", "pendiente", "puesta a disposicion"],
  ACCESSED: ["aceptada", "accedida", "acceso realizado", "comparecencia realizada"],
  REJECTED: ["rechazada", "rechazo expreso"],
  EXPIRED: ["expirada", "caducada"],
  ATTEMPTED: ["intentada", "intento realizado"],
  DELIVERED: ["entregada", "recibida"],
  PUBLISHED: ["publicada"],
} as const satisfies Readonly<Record<Exclude<NotificationEnvelopeStateV1, "UNKNOWN">, readonly string[]>>);

export function extractNotificationEnvelopeV1(
  input: ExtractNotificationEnvelopeInputV1,
): NotificationEnvelopeExtractorOutputV1 {
  assertExactDataRecordV1(input, "notificationEnvelopeInput", ["document", "segments"]);
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const notificationSegments = validateSegments(input.document, input.segments);
  if (notificationSegments.length === 0) return emptyOutput("UNKNOWN");

  const pages = new Set(notificationSegments.flatMap((segment) => range(segment.pageFrom, segment.pageTo)));
  const lines = collectLines(input.document, pages);
  const recognition = recognizeNotificationEnvelope(lines, notificationSegments);
  if (recognition.status !== "RECOGNIZED") {
    return emptyOutput(recognition.status, recognition.warning);
  }

  const parsed = parseNotificationEnvelope(input.document.documentId, recognition.documentKind, lines);
  const evidence = createEvidence(input.document, notificationSegments);
  const actId = entityId(input.document, "act", 0);
  const act: AdministrativeActV1 = Object.freeze({
    entityId: actId,
    ownerScope: input.document.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence,
    familyId: parsed.familyId,
    actSubtype: `${recognition.documentKind}:${parsed.facts.notificationState}`,
    references: parsed.references,
    dates: parsed.dates,
  });
  const procedure: TaxProcedureV1 = Object.freeze({
    entityId: entityId(input.document, "procedure", 0),
    ownerScope: input.document.ownerScope,
    entityKind: "TAX_PROCEDURE",
    evidence,
    procedureType: "NOTIFICATION_EVIDENCE_REVIEW",
    referenceIds: Object.freeze([]),
    actIds: Object.freeze([actId]),
  });
  const entities: AdministrativeEntityV1[] = [act, procedure];
  const notificationStatus = toDomainNotificationStatus(parsed.facts.notificationState);
  if (notificationStatus) {
    const event: NotificationEventV1 = Object.freeze({
      entityId: entityId(input.document, "notification", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "NOTIFICATION_EVENT",
      evidence,
      notificationStatus,
      dates: parsed.dates,
      referenceIds: Object.freeze([]),
    });
    entities.push(event);
  }
  if (parsed.facts.issuer) {
    const issuer: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party-issuer", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence,
      displayName: parsed.facts.issuer.printedValue,
      taxIdReferenceId: null,
      roles: Object.freeze(["ISSUING_AUTHORITY"] as const),
    });
    entities.push(issuer);
  }
  if (parsed.facts.recipientName || parsed.facts.recipientTaxId) {
    const recipient: PartyV1 = Object.freeze({
      entityId: entityId(input.document, "party-recipient", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PARTY",
      evidence,
      displayName: parsed.facts.recipientName?.printedValue ?? null,
      taxIdReferenceId: null,
      roles: Object.freeze(["TAXPAYER"] as const),
    });
    entities.push(recipient);
  }

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "notification-envelope",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status: "REVIEW_REQUIRED",
    familyCandidates: Object.freeze([Object.freeze({
      familyId: parsed.familyId,
      confidence: 1,
      matchingEvidenceIds: Object.freeze(notificationSegments.map((segment) => segment.segmentId)),
      contradictoryEvidenceIds: Object.freeze([]),
    })]),
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
    notificationEnvelopeFacts: parsed.facts,
    retainedSourceContent: "NONE",
    familyDecisionPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AUTHORITY_REQUIRED",
    stateDecisionPolicy: "PRINTED_STATE_OR_PRINTED_EVENT_DATE_ONLY",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
    legalDateComputationPolicy: "PROHIBITED",
  });
}

function recognizeNotificationEnvelope(
  lines: readonly PrivateLineV1[],
  segments: readonly DocumentSegmentV1[],
):
  | { readonly status: "RECOGNIZED"; readonly documentKind: NotificationEnvelopeDocumentKindV1 }
  | { readonly status: "UNKNOWN" | "BLOCKED"; readonly warning: string | null } {
  const firstPage = Math.min(...segments.map((segment) => segment.pageFrom));
  const headers = lines.filter((line) => line.pageNumber === firstPage && line.lineIndex < NOTIFICATION_ENVELOPE_EXTRACTOR_LIMITS_V1.maxHeaderLines);
  if (headers.some((line) => NON_DOCUMENT_HEADER_PREFIXES.some((prefix) => line.folded.startsWith(prefix)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_NON_DOCUMENT_GUIDE" };
  }
  if (lines.some((line) => CONFLICTING_AUTHORITY_MARKERS.some((marker) => containsTokenSequence(line.folded, marker)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_AUTHORITY_OR_TERRITORY" };
  }
  const trustedAuthority = segments.every((segment) =>
    ["AEAT", "DEHU"].includes(segment.detectedAuthority) && segment.classificationConfidence >= 0.9,
  );
  const officialDomainPrinted = headers.some((line) => OFFICIAL_DOMAINS.has(line.folded));
  if (!trustedAuthority && !officialDomainPrinted) return { status: "UNKNOWN", warning: null };

  const kinds = new Set<NotificationEnvelopeDocumentKindV1>();
  for (const segment of segments) {
    const kind = titleKind(fold(segment.detectedTitle ?? ""));
    if (kind) kinds.add(kind);
  }
  for (const line of headers) {
    const kind = titleKind(line.folded);
    if (kind) kinds.add(kind);
  }
  if (kinds.size > 1) {
    const values = [...kinds];
    const compatibleReceiptEnvelope = values.length === 2 &&
      values.includes("DEHU_NOTIFICATION_ENVELOPE") &&
      values.includes("ELECTRONIC_NOTIFICATION_RECEIPT");
    if (!compatibleReceiptEnvelope) return { status: "BLOCKED", warning: "CONFLICTING_NOTIFICATION_DOCUMENT_KIND" };
    return { status: "RECOGNIZED", documentKind: "ELECTRONIC_NOTIFICATION_RECEIPT" };
  }
  const documentKind = [...kinds][0];
  return documentKind ? { status: "RECOGNIZED", documentKind } : { status: "UNKNOWN", warning: null };
}

function titleKind(value: string): NotificationEnvelopeDocumentKindV1 | null {
  const match = TITLE_KINDS.find(([title]) => value === title || value.startsWith(`${title} `));
  return match?.[1] ?? null;
}

function parseNotificationEnvelope(
  documentId: string,
  documentKind: NotificationEnvelopeDocumentKindV1,
  lines: readonly PrivateLineV1[],
): ParsedNotificationEnvelopeV1 {
  const warnings: string[] = [];
  const printedState = uniqueTextFact(lines, LABELS.state, "Estado de la notificación", warnings, "CONFLICTING_PRINTED_NOTIFICATION_STATE");
  const notificationReference = uniqueTextFact(lines, LABELS.notificationReference, "Identificador de la notificación", warnings, "CONFLICTING_NOTIFICATION_REFERENCE");
  const actReference = uniqueTextFact(lines, LABELS.actReference, "Identificador del acto", warnings, "CONFLICTING_ACT_REFERENCE");
  const expediente = uniqueTextFact(lines, LABELS.expediente, "Número de expediente", warnings, "CONFLICTING_EXPEDIENTE_REFERENCE");
  const csv = uniqueTextFact(lines, LABELS.csv, "Código Seguro de Verificación", warnings, "CONFLICTING_CSV");
  const subject = uniqueTextFact(lines, LABELS.subject, "Asunto", warnings, "CONFLICTING_NOTIFICATION_SUBJECT");
  const issuer = uniqueTextFact(lines, LABELS.issuer, "Organismo emisor", warnings, "CONFLICTING_ISSUER");
  const recipientName = uniqueTextFact(lines, LABELS.recipientName, "Destinatario", warnings, "CONFLICTING_RECIPIENT_NAME");
  const recipientTaxId = uniqueTextFact(lines, LABELS.recipientTaxId, "NIF del destinatario", warnings, "CONFLICTING_RECIPIENT_TAX_ID");
  const channel = uniqueTextFact(lines, LABELS.channel, "Canal de notificación", warnings, "CONFLICTING_NOTIFICATION_CHANNEL");
  const availabilityDate = uniqueDateFact(lines, LABELS.availabilityDate, "Fecha de puesta a disposición", warnings, "CONFLICTING_AVAILABILITY_DATE");
  const accessDate = uniqueDateFact(lines, LABELS.accessDate, "Fecha de acceso", warnings, "CONFLICTING_ACCESS_DATE");
  const rejectionDate = uniqueDateFact(lines, LABELS.rejectionDate, "Fecha de rechazo", warnings, "CONFLICTING_REJECTION_DATE");
  const expirationDate = uniqueDateFact(lines, LABELS.expirationDate, "Fecha de expiración", warnings, "CONFLICTING_EXPIRATION_DATE");
  const effectiveNotificationDate = uniqueDateFact(lines, LABELS.effectiveNotificationDate, "Fecha de notificación", warnings, "CONFLICTING_EFFECTIVE_NOTIFICATION_DATE");

  const stateDecision = decideNotificationState(
    printedState,
    { availabilityDate, accessDate, rejectionDate, expirationDate },
    warnings,
  );
  const references: ReferenceV1[] = [];
  addReference(references, documentId, "NOTIFICATION_ID", notificationReference);
  addReference(references, documentId, "ACT_ID", actReference);
  addReference(references, documentId, "EXPEDIENTE_ID", expediente);
  addReference(references, documentId, "CSV", csv);
  addReference(references, documentId, "NIF", recipientTaxId);

  const dates: ProceduralDateV1[] = [];
  addProceduralDate(dates, documentId, availabilityDate, "AVAILABILITY_DATE");
  addProceduralDate(dates, documentId, accessDate, "ACCESS_DATE");
  addProceduralDate(dates, documentId, rejectionDate, "REJECTION_DATE");
  addProceduralDate(dates, documentId, expirationDate, "EXPIRATION_DATE");
  addProceduralDate(dates, documentId, effectiveNotificationDate, "EFFECTIVE_NOTIFICATION_DATE");
  for (const [fact, warning] of [
    [availabilityDate, "INVALID_PRINTED_AVAILABILITY_DATE"],
    [accessDate, "INVALID_PRINTED_ACCESS_DATE"],
    [rejectionDate, "INVALID_PRINTED_REJECTION_DATE"],
    [expirationDate, "INVALID_PRINTED_EXPIRATION_DATE"],
    [effectiveNotificationDate, "INVALID_PRINTED_EFFECTIVE_NOTIFICATION_DATE"],
  ] as const) {
    if (fact && !fact.parsedDate) warnings.push(warning);
  }

  const familyId = documentKind === "PUBLICATION_OR_APPEARANCE"
    ? "notification.publication_or_appearance"
    : documentKind === "DELIVERY_ATTEMPT"
      ? "notification.delivery_attempt"
      : "notification.dehu_envelope";
  return Object.freeze({
    facts: Object.freeze({
      documentKind,
      notificationState: stateDecision.state,
      stateBasis: stateDecision.basis,
      printedState,
      notificationReference,
      actReference,
      expediente,
      csv,
      subject,
      issuer,
      recipientName,
      recipientTaxId,
      channel,
      availabilityDate,
      accessDate,
      rejectionDate,
      expirationDate,
      effectiveNotificationDate,
    }),
    familyId,
    references: Object.freeze(references),
    dates: Object.freeze(dates),
    warnings: Object.freeze([...new Set(warnings)]),
  });
}

function decideNotificationState(
  printedState: NotificationEnvelopeTextFactV1 | null,
  dates: Readonly<{
    availabilityDate: NotificationEnvelopeDateFactV1 | null;
    accessDate: NotificationEnvelopeDateFactV1 | null;
    rejectionDate: NotificationEnvelopeDateFactV1 | null;
    expirationDate: NotificationEnvelopeDateFactV1 | null;
  }>,
  warnings: string[],
): Readonly<{ state: NotificationEnvelopeStateV1; basis: NotificationEnvelopeFactsV1["stateBasis"] }> {
  const printed = printedState ? statesInValue(printedState.printedValue) : new Set<Exclude<NotificationEnvelopeStateV1, "UNKNOWN">>();
  if (printed.size > 1) {
    warnings.push("CONFLICTING_EXPLICIT_NOTIFICATION_STATE");
    return Object.freeze({ state: "UNKNOWN", basis: "UNKNOWN" });
  }
  const finalDates = new Set<Exclude<NotificationEnvelopeStateV1, "UNKNOWN">>();
  if (dates.accessDate) finalDates.add("ACCESSED");
  if (dates.rejectionDate) finalDates.add("REJECTED");
  if (dates.expirationDate) finalDates.add("EXPIRED");
  if (finalDates.size > 1) {
    warnings.push("CONFLICTING_PRINTED_NOTIFICATION_EVENT_DATES");
    return Object.freeze({ state: "UNKNOWN", basis: "UNKNOWN" });
  }
  const printedValue = [...printed][0];
  const finalDatedValue = [...finalDates][0];
  if (printedState && printed.size === 0) warnings.push("UNRECOGNIZED_PRINTED_NOTIFICATION_STATE");
  if (printedValue === "AVAILABLE" && finalDatedValue) {
    warnings.push("PRINTED_AVAILABLE_STATE_PRECEDES_FINAL_EVENT");
    return Object.freeze({ state: finalDatedValue, basis: "EXPLICIT_EVENT_DATE" });
  }
  if (printedValue && finalDatedValue && printedValue !== finalDatedValue) {
    warnings.push("PRINTED_STATE_CONTRADICTS_EVENT_DATE");
    return Object.freeze({ state: "UNKNOWN", basis: "UNKNOWN" });
  }
  if (printedValue) return Object.freeze({ state: printedValue, basis: "EXPLICIT_PRINTED_STATE" });
  if (finalDatedValue) return Object.freeze({ state: finalDatedValue, basis: "EXPLICIT_EVENT_DATE" });
  if (dates.availabilityDate) return Object.freeze({ state: "AVAILABLE", basis: "EXPLICIT_EVENT_DATE" });
  warnings.push("MISSING_EXPLICIT_NOTIFICATION_STATE_OR_EVENT_DATE");
  return Object.freeze({ state: "UNKNOWN", basis: "UNKNOWN" });
}

function statesInValue(value: string): Set<Exclude<NotificationEnvelopeStateV1, "UNKNOWN">> {
  const folded = fold(value);
  const states = new Set<Exclude<NotificationEnvelopeStateV1, "UNKNOWN">>();
  for (const [state, literals] of Object.entries(STATE_LITERALS) as [Exclude<NotificationEnvelopeStateV1, "UNKNOWN">, readonly string[]][]) {
    if (literals.some((literal) => folded === literal || folded.startsWith(`${literal} `))) states.add(state);
  }
  return states;
}

function uniqueTextFact(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  conflictWarning: string,
): NotificationEnvelopeTextFactV1 | null {
  const observations = labelObservations(lines, labels);
  const distinct = new Map(observations.map((item) => [fold(item.value), item]));
  if (distinct.size > 1) {
    warnings.push(conflictWarning);
    return null;
  }
  const only = [...distinct.values()][0];
  return only ? textFact(only.value, [only.page], sourceLabel) : null;
}

function uniqueDateFact(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  conflictWarning: string,
): NotificationEnvelopeDateFactV1 | null {
  const observations = labelObservations(lines, labels);
  const distinct = new Map(observations.map((item) => [fold(item.value), item]));
  if (distinct.size > 1) {
    warnings.push(conflictWarning);
    return null;
  }
  const only = [...distinct.values()][0];
  if (!only) return null;
  const parsed = parsePrintedDateTime(only.value);
  return Object.freeze({
    ...textFact(only.value, [only.page], sourceLabel),
    parsedDate: parsed.date,
    parsedTime: parsed.time,
  });
}

function labelObservations(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
): readonly Readonly<{ value: string; page: number }>[] {
  return lines.flatMap((line, index) => {
    if (!labels.some((label) => matchesLabel(line.folded, label))) return [];
    const value = extractLabelValue(lines, line, index);
    return value ? [Object.freeze({ value, page: line.pageNumber })] : [];
  });
}

function extractLabelValue(lines: readonly PrivateLineV1[], line: PrivateLineV1, index: number): string | null {
  const separator = line.raw.search(/[:\-]/u);
  const sameLine = separator >= 0 ? line.raw.slice(separator + 1).trim() : "";
  if (sameLine.length > 0 && sameLine.length <= NOTIFICATION_ENVELOPE_EXTRACTOR_LIMITS_V1.maxTextFactChars) return sameLine;
  const next = lines[index + 1];
  if (
    next && next.pageNumber === line.pageNumber &&
    next.raw.length <= NOTIFICATION_ENVELOPE_EXTRACTOR_LIMITS_V1.maxTextFactChars &&
    !ALL_LABEL_LITERALS.some((label) => matchesLabel(next.folded, label))
  ) return next.raw;
  return null;
}

function textFact(
  printedValue: string,
  pageNumbers: readonly number[],
  sourceLabel: string,
): NotificationEnvelopeTextFactV1 {
  if (printedValue.length === 0 || printedValue.length > NOTIFICATION_ENVELOPE_EXTRACTOR_LIMITS_V1.maxTextFactChars) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "notificationEnvelope.textFact");
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

function addReference(
  target: ReferenceV1[],
  documentId: string,
  referenceType: ReferenceTypeV1,
  fact: NotificationEnvelopeTextFactV1 | null,
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

function addProceduralDate(
  target: ProceduralDateV1[],
  documentId: string,
  fact: NotificationEnvelopeDateFactV1 | null,
  dateType: ProceduralDateTypeV1,
): void {
  if (!fact) return;
  target.push(createProceduralDateV1({
    proceduralDateId: `${stablePrefix(documentId)}-date-${dateType.toLowerCase()}`,
    dateType,
    rawText: fact.printedValue,
    rawDeadlineText: null,
    parsedDate: fact.parsedDate,
    timezone: fact.parsedTime ? "Europe/Madrid" : null,
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

function parsePrintedDateTime(value: string): Readonly<{ date: string | null; time: string | null }> {
  const dateMatches = [...value.matchAll(/(?:^|\D)(\d{2})([/-])(\d{2})\2(\d{4})(?=\D|$)/gu)];
  const timeMatches = [...value.matchAll(/(?:^|\D)([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?=\D|$)/gu)];
  let date: string | null = null;
  if (dateMatches.length === 1) {
    const match = dateMatches[0]!;
    const day = Number(match[1]);
    const month = Number(match[3]);
    const year = Number(match[4]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day) {
      date = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }
  const timeMatch = timeMatches.length === 1 ? timeMatches[0]! : null;
  const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] ?? "00"}` : null;
  return Object.freeze({ date, time });
}

function validateSegments(
  document: BoundedDocumentInput,
  rawSegments: readonly DocumentSegmentV1[],
): readonly DocumentSegmentV1[] {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0 || rawSegments.length > document.pages.length) {
    throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "notificationEnvelope.segments");
  }
  const segments = rawSegments.map((segment) => createDocumentSegmentV1(segment));
  const covered = new Set<number>();
  const ids = new Set<string>();
  for (const segment of segments) {
    if (segment.documentId !== document.documentId || ids.has(segment.segmentId)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", "notificationEnvelope.segments.identity");
    }
    ids.add(segment.segmentId);
    for (let page = segment.pageFrom; page <= segment.pageTo; page += 1) {
      if (covered.has(page) || page > document.pages.length) {
        throw new FiscalNotificationInputError("INVALID_INPUT", "notificationEnvelope.segments.coverage");
      }
      covered.add(page);
    }
  }
  if (covered.size !== document.pages.length) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "notificationEnvelope.segments.coverage");
  }
  return Object.freeze(segments.filter((segment) =>
    segment.segmentType === "NOTIFICATION_COVER" || segment.segmentType === "DELIVERY_EVIDENCE",
  ));
}

function collectLines(
  document: BoundedDocumentInput,
  includedPages: ReadonlySet<number>,
): readonly PrivateLineV1[] {
  const lines: PrivateLineV1[] = [];
  for (const page of document.pages) {
    if (!includedPages.has(page.pageNumber)) continue;
    const pageLines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    for (let index = 0; index < pageLines.length; index += 1) {
      assertNotAborted(document.signal);
      const raw = pageLines[index]!.trim();
      if (raw.length === 0) continue;
      if (raw.length > NOTIFICATION_ENVELOPE_EXTRACTOR_LIMITS_V1.maxLineChars) {
        throw new FiscalNotificationInputError("INVALID_INPUT", `notificationEnvelope.pages[${page.pageNumber}].line`);
      }
      lines.push(Object.freeze({ pageNumber: page.pageNumber, lineIndex: index, raw, folded: fold(raw) }));
      if (lines.length > NOTIFICATION_ENVELOPE_EXTRACTOR_LIMITS_V1.maxLines) {
        throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "notificationEnvelope.lines");
      }
    }
  }
  return Object.freeze(lines);
}

function createEvidence(
  document: BoundedDocumentInput,
  segments: readonly DocumentSegmentV1[],
): EntityEvidenceV1 {
  return Object.freeze({
    sourceDocumentIds: Object.freeze([document.documentId]),
    sourceSegmentIds: Object.freeze(segments.map((segment) => segment.segmentId)),
    evidenceBasis: "EXPLICIT_DOCUMENT_TEXT",
    confidence: 1,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
  });
}

function toDomainNotificationStatus(
  state: NotificationEnvelopeStateV1,
): NotificationEventV1["notificationStatus"] | null {
  return state === "UNKNOWN" ? null : state;
}

function emptyOutput(
  status: "UNKNOWN" | "BLOCKED",
  warning: string | null = null,
): NotificationEnvelopeExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "notification-envelope",
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
    notificationEnvelopeFacts: Object.freeze({
      documentKind: null,
      notificationState: "UNKNOWN",
      stateBasis: "UNKNOWN",
      printedState: null,
      notificationReference: null,
      actReference: null,
      expediente: null,
      csv: null,
      subject: null,
      issuer: null,
      recipientName: null,
      recipientTaxId: null,
      channel: null,
      availabilityDate: null,
      accessDate: null,
      rejectionDate: null,
      expirationDate: null,
      effectiveNotificationDate: null,
    }),
    retainedSourceContent: "NONE",
    familyDecisionPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AUTHORITY_REQUIRED",
    stateDecisionPolicy: "PRINTED_STATE_OR_PRINTED_EVENT_DATE_ONLY",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
    legalDateComputationPolicy: "PROHIBITED",
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
  return `fx-notification-envelope-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function entityId(document: BoundedDocumentInput, kind: string, index: number): string {
  return `${stablePrefix(`${document.ownerScope}|${document.documentId}`)}-${kind}-${index}`;
}

export const NOTIFICATION_ENVELOPE_EXTRACTOR_RELEASE_V1 = Object.freeze({
  version: NOTIFICATION_ENVELOPE_EXTRACTOR_VERSION_V1,
  familyIds: Object.freeze([
    "notification.delivery_attempt",
    "notification.publication_or_appearance",
    "notification.dehu_envelope",
  ] as const),
  officialInterpretationSources: Object.freeze([
    Object.freeze({
      sourceId: "aeat.notification.dehu.access",
      url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/notificaciones-electronicas-ayuda-tecnica/acceso-notificaciones-electronicas-dehu.html",
    }),
    Object.freeze({
      sourceId: "aeat.notification.faq.effects",
      url: "https://sede.agenciatributaria.gob.es/Sede/otros-servicios/notificaciones/notificaciones/preguntas-frecuentes.html",
    }),
    Object.freeze({
      sourceId: "boe.law.39-2015.article.43",
      url: "https://www.boe.es/eli/es/l/2015/10/01/39",
    }),
  ]),
  sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
  familyPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AUTHORITY_REQUIRED",
  statePolicy: "PRINTED_STATE_OR_PRINTED_EVENT_DATE_ONLY",
  datePolicy: "NEVER_COMPUTE_EFFECTIVE_DATE_OR_EXPIRATION",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
});
