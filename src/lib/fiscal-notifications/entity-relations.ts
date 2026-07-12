import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
} from "./input-contract";
import {
  FISCAL_ENTITY_RELATION_CATALOG,
  automatedStatusForRelation,
  type AutomatedRelationBasis,
  type FiscalEntityRelationType,
} from "./relation-types";

export type RelationEntityType =
  | "DOCUMENT"
  | "FILE"
  | "CASE"
  | "DEBT"
  | "PAYMENT_PLAN"
  | "INSTALLMENT";

export type RelationMatchKey =
  | "FILE_SHA256"
  | "PARENT_ID"
  | "CSV"
  | "DOCUMENT_REFERENCE"
  | "EXPEDIENT_NUMBER"
  | "PROCEDURE_NUMBER"
  | "LIQUIDATION_KEY"
  | "DEBT_KEY"
  | "PAYMENT_JUSTIFICANTE"
  | "NOTIFICATION_ID"
  | "REQUEST_NUMBER"
  | "OFFICIAL_REGISTRY_NUMBER";

export interface RelationEntityRef {
  readonly id: string;
  readonly ownerScope: string;
  readonly entityType: RelationEntityType;
}

export interface EntityRelationSignal {
  readonly ownerScope: string;
  readonly source: RelationEntityRef;
  readonly target: RelationEntityRef;
  readonly relationType: FiscalEntityRelationType;
  readonly basis: AutomatedRelationBasis;
  readonly matchingKeys: readonly RelationMatchKey[];
  readonly provenanceEntityIds: readonly string[];
  readonly algorithm: {
    readonly id: string;
    readonly version: number;
  };
  readonly createdAt: string;
  readonly exactIdentity?: {
    readonly sourceSha256: string;
    readonly targetSha256: string;
    readonly sourceImmutableOriginal: true;
    readonly targetImmutableOriginal: true;
  };
}

export interface EvaluatedEntityRelation {
  readonly ownerScope: string;
  readonly source: RelationEntityRef;
  readonly target: RelationEntityRef;
  readonly relationType: FiscalEntityRelationType;
  readonly status: "SUGGESTED" | "SYSTEM_CONFIRMED_EXACT";
  readonly confidenceBand: "HIGH" | "EXACT";
  readonly requiresHumanReview: boolean;
  readonly provenance: {
    readonly basis: AutomatedRelationBasis;
    readonly matchingKeys: readonly RelationMatchKey[];
    readonly entityIds: readonly string[];
    readonly algorithmId: string;
    readonly algorithmVersion: number;
    readonly createdAt: string;
  };
}

const SIGNAL_KEYS = Object.freeze([
  "ownerScope",
  "source",
  "target",
  "relationType",
  "basis",
  "matchingKeys",
  "provenanceEntityIds",
  "algorithm",
  "createdAt",
  "exactIdentity",
] as const);
const ENTITY_KEYS = Object.freeze(["id", "ownerScope", "entityType"] as const);
const ALGORITHM_KEYS = Object.freeze(["id", "version"] as const);
const EXACT_IDENTITY_KEYS = Object.freeze([
  "sourceSha256",
  "targetSha256",
  "sourceImmutableOriginal",
  "targetImmutableOriginal",
] as const);
const ENTITY_TYPES = new Set<RelationEntityType>([
  "DOCUMENT",
  "FILE",
  "CASE",
  "DEBT",
  "PAYMENT_PLAN",
  "INSTALLMENT",
]);
const RELATION_TYPES = new Set(
  FISCAL_ENTITY_RELATION_CATALOG.map((item) => item.type),
);
const BASES = new Set<AutomatedRelationBasis>([
  "EXACT_FILE_HASH",
  "EXPLICIT_REFERENCE",
  "EXPLICIT_PARENT_ID",
]);
const MATCH_KEYS = new Set<RelationMatchKey>([
  "FILE_SHA256",
  "PARENT_ID",
  "CSV",
  "DOCUMENT_REFERENCE",
  "EXPEDIENT_NUMBER",
  "PROCEDURE_NUMBER",
  "LIQUIDATION_KEY",
  "DEBT_KEY",
  "PAYMENT_JUSTIFICANTE",
  "NOTIFICATION_ID",
  "REQUEST_NUMBER",
  "OFFICIAL_REGISTRY_NUMBER",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function evaluateEntityRelation(
  value: EntityRelationSignal,
): EvaluatedEntityRelation {
  const input = snapshotExactDataObject(value, SIGNAL_KEYS, ["exactIdentity"]);
  if (!input) throw invalidSignal();
  assertBoundedOwnerScope(input.ownerScope, "ownerScope");
  const ownerScope = input.ownerScope;
  const source = parseEntityRef(input.source, "source", ownerScope);
  const target = parseEntityRef(input.target, "target", ownerScope);
  if (source.id === target.id && source.entityType === target.entityType) {
    throw new Error("FISCAL_NOTIFICATIONS_RELATION_SELF_REFERENCE");
  }
  if (!RELATION_TYPES.has(input.relationType as FiscalEntityRelationType)) {
    throw new Error("FISCAL_NOTIFICATIONS_UNKNOWN_RELATION_TYPE");
  }
  if (!BASES.has(input.basis as AutomatedRelationBasis)) throw invalidSignal();
  const relationType = input.relationType as FiscalEntityRelationType;
  const basis = input.basis as AutomatedRelationBasis;
  const matchingKeys = parseEnumIdList(
    input.matchingKeys,
    "matchingKeys",
    MATCH_KEYS,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxRelationKeys,
  );
  const provenanceEntityIds = parseIdList(
    input.provenanceEntityIds,
    "provenanceEntityIds",
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds,
  );
  if (provenanceEntityIds.length < 2) {
    throw new Error("FISCAL_NOTIFICATIONS_RELATION_PROVENANCE_REQUIRED");
  }
  const algorithm = snapshotExactDataObject(
    input.algorithm,
    ALGORITHM_KEYS,
  );
  if (!algorithm) throw invalidSignal();
  assertBoundedId(algorithm.id, "algorithm.id");
  if (!Number.isSafeInteger(algorithm.version) || Number(algorithm.version) < 1) {
    throw invalidSignal();
  }
  const algorithmVersion = algorithm.version as number;
  const createdAt = assertIsoTimestamp(input.createdAt);
  const exactIdentity = parseExactIdentity(input.exactIdentity);
  if (basis === "EXACT_FILE_HASH") {
    if (
      relationType !== "EXACT_FILE_DUPLICATE" ||
      source.entityType !== "FILE" ||
      target.entityType !== "FILE" ||
      matchingKeys.length !== 1 ||
      matchingKeys[0] !== "FILE_SHA256" ||
      !exactIdentity ||
      exactIdentity.sourceSha256 !== exactIdentity.targetSha256 ||
      provenanceEntityIds.length !== 2 ||
      !provenanceEntityIds.includes(source.id) ||
      !provenanceEntityIds.includes(target.id)
    ) {
      throw new Error("FISCAL_NOTIFICATIONS_EXACT_RELATION_BASIS_REQUIRED");
    }
  } else if (
    exactIdentity !== null ||
    matchingKeys.length === 0 ||
    matchingKeys.includes("FILE_SHA256") ||
    (basis === "EXPLICIT_PARENT_ID" &&
      (matchingKeys.length !== 1 || matchingKeys[0] !== "PARENT_ID")) ||
    (basis === "EXPLICIT_REFERENCE" && matchingKeys.includes("PARENT_ID"))
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_RELATION_BASIS");
  }
  const status = automatedStatusForRelation(relationType, basis);
  const frozenSource = Object.freeze({ ...source });
  const frozenTarget = Object.freeze({ ...target });
  const frozenMatchingKeys = Object.freeze([...matchingKeys]);
  const frozenEntityIds = Object.freeze([...provenanceEntityIds]);
  const provenance = Object.freeze({
    basis,
    matchingKeys: frozenMatchingKeys,
    entityIds: frozenEntityIds,
    algorithmId: algorithm.id,
    algorithmVersion,
    createdAt,
  });
  return Object.freeze({
    ownerScope,
    source: frozenSource,
    target: frozenTarget,
    relationType,
    status,
    confidenceBand: status === "SYSTEM_CONFIRMED_EXACT" ? "EXACT" : "HIGH",
    requiresHumanReview: status !== "SYSTEM_CONFIRMED_EXACT",
    provenance,
  });
}

function parseEntityRef(
  value: unknown,
  path: string,
  ownerScope: string,
): RelationEntityRef {
  const input = snapshotExactDataObject(value, ENTITY_KEYS);
  if (!input) throw invalidSignal();
  assertBoundedId(input.id, `${path}.id`);
  assertBoundedOwnerScope(input.ownerScope, `${path}.ownerScope`);
  if (input.ownerScope !== ownerScope) {
    throw new Error("FISCAL_NOTIFICATIONS_OWNER_SCOPE_MISMATCH");
  }
  if (!ENTITY_TYPES.has(input.entityType as RelationEntityType)) {
    throw invalidSignal();
  }
  return {
    id: input.id,
    ownerScope: input.ownerScope,
    entityType: input.entityType as RelationEntityType,
  };
}

function parseExactIdentity(
  value: unknown,
): { sourceSha256: string; targetSha256: string } | null {
  if (value === undefined) return null;
  const input = snapshotExactDataObject(value, EXACT_IDENTITY_KEYS);
  if (
    !input ||
    typeof input.sourceSha256 !== "string" ||
    typeof input.targetSha256 !== "string" ||
    !SHA256_PATTERN.test(input.sourceSha256) ||
    !SHA256_PATTERN.test(input.targetSha256) ||
    input.sourceImmutableOriginal !== true ||
    input.targetImmutableOriginal !== true
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_EXACT_IDENTITY");
  }
  return {
    sourceSha256: input.sourceSha256,
    targetSha256: input.targetSha256,
  };
}

function parseIdList(
  value: unknown,
  path: string,
  max: number,
): string[] {
  const items = snapshotDataArray(value, max);
  if (!items) throw invalidSignal();
  const result: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    assertBoundedId(item, `${path}[${index}]`);
    if (seen.has(item)) throw invalidSignal();
    seen.add(item);
    result.push(item);
  }
  return result;
}

function parseEnumIdList<T extends string>(
  value: unknown,
  path: string,
  allowed: ReadonlySet<T>,
  max: number,
): T[] {
  const items = parseIdList(value, path, max);
  if (items.some((item) => !allowed.has(item as T))) throw invalidSignal();
  return items as T[];
}

function snapshotDataArray(value: unknown, max: number): unknown[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  try {
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result.push(descriptor.value);
    }
    if (Reflect.ownKeys(value).length !== value.length + 1) return null;
    return result;
  } catch {
    return null;
  }
}

function snapshotExactDataObject(
  value: unknown,
  allowedKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const allowed = new Set(allowedKeys);
    const optional = new Set(optionalKeys);
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowed.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result[key] = descriptor.value;
    }
    for (const key of allowedKeys) {
      if (!optional.has(key) && !(key in result)) return null;
    }
    return result;
  } catch {
    return null;
  }
}

function assertIsoTimestamp(value: unknown): string {
  if (typeof value !== "string") throw invalidSignal();
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw invalidSignal();
  }
  return value;
}

function invalidSignal(): Error {
  return new Error("FISCAL_NOTIFICATIONS_INVALID_RELATION_SIGNAL");
}
