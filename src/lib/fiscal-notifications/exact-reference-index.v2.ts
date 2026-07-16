import {
  SENSITIVE_REFERENCE_TYPES_V2,
  snapshotSensitiveReferenceV2,
  type SensitiveReferenceTypeV2,
  type SensitiveReferenceV2,
} from "./sensitive-reference.v2";

export const FISCAL_NOTIFICATION_EXACT_REFERENCE_INDEX_VERSION_V2 =
  "2.0.0" as const;

export const FISCAL_NOTIFICATION_REFERENCE_TYPES_V2 = Object.freeze([
  "ACT_ID",
  "AGREEMENT_ID",
  "BANK_REFERENCE",
  "CSV",
  "DEBT_KEY",
  "EXPEDIENTE_ID",
  "FILING_RECEIPT_ID",
  "FISCAL_YEAR",
  "LIQUIDATION_KEY",
  "MODEL",
  "NOTIFICATION_ID",
  "NRC",
  "OTHER_OFFICIAL_REFERENCE",
  "PAYMENT_RECEIPT_ID",
  "PROCEDURE_ID",
  "REGISTRY_ID",
  "REQUEST_NUMBER",
  "SEIZURE_ORDER_ID",
  "TAX_PERIOD",
  "THIRD_PARTY_RESPONSE_ID",
] as const);

export type FiscalNotificationReferenceTypeV2 =
  (typeof FISCAL_NOTIFICATION_REFERENCE_TYPES_V2)[number];

interface FiscalNotificationExactReferenceBaseV2 {
  readonly referenceId: string;
  readonly documentId: string;
  readonly ownerScope: string;
  readonly issuer: string;
}

type NonSensitiveReferenceTypeV2 = Exclude<
  FiscalNotificationReferenceTypeV2,
  SensitiveReferenceTypeV2
>;

export type FiscalNotificationExactReferenceInputV2 =
  | (FiscalNotificationExactReferenceBaseV2 & {
      readonly referenceType: NonSensitiveReferenceTypeV2;
      readonly reference: string;
      readonly sensitiveReference?: never;
    })
  | (FiscalNotificationExactReferenceBaseV2 & {
      readonly referenceType: SensitiveReferenceTypeV2;
      readonly reference?: never;
      readonly sensitiveReference: SensitiveReferenceV2;
    });

export type FiscalNotificationExactReferenceQueryV2 = Omit<
  FiscalNotificationExactReferenceInputV2,
  "referenceId" | "documentId"
>;

export interface FiscalNotificationNonSensitiveReferenceQueryV2 {
  readonly ownerScope: string;
  readonly issuer: string;
  readonly referenceType: NonSensitiveReferenceTypeV2;
  readonly reference: string;
}

export interface FiscalNotificationIndexedReferenceV2 {
  readonly referenceId: string;
  readonly documentId: string;
  readonly ownerScope: string;
  readonly issuerNormalized: string;
  readonly referenceType: FiscalNotificationReferenceTypeV2;
  readonly normalizedReference: string | null;
  readonly sensitiveReference: SensitiveReferenceV2 | null;
  readonly exactIndexKey: string;
}

export interface FiscalNotificationExactReferenceIndexV2 {
  readonly version: typeof FISCAL_NOTIFICATION_EXACT_REFERENCE_INDEX_VERSION_V2;
  readonly size: number;
  findExact(
    input: FiscalNotificationExactReferenceQueryV2,
  ): readonly FiscalNotificationIndexedReferenceV2[];
}

interface ExactReferenceSnapshotV2 {
  readonly referenceId: string | null;
  readonly documentId: string | null;
  readonly ownerScope: string;
  readonly issuerNormalized: string;
  readonly referenceType: FiscalNotificationReferenceTypeV2;
  readonly normalizedReference: string | null;
  readonly sensitiveReference: Readonly<SensitiveReferenceV2> | null;
}

class InvalidExactReferenceV2 extends Error {
  constructor(path: string) {
    super(`INVALID_EXACT_REFERENCE:${path}`);
    this.name = "InvalidExactReferenceV2";
  }
}

const CONTROL_CHARACTER = /[\p{Cc}\p{Cf}]/u;
const TYPOGRAPHIC_SEPARATOR = /[\p{Z}\s._\-‐‑‒–—―/:\\·•]+/gu;
const CANONICAL_OWNER_SCOPE =
  /^user:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const CANONICAL_ISSUER_CODE = /^[A-Z][A-Z0-9_]{1,31}$/u;
const MAX_IDENTIFIER_CHARS = 160;
const MAX_INDEXED_REFERENCES = 20_000;
const QUERY_KEYS = Object.freeze([
  "ownerScope",
  "issuer",
  "referenceType",
  "reference",
  "sensitiveReference",
] as const);
const INDEXED_VALUE_KEYS = Object.freeze([
  "referenceId",
  "documentId",
  ...QUERY_KEYS,
] as const);
const EMPTY_MATCHES: readonly FiscalNotificationIndexedReferenceV2[] =
  Object.freeze([]);

function invalid(path: string): never {
  throw new InvalidExactReferenceV2(path);
}

function fieldPath(parent: string, field: string): string {
  return parent.length === 0 ? field : `${parent}.${field}`;
}

function collisionSafeTupleKey(components: readonly string[]): string {
  let result = "";
  for (const component of components) {
    result += `${component.length}:${component}`;
  }
  return result;
}

function snapshotRecord(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return invalid(path);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return invalid(path);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<
      PropertyKey,
      PropertyDescriptor
    >;
    const keys = Reflect.ownKeys(descriptors);
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      if (typeof key !== "string" || !allowedKeys.includes(key)) {
        return invalid(fieldPath(path, "$shape"));
      }
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return invalid(fieldPath(path, "$shape"));
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof InvalidExactReferenceV2) throw error;
    return invalid(path);
  }
}

function snapshotArray(
  value: unknown,
  path: string,
  max: number,
): readonly unknown[] {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype
    ) {
      return invalid(path);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<
      PropertyKey,
      PropertyDescriptor
    >;
    const keys = Reflect.ownKeys(descriptors);
    const lengthDescriptor = descriptors.length;
    const length =
      lengthDescriptor && "value" in lengthDescriptor
        ? lengthDescriptor.value
        : null;
    if (
      !Number.isSafeInteger(length) ||
      Number(length) < 0 ||
      Number(length) > max ||
      keys.length !== Number(length) + 1
    ) {
      return invalid(path);
    }
    const snapshot: unknown[] = new Array(Number(length));
    for (const key of keys) {
      if (key === "length") continue;
      if (
        typeof key !== "string" ||
        !/^(?:0|[1-9]\d*)$/u.test(key) ||
        Number(key) >= Number(length)
      ) {
        return invalid(fieldPath(path, "$shape"));
      }
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return invalid(fieldPath(path, `$shape`));
      }
      snapshot[Number(key)] = descriptor.value;
    }
    for (let index = 0; index < snapshot.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(snapshot, index)) {
        return invalid(`${path}[${index}]`);
      }
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof InvalidExactReferenceV2) throw error;
    return invalid(path);
  }
}

function assertOwn(
  snapshot: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
): void {
  if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
    invalid(fieldPath(path, key));
  }
}

function assertBoundedLiteral(
  value: unknown,
  path: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_IDENTIFIER_CHARS ||
    value !== value.trim() ||
    CONTROL_CHARACTER.test(value)
  ) {
    invalid(path);
  }
}

function isReferenceTypeV2(
  value: unknown,
): value is FiscalNotificationReferenceTypeV2 {
  return (
    typeof value === "string" &&
    (FISCAL_NOTIFICATION_REFERENCE_TYPES_V2 as readonly string[]).includes(
      value,
    )
  );
}

function isSensitiveReferenceTypeV2(
  value: FiscalNotificationReferenceTypeV2,
): value is SensitiveReferenceTypeV2 {
  return (SENSITIVE_REFERENCE_TYPES_V2 as readonly string[]).includes(value);
}

function normalizeReferenceAtPath(value: unknown, path: string): string {
  assertBoundedLiteral(value, path);
  try {
    const normalized = value
      .normalize("NFKC")
      .toLocaleUpperCase("es-ES")
      .replace(TYPOGRAPHIC_SEPARATOR, "");
    if (
      normalized.length === 0 ||
      normalized.length > MAX_IDENTIFIER_CHARS ||
      CONTROL_CHARACTER.test(normalized)
    ) {
      return invalid(path);
    }
    return normalized;
  } catch (error) {
    if (error instanceof InvalidExactReferenceV2) throw error;
    return invalid(path);
  }
}

function normalizeIssuerAtPath(value: unknown, path: string): string {
  assertBoundedLiteral(value, path);
  try {
    const normalized = value
      .normalize("NFKC")
      .toLocaleUpperCase("es-ES")
      .replace(/[\p{Z}\s]+/gu, " ")
      .trim();
    if (normalized.length === 0 || CONTROL_CHARACTER.test(normalized)) {
      return invalid(path);
    }
    return normalized;
  } catch (error) {
    if (error instanceof InvalidExactReferenceV2) throw error;
    return invalid(path);
  }
}

export function normalizeFiscalNotificationReferenceV2(value: string): string {
  return normalizeReferenceAtPath(value, "reference");
}

export function normalizeFiscalNotificationIssuerV2(value: string): string {
  return normalizeIssuerAtPath(value, "issuer");
}

function parseExactReferenceInputV2(
  value: unknown,
  path: string,
  includeIdentifiers: boolean,
): ExactReferenceSnapshotV2 {
  const snapshot = snapshotRecord(
    value,
    path.length === 0 ? "input" : path,
    includeIdentifiers ? INDEXED_VALUE_KEYS : QUERY_KEYS,
  );
  if (includeIdentifiers) {
    assertOwn(snapshot, "referenceId", path);
    assertOwn(snapshot, "documentId", path);
  }
  assertOwn(snapshot, "ownerScope", path);
  assertOwn(snapshot, "issuer", path);
  assertOwn(snapshot, "referenceType", path);

  const referenceId = includeIdentifiers ? snapshot.referenceId : null;
  const documentId = includeIdentifiers ? snapshot.documentId : null;
  if (includeIdentifiers) {
    assertBoundedLiteral(referenceId, fieldPath(path, "referenceId"));
    assertBoundedLiteral(documentId, fieldPath(path, "documentId"));
  }
  assertBoundedLiteral(snapshot.ownerScope, fieldPath(path, "ownerScope"));
  if (!isReferenceTypeV2(snapshot.referenceType)) {
    return invalid(fieldPath(path, "referenceType"));
  }
  const issuerNormalized = normalizeIssuerAtPath(
    snapshot.issuer,
    fieldPath(path, "issuer"),
  );
  const referenceType = snapshot.referenceType;
  const hasReference = Object.prototype.hasOwnProperty.call(
    snapshot,
    "reference",
  );
  const hasSensitiveReference = Object.prototype.hasOwnProperty.call(
    snapshot,
    "sensitiveReference",
  );

  if (isSensitiveReferenceTypeV2(referenceType)) {
    if (!hasSensitiveReference || hasReference) {
      return invalid(fieldPath(path, "sensitiveReference"));
    }
    if (!CANONICAL_OWNER_SCOPE.test(snapshot.ownerScope)) {
      return invalid(fieldPath(path, "ownerScope"));
    }
    if (!CANONICAL_ISSUER_CODE.test(issuerNormalized)) {
      return invalid(fieldPath(path, "issuer"));
    }
    const sensitiveReference = snapshotSensitiveReferenceV2(
      snapshot.sensitiveReference,
    );
    if (
      !sensitiveReference ||
      sensitiveReference.referenceType !== referenceType
    ) {
      return invalid(fieldPath(path, "sensitiveReference"));
    }
    return Object.freeze({
      referenceId: referenceId as string | null,
      documentId: documentId as string | null,
      ownerScope: snapshot.ownerScope,
      issuerNormalized,
      referenceType,
      normalizedReference: null,
      sensitiveReference,
    });
  }

  if (!hasReference || hasSensitiveReference) {
    return invalid(fieldPath(path, "reference"));
  }
  return Object.freeze({
    referenceId: referenceId as string | null,
    documentId: documentId as string | null,
    ownerScope: snapshot.ownerScope,
    issuerNormalized,
    referenceType,
    normalizedReference: normalizeReferenceAtPath(
      snapshot.reference,
      fieldPath(path, "reference"),
    ),
    sensitiveReference: null,
  });
}

function exactKeyFromSnapshotV2(input: ExactReferenceSnapshotV2): string {
  return collisionSafeTupleKey([
    input.ownerScope,
    input.issuerNormalized,
    input.referenceType,
    input.sensitiveReference?.fingerprintSha256 ?? input.normalizedReference!,
  ]);
}

export function createFiscalNotificationExactReferenceKeyV2(input: {
  readonly ownerScope: string;
  readonly issuer: string;
  readonly referenceType: FiscalNotificationReferenceTypeV2;
  readonly reference?: string;
  readonly sensitiveReference?: SensitiveReferenceV2;
}): string {
  return exactKeyFromSnapshotV2(parseExactReferenceInputV2(input, "", false));
}

export function createFiscalNotificationExactReferenceIndexV2(
  values: readonly FiscalNotificationExactReferenceInputV2[],
): FiscalNotificationExactReferenceIndexV2 {
  const inputValues = snapshotArray(values, "values", MAX_INDEXED_REFERENCES);
  const snapshots: ExactReferenceSnapshotV2[] = new Array(inputValues.length);
  for (let index = 0; index < inputValues.length; index += 1) {
    snapshots[index] = parseExactReferenceInputV2(
      inputValues[index],
      `values[${index}]`,
      true,
    );
  }

  const byKey = new Map<string, FiscalNotificationIndexedReferenceV2[]>();
  const uniqueReferenceIds = new Set<string>();

  for (const value of snapshots) {
    const referenceId = value.referenceId!;
    const documentId = value.documentId!;
    if (uniqueReferenceIds.has(referenceId)) {
      return invalid("referenceId");
    }
    uniqueReferenceIds.add(referenceId);
    const exactIndexKey = exactKeyFromSnapshotV2(value);
    const indexed: FiscalNotificationIndexedReferenceV2 = Object.freeze({
      referenceId,
      documentId,
      ownerScope: value.ownerScope,
      issuerNormalized: value.issuerNormalized,
      referenceType: value.referenceType,
      normalizedReference: value.normalizedReference,
      sensitiveReference: value.sensitiveReference,
      exactIndexKey,
    });
    const entries = byKey.get(exactIndexKey);
    if (entries) entries.push(indexed);
    else byKey.set(exactIndexKey, [indexed]);
  }

  for (const entries of byKey.values()) Object.freeze(entries);

  return Object.freeze({
    version: FISCAL_NOTIFICATION_EXACT_REFERENCE_INDEX_VERSION_V2,
    size: snapshots.length,
    findExact(input: FiscalNotificationExactReferenceQueryV2) {
      const key = exactKeyFromSnapshotV2(
        parseExactReferenceInputV2(input, "", false),
      );
      return byKey.get(key) ?? EMPTY_MATCHES;
    },
  });
}
