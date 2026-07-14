import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "./input-contract";
import type { FiscalNotificationExtractionReason } from "./extraction-contract";

export const AEAT_ENFORCEMENT_PARTY_FACTS_SCHEMA_VERSION_V1 = 1 as const;
export const AEAT_ENFORCEMENT_PARTY_FACTS_ENGINE_ID_V1 =
  "aeat-enforcement-party-facts" as const;
export const AEAT_ENFORCEMENT_PARTY_FACTS_ENGINE_VERSION_V1 = "1.0.0" as const;

export const AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1 = Object.freeze({
  maxLineCharacters: 1_024,
  maxObservedLines: 10_000,
  maxNameCharacters: 160,
  maxTaxIdCharacters: 16,
  maxPageNumbers: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
  maxOccurrences: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
} as const);

export type AeatEnforcementPartyFactsOutcomeV1 =
  | "FACTS_AVAILABLE"
  | "INFORMATION_PENDING"
  | "AMBIGUOUS"
  | "PROCESSING_BLOCKED";

export type AeatEnforcementPartyFactIssueCodeV1 =
  | "FAMILY_GATE_NOT_SATISFIED"
  | "IDENTIFICATION_SECTION_NOT_FOUND"
  | "IDENTIFICATION_FIELDS_INCOMPLETE"
  | "INVALID_PRINTED_NAME"
  | "INVALID_PRINTED_TAX_ID"
  | "MULTIPLE_DISTINCT_SUBJECTS"
  | "SECTION_SCAN_LIMIT_EXCEEDED"
  | "UNSUPPORTED_TEXT_STATE";

export interface AeatEnforcementPartyFactEvidenceV1 {
  readonly pageNumber: number;
  readonly sectionLabel: "IDENTIFICATION_OF_PAYMENT_OBLIGOR";
  readonly nameLabel: "NAME_OR_BUSINESS_NAME";
  readonly taxIdLabel: "NIF";
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
}

export interface AeatEnforcementIdentifiedSubjectFactV1 {
  readonly role: "PAYMENT_OBLIGOR";
  readonly roleSource: "EXPLICIT_SECTION_HEADING";
  readonly printedName: string;
  readonly printedTaxId: string;
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
  readonly evidence: readonly AeatEnforcementPartyFactEvidenceV1[];
  readonly valueDisclosure: "EPHEMERAL_UI_ONLY";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatEnforcementPartyFactIssueV1 {
  readonly code: AeatEnforcementPartyFactIssueCodeV1;
  readonly pageNumbers: readonly number[];
}

export interface AeatEnforcementPartyFactsV1 {
  readonly schemaVersion: 1;
  readonly engineId: "aeat-enforcement-party-facts";
  readonly engineVersion: "1.0.0";
  readonly documentType: "AEAT_ENFORCEMENT_ORDER" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatEnforcementPartyFactsOutcomeV1;
  readonly identifiedSubject: AeatEnforcementIdentifiedSubjectFactV1 | null;
  readonly issues: readonly AeatEnforcementPartyFactIssueV1[];
  readonly semanticPolicy: "EXPLICIT_IDENTIFICATION_SECTION_ONLY";
  readonly roleMeaningPolicy: "PRINTED_ROLE_LABEL_NOT_LEGAL_CONFIRMATION";
  readonly profileMatchPolicy: "NOT_EVALUATED";
  readonly valueDisclosure: "EPHEMERAL_UI_ONLY";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly networkPolicy: "NO_NETWORK";
  readonly legalRuleStatus: "NOT_APPLIED";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

interface SubjectObservation {
  readonly printedName: string;
  readonly printedTaxId: string;
  readonly pageNumber: number;
}

type ScanResult =
  | {
      readonly state: "FACTS";
      readonly observations: readonly SubjectObservation[];
    }
  | {
      readonly state: "PENDING" | "AMBIGUOUS" | "BLOCKED";
      readonly issue: AeatEnforcementPartyFactIssueV1;
    };

const ROOT_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "status",
  "outcome",
  "identifiedSubject",
  "issues",
  "semanticPolicy",
  "roleMeaningPolicy",
  "profileMatchPolicy",
  "valueDisclosure",
  "persistencePolicy",
  "networkPolicy",
  "legalRuleStatus",
  "retainedSourceContent",
  "requiresHumanReview",
  "materializationPolicy",
]);
const SUBJECT_KEYS = new Set([
  "role",
  "roleSource",
  "printedName",
  "printedTaxId",
  "occurrenceCount",
  "pageNumbers",
  "evidence",
  "valueDisclosure",
  "reviewStatus",
]);
const EVIDENCE_KEYS = new Set([
  "pageNumber",
  "sectionLabel",
  "nameLabel",
  "taxIdLabel",
  "extractionMethod",
  "assertionType",
]);
const ISSUE_KEYS = new Set(["code", "pageNumbers"]);
const OUTCOMES = new Set<AeatEnforcementPartyFactsOutcomeV1>([
  "FACTS_AVAILABLE",
  "INFORMATION_PENDING",
  "AMBIGUOUS",
  "PROCESSING_BLOCKED",
]);
const ISSUE_CODES = new Set<AeatEnforcementPartyFactIssueCodeV1>([
  "FAMILY_GATE_NOT_SATISFIED",
  "IDENTIFICATION_SECTION_NOT_FOUND",
  "IDENTIFICATION_FIELDS_INCOMPLETE",
  "INVALID_PRINTED_NAME",
  "INVALID_PRINTED_TAX_ID",
  "MULTIPLE_DISTINCT_SUBJECTS",
  "SECTION_SCAN_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);
const BLOCKING_ISSUES = new Set<AeatEnforcementPartyFactIssueCodeV1>([
  "INVALID_PRINTED_NAME",
  "INVALID_PRINTED_TAX_ID",
  "SECTION_SCAN_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);
const LINE_SEPARATOR = /\r\n|[\n\r\u2028\u2029]/u;
const SECTION_HEADING = "IDENTIFICACION DEL OBLIGADO AL PAGO";
const NAME_LABEL =
  /^\s*NOMBRE\s*(?:\/|Y|O)\s*RAZ[OÓ]N\s+SOCIAL\s*:\s*(.*?)\s*$/iu;
const TAX_ID_LABEL = /^\s*N\.?\s*I\.?\s*F\.?\s*:\s*(.*?)\s*$/iu;
const PRINTED_NAME = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,'’&()\/-]*$/u;
const PRINTED_TAX_ID = /^(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])$/iu;

export class AeatEnforcementPartyFactsV1Error extends Error {
  constructor() {
    super("INVALID_AEAT_ENFORCEMENT_PARTY_FACTS_V1");
    this.name = "AeatEnforcementPartyFactsV1Error";
  }
}

export function extractAeatEnforcementPartyFactsV1(
  value: unknown,
): AeatEnforcementPartyFactsV1 {
  assertBoundedDocumentInput(value);
  const input = value as BoundedDocumentInput;
  const family = extractFiscalNotificationCandidates(input);
  const candidate = family.candidates[0];
  if (
    family.reason !== "SUPPORTED_FAMILY_CANDIDATE" ||
    family.candidates.length !== 1 ||
    candidate?.familyId !== "AEAT_ENFORCEMENT_ORDER_CANDIDATE" ||
    candidate.signalStatus !== "COMPLETE_REQUIRED_ANCHORS" ||
    candidate.conflictingAnchorIds.length !== 0
  ) {
    const blocked = isBlockedFamilyReason(family.reason);
    return freezeResult({
      documentType: null,
      status: blocked ? "REVIEW_REQUIRED" : "INFORMATION_PENDING",
      outcome: blocked ? "PROCESSING_BLOCKED" : "INFORMATION_PENDING",
      identifiedSubject: null,
      issues: [
        freezeIssue({
          code: blocked
            ? "UNSUPPORTED_TEXT_STATE"
            : "FAMILY_GATE_NOT_SATISFIED",
          pageNumbers: [],
        }),
      ],
    });
  }

  const scan = scanIdentificationSections(input);
  if (scan.state !== "FACTS") {
    return freezeResult({
      status: scan.state === "PENDING" ? "INFORMATION_PENDING" : "REVIEW_REQUIRED",
      outcome:
        scan.state === "PENDING"
          ? "INFORMATION_PENDING"
          : scan.state === "AMBIGUOUS"
            ? "AMBIGUOUS"
            : "PROCESSING_BLOCKED",
      identifiedSubject: null,
      issues: [scan.issue],
    });
  }

  const first = scan.observations[0];
  if (!first) throw new AeatEnforcementPartyFactsV1Error();
  const pageNumbers = [...new Set(scan.observations.map((item) => item.pageNumber))].sort(
    (left, right) => left - right,
  );
  const evidence = pageNumbers.map((pageNumber) =>
    Object.freeze({
      pageNumber,
      sectionLabel: "IDENTIFICATION_OF_PAYMENT_OBLIGOR" as const,
      nameLabel: "NAME_OR_BUSINESS_NAME" as const,
      taxIdLabel: "NIF" as const,
      extractionMethod: "RULE" as const,
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
    }),
  );
  return freezeResult({
    status: "REVIEW_REQUIRED",
    outcome: "FACTS_AVAILABLE",
    identifiedSubject: Object.freeze({
      role: "PAYMENT_OBLIGOR" as const,
      roleSource: "EXPLICIT_SECTION_HEADING" as const,
      printedName: first.printedName,
      printedTaxId: first.printedTaxId,
      occurrenceCount: scan.observations.length,
      pageNumbers: Object.freeze(pageNumbers),
      evidence: Object.freeze(evidence),
      valueDisclosure: "EPHEMERAL_UI_ONLY" as const,
      reviewStatus: "REVIEW_REQUIRED" as const,
    }),
    issues: [],
  });
}

export function parseAeatEnforcementPartyFactsV1(
  value: unknown,
  maxPageNumber: number = FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
): AeatEnforcementPartyFactsV1 {
  try {
    if (
      !Number.isSafeInteger(maxPageNumber) ||
      maxPageNumber < 1 ||
      maxPageNumber > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
    ) {
      throw new AeatEnforcementPartyFactsV1Error();
    }
    const root = snapshotRecord(value, ROOT_KEYS);
    if (
      root.schemaVersion !== 1 ||
      root.engineId !== "aeat-enforcement-party-facts" ||
      root.engineVersion !== "1.0.0" ||
      (root.documentType !== "AEAT_ENFORCEMENT_ORDER" && root.documentType !== null) ||
      (root.status !== "REVIEW_REQUIRED" && root.status !== "INFORMATION_PENDING") ||
      !OUTCOMES.has(root.outcome as AeatEnforcementPartyFactsOutcomeV1) ||
      root.semanticPolicy !== "EXPLICIT_IDENTIFICATION_SECTION_ONLY" ||
      root.roleMeaningPolicy !== "PRINTED_ROLE_LABEL_NOT_LEGAL_CONFIRMATION" ||
      root.profileMatchPolicy !== "NOT_EVALUATED" ||
      root.valueDisclosure !== "EPHEMERAL_UI_ONLY" ||
      root.persistencePolicy !== "DO_NOT_PERSIST" ||
      root.networkPolicy !== "NO_NETWORK" ||
      root.legalRuleStatus !== "NOT_APPLIED" ||
      root.retainedSourceContent !== "NONE" ||
      root.requiresHumanReview !== true ||
      root.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
    ) {
      throw new AeatEnforcementPartyFactsV1Error();
    }

    const identifiedSubject =
      root.identifiedSubject === null
        ? null
        : parseIdentifiedSubject(root.identifiedSubject, maxPageNumber);
    const issues = snapshotArray(root.issues, 1).map((item) =>
      parseIssue(item, maxPageNumber),
    );
    const documentType = root.documentType as AeatEnforcementPartyFactsV1["documentType"];
    const status = root.status as AeatEnforcementPartyFactsV1["status"];
    const outcome = root.outcome as AeatEnforcementPartyFactsOutcomeV1;
    assertResultSemantics(documentType, status, outcome, identifiedSubject, issues);
    return freezeResult({
      documentType,
      status,
      outcome,
      identifiedSubject,
      issues,
    });
  } catch (error) {
    if (error instanceof AeatEnforcementPartyFactsV1Error) throw error;
    throw new AeatEnforcementPartyFactsV1Error();
  }
}

function scanIdentificationSections(input: BoundedDocumentInput): ScanResult {
  const observations: SubjectObservation[] = [];
  const pagesWithIncompleteSections = new Set<number>();
  let observedLines = 0;
  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const lines = page.text.split(LINE_SEPARATOR);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      assertNotAborted(input.signal);
      observedLines += 1;
      if (observedLines > AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxObservedLines) {
        return blockedIssue("SECTION_SCAN_LIMIT_EXCEEDED", [page.pageNumber]);
      }
      const heading = lines[lineIndex] ?? "";
      if (!isBoundedLine(heading)) {
        return blockedIssue("SECTION_SCAN_LIMIT_EXCEEDED", [page.pageNumber]);
      }
      if (normalizeLabel(heading) !== SECTION_HEADING) continue;

      const nameLine = lines[lineIndex + 1];
      const taxIdLine = lines[lineIndex + 2];
      if (
        typeof nameLine !== "string" ||
        typeof taxIdLine !== "string" ||
        !isBoundedLine(nameLine) ||
        !isBoundedLine(taxIdLine)
      ) {
        pagesWithIncompleteSections.add(page.pageNumber);
        continue;
      }
      const nameMatch = NAME_LABEL.exec(nameLine);
      const taxIdMatch = TAX_ID_LABEL.exec(taxIdLine);
      if (!nameMatch || !taxIdMatch || !nameMatch[1] || !taxIdMatch[1]) {
        pagesWithIncompleteSections.add(page.pageNumber);
        continue;
      }
      const printedName = nameMatch[1].trim();
      const printedTaxId = taxIdMatch[1].trim();
      if (!isValidPrintedName(printedName)) {
        return blockedIssue("INVALID_PRINTED_NAME", [page.pageNumber]);
      }
      if (!isValidPrintedTaxId(printedTaxId)) {
        return blockedIssue("INVALID_PRINTED_TAX_ID", [page.pageNumber]);
      }
      observations.push(Object.freeze({ printedName, printedTaxId, pageNumber: page.pageNumber }));
      if (observations.length > AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxOccurrences) {
        return blockedIssue("SECTION_SCAN_LIMIT_EXCEEDED", [page.pageNumber]);
      }
    }
  }
  assertNotAborted(input.signal);

  if (observations.length === 0) {
    return Object.freeze({
      state: "PENDING" as const,
      issue: freezeIssue({
        code:
          pagesWithIncompleteSections.size > 0
            ? "IDENTIFICATION_FIELDS_INCOMPLETE"
            : "IDENTIFICATION_SECTION_NOT_FOUND",
        pageNumbers: [...pagesWithIncompleteSections].sort((left, right) => left - right),
      }),
    });
  }
  const identities = new Set(
    observations.map(
      (item) => `${foldComparison(item.printedName)}\u0000${item.printedTaxId.toUpperCase()}`,
    ),
  );
  if (identities.size > 1 || pagesWithIncompleteSections.size > 0) {
    return Object.freeze({
      state: "AMBIGUOUS" as const,
      issue: freezeIssue({
        code: "MULTIPLE_DISTINCT_SUBJECTS",
        pageNumbers: [...new Set([
          ...observations.map((item) => item.pageNumber),
          ...pagesWithIncompleteSections,
        ])].sort((left, right) => left - right),
      }),
    });
  }
  return Object.freeze({ state: "FACTS" as const, observations: Object.freeze(observations) });
}

function parseIdentifiedSubject(
  value: unknown,
  maxPageNumber: number,
): AeatEnforcementIdentifiedSubjectFactV1 {
  const item = snapshotRecord(value, SUBJECT_KEYS);
  const printedName = typeof item.printedName === "string" ? item.printedName : "";
  const printedTaxId = typeof item.printedTaxId === "string" ? item.printedTaxId : "";
  const occurrenceCount = parsePositiveInteger(
    item.occurrenceCount,
    AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxOccurrences,
  );
  const pageNumbers = parsePageNumbers(item.pageNumbers, maxPageNumber, false);
  const evidence = snapshotArray(
    item.evidence,
    AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxPageNumbers,
  ).map((entry) => parseEvidence(entry, maxPageNumber));
  if (
    item.role !== "PAYMENT_OBLIGOR" ||
    item.roleSource !== "EXPLICIT_SECTION_HEADING" ||
    !isValidPrintedName(printedName) ||
    !isValidPrintedTaxId(printedTaxId) ||
    pageNumbers.length > occurrenceCount ||
    evidence.length !== pageNumbers.length ||
    evidence.some((entry, index) => entry.pageNumber !== pageNumbers[index]) ||
    item.valueDisclosure !== "EPHEMERAL_UI_ONLY" ||
    item.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
  return Object.freeze({
    role: "PAYMENT_OBLIGOR",
    roleSource: "EXPLICIT_SECTION_HEADING",
    printedName,
    printedTaxId,
    occurrenceCount,
    pageNumbers,
    evidence: Object.freeze(evidence),
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseEvidence(
  value: unknown,
  maxPageNumber: number,
): AeatEnforcementPartyFactEvidenceV1 {
  const item = snapshotRecord(value, EVIDENCE_KEYS);
  const pageNumber = parsePositiveInteger(item.pageNumber, maxPageNumber);
  if (
    item.sectionLabel !== "IDENTIFICATION_OF_PAYMENT_OBLIGOR" ||
    item.nameLabel !== "NAME_OR_BUSINESS_NAME" ||
    item.taxIdLabel !== "NIF" ||
    item.extractionMethod !== "RULE" ||
    item.assertionType !== "EXPLICIT_IN_DOCUMENT"
  ) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
  return Object.freeze({
    pageNumber,
    sectionLabel: "IDENTIFICATION_OF_PAYMENT_OBLIGOR",
    nameLabel: "NAME_OR_BUSINESS_NAME",
    taxIdLabel: "NIF",
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
  });
}

function parseIssue(
  value: unknown,
  maxPageNumber: number,
): AeatEnforcementPartyFactIssueV1 {
  const item = snapshotRecord(value, ISSUE_KEYS);
  if (!ISSUE_CODES.has(item.code as AeatEnforcementPartyFactIssueCodeV1)) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
  const code = item.code as AeatEnforcementPartyFactIssueCodeV1;
  const allowEmpty =
    code === "FAMILY_GATE_NOT_SATISFIED" ||
    code === "IDENTIFICATION_SECTION_NOT_FOUND" ||
    code === "UNSUPPORTED_TEXT_STATE";
  const pageNumbers = parsePageNumbers(item.pageNumbers, maxPageNumber, allowEmpty);
  if (
    (code === "FAMILY_GATE_NOT_SATISFIED" || code === "UNSUPPORTED_TEXT_STATE") &&
    pageNumbers.length !== 0
  ) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
  return freezeIssue({ code, pageNumbers });
}

function assertResultSemantics(
  documentType: AeatEnforcementPartyFactsV1["documentType"],
  status: AeatEnforcementPartyFactsV1["status"],
  outcome: AeatEnforcementPartyFactsOutcomeV1,
  identifiedSubject: AeatEnforcementIdentifiedSubjectFactV1 | null,
  issues: readonly AeatEnforcementPartyFactIssueV1[],
): void {
  const issue = issues[0];
  const validFacts =
    documentType === "AEAT_ENFORCEMENT_ORDER" &&
    status === "REVIEW_REQUIRED" &&
    outcome === "FACTS_AVAILABLE" &&
    identifiedSubject !== null &&
    issues.length === 0;
  const validPending =
    status === "INFORMATION_PENDING" &&
    outcome === "INFORMATION_PENDING" &&
    identifiedSubject === null &&
    issues.length === 1 &&
    (issue?.code === "FAMILY_GATE_NOT_SATISFIED"
      ? documentType === null
      : documentType === "AEAT_ENFORCEMENT_ORDER" &&
        (issue?.code === "IDENTIFICATION_SECTION_NOT_FOUND" ||
          issue?.code === "IDENTIFICATION_FIELDS_INCOMPLETE"));
  const validAmbiguous =
    documentType === "AEAT_ENFORCEMENT_ORDER" &&
    status === "REVIEW_REQUIRED" &&
    outcome === "AMBIGUOUS" &&
    identifiedSubject === null &&
    issues.length === 1 &&
    issue?.code === "MULTIPLE_DISTINCT_SUBJECTS";
  const validBlocked =
    status === "REVIEW_REQUIRED" &&
    outcome === "PROCESSING_BLOCKED" &&
    identifiedSubject === null &&
    issues.length === 1 &&
    issue !== undefined &&
    BLOCKING_ISSUES.has(issue.code) &&
    (issue.code === "UNSUPPORTED_TEXT_STATE"
      ? documentType === null
      : documentType === "AEAT_ENFORCEMENT_ORDER");
  if (!validFacts && !validPending && !validAmbiguous && !validBlocked) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
}

function isValidPrintedName(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxNameCharacters &&
    PRINTED_NAME.test(value) &&
    /\p{L}/u.test(value) &&
    !hasControl(value)
  );
}

function isValidPrintedTaxId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxTaxIdCharacters &&
    PRINTED_TAX_ID.test(value) &&
    !hasControl(value)
  );
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleUpperCase("es")
    .replace(/[\t \u00a0]+/gu, " ")
    .trim();
}

function foldComparison(value: string): string {
  return normalizeLabel(value).replace(/[\t \u00a0]+/gu, " ");
}

function isBoundedLine(value: string): boolean {
  return (
    value.length <= AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxLineCharacters &&
    !hasControl(value)
  );
}

function hasControl(value: string): boolean {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(
    value,
  );
}

function isBlockedFamilyReason(reason: FiscalNotificationExtractionReason): boolean {
  return (
    reason === "INCONSISTENT_PAGE_STATE" ||
    reason === "UNSUPPORTED_TEXT_CONTROLS" ||
    reason === "NORMALIZED_TEXT_LIMIT_EXCEEDED" ||
    reason === "TEXT_LINE_LIMIT_EXCEEDED"
  );
}

function blockedIssue(
  code: Extract<
    AeatEnforcementPartyFactIssueCodeV1,
    "INVALID_PRINTED_NAME" | "INVALID_PRINTED_TAX_ID" | "SECTION_SCAN_LIMIT_EXCEEDED"
  >,
  pageNumbers: readonly number[],
): ScanResult {
  return Object.freeze({
    state: "BLOCKED" as const,
    issue: freezeIssue({ code, pageNumbers }),
  });
}

function parsePositiveInteger(value: unknown, maximum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > maximum) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
  return Number(value);
}

function parsePageNumbers(
  value: unknown,
  maxPageNumber: number,
  allowEmpty: boolean,
): readonly number[] {
  const pages = snapshotArray(value, AEAT_ENFORCEMENT_PARTY_FACTS_LIMITS_V1.maxPageNumbers);
  if (!allowEmpty && pages.length === 0) throw new AeatEnforcementPartyFactsV1Error();
  let previous = 0;
  const result = pages.map((page) => {
    const parsed = parsePositiveInteger(page, maxPageNumber);
    if (parsed <= previous) throw new AeatEnforcementPartyFactsV1Error();
    previous = parsed;
    return parsed;
  });
  return Object.freeze(result);
}

function snapshotRecord(value: unknown, knownKeys: ReadonlySet<string>): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!knownKeys.has(key)) throw new AeatEnforcementPartyFactsV1Error();
  }
  return Object.fromEntries(Object.keys(record).map((key) => [key, record[key]]));
}

function snapshotArray(value: unknown, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new AeatEnforcementPartyFactsV1Error();
  }
  return [...value];
}

function freezeIssue(input: {
  code: AeatEnforcementPartyFactIssueCodeV1;
  pageNumbers: readonly number[];
}): AeatEnforcementPartyFactIssueV1 {
  return Object.freeze({
    code: input.code,
    pageNumbers: Object.freeze([...input.pageNumbers]),
  });
}

function freezeResult(input: {
  documentType?: "AEAT_ENFORCEMENT_ORDER" | null;
  status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  outcome: AeatEnforcementPartyFactsOutcomeV1;
  identifiedSubject: AeatEnforcementIdentifiedSubjectFactV1 | null;
  issues: readonly AeatEnforcementPartyFactIssueV1[];
}): AeatEnforcementPartyFactsV1 {
  return Object.freeze({
    schemaVersion: AEAT_ENFORCEMENT_PARTY_FACTS_SCHEMA_VERSION_V1,
    engineId: AEAT_ENFORCEMENT_PARTY_FACTS_ENGINE_ID_V1,
    engineVersion: AEAT_ENFORCEMENT_PARTY_FACTS_ENGINE_VERSION_V1,
    documentType:
      input.documentType === undefined
        ? "AEAT_ENFORCEMENT_ORDER"
        : input.documentType,
    status: input.status,
    outcome: input.outcome,
    identifiedSubject: input.identifiedSubject,
    issues: Object.freeze(input.issues.map((item) => freezeIssue(item))),
    semanticPolicy: "EXPLICIT_IDENTIFICATION_SECTION_ONLY",
    roleMeaningPolicy: "PRINTED_ROLE_LABEL_NOT_LEGAL_CONFIRMATION",
    profileMatchPolicy: "NOT_EVALUATED",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    persistencePolicy: "DO_NOT_PERSIST",
    networkPolicy: "NO_NETWORK",
    legalRuleStatus: "NOT_APPLIED",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}
