import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import { createSensitiveReferenceV2Sync } from "../sensitive-reference.v2";
import {
  AEAT_P0_DEEP_PROFILES_V10,
  type AeatP0CanonicalFieldV10,
  type AeatP0DeepProfileIdV10,
  type AeatP0ProfileV10,
} from "../knowledge/p0-deep-contracts.v10";
import type { BaseExtractorIdV1 } from "./extractor-contract.v1";

export const AEAT_P0_DEEP_EXTRACTOR_VERSION_V10 = "10.0.0" as const;
export const AEAT_P0_DEEP_EXTRACTOR_LIMITS_V10 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxFields: 256,
  maxValueChars: 500,
  maxHeaderLinesPerPage: 40,
} as const);

export type AeatP0ExtractedFieldKindV10 =
  | "REFERENCE" | "SENSITIVE_REFERENCE" | "DATE" | "MONEY"
  | "TIME" | "DURATION" | "INTEGER" | "BOOLEAN"
  | "NORMALIZED_STATE" | "NORMALIZED_ENUM" | "STRUCTURED_PRESENCE";

export interface AeatP0ExtractedFieldV10 {
  readonly fieldId: string;
  readonly fieldCode: string;
  readonly kind: AeatP0ExtractedFieldKindV10;
  readonly assertionLayer: "PRINTED" | "NORMALIZED";
  readonly displayValue: string;
  readonly normalizedValue: string | null;
  readonly amountCents: number | null;
  readonly currency: "EUR" | null;
  readonly fingerprintSha256: string | null;
  readonly sourcePageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly reviewStatus: "REVIEW_REQUIRED";
  readonly persistencePolicy: "PERSIST_STRUCTURED" | "FINGERPRINT_ONLY" | "DO_NOT_PERSIST_RAW_TEXT";
}

export interface AeatP0DeepExtractorOutcomeV10 {
  readonly schemaVersion: 10;
  readonly extractorVersion: typeof AEAT_P0_DEEP_EXTRACTOR_VERSION_V10;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN" | "AMBIGUOUS" | "BLOCKED";
  readonly familyId: AeatP0DeepProfileIdV10 | null;
  readonly title: string | null;
  readonly extractorId: BaseExtractorIdV1 | null;
  readonly matchedStrongSetIndexes: readonly number[];
  readonly matchedPageNumbers: readonly number[];
  readonly fields: readonly AeatP0ExtractedFieldV10[];
  readonly missingRequiredFieldIds: readonly string[];
  readonly issues: readonly string[];
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly confirmsFamily: false;
  readonly confirmsObligation: false;
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsDeadline: false;
  readonly permitsAccountingAction: false;
}

interface IndexedLine {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
  readonly header: boolean;
}

interface ProfileCandidate {
  readonly profile: AeatP0ProfileV10;
  readonly strongSetIndexes: readonly number[];
  readonly pageNumbers: readonly number[];
  readonly exactTitle: boolean;
}

const AEAT_AUTHORITY = Object.freeze([
  "agencia tributaria",
  "agencia estatal de administracion tributaria",
  "sede agenciatributaria gob es",
]);
const CONFLICTING_AUTHORITY = Object.freeze([
  "tesoreria general de la seguridad social",
  "agencia tributaria canaria",
  "hacienda foral",
  "diputacion foral",
  "hacienda tributaria de navarra",
]);
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
const PERSONAL_TAX_ID = /(?:^|[^A-Z0-9])(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])(?=$|[^A-Z0-9])/iu;
const IBAN = /(?:^|[^A-Z0-9])ES(?:[\s._-]?\d){22}(?=$|[^A-Z0-9])/iu;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const PHONE = /(?:^|\D)(?:\+?34[\s._-]?)?[6789](?:[\s._-]?\d){8}(?:$|\D)/u;
const SAFE_REFERENCE = /^[A-Z0-9][A-Z0-9./:_-]{0,199}$/u;

const EXTRACTOR_BY_PHASE: Readonly<Record<string, BaseExtractorIdV1>> = Object.freeze({
  EVIDENCE: "informative-communication",
  REQUEST: "requirement",
  DECISION: "requirement",
  REQUIREMENT: "requirement",
  PROPOSAL: "assessment",
  FINAL_DECISION: "assessment",
  SELF_ASSESSMENT_FILING: "payment-evidence",
  EXECUTION: "appeal-and-review",
  CERTIFICATE: "identity-and-certificate",
  CORRECTION: "identity-and-certificate",
});

function normalize(value: string): string {
  try {
    return value.normalize("NFKD").replace(/\p{M}+/gu, "")
      .toLocaleLowerCase("es-ES").replace(/[^a-z0-9@]+/gu, " ")
      .replace(/\s+/gu, " ").trim();
  } catch {
    return "";
  }
}

function indexDocument(document: BoundedDocumentInput): readonly IndexedLine[] {
  const output: IndexedLine[] = [];
  for (const page of document.pages) {
    assertNotAborted(document.signal);
    const lines = page.text.split(/\r\n|\n|\r/u);
    if (lines.length + output.length > AEAT_P0_DEEP_EXTRACTOR_LIMITS_V10.maxLines) {
      throw new Error("AEAT_P0_DEEP_V10_LINE_LIMIT");
    }
    lines.forEach((raw, index) => {
      if (raw.length > AEAT_P0_DEEP_EXTRACTOR_LIMITS_V10.maxLineChars) {
        throw new Error("AEAT_P0_DEEP_V10_LINE_LIMIT");
      }
      const normalized = normalize(raw);
      if (!normalized) return;
      output.push(Object.freeze({
        pageNumber: page.pageNumber,
        raw: raw.trim(),
        normalized,
        header: index < AEAT_P0_DEEP_EXTRACTOR_LIMITS_V10.maxHeaderLinesPerPage,
      }));
    });
  }
  return Object.freeze(output);
}

function containsTokens(line: string, literal: string): boolean {
  const expected = normalize(literal);
  return expected.length > 0 && (` ${line} `).includes(` ${expected} `);
}

function candidate(profile: AeatP0ProfileV10, lines: readonly IndexedLine[]): ProfileCandidate | null {
  const normalizedTitle = normalize(profile.titleEs);
  const exactTitleLines = lines.filter((line) =>
    line.header && (line.normalized === normalizedTitle || line.normalized.startsWith(`${normalizedTitle} `)),
  );
  const strongSetIndexes: number[] = [];
  const pages = new Set<number>(exactTitleLines.map((line) => line.pageNumber));
  profile.recognition.strongAnchorSets.forEach((set, index) => {
    const matches = set.map((anchor) => lines.filter((line) => containsTokens(line.normalized, anchor)));
    if (matches.every((group) => group.length > 0)) {
      strongSetIndexes.push(index);
      matches.flat().forEach((line) => pages.add(line.pageNumber));
    }
  });
  if (strongSetIndexes.length < profile.recognition.minimumStrongSetsRequired) return null;
  const incompatibleHeader = lines.some((line) =>
    line.header && profile.recognition.incompatibleAnchors.some((anchor) => containsTokens(line.normalized, anchor)),
  );
  if (incompatibleHeader && exactTitleLines.length === 0) return null;
  return Object.freeze({
    profile,
    strongSetIndexes: Object.freeze(strongSetIndexes),
    pageNumbers: Object.freeze([...pages].sort((left, right) => left - right)),
    exactTitle: exactTitleLines.length > 0,
  });
}

function safeValue(value: string | null): string | null {
  if (
    value === null || value.length === 0 ||
    value.length > AEAT_P0_DEEP_EXTRACTOR_LIMITS_V10.maxValueChars ||
    CONTROL.test(value) || PERSONAL_TAX_ID.test(value) || IBAN.test(value) ||
    EMAIL.test(value) || PHONE.test(value)
  ) return null;
  return value.trim();
}

function valueForLabel(lines: readonly IndexedLine[], lineIndex: number, label: string): string | null {
  const line = lines[lineIndex]!;
  const rawNormalized = normalize(line.raw);
  const labelNormalized = normalize(label);
  const exactLabelLine = rawNormalized === labelNormalized;
  const startsWithLabel = rawNormalized.startsWith(`${labelNormalized} `);
  if (!exactLabelLine && !startsWithLabel) return null;
  const colon = line.raw.indexOf(":");
  if (colon >= 0) {
    const prefix = normalize(line.raw.slice(0, colon));
    if (prefix === labelNormalized) {
      const inline = safeValue(line.raw.slice(colon + 1).trim());
      if (inline) return inline;
    }
  }
  if (startsWithLabel) {
    const rawTokens = line.raw.trim().split(/\s+/u);
    const labelTokenCount = label.trim().split(/\s+/u).length;
    const suffix = safeValue(rawTokens.slice(labelTokenCount).join(" "));
    if (suffix) return suffix;
  }
  const next = lines[lineIndex + 1];
  if (exactLabelLine && next && next.pageNumber === line.pageNumber) return safeValue(next.raw);
  return null;
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

function parseDate(value: string): string | null {
  const match = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/u.exec(value);
  if (match) return isoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  const direct = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/u.exec(value);
  return direct ? isoDate(Number(direct[1]), Number(direct[2]), Number(direct[3])) : null;
}

function parseTime(value: string): string | null {
  const match = /(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?:$|\D)/u.exec(value);
  if (!match) return null;
  return `${match[1]!.padStart(2, "0")}:${match[2]}${match[3] ? `:${match[3]}` : ""}`;
}

function parseDuration(value: string): Readonly<{ displayValue: string; normalizedValue: string }> | null {
  const normalized = normalize(value);
  const match = /(?:^|\s)(\d{1,4})\s*(dia|dias|mes|meses|hora|horas)(?:\s|$)/u.exec(normalized);
  if (!match) return null;
  const count = Number(match[1]);
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  const unit = match[2]!.startsWith("dia")
    ? "D"
    : match[2]!.startsWith("mes")
      ? "M"
      : "H";
  const label = unit === "D" ? (count === 1 ? "día" : "días") : unit === "M" ? (count === 1 ? "mes" : "meses") : (count === 1 ? "hora" : "horas");
  return Object.freeze({
    displayValue: `${count} ${label}`,
    normalizedValue: unit === "H" ? `PT${count}H` : `P${count}${unit}`,
  });
}

function parseCents(value: string): number | null {
  const match = /(?:^|[^\d])((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)\s*(?:EUR|€)(?=$|[^\d])/iu.exec(value);
  if (!match) return null;
  const [units, decimals = ""] = match[1].split(",");
  const cents = Number(units.replaceAll(".", "")) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function normalizeReference(value: string, fieldCode: string): string | null {
  const candidate = value.normalize("NFKC").toUpperCase().replace(/\s+/gu, "").replace(/^[,;]+|[,;]+$/gu, "");
  if (!SAFE_REFERENCE.test(candidate) || PERSONAL_TAX_ID.test(candidate) || IBAN.test(candidate)) return null;
  if (fieldCode === "MODEL" && !/^\d{3}$/u.test(candidate)) return null;
  if (fieldCode === "FISCAL_YEAR" && !/^(?:19|20)\d{2}$/u.test(candidate)) return null;
  if (fieldCode === "TAX_PERIOD" && !/^(?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(candidate)) return null;
  return candidate;
}

function normalizedState(fieldCode: string, value: string): string | null {
  const normalized = normalize(value);
  const rules: Readonly<Record<string, readonly (readonly [string, string])[]>> = Object.freeze({
    SUBMISSION_RESULT: [["rechaz", "REJECTED_OR_INCOMPLETE"], ["incomplet", "REJECTED_OR_INCOMPLETE"], ["registr", "REGISTERED"], ["present", "SUBMITTED"]],
    DECISION_RESULT: [["deneg", "EXPRESS_DENIED"], ["parcial", "EXPRESS_GRANTED_SHORTER_THAN_HALF"], ["conced", "EXPRESS_GRANTED"]],
    PROPOSAL_RESULT: [["deneg", "PROPOSED_DENIAL"], ["parcial", "PROPOSED_PARTIAL_GRANT"], ["estim", "PROPOSED_FULL_GRANT"]],
    FINAL_RESULT: [["archiv", "ARCHIVAL"], ["deneg", "DENIAL"], ["parcial", "PARTIAL_GRANT"], ["estim", "FULL_GRANT"]],
    CERTIFICATE_RESULT: [["no se puede certificar", "CANNOT_CERTIFY"], ["sin datos", "NO_DATA"], ["negativ", "NEGATIVE"], ["positiv", "POSITIVE"]],
    CORRECTION_RESULT: [["no procede", "DENIED"], ["deneg", "DENIED"], ["correg", "CORRECTED"]],
  });
  for (const [needle, state] of rules[fieldCode] ?? []) if (normalized.includes(needle)) return state;
  return null;
}

function normalizedEnum(fieldCode: string, value: string): string | null {
  const normalized = normalize(value);
  const rules: Readonly<Record<string, readonly (readonly [string, string])[]>> = Object.freeze({
    SUBMISSION_CHANNEL: [["sede electronica", "ELECTRONIC_REGISTER"], ["registro electronico", "ELECTRONIC_REGISTER"], ["presencial", "IN_PERSON_REGISTER"], ["correo", "POSTAL_REGISTER"]],
    RESPONSE_CHANNEL: [["sede electronica", "ELECTRONIC_OFFICE"], ["registro electronico", "ELECTRONIC_OFFICE"], ["registro", "OFFICIAL_REGISTER"], ["presencial", "IN_PERSON_REGISTER"]],
    RECTIFICATION_REASON: [["cuota indebidamente repercutida", "TRADITIONAL_WRONGLY_CHARGED_OUTPUT_VAT"], ["capitulo xi", "TRADITIONAL_SPECIAL_REGIME"], ["mayor ingreso", "FILED_HIGHER_AMOUNT"], ["menor ingreso", "FILED_LOWER_AMOUNT"], ["devolucion", "REFUND_REQUESTED"], ["compensacion", "COMPENSATION_UPDATED"], ["sin efecto monetario", "FILED_SAME_AMOUNT"]],
    EXECUTION_SCOPE: [["retrotra", "RETROACT"], ["anular", "ANNUL"], ["recalcular", "RECALCULATE"], ["nueva liquidacion", "NEW_ASSESSMENT"], ["devolver", "REFUND"], ["conservar", "PRESERVE"]],
    CERTIFICATE_KIND: [["situacion censal", "CENSUS_STATUS"], ["contratistas", "CONTRACTORS_AND_SUBCONTRACTORS"], ["irpf", "PERSONAL_INCOME_TAX"], ["tributario", "GENERIC_TAX_CERTIFICATE"]],
    PRESENTER_ROLE: [["representante", "REPRESENTATIVE"], ["colaborador", "SOCIAL_COLLABORATOR"], ["interesado", "INTERESTED_PARTY"]],
  });
  for (const [needle, state] of rules[fieldCode] ?? []) if (normalized.includes(needle)) return state;
  return null;
}

function booleanValue(value: string): boolean | null {
  const normalized = normalize(value);
  if (/^(?:si|verdadero|x|marcada|1)$/u.test(normalized)) return true;
  if (/^(?:no|falso|0)$/u.test(normalized)) return false;
  return null;
}

function extractField(
  document: BoundedDocumentInput,
  lines: readonly IndexedLine[],
  contract: AeatP0CanonicalFieldV10,
  ordinal: number,
): AeatP0ExtractedFieldV10 | null {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    for (const label of contract.labelVariants) {
      const value = valueForLabel(lines, index, label);
      if (value === null) continue;
      const common = {
        fieldId: `p0-v10:${contract.id}:${ordinal}`,
        fieldCode: contract.id,
        sourcePageNumbers: Object.freeze([line.pageNumber]),
        sourceLabel: label,
        reviewStatus: "REVIEW_REQUIRED" as const,
      };
      if (contract.type === "SENSITIVE_REFERENCE") {
        const reference = createSensitiveReferenceV2Sync({
          ownerScope: document.ownerScope,
          issuerCode: "AEAT",
          referenceType: "CSV",
          printedValue: value,
        });
        if (!reference) continue;
        return Object.freeze({ ...common, kind: "SENSITIVE_REFERENCE", assertionLayer: "PRINTED", displayValue: "CSV protegido", normalizedValue: null, amountCents: null, currency: null, fingerprintSha256: reference.fingerprintSha256, persistencePolicy: "FINGERPRINT_ONLY" });
      }
      if (contract.type === "DATE" || contract.type === "DATE_TIME" || contract.type === "DATE_OR_RULE") {
        const parsed = parseDate(value);
        if (parsed) return Object.freeze({ ...common, kind: "DATE", assertionLayer: "PRINTED", displayValue: parsed, normalizedValue: parsed, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
        if (contract.type === "DATE_OR_RULE") {
          const duration = parseDuration(value);
          if (duration) return Object.freeze({ ...common, kind: "DURATION", assertionLayer: "NORMALIZED", ...duration, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
        }
        continue;
      }
      if (contract.type === "TIME") {
        const parsed = parseTime(value);
        if (!parsed) continue;
        return Object.freeze({ ...common, kind: "TIME", assertionLayer: "NORMALIZED", displayValue: parsed, normalizedValue: parsed, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      if (contract.type === "DURATION") {
        const parsed = parseDuration(value);
        if (!parsed) continue;
        return Object.freeze({ ...common, kind: "DURATION", assertionLayer: "NORMALIZED", ...parsed, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      if (contract.type === "MONEY") {
        const amountCents = parseCents(value);
        if (amountCents === null) continue;
        return Object.freeze({ ...common, kind: "MONEY", assertionLayer: "PRINTED", displayValue: `${(amountCents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, normalizedValue: null, amountCents, currency: "EUR", fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      if (["REFERENCE", "MODEL", "YEAR", "PERIOD"].includes(contract.type)) {
        const normalized = normalizeReference(value, contract.id);
        if (!normalized) continue;
        return Object.freeze({ ...common, kind: "REFERENCE", assertionLayer: "PRINTED", displayValue: normalized, normalizedValue: normalized, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      if (contract.type === "INTEGER") {
        const match = /\b\d{1,6}\b/u.exec(value);
        if (!match) continue;
        const integer = Number(match[0]);
        if (!Number.isSafeInteger(integer) || integer < 0) continue;
        return Object.freeze({ ...common, kind: "INTEGER", assertionLayer: "PRINTED", displayValue: String(integer), normalizedValue: String(integer), amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      if (contract.type === "BOOLEAN") {
        const parsed = booleanValue(value);
        if (parsed === null) continue;
        return Object.freeze({ ...common, kind: "BOOLEAN", assertionLayer: "NORMALIZED", displayValue: parsed ? "Sí" : "No", normalizedValue: parsed ? "TRUE" : "FALSE", amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      if (contract.type === "ENUM" || contract.type === "ENUM_LIST") {
        const state = normalizedState(contract.id, value);
        if (state) return Object.freeze({ ...common, kind: "NORMALIZED_STATE", assertionLayer: "NORMALIZED", displayValue: state.replaceAll("_", " ").toLocaleLowerCase("es-ES"), normalizedValue: state, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
        const enumValue = normalizedEnum(contract.id, value);
        if (enumValue) return Object.freeze({ ...common, kind: "NORMALIZED_ENUM", assertionLayer: "NORMALIZED", displayValue: enumValue.replaceAll("_", " ").toLocaleLowerCase("es-ES"), normalizedValue: enumValue, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      if (contract.type === "ROLE") {
        const role = normalizedEnum(contract.id, value);
        if (role) return Object.freeze({ ...common, kind: "NORMALIZED_ENUM", assertionLayer: "NORMALIZED", displayValue: role.replaceAll("_", " ").toLocaleLowerCase("es-ES"), normalizedValue: role, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: "PERSIST_STRUCTURED" });
      }
      return Object.freeze({ ...common, kind: "STRUCTURED_PRESENCE", assertionLayer: contract.assertionType === "NORMALIZED" ? "NORMALIZED" : "PRINTED", displayValue: "Detectado en el documento", normalizedValue: null, amountCents: null, currency: null, fingerprintSha256: null, persistencePolicy: contract.privacy === "ROLE_ONLY" ? "PERSIST_STRUCTURED" : "DO_NOT_PERSIST_RAW_TEXT" });
    }
  }
  return null;
}

function outcome(input: Partial<AeatP0DeepExtractorOutcomeV10> & Pick<AeatP0DeepExtractorOutcomeV10, "status">): AeatP0DeepExtractorOutcomeV10 {
  return Object.freeze({
    schemaVersion: 10,
    extractorVersion: AEAT_P0_DEEP_EXTRACTOR_VERSION_V10,
    status: input.status,
    familyId: input.familyId ?? null,
    title: input.title ?? null,
    extractorId: input.extractorId ?? null,
    matchedStrongSetIndexes: Object.freeze([...(input.matchedStrongSetIndexes ?? [])]),
    matchedPageNumbers: Object.freeze([...(input.matchedPageNumbers ?? [])]),
    fields: Object.freeze([...(input.fields ?? [])]),
    missingRequiredFieldIds: Object.freeze([...(input.missingRequiredFieldIds ?? [])]),
    issues: Object.freeze([...(input.issues ?? [])]),
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    confirmsFamily: false,
    confirmsObligation: false,
    confirmsDebt: false,
    confirmsPayment: false,
    confirmsDeadline: false,
    permitsAccountingAction: false,
  });
}

export function extractAeatP0DeepDocumentV10(document: BoundedDocumentInput): AeatP0DeepExtractorOutcomeV10 {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);
  const lines = indexDocument(document);
  const header = lines.filter((line) => line.header);
  if (header.some((line) => CONFLICTING_AUTHORITY.some((anchor) => containsTokens(line.normalized, anchor)))) {
    return outcome({ status: "BLOCKED", issues: ["CONFLICTING_AUTHORITY"] });
  }
  if (!header.some((line) => AEAT_AUTHORITY.some((anchor) => containsTokens(line.normalized, anchor)))) {
    return outcome({ status: "UNKNOWN", issues: ["AEAT_AUTHORITY_NOT_FOUND"] });
  }
  const candidates = AEAT_P0_DEEP_PROFILES_V10.map((profile) => candidate(profile, lines)).filter((value): value is ProfileCandidate => value !== null);
  if (candidates.length === 0) return outcome({ status: "UNKNOWN", issues: ["P0_STRONG_SIGNATURE_NOT_FOUND"] });
  const exact = candidates.filter((item) => item.exactTitle);
  const selectedPool = exact.length > 0 ? exact : candidates;
  if (selectedPool.length !== 1) return outcome({ status: "AMBIGUOUS", issues: ["MULTIPLE_P0_PROFILES"] });
  const selected = selectedPool[0]!;
  const extractorId = EXTRACTOR_BY_PHASE[selected.profile.procedurePhase];
  if (!extractorId) return outcome({ status: "BLOCKED", issues: ["P0_PHASE_NOT_MAPPED"] });
  const fields: AeatP0ExtractedFieldV10[] = [];
  selected.profile.canonicalFields.forEach((field, index) => {
    const extracted = extractField(document, lines, field, index);
    if (extracted) fields.push(extracted);
  });
  if (fields.length > AEAT_P0_DEEP_EXTRACTOR_LIMITS_V10.maxFields) throw new Error("AEAT_P0_DEEP_V10_FIELD_LIMIT");
  const observed = new Set(fields.map((field) => field.fieldCode));
  const missingRequiredFieldIds = selected.profile.canonicalFields.filter((field) => field.required && !observed.has(field.id)).map((field) => field.id);
  return outcome({
    status: "REVIEW_REQUIRED",
    familyId: selected.profile.profileId,
    title: selected.profile.titleEs,
    extractorId,
    matchedStrongSetIndexes: selected.strongSetIndexes,
    matchedPageNumbers: selected.pageNumbers,
    fields,
    missingRequiredFieldIds,
    issues: missingRequiredFieldIds.length > 0 ? ["INCOMPLETE_REQUIRED_FIELDS"] : [],
  });
}
