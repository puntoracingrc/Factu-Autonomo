export const SENSITIVE_REFERENCE_TYPES_V2 = Object.freeze([
  "CSV",
  "NRC",
  "BANK_REFERENCE",
] as const);

export type SensitiveReferenceTypeV2 =
  (typeof SENSITIVE_REFERENCE_TYPES_V2)[number];

/**
 * Persisted representation of a sensitive administrative reference.
 *
 * The printed value is deliberately absent. `fingerprintSha256` is a
 * domain-separated digest of the canonical owner/issuer/type partition and
 * the normalized value. It is useful only for equality in that partition; it
 * is never a display value, URL parameter or error detail.
 */
export interface SensitiveReferenceV2 {
  readonly storage: "FINGERPRINT_ONLY";
  readonly referenceType: SensitiveReferenceTypeV2;
  readonly fingerprintSha256: string;
}

type DataRecordSnapshot = Readonly<Record<string, unknown>>;

const SHA256_HEX = /^[0-9a-f]{64}$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const NORMALIZED_REFERENCE = /^[\p{L}\p{N}]+$/u;
const CANONICAL_OWNER_SCOPE =
  /^user:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const CANONICAL_ISSUER_CODE = /^[A-Z][A-Z0-9_]{1,31}$/u;
const MAX_REFERENCE_INPUT_CHARS = 256;
const MAX_NORMALIZED_REFERENCE_CHARS = 160;
const SENSITIVE_REFERENCE_KEYS = Object.freeze([
  "storage",
  "referenceType",
  "fingerprintSha256",
] as const);
const CREATE_INPUT_KEYS = Object.freeze([
  "ownerScope",
  "issuerCode",
  "referenceType",
  "printedValue",
] as const);
const EXACT_KEY_INPUT_KEYS = Object.freeze([
  "ownerScope",
  "issuerCode",
  "reference",
] as const);
const PARTITIONED_FINGERPRINT_DOMAIN =
  "factu:fiscal-notification:sensitive-reference:partitioned-sha256:v2";
const PARTITIONED_EXACT_KEY_DOMAIN =
  "factu:fiscal-notification:sensitive-reference:exact-key-sha256:v2";

const TYPE_STRENGTH_RULES: Readonly<
  Record<
    SensitiveReferenceTypeV2,
    Readonly<{ minLength: number; minDistinctCharacters: number }>
  >
> = Object.freeze({
  CSV: Object.freeze({ minLength: 12, minDistinctCharacters: 5 }),
  NRC: Object.freeze({ minLength: 10, minDistinctCharacters: 5 }),
  BANK_REFERENCE: Object.freeze({
    minLength: 8,
    minDistinctCharacters: 4,
  }),
});

function snapshotPlainRecord(
  value: unknown,
  exactKeys: readonly string[],
): DataRecordSnapshot | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== exactKeys.length ||
      keys.some(
        (key) =>
          typeof key !== "string" ||
          !exactKeys.includes(key) ||
          !Object.prototype.hasOwnProperty.call(descriptors, key),
      )
    ) {
      return null;
    }
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of exactKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function isSensitiveReferenceTypeV2(
  value: unknown,
): value is SensitiveReferenceTypeV2 {
  return (
    typeof value === "string" &&
    (SENSITIVE_REFERENCE_TYPES_V2 as readonly string[]).includes(value)
  );
}

function canonicalOwnerScopeV2(value: unknown): string | null {
  return typeof value === "string" && CANONICAL_OWNER_SCOPE.test(value)
    ? value
    : null;
}

function canonicalIssuerCodeV2(value: unknown): string | null {
  return typeof value === "string" && CANONICAL_ISSUER_CODE.test(value)
    ? value
    : null;
}

function collisionSafeTupleV2(components: readonly string[]): string {
  let result = "";
  for (const component of components) {
    result += `${component.length}:${component}`;
  }
  return result;
}

function hasTypeSpecificStrengthV2(
  referenceType: SensitiveReferenceTypeV2,
  normalized: string,
): boolean {
  const rule = TYPE_STRENGTH_RULES[referenceType];
  return (
    normalized.length >= rule.minLength &&
    new Set(normalized).size >= rule.minDistinctCharacters
  );
}

/**
 * Returns a descriptor-safe defensive copy or `null`. No accessor on the
 * candidate is evaluated.
 */
export function snapshotSensitiveReferenceV2(
  value: unknown,
): Readonly<SensitiveReferenceV2> | null {
  const snapshot = snapshotPlainRecord(value, SENSITIVE_REFERENCE_KEYS);
  if (
    !snapshot ||
    snapshot.storage !== "FINGERPRINT_ONLY" ||
    !isSensitiveReferenceTypeV2(snapshot.referenceType) ||
    typeof snapshot.fingerprintSha256 !== "string" ||
    !SHA256_HEX.test(snapshot.fingerprintSha256)
  ) {
    return null;
  }
  return Object.freeze({
    storage: "FINGERPRINT_ONLY" as const,
    referenceType: snapshot.referenceType,
    fingerprintSha256: snapshot.fingerprintSha256,
  });
}

export function isSensitiveReferenceV2(
  value: unknown,
): value is SensitiveReferenceV2 {
  return snapshotSensitiveReferenceV2(value) !== null;
}

/**
 * Canonicalizes only typographic separators. Significant letters, zeroes,
 * check digits, suffixes and installment markers are preserved.
 *
 * Callers must treat the returned value as sensitive and ephemeral. Only the
 * partitioned digest returned by `createSensitiveReferenceV2` is persistable.
 */
export function normalizeSensitiveReferenceForFingerprintV2(
  printedValue: string,
): string | null {
  if (
    typeof printedValue !== "string" ||
    printedValue.length === 0 ||
    printedValue.length > MAX_REFERENCE_INPUT_CHARS ||
    CONTROL_CHARACTERS.test(printedValue)
  ) {
    return null;
  }
  try {
    const normalized = printedValue
      .normalize("NFKC")
      .toUpperCase()
      .replace(/[\s\-‐‑‒–—―._/\\·]+/gu, "");
    return normalized.length > 0 &&
      normalized.length <= MAX_NORMALIZED_REFERENCE_CHARS &&
      NORMALIZED_REFERENCE.test(normalized)
      ? normalized
      : null;
  } catch {
    return null;
  }
}

async function sha256HexV2(value: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const digest = await subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return null;
  }
}

/**
 * Creates a partitioned equality digest. This is deliberately SHA-256, not an
 * HMAC: this local persistence boundary has no managed secret or key lifecycle,
 * so claiming MAC authentication would be false. The opaque canonical owner
 * scope, canonical issuer, type-specific minimum strength and domain-separated
 * tuple prevent a single value-only digest from correlating all tenants.
 */
export async function createSensitiveReferenceV2(input: {
  readonly ownerScope: string;
  readonly issuerCode: string;
  readonly referenceType: SensitiveReferenceTypeV2;
  readonly printedValue: string;
}): Promise<Readonly<SensitiveReferenceV2> | null> {
  const snapshot = snapshotPlainRecord(input, CREATE_INPUT_KEYS);
  if (!snapshot) return null;
  const ownerScope = canonicalOwnerScopeV2(snapshot.ownerScope);
  const issuerCode = canonicalIssuerCodeV2(snapshot.issuerCode);
  const referenceType = snapshot.referenceType;
  if (
    !ownerScope ||
    !issuerCode ||
    !isSensitiveReferenceTypeV2(referenceType) ||
    typeof snapshot.printedValue !== "string"
  ) {
    return null;
  }
  const normalized = normalizeSensitiveReferenceForFingerprintV2(
    snapshot.printedValue,
  );
  if (!normalized || !hasTypeSpecificStrengthV2(referenceType, normalized)) {
    return null;
  }
  const fingerprintSha256 = await sha256HexV2(
    collisionSafeTupleV2([
      PARTITIONED_FINGERPRINT_DOMAIN,
      ownerScope,
      issuerCode,
      referenceType,
      normalized,
    ]),
  );
  if (!fingerprintSha256) return null;
  return Object.freeze({
    storage: "FINGERPRINT_ONLY" as const,
    referenceType,
    fingerprintSha256,
  });
}

/** Safe label for diagnostics/UI. It never includes the printed value. */
export function sensitiveReferenceSafeLabelV2(value: unknown): string {
  const snapshot = snapshotSensitiveReferenceV2(value);
  if (!snapshot) return "referencia protegida";
  return snapshot.referenceType === "BANK_REFERENCE"
    ? "referencia bancaria protegida"
    : `${snapshot.referenceType} protegido`;
}

/**
 * Builds an opaque secondary equality key. The persisted fingerprint is
 * already partitioned; the second domain keeps index keys distinct from the
 * persistence representation.
 */
export async function buildSensitiveReferenceExactIndexKeyV2(input: {
  readonly ownerScope: string;
  readonly issuerCode: string;
  readonly reference: SensitiveReferenceV2;
}): Promise<string | null> {
  const snapshot = snapshotPlainRecord(input, EXACT_KEY_INPUT_KEYS);
  if (!snapshot) return null;
  const ownerScope = canonicalOwnerScopeV2(snapshot.ownerScope);
  const issuerCode = canonicalIssuerCodeV2(snapshot.issuerCode);
  const reference = snapshotSensitiveReferenceV2(snapshot.reference);
  if (!ownerScope || !issuerCode || !reference) return null;
  return sha256HexV2(
    collisionSafeTupleV2([
      PARTITIONED_EXACT_KEY_DOMAIN,
      ownerScope,
      issuerCode,
      reference.referenceType,
      reference.fingerprintSha256,
    ]),
  );
}
