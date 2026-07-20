import {
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import { createSensitiveReferenceV2 } from "../sensitive-reference.v2";
import {
  resolveAllowedPrintedEffectCodesV2,
  type FiscalNotificationDocumentFamilyIdV2,
  type FiscalNotificationPrintedEffectCodeV2,
} from "../structured-document-explanation.v2";
import type {
  FamilyRecognitionRuleV2,
  FamilyRuleAnchorMatchModeV2,
  FamilyRuleAnchorV2,
  FamilyRuleAuthorityIdV2,
  FamilyRuleConflictIdV2,
} from "./family-rule-contract.v2";
import { FISCAL_NOTIFICATION_FAMILY_RULES_V2 } from "./family-rule-registry.v2";
import {
  resolveProfileFieldAdapterV2,
  type ProfileFieldAdapterOutcomeV2,
  type ProfileFieldCandidateV2,
  type ProfileFieldContractV2,
} from "./profile-field-adapter.v2";
import {
  PROFILE_FIELD_LABELS_V2,
  resolveProfileFieldLabelV2,
  type ProfileFieldLabelV2,
} from "./profile-field-labels.v2";

export const PROFILE_DRIVEN_EXTRACTOR_SCHEMA_VERSION_V2 = 2 as const;
export const PROFILE_DRIVEN_EXTRACTOR_VERSION_V2 =
  "profile-driven-extractor.2026-07-16.v2" as const;
export const PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2 =
  "profile-driven-family-v2" as const;

export const PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2 = Object.freeze({
  maxRules: 128,
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxHeaderLines: 40,
  maxCandidateFields: 512,
  maxPrintedFieldValueChars: 256,
} as const);

export type ProfileDrivenExtractorStatusV2 =
  | "REVIEW_REQUIRED"
  | "UNKNOWN"
  | "AMBIGUOUS"
  | "BLOCKED";

export type ProfileDrivenExtractorIssueV2 =
  | "TITLE_NOT_EXACT"
  | "AUTHORITY_NOT_COMPATIBLE"
  | "REQUIRED_ANCHORS_MISSING"
  | "CONFLICTING_AUTHORITY_OR_GUIDE"
  | "MULTIPLE_EXACT_FAMILY_RULES"
  | "FIELD_ADAPTER_NOT_REGISTERED";

export interface ProfileDrivenFamilyCandidateV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly ruleId: FamilyRecognitionRuleV2["ruleId"];
  readonly titleMatch: "EXACT_LINE" | "CLOSED_PREFIX";
  readonly matchedAnchorIds: readonly string[];
  readonly matchedPageNumbers: readonly number[];
  readonly missingRequiredAnchorIds: readonly string[];
  readonly compatibleAuthorityIds: readonly FamilyRuleAuthorityIdV2[];
  readonly conflictingIds: readonly FamilyRuleConflictIdV2[];
}

export interface ExtractProfileDrivenFamilyInputV2 {
  readonly document: BoundedDocumentInput;
  /** Tests and future versioned registries may inject an immutable rule set. */
  readonly rules?: readonly FamilyRecognitionRuleV2[];
}

export interface ProfileDrivenPrintedEffectV2 {
  readonly effectCode: FiscalNotificationPrintedEffectCodeV2;
  readonly pageNumbers: readonly number[];
  readonly detectionBasis: "CLOSED_PRINTED_PHRASE";
}

export type ProfileDrivenAdaptedFieldsV2 = ProfileFieldAdapterOutcomeV2 &
  Readonly<{
    /** Controlled effect codes only. Source phrases are deliberately omitted. */
    printedEffects: readonly ProfileDrivenPrintedEffectV2[];
  }>;

export interface ProfileDrivenExtractorOutcomeV2 {
  readonly schemaVersion: typeof PROFILE_DRIVEN_EXTRACTOR_SCHEMA_VERSION_V2;
  readonly extractorVersion: typeof PROFILE_DRIVEN_EXTRACTOR_VERSION_V2;
  readonly implementationId: typeof PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2;
  readonly status: ProfileDrivenExtractorStatusV2;
  readonly familyId: FiscalNotificationDocumentFamilyIdV3 | null;
  readonly ruleId: FamilyRecognitionRuleV2["ruleId"] | null;
  readonly authorityId: FamilyRuleAuthorityIdV2 | null;
  readonly familyCandidates: readonly ProfileDrivenFamilyCandidateV2[];
  readonly fieldCandidates: readonly ProfileFieldCandidateV2[];
  readonly printedEffects: readonly ProfileDrivenPrintedEffectV2[];
  readonly adaptedFields: ProfileDrivenAdaptedFieldsV2 | null;
  readonly issues: readonly ProfileDrivenExtractorIssueV2[];
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsFamily: false;
  readonly confirmsObligation: false;
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsDeadline: false;
  readonly confirmsSeizure: false;
  readonly permitsAccountingAction: false;
}

interface PrivateLineV2 {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
  readonly isHeader: boolean;
  readonly host: string | null;
}

interface PrivateTextIndexV2 {
  readonly lines: readonly PrivateLineV2[];
  readonly exactLines: ReadonlySet<string>;
  readonly headerExactLines: ReadonlySet<string>;
  readonly hosts: ReadonlySet<string>;
}

interface PrivateRuleEvaluationV2 {
  readonly rule: FamilyRecognitionRuleV2;
  readonly candidate: ProfileDrivenFamilyCandidateV2;
  readonly complete: boolean;
}

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const PERSONAL_TAX_ID =
  /(?:^|[./:_-])(?:\d{8}[./:_-]?[A-Z]|[XYZ][./:_-]?\d{7}[./:_-]?[A-Z]|[ABCDEFGHJNPQRSUVW][./:_-]?\d{7}[./:_-]?[0-9A-J])(?=$|[./:_-])|^NIF[./:_-]?(?:\d{8}[./:_-]?[A-Z]|[XYZ][./:_-]?\d{7}[./:_-]?[A-Z]|[ABCDEFGHJNPQRSUVW][./:_-]?\d{7}[./:_-]?[0-9A-J])$/u;
const PERSONAL_IBAN =
  /(?:^|[./:_-])(?:IBAN[./:_-]?)?ES(?:[./:_-]?\d){22}(?=$|[./:_-])/u;
const PERSONAL_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const PERSONAL_PHONE =
  /(?:^|[./:_-])(?:34[./:_-]?)?[6789](?:[./:_-]?\d){8}(?=$|[./:_-])/u;
const SAFE_REFERENCE = /^[A-Z0-9][A-Z0-9./:_-]{0,199}$/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const SPANISH_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/u;
const SPANISH_DATE_WORDS =
  /^(\d{1,2})\s+de\s+([a-záéíóúüñ]+)\s+de\s+(\d{4})$/iu;
const DEADLINE_DATE_FIELD_CODES = new Set([
  "APPEAL_DEADLINE",
  "EXPIRATION_DATE",
  "INSTALLMENT_DUE_DATE",
  "RESPONSE_DEADLINE",
  "VOLUNTARY_PAYMENT_DEADLINE",
]);
const ABSOLUTE_DEADLINE_PREFIXES = new Set([
  "",
  "antes de",
  "antes del",
  "como maximo",
  "como maximo el",
  "dia",
  "el",
  "el dia",
  "fecha",
  "fecha de vencimiento",
  "fecha limite",
  "hasta",
  "hasta el",
  "no mas tarde de",
  "no mas tarde del",
  "vence",
  "vence el",
  "vencimiento",
  "vencimiento el",
]);
const ABSOLUTE_DEADLINE_SUFFIXES = new Set([
  "",
  "ambos inclusive",
  "incluida",
  "incluido",
  "inclusive",
]);
const SPANISH_MONTHS = Object.freeze(
  new Map<string, number>([
    ["enero", 1],
    ["febrero", 2],
    ["marzo", 3],
    ["abril", 4],
    ["mayo", 5],
    ["junio", 6],
    ["julio", 7],
    ["agosto", 8],
    ["septiembre", 9],
    ["setiembre", 9],
    ["octubre", 10],
    ["noviembre", 11],
    ["diciembre", 12],
  ]),
);

/**
 * Conservative closed phrases for result-bearing families. A phrase only
 * matches at the beginning of a normalized line, so quoted negations such as
 * "no se concede la suspensión" cannot become a positive effect merely
 * because they contain a shorter affirmative fragment.
 */
const PRINTED_EFFECT_LINE_PREFIXES_V2 = Object.freeze({
  OFFSET_REQUESTED: Object.freeze([
    "compensacion a instancia del obligado",
    "solicitud de compensacion presentada",
    "se solicita la compensacion",
  ]),
  OFFSET_EX_OFFICIO: Object.freeze([
    "compensacion de oficio",
    "se acuerda de oficio la compensacion",
  ]),
  OFFSET_TOTAL: Object.freeze([
    "compensacion total",
    "resultado compensacion total",
    "se acuerda la compensacion total",
    "la deuda queda totalmente compensada",
  ]),
  OFFSET_PARTIAL: Object.freeze([
    "compensacion parcial",
    "resultado compensacion parcial",
    "se acuerda la compensacion parcial",
    "la deuda queda parcialmente compensada",
  ]),
  OFFSET_DENIED: Object.freeze([
    "compensacion denegada",
    "se deniega la compensacion",
    "se acuerda denegar la compensacion",
  ]),
  OFFSET_RESIDUAL: Object.freeze([
    "queda saldo pendiente tras la compensacion",
    "queda un saldo pendiente tras la compensacion",
    "compensacion con saldo pendiente",
  ]),
  EXTINCTION_CONFIRMED: Object.freeze([
    "deuda totalmente extinguida",
    "deuda totalmente extinguida en periodo voluntario",
    "la deuda queda extinguida",
    "extincion total de la deuda",
  ]),
  REFUND_RECOGNIZED: Object.freeze([
    "devolucion reconocida",
    "se reconoce el derecho a la devolucion",
    "acuerdo de reconocimiento de devolucion",
  ]),
  REFUND_PAYMENT_CONFIRMED: Object.freeze([
    "devolucion pagada",
    "pago de la devolucion realizado",
    "transferencia de la devolucion realizada",
  ]),
  SUSPENSION_GRANTED: Object.freeze([
    "suspension concedida",
    "se acuerda conceder la suspension",
    "acuerdo de concesion de suspension",
  ]),
  SUSPENSION_DENIED: Object.freeze([
    "suspension denegada",
    "se acuerda denegar la suspension",
    "acuerdo de denegacion de suspension",
  ]),
  APPEAL_FILED: Object.freeze([
    "recurso presentado",
    "reclamacion presentada",
    "justificante de presentacion del recurso",
    "justificante de presentacion de la reclamacion",
  ]),
  REVIEW_REQUESTED: Object.freeze([
    "revision solicitada",
    "se solicita la revision",
  ]),
  REVIEW_RESOLVED: Object.freeze([
    "resolucion de recurso o reclamacion",
    "revision resuelta",
    "recurso resuelto",
    "reclamacion resuelta",
    "se resuelve el recurso",
    "se resuelve la reclamacion",
  ]),
  ACT_CORRECTED: Object.freeze([
    "acto rectificado",
    "se rectifica el acto",
    "error material rectificado",
  ]),
  ACT_CANCELLED: Object.freeze([
    "acto anulado",
    "se anula el acto",
    "el acto queda sin efecto",
  ]),
  LIABILITY_PROPOSED: Object.freeze([
    "propuesta de declaracion de responsabilidad",
    "responsabilidad propuesta",
  ]),
  LIABILITY_DECLARED: Object.freeze([
    "declaracion de responsabilidad",
    "responsabilidad declarada",
    "se declara la responsabilidad",
  ]),
} as const satisfies Partial<
  Readonly<
    Record<
      FiscalNotificationPrintedEffectCodeV2,
      readonly string[]
    >
  >
>);

function invalidLimit(code: "COLLECTION_LIMIT_EXCEEDED" | "TEXT_TOO_LARGE", path: string): never {
  throw new FiscalNotificationInputError(code, path);
}

function normalizeForMatching(value: string): string {
  try {
    return value
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .toLocaleLowerCase("es-ES")
      .replace(/[^a-z0-9@.]+/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
  } catch {
    return "";
  }
}

function normalizedHost(rawLine: string): string | null {
  const trimmed = rawLine.trim().replace(/^[({[\s]+|[)}\]\s,;]+$/gu, "");
  if (trimmed.length === 0 || trimmed.length > 512) return null;
  try {
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.hostname.length === 0
    ) {
      return null;
    }
    return parsed.hostname.toLowerCase().replace(/\.$/u, "");
  } catch {
    return null;
  }
}

function addPrivateLine(
  lines: PrivateLineV2[],
  pageNumber: number,
  pageLineIndex: number,
  raw: string,
): void {
  if (raw.length > PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxLineChars) {
    invalidLimit("TEXT_TOO_LARGE", "document.pages.lines");
  }
  if (lines.length >= PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxLines) {
    invalidLimit("COLLECTION_LIMIT_EXCEEDED", "document.pages.lines");
  }
  lines.push(
    Object.freeze({
      pageNumber,
      raw,
      normalized: normalizeForMatching(raw),
      isHeader:
        pageLineIndex < PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxHeaderLines,
      host: normalizedHost(raw),
    }),
  );
}

function indexDocument(document: BoundedDocumentInput): PrivateTextIndexV2 {
  const lines: PrivateLineV2[] = [];
  for (const page of document.pages) {
    assertNotAborted(document.signal);
    let start = 0;
    let pageLineIndex = 0;
    for (let cursor = 0; cursor <= page.text.length; cursor += 1) {
      if ((cursor & 1023) === 0) assertNotAborted(document.signal);
      const character = page.text.charCodeAt(cursor);
      if (cursor !== page.text.length && character !== 10 && character !== 13) {
        continue;
      }
      addPrivateLine(
        lines,
        page.pageNumber,
        pageLineIndex,
        page.text.slice(start, cursor),
      );
      pageLineIndex += 1;
      if (character === 13 && page.text.charCodeAt(cursor + 1) === 10) {
        cursor += 1;
      }
      start = cursor + 1;
    }
  }
  const exactLines = new Set<string>();
  const headerExactLines = new Set<string>();
  const hosts = new Set<string>();
  for (const line of lines) {
    if (line.normalized) {
      exactLines.add(line.normalized);
      if (line.isHeader) headerExactLines.add(line.normalized);
    }
    if (line.host) hosts.add(line.host);
  }
  return Object.freeze({
    lines: Object.freeze(lines),
    exactLines,
    headerExactLines,
    hosts,
  });
}

function detectClosedPrintedEffectsV2(
  index: PrivateTextIndexV2,
  familyId: FiscalNotificationDocumentFamilyIdV2,
  signal?: AbortSignal,
): readonly ProfileDrivenPrintedEffectV2[] {
  const allowed = resolveAllowedPrintedEffectCodesV2(familyId);
  // A unique family effect is derived from the exact title later. Scanning it
  // again would only duplicate evidence and expand the false-positive surface.
  if (allowed.length <= 1) return Object.freeze([]);

  const detected: ProfileDrivenPrintedEffectV2[] = [];
  const phraseCatalog = PRINTED_EFFECT_LINE_PREFIXES_V2 as Partial<
    Readonly<
      Record<FiscalNotificationPrintedEffectCodeV2, readonly string[]>
    >
  >;
  for (const effectCode of allowed) {
    assertNotAborted(signal);
    const phrases = phraseCatalog[effectCode];
    if (!phrases) continue;
    const pages = new Set<number>();
    for (const line of index.lines) {
      assertNotAborted(signal);
      if (
        phrases.some(
          (phrase) =>
            line.normalized === phrase ||
            line.normalized.startsWith(`${phrase} `),
        )
      ) {
        pages.add(line.pageNumber);
      }
    }
    if (pages.size === 0) continue;
    detected.push(
      Object.freeze({
        effectCode,
        pageNumbers: Object.freeze([...pages].sort((left, right) => left - right)),
        detectionBasis: "CLOSED_PRINTED_PHRASE" as const,
      }),
    );
  }
  return Object.freeze(detected);
}

function containsClosedTokenSequence(line: string, literal: string): boolean {
  return line === literal || line.startsWith(`${literal} `) ||
    line.endsWith(` ${literal}`) || line.includes(` ${literal} `);
}

function hasClosedTitleQualifier(line: string, literal: string): boolean {
  if (line === literal) return true;
  const suffix = line.slice(literal.length).trim();
  return (
    /^(?:copia|numero|num|n |expediente|referencia|acuerdo|resolucion|notificacion|modelo|ejercicio|periodo|de fecha)\b/u.test(
      suffix,
    ) || /^\d{1,2} \d{1,2} \d{4}\b/u.test(suffix)
  );
}

function literalMatches(
  index: PrivateTextIndexV2,
  mode: FamilyRuleAnchorMatchModeV2,
  literalValue: string,
  signal?: AbortSignal,
  headerOnly = false,
): "EXACT" | "PREFIX" | null {
  const literal = normalizeForMatching(literalValue);
  if (!literal) return null;
  if (mode === "HOST_EXACT") {
    return index.hosts.has(literalValue.toLowerCase().replace(/\.$/u, ""))
      ? "EXACT"
      : null;
  }
  const headerScoped =
    headerOnly ||
    mode === "HEADER_TOKEN_SEQUENCE" ||
    (mode as string) === "HEADER_LINE_PREFIX";
  const eligible = headerScoped
    ? index.lines.filter((line) => line.isHeader)
    : index.lines;
  if (mode === "LINE_EXACT") {
    return (headerOnly ? index.headerExactLines : index.exactLines).has(literal)
      ? "EXACT"
      : null;
  }
  if (mode === "LINE_PREFIX" || (mode as string) === "HEADER_LINE_PREFIX") {
    for (const line of eligible) {
      assertNotAborted(signal);
      if (line.normalized === literal) return "EXACT";
      if (
        line.normalized.startsWith(`${literal} `) &&
        (!headerOnly || hasClosedTitleQualifier(line.normalized, literal))
      ) {
        return "PREFIX";
      }
    }
    return null;
  }
  for (const line of eligible) {
    assertNotAborted(signal);
    if (containsClosedTokenSequence(line.normalized, literal)) return "EXACT";
  }
  return null;
}

function anchorMatchQuality(
  index: PrivateTextIndexV2,
  anchor: FamilyRuleAnchorV2,
  signal?: AbortSignal,
  headerOnly = false,
): "EXACT" | "PREFIX" | null {
  let prefix = false;
  for (const literal of anchor.literals) {
    assertNotAborted(signal);
    const quality = literalMatches(
      index,
      anchor.matchMode,
      literal,
      signal,
      headerOnly,
    );
    if (quality === "EXACT") return "EXACT";
    if (quality === "PREFIX") prefix = true;
  }
  return prefix ? "PREFIX" : null;
}

function matchedPagesForAnchor(
  index: PrivateTextIndexV2,
  anchor: FamilyRuleAnchorV2,
  signal?: AbortSignal,
  headerOnly = false,
): readonly number[] {
  const pages = new Set<number>();
  const headerScoped =
    headerOnly ||
    anchor.matchMode === "HEADER_TOKEN_SEQUENCE" ||
    (anchor.matchMode as string) === "HEADER_LINE_PREFIX";
  for (const line of index.lines) {
    assertNotAborted(signal);
    if (headerScoped && !line.isHeader) continue;
    for (const literalValue of anchor.literals) {
      const literal = normalizeForMatching(literalValue);
      let matched = false;
      if (anchor.matchMode === "HOST_EXACT") {
        matched = line.host === literalValue.toLowerCase().replace(/\.$/u, "");
      } else if (anchor.matchMode === "LINE_EXACT") {
        matched = line.normalized === literal;
      } else if (
        anchor.matchMode === "LINE_PREFIX" ||
        (anchor.matchMode as string) === "HEADER_LINE_PREFIX"
      ) {
        matched =
          line.normalized === literal ||
          (line.normalized.startsWith(`${literal} `) &&
            (!headerOnly || hasClosedTitleQualifier(line.normalized, literal)));
      } else {
        matched = containsClosedTokenSequence(line.normalized, literal);
      }
      if (matched) {
        pages.add(line.pageNumber);
        break;
      }
    }
  }
  return Object.freeze([...pages].sort((left, right) => left - right));
}

function evaluateRule(
  index: PrivateTextIndexV2,
  rule: FamilyRecognitionRuleV2,
  signal?: AbortSignal,
): PrivateRuleEvaluationV2 | null {
  const matchedTitleAnchors = rule.titleAnchors
    .map((anchor) => ({
      anchor,
      quality: anchorMatchQuality(index, anchor, signal, true),
    }))
    .filter((item) => item.quality !== null);
  if (matchedTitleAnchors.length === 0) return null;
  const titleMatch = matchedTitleAnchors.some(({ quality }) => quality === "EXACT")
    ? "EXACT_LINE"
    : "CLOSED_PREFIX";
  const matchedRequired: string[] = [];
  const matchedPages = new Set<number>();
  for (const { anchor } of matchedTitleAnchors) {
    for (const pageNumber of matchedPagesForAnchor(index, anchor, signal, true)) {
      matchedPages.add(pageNumber);
    }
  }
  const missingRequired: string[] = [];
  for (const anchor of rule.requiredAnchors) {
    assertNotAborted(signal);
    if (anchorMatchQuality(index, anchor, signal)) {
      matchedRequired.push(anchor.anchorId);
      for (const pageNumber of matchedPagesForAnchor(index, anchor, signal)) {
        matchedPages.add(pageNumber);
      }
    } else missingRequired.push(anchor.anchorId);
  }
  const compatibleAuthorities: FamilyRuleAuthorityIdV2[] = [];
  const matchedAuthorityAnchors: string[] = [];
  for (const authority of rule.allowedAuthorities) {
    for (const anchor of authority.anchors) {
      assertNotAborted(signal);
      if (!anchorMatchQuality(index, anchor, signal)) continue;
      compatibleAuthorities.push(authority.authorityId);
      matchedAuthorityAnchors.push(anchor.anchorId);
      for (const pageNumber of matchedPagesForAnchor(index, anchor, signal)) {
        matchedPages.add(pageNumber);
      }
      break;
    }
  }
  const conflictingIds: FamilyRuleConflictIdV2[] = [];
  for (const conflict of rule.conflicts) {
    for (const literal of conflict.literals) {
      assertNotAborted(signal);
      if (literalMatches(index, conflict.matchMode, literal, signal)) {
        conflictingIds.push(conflict.conflictId);
        break;
      }
    }
  }
  const matchedAnchorIds = Object.freeze([
    ...new Set([
      ...matchedTitleAnchors.map(({ anchor }) => anchor.anchorId),
      ...matchedRequired,
      ...matchedAuthorityAnchors,
    ]),
  ]);
  const candidate = Object.freeze({
    familyId: rule.familyId,
    ruleId: rule.ruleId,
    titleMatch,
    matchedAnchorIds,
    matchedPageNumbers: Object.freeze(
      [...matchedPages].sort((left, right) => left - right),
    ),
    missingRequiredAnchorIds: Object.freeze(missingRequired),
    compatibleAuthorityIds: Object.freeze([...new Set(compatibleAuthorities)]),
    conflictingIds: Object.freeze(conflictingIds),
  });
  return Object.freeze({
    rule,
    candidate,
    complete:
      missingRequired.length === 0 &&
      compatibleAuthorities.length > 0 &&
      conflictingIds.length === 0,
  });
}

function snapshotRules(
  rules: readonly FamilyRecognitionRuleV2[] | undefined,
): readonly FamilyRecognitionRuleV2[] {
  const source = rules ?? FISCAL_NOTIFICATION_FAMILY_RULES_V2;
  if (!Array.isArray(source) || source.length === 0) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "rules");
  }
  if (source.length > PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxRules) {
    invalidLimit("COLLECTION_LIMIT_EXCEEDED", "rules");
  }
  const seenRules = new Set<string>();
  const snapshot: FamilyRecognitionRuleV2[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const rule = source[index];
    if (
      !rule ||
      !Object.isFrozen(rule) ||
      rule.classificationPolicy !== "REVIEW_REQUIRED_ONLY" ||
      rule.permitsAutomaticFamilyConfirmation !== false ||
      seenRules.has(rule.ruleId)
    ) {
      throw new FiscalNotificationInputError("INVALID_INPUT", `rules[${index}]`);
    }
    seenRules.add(rule.ruleId);
    snapshot.push(rule);
  }
  return Object.freeze(snapshot);
}

function activeLabels(contract: ProfileFieldContractV2): readonly ProfileFieldLabelV2[] {
  const groups = [
    ["REFERENCE", contract.references],
    ["DATE", contract.dates],
    ["MONEY", contract.money],
    ["FACT", contract.facts],
    ["PARTICIPANT_ROLE", contract.participantRoles],
  ] as const;
  const labels: ProfileFieldLabelV2[] = [];
  for (const [kind, fieldCodes] of groups) {
    for (const fieldCode of fieldCodes) {
      const label = resolveProfileFieldLabelV2(kind, fieldCode);
      if (label) labels.push(label);
    }
  }
  return Object.freeze(labels);
}

function labelsByNormalizedText(
  labels: readonly ProfileFieldLabelV2[],
): ReadonlyMap<string, readonly ProfileFieldLabelV2[]> {
  const mutable = new Map<string, ProfileFieldLabelV2[]>();
  for (const label of labels) {
    for (const literal of [label.labelEs, ...label.aliasesEs]) {
      const normalized = normalizeForMatching(literal);
      if (!normalized) continue;
      const current = mutable.get(normalized) ?? [];
      if (!current.includes(label)) current.push(label);
      mutable.set(normalized, current);
    }
  }
  return new Map(
    [...mutable.entries()].map(([key, values]) => [key, Object.freeze(values)]),
  );
}

function splitClosedLabel(line: PrivateLineV2): {
  readonly label: string;
  readonly inlineValue: string | null;
} {
  const separator = line.raw.indexOf(":");
  if (separator < 0) {
    return Object.freeze({ label: line.normalized, inlineValue: null });
  }
  const label = normalizeForMatching(line.raw.slice(0, separator));
  const inlineValue = line.raw.slice(separator + 1).trim();
  return Object.freeze({ label, inlineValue: inlineValue || null });
}

function stripDiacriticsPreservingLayout(value: string): string {
  try {
    return value
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .toLocaleLowerCase("es-ES");
  } catch {
    return "";
  }
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function valueAfterClosedLiteral(raw: string, literal: string): string | null {
  const source = stripDiacriticsPreservingLayout(raw);
  const tokens = literal.split(" ").filter(Boolean);
  if (source.length === 0 || tokens.length === 0) return null;
  const expression = new RegExp(
    `(?:^|[^a-z0-9])${tokens.map(escapeRegularExpression).join("[^a-z0-9]+")}(?=$|[^a-z0-9])`,
    "u",
  );
  const match = expression.exec(source);
  if (!match) return null;
  const prefix = source.slice(0, match.index).trim();
  const finalPrefixCharacter = prefix.at(-1) ?? "";
  if (
    prefix &&
    !".:;|()[]{}<>,/\\-‐‑‒–—−".includes(finalPrefixCharacter)
  ) {
    return null;
  }
  const suffix = source
    .slice(match.index + match[0].length)
    .trim()
    .replace(/^(?::|[-‐‑‒–—−])\s*/u, "")
    .trim();
  return suffix || null;
}

function plausibleSingleWordInlineLabels(
  literal: string,
  labels: readonly ProfileFieldLabelV2[],
  value: string,
): readonly ProfileFieldLabelV2[] {
  if (literal.includes(" ")) return labels;
  return Object.freeze(
    labels.filter((label) => {
      if (label.kind === "MONEY") return parsePrintedEurCents(value) !== null;
      if (label.kind === "DATE") return parsePrintedDate(value) !== null;
      return label.kind === "REFERENCE" ||
        label.kind === "FACT" ||
        label.kind === "PARTICIPANT_ROLE";
    }),
  );
}

function lineUsesSingleWordLabel(
  line: PrivateLineV2,
  label: ProfileFieldLabelV2,
): boolean {
  const split = splitClosedLabel(line);
  return !split.label.includes(" ") &&
    [label.labelEs, ...label.aliasesEs].some(
      (literal) => normalizeForMatching(literal) === split.label,
    );
}

function matchClosedFieldLabel(
  line: PrivateLineV2,
  knownLabels: ReadonlyMap<string, readonly ProfileFieldLabelV2[]>,
): {
  readonly labels: readonly ProfileFieldLabelV2[];
  readonly inlineValue: string | null;
} | null {
  const split = splitClosedLabel(line);
  const exact = knownLabels.get(split.label);
  if (exact) {
    const labels = split.inlineValue === null
      ? exact
      : plausibleSingleWordInlineLabels(
          split.label,
          exact,
          split.inlineValue,
        );
    return labels.length > 0
      ? Object.freeze({ labels, inlineValue: split.inlineValue })
      : null;
  }

  let selectedLiteral: string | null = null;
  let selectedLabels: readonly ProfileFieldLabelV2[] = Object.freeze([]);
  let selectedInlineValue: string | null = null;
  for (const literal of knownLabels.keys()) {
    if (!containsClosedTokenSequence(line.normalized, literal)) continue;
    const inlineValue = valueAfterClosedLiteral(line.raw, literal);
    if (!inlineValue) continue;
    const labels = plausibleSingleWordInlineLabels(
      literal,
      knownLabels.get(literal) ?? Object.freeze([]),
      inlineValue,
    );
    if (
      labels.length > 0 &&
      (selectedLiteral === null || literal.length > selectedLiteral.length)
    ) {
      selectedLiteral = literal;
      selectedLabels = labels;
      selectedInlineValue = inlineValue;
    }
  }
  if (selectedLiteral === null) return null;
  return Object.freeze({
    labels: selectedLabels,
    inlineValue: selectedInlineValue,
  });
}

function nextClosedValue(
  lines: readonly PrivateLineV2[],
  lineIndex: number,
  pageNumber: number,
  knownLabels: ReadonlyMap<string, readonly ProfileFieldLabelV2[]>,
): string | null {
  const next = lines[lineIndex + 1];
  if (
    !next ||
    next.pageNumber !== pageNumber ||
    !next.normalized ||
    matchClosedFieldLabel(next, knownLabels) !== null
  ) {
    return null;
  }
  return next.raw.trim() || null;
}

function safePrintedValue(value: string | null): string | null {
  if (
    value === null ||
    value.length === 0 ||
    value.length > PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxPrintedFieldValueChars ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return null;
  }
  return value;
}

function normalizeReferenceValue(
  value: string,
  fieldCode: string,
): string | null {
  let normalized: string;
  try {
    normalized = value
      .normalize("NFKC")
      .toUpperCase()
      .replace(/\s+/gu, "")
      .replace(/^[,;]+|[,;]+$/gu, "");
  } catch {
    return null;
  }
  if (
    !SAFE_REFERENCE.test(normalized) ||
    !/\d/u.test(normalized) ||
    PERSONAL_TAX_ID.test(normalized) ||
    PERSONAL_IBAN.test(normalized) ||
    PERSONAL_EMAIL.test(normalized) ||
    PERSONAL_PHONE.test(normalized)
  ) {
    return null;
  }
  if (fieldCode === "MODEL" && !/^\d{3}$/u.test(normalized)) return null;
  if (fieldCode === "FISCAL_YEAR" && !/^(?:19|20)\d{2}$/u.test(normalized)) {
    return null;
  }
  if (
    fieldCode === "TAX_PERIOD" &&
    !/^(?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function validIsoDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isSafeInteger(year) ||
    !Number.isSafeInteger(month) ||
    !Number.isSafeInteger(day) ||
    year < 1900 ||
    year > 2200
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parsePrintedDate(value: string): string | null {
  const trimmed = value.trim().replace(/[.;,]+$/u, "");
  const iso = ISO_DATE.exec(trimmed);
  if (iso) return validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const spanish = SPANISH_DATE.exec(trimmed);
  if (spanish) {
    return validIsoDate(Number(spanish[3]), Number(spanish[2]), Number(spanish[1]));
  }
  const words = SPANISH_DATE_WORDS.exec(trimmed);
  if (!words) return null;
  const month = SPANISH_MONTHS.get(normalizeForMatching(words[2]));
  return month ? validIsoDate(Number(words[3]), month, Number(words[1])) : null;
}

function extractPrintedDate(value: string): string | null {
  const direct = parsePrintedDate(value);
  if (direct) return direct;
  const candidates = [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/gu,
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/gu,
    /\b\d{1,2}\s+de\s+[a-záéíóúüñ]+\s+de\s+\d{4}\b/giu,
  ];
  for (const expression of candidates) {
    for (const match of value.matchAll(expression)) {
      const parsed = parsePrintedDate(match[0]);
      if (parsed) return parsed;
    }
  }
  return null;
}

function extractAllPrintedDates(value: string): readonly string[] {
  const values = new Set<string>();
  const direct = parsePrintedDate(value);
  if (direct) values.add(direct);
  for (const expression of [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/gu,
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/gu,
    /\b\d{1,2}\s+de\s+[a-záéíóúüñ]+\s+de\s+\d{4}\b/giu,
  ]) {
    for (const match of value.matchAll(expression)) {
      const parsed = parsePrintedDate(match[0]);
      if (parsed) values.add(parsed);
    }
  }
  return Object.freeze([...values]);
}

function firstPrintedDateMatch(
  value: string,
): Readonly<{ index: number; length: number }> | null {
  const matches = [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/u.exec(value),
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/u.exec(value),
    /\b\d{1,2}\s+de\s+[a-záéíóúüñ]+\s+de\s+\d{4}\b/iu.exec(value),
  ].filter((match): match is RegExpExecArray => match !== null);
  if (matches.length === 0) return null;
  const first = matches.reduce((earliest, match) =>
    match.index < earliest.index ? match : earliest,
  );
  return Object.freeze({ index: first.index, length: first[0].length });
}

function isExplicitAbsoluteDeadlineValue(value: string): boolean {
  const date = firstPrintedDateMatch(value);
  if (!date) return false;
  const normalizeDeadlineContext = (context: string): string =>
    normalizeForMatching(context)
      .replace(/^[,.;:()]+|[,.;:()]+$/gu, "")
      .trim();
  const prefix = normalizeDeadlineContext(value.slice(0, date.index));
  const suffix = normalizeDeadlineContext(
    value.slice(date.index + date.length),
  );
  return ABSOLUTE_DEADLINE_PREFIXES.has(prefix) &&
    (ABSOLUTE_DEADLINE_SUFFIXES.has(suffix) ||
      /^(?:a las )?\d{1,2}(?: \d{2})?(?: horas?)?$/u.test(suffix));
}

function extractPrintedDateForField(
  value: string,
  fieldCode: string,
): string | null {
  if (
    DEADLINE_DATE_FIELD_CODES.has(fieldCode) &&
    !isExplicitAbsoluteDeadlineValue(value)
  ) {
    return null;
  }
  return extractPrintedDate(value);
}

function extractAllPrintedDatesForField(
  value: string,
  fieldCode: string,
): readonly string[] {
  if (
    DEADLINE_DATE_FIELD_CODES.has(fieldCode) &&
    !isExplicitAbsoluteDeadlineValue(value)
  ) {
    return Object.freeze([]);
  }
  return extractAllPrintedDates(value);
}

function parsePrintedEurCents(value: string): number | null {
  const trimmed = value.trim();
  const hasCurrency = /(?:EUR|€)$/iu.test(trimmed.replace(/\s+/gu, ""));
  const normalized = trimmed
    .replace(/\s+/gu, "")
    .replace(/(?:EUR|€)$/iu, "");
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/u.exec(normalized);
  if (!match || (!hasCurrency && match[2] === undefined)) return null;
  const units = match[1].replace(/\./gu, "");
  const decimals = (match[2] ?? "").padEnd(2, "0");
  const amount = Number(units) * 100 + Number(decimals || "0");
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function extractPrintedEurCents(value: string): number | null {
  const direct = parsePrintedEurCents(value);
  if (direct !== null) return direct;
  const matches = value.matchAll(
    /(?:^|[^\d])((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?\s*(?:EUR|€)?)(?=$|[^\d])/giu,
  );
  for (const match of matches) {
    const parsed = parsePrintedEurCents(match[1]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function extractPrintedReference(value: string): string | null {
  const matches = value.toUpperCase().match(/[A-Z0-9][A-Z0-9./:_-]{1,199}/gu);
  if (!matches) return null;
  return (
    matches.find(
      (candidate) =>
        /\d/u.test(candidate) &&
        parsePrintedDate(candidate) === null &&
        !/^\d+(?:[.,]\d{1,2})?$/u.test(candidate),
    ) ?? null
  );
}

function evidence(index: number, pageNumber: number) {
  return Object.freeze({
    evidenceId: `profile-evidence-${index}`,
    pageNumber,
    evidenceBasis: "EXPLICIT_DOCUMENT_FIELD" as const,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
    confidence: 1,
  });
}

function freezeCandidate(candidate: ProfileFieldCandidateV2): ProfileFieldCandidateV2 {
  return Object.freeze(candidate);
}

function allClosedLayoutLabels(
  raw: string,
  knownLabels: ReadonlyMap<string, readonly ProfileFieldLabelV2[]>,
): readonly ProfileFieldLabelV2[] {
  const normalized = normalizeForMatching(raw);
  if (!normalized) return Object.freeze([]);
  const matchingLiterals = [...knownLabels.keys()].filter((literal) => {
    if (!containsClosedTokenSequence(normalized, literal)) return false;
    if (literal.includes(" ") || normalized === literal) return true;
    const inlineValue = valueAfterClosedLiteral(raw, literal);
    return inlineValue !== null &&
      plausibleSingleWordInlineLabels(
        literal,
        knownLabels.get(literal) ?? Object.freeze([]),
        inlineValue,
      ).length > 0;
  });
  const mostSpecificLiterals = matchingLiterals.filter(
    (literal) =>
      !matchingLiterals.some(
        (candidate) =>
          candidate.length > literal.length &&
          containsClosedTokenSequence(candidate, literal),
      ),
  );
  return Object.freeze(
    mostSpecificLiterals.flatMap((literal, index) =>
      (knownLabels.get(literal) ?? []).filter(
        (label) =>
          !mostSpecificLiterals
            .slice(0, index)
            .some((previous) => knownLabels.get(previous)?.includes(label)),
      ),
    ),
  );
}

function hasInlineScalarLabel(
  raw: string,
  kind: ProfileFieldLabelV2["kind"],
): boolean {
  const normalized = normalizeForMatching(raw);
  if (!normalized) return false;
  if (kind === "DATE") {
    if (extractAllPrintedDates(raw).length === 0) return false;
    const residue = normalized
      .replace(/\b\d{1,4}\b/gu, " ")
      .replace(
        /\b(?:de|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gu,
        " ",
      )
      .replace(/\b(?:a|al|del|desde|dia|el|entre|hasta|y)\b/gu, " ")
      .replace(/[^a-z]+/gu, "");
    return residue.length > 0;
  }
  if (kind === "MONEY") {
    if (extractPrintedEurCents(raw) === null) return false;
    const residue = normalized
      .replace(/\b\d[\d.,]*\b/gu, " ")
      .replace(/\b(?:eur|euro|euros)\b/gu, " ")
      .replace(/[^a-z]+/gu, "");
    return residue.length > 0;
  }
  if (kind === "REFERENCE") {
    const reference = extractPrintedReference(raw);
    if (!reference) return false;
    const normalizedReference = normalizeForMatching(reference);
    const residue = normalized
      .replace(normalizedReference, " ")
      .replace(/[^a-z]+/gu, "");
    return residue.length > 0;
  }
  return false;
}

function layoutValuesBelow(input: {
  readonly page: BoundedDocumentInput["pages"][number];
  readonly rowIndex: number;
  readonly labelX: number;
  readonly labelWidth: number;
  readonly label: ProfileFieldLabelV2;
  readonly knownLabels: ReadonlyMap<
    string,
    readonly ProfileFieldLabelV2[]
  >;
}): readonly string[] {
  const rows = input.page.layoutRows ?? Object.freeze([]);
  const header = rows[input.rowIndex];
  if (!header) return Object.freeze([]);
  const values: string[] = [];
  const defaultMaxX =
    input.labelX + Math.max(input.labelWidth + 180_000, 220_000);
  const minX = input.labelX - 20_000;
  const maxX = defaultMaxX;
  for (let index = input.rowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]!;
    const verticalDistance = header.yMilli - row.yMilli;
    if (verticalDistance <= 0) continue;
    if (verticalDistance > 100_000) break;
    const windowCells = row.cells.filter(
      (cell) =>
        cell.xMilli + cell.widthMilli >= minX && cell.xMilli <= maxX,
    );
    const maxAnchorDistance = Math.max(input.labelWidth + 40_000, 80_000);
    const columnCells = windowCells.filter(
      (cell) => Math.abs(cell.xMilli - input.labelX) <= maxAnchorDistance,
    );
    const anchorCell = columnCells.reduce<(typeof columnCells)[number] | null>(
      (nearest, cell) =>
        nearest === null ||
        Math.abs(cell.xMilli - input.labelX) <
          Math.abs(nearest.xMilli - input.labelX)
          ? cell
          : nearest,
      null,
    );
    const relevantCells = anchorCell === null
      ? Object.freeze([])
      : windowCells.filter(
          (cell) =>
            cell.xMilli >= anchorCell.xMilli - 20_000 &&
            cell.xMilli <=
              anchorCell.xMilli + Math.max(input.labelWidth + 40_000, 80_000),
        );
    if (
      relevantCells.some(
        (cell) =>
          allClosedLayoutLabels(cell.text, input.knownLabels).length > 0 ||
          hasInlineScalarLabel(cell.text, input.label.kind),
      )
    ) {
      break;
    }
    for (const cell of relevantCells) {
      const printed = safePrintedValue(cell.text.trim());
      if (!printed) continue;
      if (
        input.label.kind === "MONEY" &&
        extractPrintedEurCents(printed) !== null
      ) {
        values.push(printed);
      } else if (
        input.label.kind === "DATE" &&
        extractAllPrintedDates(printed).length > 0
      ) {
        values.push(printed);
      } else if (
        input.label.kind === "REFERENCE" &&
        extractPrintedReference(printed) !== null
      ) {
        values.push(printed);
      }
      if (values.length >= 32) return Object.freeze(values);
    }
  }
  return Object.freeze(values);
}

async function extractFieldCandidates(
  document: BoundedDocumentInput,
  index: PrivateTextIndexV2,
  contract: ProfileFieldContractV2,
  selectedRule: FamilyRecognitionRuleV2,
): Promise<readonly ProfileFieldCandidateV2[]> {
  const labels = activeLabels(contract);
  const byLabel = labelsByNormalizedText(labels);
  const layoutBoundaries = labelsByNormalizedText(PROFILE_FIELD_LABELS_V2);
  const candidates: ProfileFieldCandidateV2[] = [];
  const seen = new Set<string>();
  const roleOrdinals = new Map<string, number>();
  const selectedTitleLiterals = Object.freeze(
    [...new Set(
      selectedRule.titleAnchors.flatMap((anchor) =>
        anchor.literals.map(normalizeForMatching),
      ),
    )],
  );
  const append = (candidate: ProfileFieldCandidateV2, key: string): void => {
    if (seen.has(key)) return;
    if (candidates.length >= PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxCandidateFields) {
      invalidLimit("COLLECTION_LIMIT_EXCEEDED", "fieldCandidates");
    }
    seen.add(key);
    candidates.push(freezeCandidate(candidate));
  };

  for (let lineIndex = 0; lineIndex < index.lines.length; lineIndex += 1) {
    assertNotAborted(document.signal);
    const line = index.lines[lineIndex];
    if (
      line.isHeader &&
      selectedTitleLiterals.some(
        (literal) =>
          line.normalized === literal ||
          line.normalized.startsWith(`${literal} `),
      )
    ) {
      continue;
    }
    const closed = matchClosedFieldLabel(line, byLabel);
    if (!closed) continue;
    for (const label of closed.labels) {
      assertNotAborted(document.signal);
      const candidateIndex = candidates.length + 1;
      const candidateEvidence = evidence(candidateIndex, line.pageNumber);
      if (label.kind === "FACT") {
        append(
          {
            candidateId: `profile-candidate-${candidateIndex}`,
            candidateStatus: "EXACT",
            evidence: candidateEvidence,
            kind: "FACT",
            fieldCode: label.fieldCode,
            observed: true,
          },
          `FACT:${label.fieldCode}`,
        );
        continue;
      }
      if (label.kind === "PARTICIPANT_ROLE") {
        const ordinal = (roleOrdinals.get(label.fieldCode) ?? 0) + 1;
        roleOrdinals.set(label.fieldCode, ordinal);
        append(
          {
            candidateId: `profile-candidate-${candidateIndex}`,
            candidateStatus: "EXACT",
            evidence: candidateEvidence,
            kind: "PARTICIPANT_ROLE",
            fieldCode: label.fieldCode,
            ordinal,
          },
          `PARTICIPANT_ROLE:${label.fieldCode}:${ordinal}`,
        );
        continue;
      }
      const printedValue = safePrintedValue(
        closed.inlineValue ??
          nextClosedValue(
            index.lines,
            lineIndex,
            line.pageNumber,
            layoutBoundaries,
          ),
      );
      if (!printedValue) continue;
      if (label.kind === "DATE") {
        const valueIso = extractPrintedDateForField(
          printedValue,
          label.fieldCode,
        );
        if (!valueIso) continue;
        append(
          {
            candidateId: `profile-candidate-${candidateIndex}`,
            candidateStatus: "EXACT",
            evidence: candidateEvidence,
            kind: "DATE",
            fieldCode: label.fieldCode,
            valueIso,
          },
          `DATE:${label.fieldCode}:${valueIso}`,
        );
        continue;
      }
      if (label.kind === "MONEY") {
        const amountCents =
          closed.inlineValue === null && lineUsesSingleWordLabel(line, label)
            ? parsePrintedEurCents(printedValue)
            : extractPrintedEurCents(printedValue);
        if (amountCents === null) continue;
        append(
          {
            candidateId: `profile-candidate-${candidateIndex}`,
            candidateStatus: "EXACT",
            evidence: candidateEvidence,
            kind: "MONEY",
            fieldCode: label.fieldCode,
            amountCents,
            currency: "EUR",
          },
          `MONEY:${label.fieldCode}:${amountCents}`,
        );
        continue;
      }
      if (label.privacy === "SENSITIVE_FINGERPRINT") {
        const protectedPrintedValue = extractPrintedReference(printedValue);
        if (!protectedPrintedValue) continue;
        const sensitiveReference = await createSensitiveReferenceV2({
          ownerScope: document.ownerScope,
          issuerCode: "AEAT",
          referenceType: label.fieldCode as "CSV" | "NRC" | "BANK_REFERENCE",
          printedValue: protectedPrintedValue,
        });
        assertNotAborted(document.signal);
        if (!sensitiveReference) continue;
        append(
          {
            candidateId: `profile-candidate-${candidateIndex}`,
            candidateStatus: "EXACT",
            evidence: candidateEvidence,
            kind: "REFERENCE",
            fieldCode: label.fieldCode,
            normalizedValue: null,
            sensitiveReference,
          },
          `REFERENCE:${label.fieldCode}:${sensitiveReference.fingerprintSha256}`,
        );
        continue;
      }
      const normalizedValue = normalizeReferenceValue(
        extractPrintedReference(printedValue) ?? printedValue,
        label.fieldCode,
      );
      if (!normalizedValue) continue;
      append(
        {
          candidateId: `profile-candidate-${candidateIndex}`,
          candidateStatus: "EXACT",
          evidence: candidateEvidence,
          kind: "REFERENCE",
          fieldCode: label.fieldCode,
          normalizedValue,
          sensitiveReference: null,
        },
        `REFERENCE:${label.fieldCode}:${normalizedValue}`,
      );
    }
  }

  for (const page of document.pages) {
    const rows = page.layoutRows ?? Object.freeze([]);
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      assertNotAborted(document.signal);
      const row = rows[rowIndex]!;
      for (const cell of row.cells) {
        const cellNormalized = normalizeForMatching(cell.text);
        if (
          selectedTitleLiterals.some(
            (literal) =>
              cellNormalized === literal ||
              cellNormalized.startsWith(`${literal} `),
          )
        ) {
          continue;
        }
        const layoutLabels = allClosedLayoutLabels(cell.text, byLabel);
        for (const label of layoutLabels) {
          if (label.kind === "FACT" || label.kind === "PARTICIPANT_ROLE") {
            continue;
          }
          const printedValues = layoutValuesBelow({
            page,
            rowIndex,
            labelX: cell.xMilli,
            labelWidth: cell.widthMilli,
            label,
            knownLabels: layoutBoundaries,
          });
          for (const printedValue of printedValues) {
            assertNotAborted(document.signal);
            const candidateIndex = candidates.length + 1;
            const candidateEvidence = evidence(candidateIndex, page.pageNumber);
            if (label.kind === "DATE") {
              const dates = extractAllPrintedDatesForField(
                printedValue,
                label.fieldCode,
              );
              const selectedDates =
                label.fieldCode === "INTEREST_START_DATE"
                  ? dates.slice(0, 1)
                  : label.fieldCode === "INTEREST_END_DATE"
                    ? dates.slice(-1)
                    : dates;
              for (const valueIso of selectedDates) {
                append(
                  {
                    candidateId: `profile-candidate-${candidateIndex}`,
                    candidateStatus: "EXACT",
                    evidence: candidateEvidence,
                    kind: "DATE",
                    fieldCode: label.fieldCode,
                    valueIso,
                  },
                  `DATE:${label.fieldCode}:${valueIso}`,
                );
              }
              continue;
            }
            if (label.kind === "MONEY") {
              const amountCents = extractPrintedEurCents(printedValue);
              if (amountCents === null) continue;
              append(
                {
                  candidateId: `profile-candidate-${candidateIndex}`,
                  candidateStatus: "EXACT",
                  evidence: candidateEvidence,
                  kind: "MONEY",
                  fieldCode: label.fieldCode,
                  amountCents,
                  currency: "EUR",
                },
                `MONEY:${label.fieldCode}:${amountCents}`,
              );
              continue;
            }
            if (label.privacy === "SENSITIVE_FINGERPRINT") {
              const protectedPrintedValue = extractPrintedReference(printedValue);
              if (!protectedPrintedValue) continue;
              const sensitiveReference = await createSensitiveReferenceV2({
                ownerScope: document.ownerScope,
                issuerCode: "AEAT",
                referenceType: label.fieldCode as "CSV" | "NRC" | "BANK_REFERENCE",
                printedValue: protectedPrintedValue,
              });
              if (!sensitiveReference) continue;
              append(
                {
                  candidateId: `profile-candidate-${candidateIndex}`,
                  candidateStatus: "EXACT",
                  evidence: candidateEvidence,
                  kind: "REFERENCE",
                  fieldCode: label.fieldCode,
                  normalizedValue: null,
                  sensitiveReference,
                },
                `REFERENCE:${label.fieldCode}:${sensitiveReference.fingerprintSha256}`,
              );
              continue;
            }
            const normalizedValue = normalizeReferenceValue(
              extractPrintedReference(printedValue) ?? printedValue,
              label.fieldCode,
            );
            if (!normalizedValue) continue;
            append(
              {
                candidateId: `profile-candidate-${candidateIndex}`,
                candidateStatus: "EXACT",
                evidence: candidateEvidence,
                kind: "REFERENCE",
                fieldCode: label.fieldCode,
                normalizedValue,
                sensitiveReference: null,
              },
              `REFERENCE:${label.fieldCode}:${normalizedValue}`,
            );
          }
        }
      }
    }
  }
  return Object.freeze(candidates);
}

function buildOutcome(input: {
  readonly status: ProfileDrivenExtractorStatusV2;
  readonly familyId?: FiscalNotificationDocumentFamilyIdV3 | null;
  readonly ruleId?: FamilyRecognitionRuleV2["ruleId"] | null;
  readonly authorityId?: FamilyRuleAuthorityIdV2 | null;
  readonly familyCandidates?: readonly ProfileDrivenFamilyCandidateV2[];
  readonly fieldCandidates?: readonly ProfileFieldCandidateV2[];
  readonly printedEffects?: readonly ProfileDrivenPrintedEffectV2[];
  readonly adaptedFields?: ProfileDrivenAdaptedFieldsV2 | null;
  readonly issues?: readonly ProfileDrivenExtractorIssueV2[];
}): ProfileDrivenExtractorOutcomeV2 {
  return Object.freeze({
    schemaVersion: PROFILE_DRIVEN_EXTRACTOR_SCHEMA_VERSION_V2,
    extractorVersion: PROFILE_DRIVEN_EXTRACTOR_VERSION_V2,
    implementationId: PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2,
    status: input.status,
    familyId: input.familyId ?? null,
    ruleId: input.ruleId ?? null,
    authorityId: input.authorityId ?? null,
    familyCandidates: Object.freeze([...(input.familyCandidates ?? [])]),
    fieldCandidates: Object.freeze([...(input.fieldCandidates ?? [])]),
    printedEffects: Object.freeze([...(input.printedEffects ?? [])]),
    adaptedFields: input.adaptedFields ?? null,
    issues: Object.freeze([...(input.issues ?? [])]),
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED" as const,
    confirmsFamily: false as const,
    confirmsObligation: false as const,
    confirmsDebt: false as const,
    confirmsPayment: false as const,
    confirmsDeadline: false as const,
    confirmsSeizure: false as const,
    permitsAccountingAction: false as const,
  });
}

/**
 * Deterministic, local and review-only recognition for the 87 source-controlled
 * AEAT profiles. Document strings are used ephemerally and never returned.
 */
export async function extractProfileDrivenFamilyV2(
  input: ExtractProfileDrivenFamilyInputV2,
): Promise<ProfileDrivenExtractorOutcomeV2> {
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const rules = snapshotRules(input.rules);
  const index = indexDocument(input.document);
  const titleMatches: PrivateRuleEvaluationV2[] = [];
  for (const rule of rules) {
    assertNotAborted(input.document.signal);
    const evaluation = evaluateRule(index, rule, input.document.signal);
    if (evaluation) titleMatches.push(evaluation);
  }
  if (titleMatches.length === 0) {
    return buildOutcome({ status: "UNKNOWN", issues: ["TITLE_NOT_EXACT"] });
  }
  const hasExactTitle = titleMatches.some(
    ({ candidate }) => candidate.titleMatch === "EXACT_LINE",
  );
  const strongestTitleMatches = hasExactTitle
    ? titleMatches.filter(({ candidate }) => candidate.titleMatch === "EXACT_LINE")
    : titleMatches;
  const familyCandidates = Object.freeze(
    strongestTitleMatches.map(({ candidate }) => candidate),
  );
  if (strongestTitleMatches.some(({ candidate }) => candidate.conflictingIds.length > 0)) {
    return buildOutcome({
      status: "BLOCKED",
      familyCandidates,
      issues: ["CONFLICTING_AUTHORITY_OR_GUIDE"],
    });
  }
  const complete = strongestTitleMatches.filter(({ complete: value }) => value);
  if (complete.length > 1) {
    return buildOutcome({
      status: "AMBIGUOUS",
      familyCandidates,
      issues: ["MULTIPLE_EXACT_FAMILY_RULES"],
    });
  }
  if (complete.length === 0) {
    const issues: ProfileDrivenExtractorIssueV2[] = [];
    if (strongestTitleMatches.every(({ candidate }) => candidate.compatibleAuthorityIds.length === 0)) {
      issues.push("AUTHORITY_NOT_COMPATIBLE");
    }
    if (strongestTitleMatches.some(({ candidate }) => candidate.missingRequiredAnchorIds.length > 0)) {
      issues.push("REQUIRED_ANCHORS_MISSING");
    }
    return buildOutcome({ status: "UNKNOWN", familyCandidates, issues });
  }
  const selected = complete[0];
  const adapter = resolveProfileFieldAdapterV2(selected.rule.familyId);
  if (!adapter) {
    return buildOutcome({
      status: "BLOCKED",
      familyCandidates,
      issues: ["FIELD_ADAPTER_NOT_REGISTERED"],
    });
  }
  const fieldCandidates = await extractFieldCandidates(
    input.document,
    index,
    adapter.fieldContract,
    selected.rule,
  );
  assertNotAborted(input.document.signal);
  const printedEffects = detectClosedPrintedEffectsV2(
    index,
    selected.rule.familyId as FiscalNotificationDocumentFamilyIdV2,
    input.document.signal,
  );
  const adaptedFieldOutcome = adapter.adapt({
    ownerScope: input.document.ownerScope,
    documentId: input.document.documentId,
    selection: {
      selectionStatus: "SELECTED",
      familyId: selected.rule.familyId,
      basis: "SYSTEM_EXACT",
    },
    candidates: fieldCandidates,
  });
  const adaptedFields: ProfileDrivenAdaptedFieldsV2 = Object.freeze({
    ...adaptedFieldOutcome,
    printedEffects,
  });
  return buildOutcome({
    status: "REVIEW_REQUIRED",
    familyId: selected.rule.familyId,
    ruleId: selected.rule.ruleId,
    authorityId: selected.candidate.compatibleAuthorityIds[0] ?? null,
    familyCandidates,
    fieldCandidates,
    printedEffects,
    adaptedFields,
  });
}
