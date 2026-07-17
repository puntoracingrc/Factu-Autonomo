import rawCatalog from "./aeat-official-catalog-expansion.v9.json";

export const AEAT_OFFICIAL_CATALOG_EXPANSION_SCHEMA_VERSION_V9 = 9 as const;
export const AEAT_OFFICIAL_CATALOG_EXPANSION_RELEASE_ID_V9 =
  "aeat-official-catalog-expansion.2026-07-17.v9" as const;

export const AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9 = Object.freeze([
  "evidence.submission_receipt",
  "procedure.deadline_extension_request",
  "procedure.deadline_extension_decision",
  "assessment.rectification_request",
  "assessment.rectification_requirement",
  "assessment.rectification_proposal",
  "assessment.rectification_resolution",
  "filing.rectifying_self_assessment_receipt",
  "filing.complementary_self_assessment_receipt",
  "review.execution_resolution",
  "review.execution_challenge",
  "review.annulment_or_higher_appeal",
  "review.extraordinary_review",
  "review.inadmissibility_or_archival",
  "notification.electronic_assignment",
  "representation.power_registration",
  "representation.power_change",
  "registry.redeme_requirement",
  "registry.redeme_proposal",
  "registry.redeme_resolution",
  "registry.redeme_cautionary_deregistration",
  "registry.sii_inclusion_or_exclusion",
  "certificate.specialized",
  "certificate.correction_or_disagreement",
  "collection.asset_valuation",
  "collection.auction_announcement",
  "collection.auction_adjudication",
  "collection.auction_suspension_or_release",
  "collection.payment_in_kind",
  "sanction.termination_without_penalty",
  "refund.bank_data_requirement",
  "refund.denial_or_prescription",
  "insolvency.tax_debt_notice",
  "customs.import_release_or_provisional_assessment",
  "verifactu.technical_response",
] as const);

export type AeatOfficialCatalogProfileIdV9 =
  (typeof AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9)[number];

export const AEAT_OFFICIAL_CATALOG_SECTOR_GATES_V9 = Object.freeze([
  "PAYMENT_IN_KIND",
  "INSOLVENCY",
  "CUSTOMS",
  "VERIFACTU_TECHNICAL",
] as const);
export type AeatOfficialCatalogSectorGateV9 =
  (typeof AEAT_OFFICIAL_CATALOG_SECTOR_GATES_V9)[number];

export const AEAT_OFFICIAL_CATALOG_MATURITY_LEVELS_V9 = Object.freeze([
  "OFFICIAL_ONLY",
  "SYNTHETIC_VALIDATED",
  "REAL_VARIANT_OBSERVED",
  "MULTI_VARIANT_HARDENED",
  "PRODUCTION_STRONG_SIGNATURE",
] as const);
export type AeatOfficialCatalogMaturityV9 =
  (typeof AEAT_OFFICIAL_CATALOG_MATURITY_LEVELS_V9)[number];

export type AeatOfficialCatalogPriorityV9 = "P0" | "P1" | "P2";
export type AeatOfficialCatalogChangeKindV9 =
  | "NEW_PROFILE"
  | "NEW_SUBTYPE"
  | "NEW_SUBTYPE_ENGINE"
  | "OPTIONAL_SECTOR_PROFILE"
  | "OPTIONAL_TECHNICAL_PROFILE";

export interface AeatOfficialCatalogSourceV9 {
  readonly sourceId: string;
  readonly title: string;
  readonly url: string;
  readonly authority: "AEAT";
  readonly usagePolicy: "OFFICIAL_CONTEXT_ONLY";
}

export interface AeatOfficialCatalogTypedFieldsV9 {
  readonly references: readonly string[];
  readonly dates: readonly string[];
  readonly money: readonly string[];
  readonly facts: readonly string[];
}

export interface AeatOfficialCatalogProfileV9 {
  readonly schemaVersion: 9;
  readonly releaseId: typeof AEAT_OFFICIAL_CATALOG_EXPANSION_RELEASE_ID_V9;
  readonly id: AeatOfficialCatalogProfileIdV9;
  readonly nameEs: string;
  readonly category: string;
  readonly changeKind: AeatOfficialCatalogChangeKindV9;
  readonly priority: AeatOfficialCatalogPriorityV9;
  readonly whatItIs: string;
  readonly phases: readonly string[];
  readonly mustExtract: AeatOfficialCatalogTypedFieldsV9;
  readonly relationRules: readonly string[];
  readonly deadlineTrigger: string;
  readonly notProvenByThisDocument: readonly string[];
  readonly officialSourceIds: readonly string[];
  readonly recognitionMaturity: AeatOfficialCatalogMaturityV9;
  readonly rawRecognitionMaturity: "OFFICIAL_ONLY_UNTIL_REAL_SAMPLE";
  readonly sampleAcquisitionNeed: string;
  readonly notes: string;
  readonly sectorGate: AeatOfficialCatalogSectorGateV9 | null;
  readonly recognitionPolicy:
    | "EXACT_TITLE_AND_AEAT_AUTHORITY_REVIEW_ONLY"
    | "SECTOR_GATE_AND_EXACT_TITLE_AND_AEAT_AUTHORITY_REVIEW_ONLY";
  readonly strongSignaturePolicy: "PROHIBITED_UNTIL_REAL_SAMPLE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
  readonly permitsAutomaticRelationConfirmation: false;
}

export interface AeatOfficialCatalogExpansionV9 {
  readonly schemaVersion: 9;
  readonly releaseId: typeof AEAT_OFFICIAL_CATALOG_EXPANSION_RELEASE_ID_V9;
  readonly meta: Readonly<{
    title: string;
    version: "9.0.0";
    createdAt: "2026-07-17";
    currentProfileCount: 87;
    proposedAdditionCount: 35;
    realCorpusRowsReviewed: 120;
    realCorpusFamiliesObserved: 31;
    scope: string;
    exhaustiveness: string;
  }>;
  readonly officialSources: Readonly<Record<string, AeatOfficialCatalogSourceV9>>;
  readonly profiles: readonly AeatOfficialCatalogProfileV9[];
}

type UnknownRecord = Record<string, unknown>;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const PROFILE_ID = /^[a-z][a-z0-9]*(?:[._][a-z0-9]+)+$/u;
const CLOSED_CODE = /^[A-Z][A-Z0-9_]{0,159}$/u;
const AEAT_URL = /^https:\/\/sede\.agenciatributaria\.gob\.es\/Sede\//u;
const DIRECT_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const IBAN = /\bES\d{22}\b/u;
const TAX_ID = /\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/u;
const MAX_CATALOG_GRAPH_NODES = 20_000;
const MAX_CATALOG_TEXT_CHARS = 150_000;

const PROFILE_KEYS = Object.freeze([
  "id",
  "nameEs",
  "category",
  "changeKind",
  "priority",
  "whatItIs",
  "phases",
  "mustExtract",
  "relationRules",
  "deadlineTrigger",
  "notProvenByThisDocument",
  "officialSourceIds",
  "recognitionMaturity",
  "sampleAcquisitionNeed",
  "notes",
] as const);

function invalid(path: string): never {
  throw new Error(`AEAT_OFFICIAL_CATALOG_V9_INVALID:${path}`);
}

function record(value: unknown, path: string): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid(path);
  }
  const candidate = value as UnknownRecord;
  for (const key of Object.keys(candidate)) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    if (!descriptor || descriptor.get || descriptor.set) invalid(`${path}.${key}`);
  }
  return candidate;
}

function exactKeys(value: UnknownRecord, path: string, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) invalid(`${path}.${key}`);
  }
  if (Object.keys(value).length !== allowed.length) invalid(path);
  for (const key of allowed) if (!(key in value)) invalid(`${path}.${key}`);
}

function text(value: unknown, path: string, max = 2_000): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    value.trim() !== value ||
    CONTROL_CHARACTERS.test(value)
  ) invalid(path);
  return value;
}

function optionalText(value: unknown, path: string, max = 2_000): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    value.trim() !== value ||
    CONTROL_CHARACTERS.test(value)
  ) invalid(path);
  return value;
}

function stringArray(
  value: unknown,
  path: string,
  options: Readonly<{ min: number; max?: number; code?: boolean }>,
): readonly string[] {
  if (!Array.isArray(value) || value.length < options.min || value.length > (options.max ?? 80)) {
    invalid(path);
  }
  const seen = new Set<string>();
  return Object.freeze(value.map((item, index) => {
    const itemValue = text(item, `${path}[${index}]`, 400);
    if (options.code && !CLOSED_CODE.test(itemValue)) invalid(`${path}[${index}]`);
    if (seen.has(itemValue)) invalid(`${path}[${index}]`);
    seen.add(itemValue);
    return itemValue;
  }));
}

function sectorGate(id: AeatOfficialCatalogProfileIdV9): AeatOfficialCatalogSectorGateV9 | null {
  if (id === "collection.payment_in_kind") return "PAYMENT_IN_KIND";
  if (id === "insolvency.tax_debt_notice") return "INSOLVENCY";
  if (id === "customs.import_release_or_provisional_assessment") return "CUSTOMS";
  if (id === "verifactu.technical_response") return "VERIFACTU_TECHNICAL";
  return null;
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value !== null && typeof value === "object") {
    const object = value as object;
    if (seen.has(object)) return value;
    seen.add(object);
    Object.values(value as UnknownRecord).forEach((item) => deepFreeze(item, seen));
    Object.freeze(object);
  }
  return value;
}

function assertSafeCatalogGraph(input: unknown): void {
  const stack: unknown[] = [input];
  const seen = new WeakSet<object>();
  let nodeCount = 0;
  let textChars = 0;
  while (stack.length > 0) {
    const value = stack.pop();
    nodeCount += 1;
    if (nodeCount > MAX_CATALOG_GRAPH_NODES) invalid("graph");
    if (typeof value === "string") {
      textChars += value.length;
      if (
        textChars > MAX_CATALOG_TEXT_CHARS ||
        DIRECT_EMAIL.test(value) ||
        IBAN.test(value) ||
        TAX_ID.test(value)
      ) invalid("privacy");
      continue;
    }
    if (value === null || typeof value !== "object") continue;
    if (seen.has(value)) invalid("graph");
    seen.add(value);
    if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) {
      invalid("graph");
    }
    const prototype = Object.getPrototypeOf(value);
    if (
      !Array.isArray(value) &&
      prototype !== Object.prototype &&
      prototype !== null
    ) invalid("graph");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      const indexedKeys = Object.keys(descriptors).filter((key) => key !== "length");
      if (
        indexedKeys.length !== value.length ||
        indexedKeys.some(
          (key) => !/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= value.length,
        )
      ) invalid("graph");
    }
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor.get || descriptor.set || !("value" in descriptor)) {
        invalid(`graph.${key}`);
      }
      stack.push(descriptor.value);
    }
  }
}

export function parseAeatOfficialCatalogExpansionV9(input: unknown): AeatOfficialCatalogExpansionV9 {
  assertSafeCatalogGraph(input);
  const root = record(structuredClone(input), "root");
  exactKeys(root, "root", ["meta", "officialSources", "proposedProfiles"]);
  const meta = record(root.meta, "meta");
  exactKeys(meta, "meta", [
    "title", "version", "createdAt", "currentProfileCount", "proposedAdditionCount",
    "realCorpusRowsReviewed", "realCorpusFamiliesObserved", "scope", "exhaustiveness",
  ]);
  if (
    text(meta.version, "meta.version") !== "9.0.0" ||
    text(meta.createdAt, "meta.createdAt") !== "2026-07-17" ||
    meta.currentProfileCount !== 87 ||
    meta.proposedAdditionCount !== 35 ||
    meta.realCorpusRowsReviewed !== 120 ||
    meta.realCorpusFamiliesObserved !== 31
  ) invalid("meta");
  text(meta.title, "meta.title");
  text(meta.scope, "meta.scope");
  text(meta.exhaustiveness, "meta.exhaustiveness");

  const sourcesInput = record(root.officialSources, "officialSources");
  const sources: Record<string, AeatOfficialCatalogSourceV9> = {};
  for (const [sourceId, sourceValue] of Object.entries(sourcesInput)) {
    if (!CLOSED_CODE.test(sourceId)) invalid(`officialSources.${sourceId}`);
    const source = record(sourceValue, `officialSources.${sourceId}`);
    exactKeys(source, `officialSources.${sourceId}`, ["title", "url"]);
    const url = text(source.url, `officialSources.${sourceId}.url`, 500);
    if (!AEAT_URL.test(url)) invalid(`officialSources.${sourceId}.url`);
    sources[sourceId] = Object.freeze({
      sourceId,
      title: text(source.title, `officialSources.${sourceId}.title`),
      url,
      authority: "AEAT",
      usagePolicy: "OFFICIAL_CONTEXT_ONLY",
    });
  }
  if (Object.keys(sources).length !== 23) invalid("officialSources");

  if (!Array.isArray(root.proposedProfiles) || root.proposedProfiles.length !== 35) invalid("proposedProfiles");
  const expectedIds = new Set<string>(AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9);
  const seenIds = new Set<string>();
  const profiles = root.proposedProfiles.map((profileValue, index): AeatOfficialCatalogProfileV9 => {
    const path = `proposedProfiles[${index}]`;
    const profile = record(profileValue, path);
    exactKeys(profile, path, PROFILE_KEYS);
    const id = text(profile.id, `${path}.id`, 160);
    if (!PROFILE_ID.test(id) || !expectedIds.has(id) || seenIds.has(id)) invalid(`${path}.id`);
    seenIds.add(id);
    const typedId = id as AeatOfficialCatalogProfileIdV9;
    const priority = text(profile.priority, `${path}.priority`) as AeatOfficialCatalogPriorityV9;
    if (!["P0", "P1", "P2"].includes(priority)) invalid(`${path}.priority`);
    const changeKind = text(profile.changeKind, `${path}.changeKind`) as AeatOfficialCatalogChangeKindV9;
    if (!["NEW_PROFILE", "NEW_SUBTYPE", "NEW_SUBTYPE_ENGINE", "OPTIONAL_SECTOR_PROFILE", "OPTIONAL_TECHNICAL_PROFILE"].includes(changeKind)) {
      invalid(`${path}.changeKind`);
    }
    if (profile.recognitionMaturity !== "OFFICIAL_ONLY_UNTIL_REAL_SAMPLE") invalid(`${path}.recognitionMaturity`);
    const fields = record(profile.mustExtract, `${path}.mustExtract`);
    exactKeys(fields, `${path}.mustExtract`, ["references", "dates", "money", "facts"]);
    const sourceIds = stringArray(profile.officialSourceIds, `${path}.officialSourceIds`, { min: 1, code: true });
    sourceIds.forEach((sourceId, sourceIndex) => {
      if (!sources[sourceId]) invalid(`${path}.officialSourceIds[${sourceIndex}]`);
    });
    const gate = sectorGate(typedId);
    if ((priority === "P2") !== (gate !== null)) invalid(`${path}.priority`);
    return Object.freeze({
      schemaVersion: 9,
      releaseId: AEAT_OFFICIAL_CATALOG_EXPANSION_RELEASE_ID_V9,
      id: typedId,
      nameEs: text(profile.nameEs, `${path}.nameEs`),
      category: text(profile.category, `${path}.category`, 80),
      changeKind,
      priority,
      whatItIs: text(profile.whatItIs, `${path}.whatItIs`),
      phases: stringArray(profile.phases, `${path}.phases`, { min: 1, code: true }),
      mustExtract: Object.freeze({
        references: stringArray(fields.references, `${path}.mustExtract.references`, { min: 1, code: true }),
        dates: stringArray(fields.dates, `${path}.mustExtract.dates`, { min: 1, code: true }),
        money: stringArray(fields.money, `${path}.mustExtract.money`, { min: 0, code: true }),
        facts: stringArray(fields.facts, `${path}.mustExtract.facts`, { min: 1, code: true }),
      }),
      relationRules: stringArray(profile.relationRules, `${path}.relationRules`, { min: 1, code: true }),
      deadlineTrigger: text(profile.deadlineTrigger, `${path}.deadlineTrigger`, 200),
      notProvenByThisDocument: stringArray(profile.notProvenByThisDocument, `${path}.notProvenByThisDocument`, { min: 1 }),
      officialSourceIds: sourceIds,
      recognitionMaturity: "OFFICIAL_ONLY",
      rawRecognitionMaturity: "OFFICIAL_ONLY_UNTIL_REAL_SAMPLE",
      sampleAcquisitionNeed: text(profile.sampleAcquisitionNeed, `${path}.sampleAcquisitionNeed`),
      notes: optionalText(profile.notes, `${path}.notes`),
      sectorGate: gate,
      recognitionPolicy: gate
        ? "SECTOR_GATE_AND_EXACT_TITLE_AND_AEAT_AUTHORITY_REVIEW_ONLY"
        : "EXACT_TITLE_AND_AEAT_AUTHORITY_REVIEW_ONLY",
      strongSignaturePolicy: "PROHIBITED_UNTIL_REAL_SAMPLE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      permitsAutomaticRelationConfirmation: false,
    });
  });
  if (seenIds.size !== expectedIds.size || [...expectedIds].some((id) => !seenIds.has(id))) invalid("proposedProfiles");
  const counts = profiles.reduce((result, profile) => ({ ...result, [profile.priority]: result[profile.priority] + 1 }), { P0: 0, P1: 0, P2: 0 });
  if (counts.P0 !== 10 || counts.P1 !== 21 || counts.P2 !== 4) invalid("proposedProfiles.priority");
  return deepFreeze({
    schemaVersion: 9,
    releaseId: AEAT_OFFICIAL_CATALOG_EXPANSION_RELEASE_ID_V9,
    meta: meta as unknown as AeatOfficialCatalogExpansionV9["meta"],
    officialSources: sources,
    profiles,
  });
}

export const AEAT_OFFICIAL_CATALOG_EXPANSION_V9 =
  parseAeatOfficialCatalogExpansionV9(rawCatalog as unknown);
export const AEAT_OFFICIAL_CATALOG_PROFILES_V9 =
  AEAT_OFFICIAL_CATALOG_EXPANSION_V9.profiles;
export const AEAT_OFFICIAL_CATALOG_SOURCES_V9 =
  AEAT_OFFICIAL_CATALOG_EXPANSION_V9.officialSources;

const profileById = new Map(
  AEAT_OFFICIAL_CATALOG_PROFILES_V9.map((profile) => [profile.id, profile] as const),
);

export function resolveAeatOfficialCatalogProfileV9(id: unknown): AeatOfficialCatalogProfileV9 | null {
  return typeof id === "string" && id.length > 0 && id.length <= 160 && id.trim() === id && !CONTROL_CHARACTERS.test(id)
    ? (profileById.get(id as AeatOfficialCatalogProfileIdV9) ?? null)
    : null;
}

export function isAeatOfficialCatalogProfileIdV9(id: unknown): id is AeatOfficialCatalogProfileIdV9 {
  return resolveAeatOfficialCatalogProfileV9(id) !== null;
}
