import rawMaster from "./aeat-mathematical-validation-master.v11.json";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3 } from "./document-families.v3";
import { AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9 } from "./official-catalog-expansion.v9";

export const AEAT_MATHEMATICAL_INTEGRITY_SCHEMA_VERSION_V11 = 11 as const;
export const AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11 =
  "aeat-mathematical-integrity.2026-07-21.v11" as const;

export const AEAT_MATHEMATICAL_INTEGRITY_ASSERTION_TYPES_V11 = Object.freeze([
  "PRINTED",
  "NORMALIZED",
  "CALCULATED_FROM_PRINTED_VALUES",
  "LEGAL_RULE_APPLIED",
  "CROSS_DOCUMENT_CONFIRMED",
  "SUGGESTED",
  "NOT_PROVEN",
] as const);
export type AeatMathematicalIntegrityAssertionTypeV11 =
  (typeof AEAT_MATHEMATICAL_INTEGRITY_ASSERTION_TYPES_V11)[number];

export const AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11 = Object.freeze([
  "VALIDATED_EXACT",
  "VALIDATED_WITH_ROUNDING",
  "VALIDATED_PARTIAL_COMPONENTS",
  "REVIEW_REQUIRED",
  "INCONSISTENT_PRINTED_VALUES",
  "NOT_APPLICABLE_NO_ARITHMETIC",
] as const);
export type AeatMathematicalIntegrityStatusV11 =
  (typeof AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11)[number];

export type AeatMathematicalIntegrityValidationModeV11 =
  | "ARITHMETIC_AND_LOGICAL"
  | "TEMPORAL_OR_COUNT_AND_LOGICAL";

export interface AeatMathematicalIntegrityArchetypeV11 {
  readonly id: string;
  readonly nameEs: string;
  readonly structure: readonly string[];
  readonly formulae: readonly string[];
  readonly logicalChecks: readonly string[];
  readonly crossDocumentChecks: readonly string[];
  readonly hardFailures: readonly string[];
  readonly warnings: readonly string[];
  readonly noInference: readonly string[];
}

export interface AeatMathematicalIntegrityFamilyV11 {
  readonly id: string;
  readonly nameEs: string;
  readonly category: string;
  readonly sourcePack: "V1_BASE_87" | "V9_EXTENSION_35";
  readonly phase: string;
  readonly documentNature: string;
  readonly createsOrUpdatesDebt: string;
  readonly moneyFields: readonly string[];
  readonly referenceFields: readonly string[];
  readonly dateFields: readonly string[];
  readonly factFields: readonly string[];
  readonly participantRoles: readonly string[];
  readonly chainRole: readonly string[];
  readonly acceptanceTests: Readonly<{
    positive: readonly string[];
    negative: readonly string[];
  }>;
  readonly archetypeId: string;
  readonly archetypeNameEs: string;
  readonly validationMode: AeatMathematicalIntegrityValidationModeV11;
  readonly expectedStructure: readonly string[];
  readonly formulae: readonly string[];
  readonly logicalChecks: readonly string[];
  readonly crossDocumentChecks: readonly string[];
  readonly hardFailures: readonly string[];
  readonly warnings: readonly string[];
  readonly noInference: readonly string[];
  readonly specialRule: string;
}

export interface AeatMathematicalIntegrityCatalogV11 {
  readonly schemaVersion: 11;
  readonly releaseId: typeof AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11;
  readonly meta: Readonly<{
    title: string;
    version: "11.0.0";
    createdAt: "2026-07-21";
    baseFamilies: 87;
    extensionFamilies: 35;
    totalFamilies: 122;
    archetypeCount: 47;
    purpose: string;
    privacy: string;
  }>;
  readonly globalValidationOrder: readonly string[];
  readonly tolerancePolicy: Readonly<{
    printedCentSums: string;
    percentageDerived: string;
    interestSchedule: string;
    dates: string;
    missingComponent: string;
  }>;
  readonly assertionTypes: readonly AeatMathematicalIntegrityAssertionTypeV11[];
  readonly validationStatuses: readonly AeatMathematicalIntegrityStatusV11[];
  readonly archetypes: readonly AeatMathematicalIntegrityArchetypeV11[];
  readonly families: readonly AeatMathematicalIntegrityFamilyV11[];
}

type DataRecord = Record<string, unknown>;

const FAMILY_ID = /^[a-z][a-z0-9]*(?:[._][a-z0-9]+)+$/u;
const CLOSED_ID = /^[A-Z][A-Z0-9_]{0,159}$/u;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
const DIRECT_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const IBAN = /\bES\d{22}\b/u;
const TAX_ID = /\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/u;
const MASTER_KEYS = Object.freeze([
  "meta",
  "globalValidationOrder",
  "tolerancePolicy",
  "assertionTypes",
  "validationStatuses",
  "archetypes",
  "families",
] as const);
const META_KEYS = Object.freeze([
  "title",
  "version",
  "createdAt",
  "baseFamilies",
  "extensionFamilies",
  "totalFamilies",
  "archetypeCount",
  "purpose",
  "privacy",
] as const);
const TOLERANCE_KEYS = Object.freeze([
  "printedCentSums",
  "percentageDerived",
  "interestSchedule",
  "dates",
  "missingComponent",
] as const);
const ARCHETYPE_KEYS = Object.freeze([
  "nameEs",
  "structure",
  "formulae",
  "logicalChecks",
  "crossDocumentChecks",
  "hardFailures",
  "warnings",
  "noInference",
] as const);
const FAMILY_KEYS = Object.freeze([
  "id",
  "nameEs",
  "category",
  "sourcePack",
  "phase",
  "documentNature",
  "createsOrUpdatesDebt",
  "moneyFields",
  "referenceFields",
  "dateFields",
  "factFields",
  "participantRoles",
  "chainRole",
  "acceptanceTests",
  "archetypeId",
  "archetypeNameEs",
  "validationMode",
  "expectedStructure",
  "formulae",
  "logicalChecks",
  "crossDocumentChecks",
  "hardFailures",
  "warnings",
  "noInference",
  "specialRule",
] as const);
const ACCEPTANCE_KEYS = Object.freeze(["positive", "negative"] as const);

function invalid(path: string): never {
  throw new Error(`AEAT_MATHEMATICAL_INTEGRITY_V11_INVALID:${path}`);
}

function record(
  value: unknown,
  path: string,
  keys?: readonly string[],
): DataRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid(path);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(path);
  const item = value as DataRecord;
  if (keys) {
    const actual = Object.keys(item);
    if (
      actual.length !== keys.length ||
      actual.some((key) => !keys.includes(key))
    ) {
      invalid(path);
    }
  }
  return item;
}

function literal(value: unknown, path: string, maxChars = 4_000): string {
  if (
    typeof value !== "string" ||
    value.length > maxChars ||
    CONTROL.test(value) ||
    DIRECT_EMAIL.test(value) ||
    IBAN.test(value) ||
    TAX_ID.test(value)
  ) {
    invalid(path);
  }
  return value;
}

function nonEmpty(value: unknown, path: string, maxChars = 4_000): string {
  const parsed = literal(value, path, maxChars);
  if (parsed.trim().length === 0) invalid(path);
  return parsed;
}

function literals(
  value: unknown,
  path: string,
  options: Readonly<{ maxItems?: number; allowEmpty?: boolean }> = {},
): readonly string[] {
  const maxItems = options.maxItems ?? 256;
  if (!Array.isArray(value) || value.length > maxItems) invalid(path);
  const parsed = value.map((entry, index) =>
    options.allowEmpty
      ? literal(entry, `${path}[${index}]`)
      : nonEmpty(entry, `${path}[${index}]`),
  );
  return Object.freeze(parsed);
}

function parseMaster(value: unknown): AeatMathematicalIntegrityCatalogV11 {
  const root = record(value, "master", MASTER_KEYS);
  const meta = record(root.meta, "meta", META_KEYS);
  if (
    meta.version !== "11.0.0" ||
    meta.createdAt !== "2026-07-21" ||
    meta.baseFamilies !== 87 ||
    meta.extensionFamilies !== 35 ||
    meta.totalFamilies !== 122 ||
    meta.archetypeCount !== 47
  ) {
    invalid("meta");
  }
  const parsedMeta = Object.freeze({
    title: nonEmpty(meta.title, "meta.title"),
    version: "11.0.0" as const,
    createdAt: "2026-07-21" as const,
    baseFamilies: 87 as const,
    extensionFamilies: 35 as const,
    totalFamilies: 122 as const,
    archetypeCount: 47 as const,
    purpose: nonEmpty(meta.purpose, "meta.purpose"),
    privacy: nonEmpty(meta.privacy, "meta.privacy"),
  });
  const tolerance = record(
    root.tolerancePolicy,
    "tolerancePolicy",
    TOLERANCE_KEYS,
  );
  const tolerancePolicy = Object.freeze({
    printedCentSums: nonEmpty(
      tolerance.printedCentSums,
      "tolerancePolicy.printedCentSums",
    ),
    percentageDerived: nonEmpty(
      tolerance.percentageDerived,
      "tolerancePolicy.percentageDerived",
    ),
    interestSchedule: nonEmpty(
      tolerance.interestSchedule,
      "tolerancePolicy.interestSchedule",
    ),
    dates: nonEmpty(tolerance.dates, "tolerancePolicy.dates"),
    missingComponent: nonEmpty(
      tolerance.missingComponent,
      "tolerancePolicy.missingComponent",
    ),
  });
  const assertionTypes = literals(root.assertionTypes, "assertionTypes");
  if (
    assertionTypes.length !==
      AEAT_MATHEMATICAL_INTEGRITY_ASSERTION_TYPES_V11.length ||
    assertionTypes.some(
      (entry, index) =>
        entry !== AEAT_MATHEMATICAL_INTEGRITY_ASSERTION_TYPES_V11[index],
    )
  ) {
    invalid("assertionTypes");
  }
  const validationStatuses = literals(
    root.validationStatuses,
    "validationStatuses",
  );
  if (
    validationStatuses.length !==
      AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11.length ||
    validationStatuses.some(
      (entry, index) =>
        entry !== AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11[index],
    )
  ) {
    invalid("validationStatuses");
  }
  const rawArchetypes = record(root.archetypes, "archetypes");
  const archetypes = Object.freeze(
    Object.entries(rawArchetypes).map(([id, raw]) => {
      if (!CLOSED_ID.test(id)) invalid(`archetypes.${id}`);
      const item = record(raw, `archetypes.${id}`, ARCHETYPE_KEYS);
      return Object.freeze({
        id,
        nameEs: nonEmpty(item.nameEs, `archetypes.${id}.nameEs`),
        structure: literals(item.structure, `archetypes.${id}.structure`),
        formulae: literals(item.formulae, `archetypes.${id}.formulae`),
        logicalChecks: literals(
          item.logicalChecks,
          `archetypes.${id}.logicalChecks`,
        ),
        crossDocumentChecks: literals(
          item.crossDocumentChecks,
          `archetypes.${id}.crossDocumentChecks`,
        ),
        hardFailures: literals(
          item.hardFailures,
          `archetypes.${id}.hardFailures`,
        ),
        warnings: literals(item.warnings, `archetypes.${id}.warnings`),
        noInference: literals(
          item.noInference,
          `archetypes.${id}.noInference`,
        ),
      });
    }),
  );
  if (archetypes.length !== 47) invalid("archetypes.length");
  const archetypeById = new Map(
    archetypes.map((archetype) => [archetype.id, archetype] as const),
  );
  if (!Array.isArray(root.families) || root.families.length !== 122) {
    invalid("families");
  }
  const seenFamilies = new Set<string>();
  const families = Object.freeze(
    root.families.map((raw, index) => {
      const path = `families[${index}]`;
      const item = record(raw, path, FAMILY_KEYS);
      const id = nonEmpty(item.id, `${path}.id`, 160);
      if (!FAMILY_ID.test(id) || seenFamilies.has(id)) invalid(`${path}.id`);
      seenFamilies.add(id);
      const archetypeId = nonEmpty(item.archetypeId, `${path}.archetypeId`, 160);
      const archetype = archetypeById.get(archetypeId);
      if (!archetype) invalid(`${path}.archetypeId`);
      const sourcePack = item.sourcePack;
      const validationMode = item.validationMode;
      if (sourcePack !== "V1_BASE_87" && sourcePack !== "V9_EXTENSION_35") {
        invalid(`${path}.sourcePack`);
      }
      if (
        validationMode !== "ARITHMETIC_AND_LOGICAL" &&
        validationMode !== "TEMPORAL_OR_COUNT_AND_LOGICAL"
      ) {
        invalid(`${path}.validationMode`);
      }
      const acceptance = record(
        item.acceptanceTests,
        `${path}.acceptanceTests`,
      );
      if (Object.keys(acceptance).some((key) => !ACCEPTANCE_KEYS.includes(key as "positive" | "negative"))) {
        invalid(`${path}.acceptanceTests`);
      }
      const formulae = literals(item.formulae, `${path}.formulae`);
      if (
        item.archetypeNameEs !== archetype.nameEs ||
        JSON.stringify(formulae) !== JSON.stringify(archetype.formulae)
      ) {
        invalid(`${path}.archetypeContract`);
      }
      return Object.freeze({
        id,
        nameEs: nonEmpty(item.nameEs, `${path}.nameEs`),
        category: nonEmpty(item.category, `${path}.category`, 160),
        sourcePack,
        phase: nonEmpty(item.phase, `${path}.phase`, 240),
        documentNature: nonEmpty(
          item.documentNature,
          `${path}.documentNature`,
          240,
        ),
        createsOrUpdatesDebt: literal(
          item.createsOrUpdatesDebt,
          `${path}.createsOrUpdatesDebt`,
          240,
        ),
        moneyFields: literals(item.moneyFields, `${path}.moneyFields`),
        referenceFields: literals(
          item.referenceFields,
          `${path}.referenceFields`,
        ),
        dateFields: literals(item.dateFields, `${path}.dateFields`),
        factFields: literals(item.factFields, `${path}.factFields`),
        participantRoles: literals(
          item.participantRoles,
          `${path}.participantRoles`,
        ),
        chainRole: literals(item.chainRole, `${path}.chainRole`),
        acceptanceTests: Object.freeze({
          positive: literals(
            acceptance.positive ?? [],
            `${path}.acceptanceTests.positive`,
          ),
          negative: literals(
            acceptance.negative ?? [],
            `${path}.acceptanceTests.negative`,
          ),
        }),
        archetypeId,
        archetypeNameEs: archetype.nameEs,
        validationMode,
        expectedStructure: literals(
          item.expectedStructure,
          `${path}.expectedStructure`,
        ),
        formulae,
        logicalChecks: literals(
          item.logicalChecks,
          `${path}.logicalChecks`,
        ),
        crossDocumentChecks: literals(
          item.crossDocumentChecks,
          `${path}.crossDocumentChecks`,
        ),
        hardFailures: literals(
          item.hardFailures,
          `${path}.hardFailures`,
        ),
        warnings: literals(item.warnings, `${path}.warnings`),
        noInference: literals(item.noInference, `${path}.noInference`),
        specialRule: literal(item.specialRule, `${path}.specialRule`),
      }) satisfies AeatMathematicalIntegrityFamilyV11;
    }),
  );
  const expectedProfileIds = new Set<string>([
    ...FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
    ...AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9,
  ]);
  if (
    expectedProfileIds.size !== 122 ||
    families.some((family) => !expectedProfileIds.has(family.id)) ||
    [...expectedProfileIds].some((id) => !seenFamilies.has(id))
  ) {
    invalid("families.coverage");
  }
  if (
    families.filter((family) => family.sourcePack === "V1_BASE_87").length !==
      87 ||
    families.filter((family) => family.sourcePack === "V9_EXTENSION_35")
      .length !== 35
  ) {
    invalid("families.sourcePack");
  }
  return Object.freeze({
    schemaVersion: AEAT_MATHEMATICAL_INTEGRITY_SCHEMA_VERSION_V11,
    releaseId: AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
    meta: parsedMeta,
    globalValidationOrder: literals(
      root.globalValidationOrder,
      "globalValidationOrder",
      { maxItems: 7 },
    ),
    tolerancePolicy,
    assertionTypes:
      AEAT_MATHEMATICAL_INTEGRITY_ASSERTION_TYPES_V11,
    validationStatuses: AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11,
    archetypes,
    families,
  });
}

export const AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11 = parseMaster(rawMaster);

const familyById = new Map(
  AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.map(
    (family) => [family.id, family] as const,
  ),
);
const archetypeById = new Map(
  AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.archetypes.map(
    (archetype) => [archetype.id, archetype] as const,
  ),
);

export function resolveAeatMathematicalIntegrityFamilyV11(
  familyId: unknown,
): AeatMathematicalIntegrityFamilyV11 | null {
  return typeof familyId === "string" && familyId.length <= 160
    ? (familyById.get(familyId) ?? null)
    : null;
}

export function resolveAeatMathematicalIntegrityArchetypeV11(
  archetypeId: unknown,
): AeatMathematicalIntegrityArchetypeV11 | null {
  return typeof archetypeId === "string" && archetypeId.length <= 160
    ? (archetypeById.get(archetypeId) ?? null)
    : null;
}
