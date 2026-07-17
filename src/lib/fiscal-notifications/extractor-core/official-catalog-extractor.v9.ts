import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import {
  AEAT_OFFICIAL_CATALOG_PROFILES_V9,
  type AeatOfficialCatalogMaturityV9,
  type AeatOfficialCatalogProfileIdV9,
  type AeatOfficialCatalogSectorGateV9,
  type AeatOfficialCatalogTypedFieldsV9,
} from "../knowledge/official-catalog-expansion.v9";
import type { BaseExtractorIdV1 } from "./extractor-contract.v1";

export const AEAT_OFFICIAL_CATALOG_EXTRACTOR_VERSION_V9 = "9.0.0" as const;

export interface AeatOfficialCatalogCandidateV9 {
  readonly familyId: AeatOfficialCatalogProfileIdV9;
  readonly canonicalTitle: string;
  readonly extractorId: BaseExtractorIdV1;
  readonly titlePageNumbers: readonly number[];
  readonly authorityPageNumbers: readonly number[];
  readonly maturity: AeatOfficialCatalogMaturityV9;
  readonly sectorGate: AeatOfficialCatalogSectorGateV9 | null;
  readonly expectedFields: AeatOfficialCatalogTypedFieldsV9;
  readonly detectionBasis: "EXACT_CANONICAL_TITLE_AND_AEAT_AUTHORITY";
  readonly strongSignature: false;
}

export type AeatOfficialCatalogExtractorIssueV9 =
  | "TITLE_NOT_EXACT"
  | "AEAT_AUTHORITY_NOT_FOUND"
  | "CONFLICTING_AUTHORITY"
  | "MULTIPLE_OFFICIAL_PROFILES"
  | "SECTOR_GATE_REQUIRED";

export interface AeatOfficialCatalogExtractorOutcomeV9 {
  readonly schemaVersion: 9;
  readonly extractorVersion: typeof AEAT_OFFICIAL_CATALOG_EXTRACTOR_VERSION_V9;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN" | "AMBIGUOUS" | "BLOCKED";
  readonly familyId: AeatOfficialCatalogProfileIdV9 | null;
  readonly candidate: AeatOfficialCatalogCandidateV9 | null;
  readonly candidates: readonly AeatOfficialCatalogCandidateV9[];
  readonly issues: readonly AeatOfficialCatalogExtractorIssueV9[];
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsFamily: false;
  readonly confirmsObligation: false;
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsDeadline: false;
  readonly permitsAccountingAction: false;
}

export interface ExtractAeatOfficialCatalogDocumentV9Input {
  readonly document: BoundedDocumentInput;
  readonly enabledSectorGates?: readonly AeatOfficialCatalogSectorGateV9[];
}

interface IndexedLineV9 {
  readonly pageNumber: number;
  readonly normalized: string;
  readonly header: boolean;
}

const AEAT_AUTHORITY_ANCHORS = Object.freeze([
  "agencia tributaria",
  "agencia estatal de administracion tributaria",
  "sede.agenciatributaria.gob.es",
]);
const CONFLICTING_AUTHORITY_ANCHORS = Object.freeze([
  "tesoreria general de la seguridad social",
  "agencia tributaria canaria",
  "hacienda foral",
  "diputacion foral",
  "hacienda tributaria de navarra",
]);

const EXTRACTOR_BY_CATEGORY: Readonly<Record<string, BaseExtractorIdV1>> = Object.freeze({
  EVIDENCE: "informative-communication",
  PROCEDURE: "requirement",
  ASSESSMENT: "assessment",
  FILING: "payment-evidence",
  REVIEW: "appeal-and-review",
  NOTIFICATION: "notification-envelope",
  REPRESENTATION: "identity-and-certificate",
  CENSUS: "census-resolution",
  CERTIFICATE: "identity-and-certificate",
  COLLECTION: "deferral",
  SANCTION: "penalty",
  REFUND: "refund",
  INSOLVENCY: "liability",
  CUSTOMS: "assessment",
  TECHNICAL: "informative-communication",
});

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[‐‑‒–—−]/gu, "-")
    .toLocaleLowerCase("es")
    .replace(/\s+/gu, " ")
    .trim();
}

function buildIndex(document: BoundedDocumentInput): readonly IndexedLineV9[] {
  const lines: IndexedLineV9[] = [];
  for (const page of document.pages) {
    assertNotAborted(document.signal);
    const pageLines = page.text.split(/\r\n|\n|\r/u);
    for (let index = 0; index < pageLines.length; index += 1) {
      const normalized = normalize(pageLines[index] ?? "");
      if (!normalized) continue;
      lines.push(Object.freeze({
        pageNumber: page.pageNumber,
        normalized,
        header: index < 40,
      }));
    }
  }
  return Object.freeze(lines);
}

function pagesFor(lines: readonly IndexedLineV9[], predicate: (line: string) => boolean): readonly number[] {
  return Object.freeze([
    ...new Set(lines.filter((line) => predicate(line.normalized)).map((line) => line.pageNumber)),
  ].sort((left, right) => left - right));
}

function candidateFor(
  profile: (typeof AEAT_OFFICIAL_CATALOG_PROFILES_V9)[number],
  titlePages: readonly number[],
  authorityPages: readonly number[],
): AeatOfficialCatalogCandidateV9 {
  const extractorId = EXTRACTOR_BY_CATEGORY[profile.category];
  if (!extractorId) throw new Error("AEAT_OFFICIAL_CATALOG_V9_CATEGORY_NOT_MAPPED");
  return Object.freeze({
    familyId: profile.id,
    canonicalTitle: profile.nameEs,
    extractorId,
    titlePageNumbers: Object.freeze([...titlePages]),
    authorityPageNumbers: Object.freeze([...authorityPages]),
    maturity: profile.recognitionMaturity,
    sectorGate: profile.sectorGate,
    expectedFields: profile.mustExtract,
    detectionBasis: "EXACT_CANONICAL_TITLE_AND_AEAT_AUTHORITY",
    strongSignature: false,
  });
}

function outcome(input: {
  status: AeatOfficialCatalogExtractorOutcomeV9["status"];
  familyId?: AeatOfficialCatalogProfileIdV9 | null;
  candidate?: AeatOfficialCatalogCandidateV9 | null;
  candidates?: readonly AeatOfficialCatalogCandidateV9[];
  issues: readonly AeatOfficialCatalogExtractorIssueV9[];
}): AeatOfficialCatalogExtractorOutcomeV9 {
  return Object.freeze({
    schemaVersion: 9,
    extractorVersion: AEAT_OFFICIAL_CATALOG_EXTRACTOR_VERSION_V9,
    status: input.status,
    familyId: input.familyId ?? null,
    candidate: input.candidate ?? null,
    candidates: Object.freeze([...(input.candidates ?? [])]),
    issues: Object.freeze([...input.issues]),
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED",
    confirmsFamily: false,
    confirmsObligation: false,
    confirmsDebt: false,
    confirmsPayment: false,
    confirmsDeadline: false,
    permitsAccountingAction: false,
  });
}

export function extractAeatOfficialCatalogDocumentV9(
  input: ExtractAeatOfficialCatalogDocumentV9Input,
): AeatOfficialCatalogExtractorOutcomeV9 {
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const lines = buildIndex(input.document);
  const headerLines = lines.filter((line) => line.header);
  const authorityPages = pagesFor(
    headerLines,
    (line) => AEAT_AUTHORITY_ANCHORS.some((anchor) => line.includes(anchor)),
  );
  const conflictingAuthorityPages = pagesFor(
    headerLines,
    (line) => CONFLICTING_AUTHORITY_ANCHORS.some((anchor) => line.includes(anchor)),
  );
  const titleMatches = AEAT_OFFICIAL_CATALOG_PROFILES_V9.flatMap((profile) => {
    const title = normalize(profile.nameEs);
    const titlePages = pagesFor(lines, (line) => line === title);
    return titlePages.length > 0 ? [{ profile, titlePages }] : [];
  });
  if (titleMatches.length === 0) {
    return outcome({ status: "UNKNOWN", issues: ["TITLE_NOT_EXACT"] });
  }
  if (conflictingAuthorityPages.length > 0) {
    return outcome({ status: "BLOCKED", issues: ["CONFLICTING_AUTHORITY"] });
  }
  if (authorityPages.length === 0) {
    return outcome({ status: "UNKNOWN", issues: ["AEAT_AUTHORITY_NOT_FOUND"] });
  }

  const enabledGates = new Set(input.enabledSectorGates ?? []);
  const eligible = titleMatches.filter(({ profile }) =>
    profile.sectorGate === null || enabledGates.has(profile.sectorGate),
  );
  if (eligible.length === 0) {
    return outcome({ status: "UNKNOWN", issues: ["SECTOR_GATE_REQUIRED"] });
  }
  const candidates = Object.freeze(
    eligible.map(({ profile, titlePages }) => candidateFor(profile, titlePages, authorityPages)),
  );
  if (candidates.length !== 1) {
    return outcome({
      status: "AMBIGUOUS",
      candidates,
      issues: ["MULTIPLE_OFFICIAL_PROFILES"],
    });
  }
  const candidate = candidates[0]!;
  return outcome({
    status: "REVIEW_REQUIRED",
    familyId: candidate.familyId,
    candidate,
    candidates,
    issues: [],
  });
}
