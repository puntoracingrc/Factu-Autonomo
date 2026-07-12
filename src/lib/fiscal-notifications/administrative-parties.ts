import type {
  AdministrativePartyRole,
  AdministrativeRoleAssertion,
} from "./administrative-domain";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedId,
  assertBoundedOwnerScope,
} from "./input-contract";

export type RoleResolutionBlocker =
  | "NO_EXPLICIT_ROLE"
  | "CONFLICTING_ROLES"
  | "OWNER_NOT_TAX_DEBTOR"
  | "EVIDENCE_REQUIRED";

interface RoleEvidenceInputBase {
  readonly assertionId: string;
  readonly ownerScope: string;
  readonly documentId: string;
  readonly partyRefId: string;
  readonly role: AdministrativePartyRole;
  readonly confidence: number;
  readonly evidenceIds: readonly string[];
  readonly createdAt: string;
  readonly supersedesAssertionId?: string;
}

/**
 * USER_CONFIRMED is deliberately impossible to construct through this API
 * unless its caller marks the input as an explicit human action. The marker is
 * an intake guard only and is not persisted in AdministrativeRoleAssertion.
 */
export type RoleEvidenceInput = RoleEvidenceInputBase &
  (
    | { readonly assertionType: "EXPLICIT_IN_DOCUMENT" }
    | {
        readonly assertionType: "USER_CONFIRMED";
        readonly humanInputExplicit: true;
      }
  );

export interface RoleResolutionResult {
  readonly assertions: readonly AdministrativeRoleAssertion[];
  readonly effectiveOwnerRole: AdministrativePartyRole;
  readonly blockers: readonly RoleResolutionBlocker[];
  readonly requiresHumanReview: true;
}

export type OwnerTaxRoleAssessmentStatus =
  | "CONFIRMED_TAX_DEBTOR"
  | "THIRD_PARTY_OR_OTHER"
  | "UNKNOWN"
  | "CONFLICT";

export interface OwnerTaxRoleAssessment {
  readonly status: OwnerTaxRoleAssessmentStatus;
  readonly blockers: readonly RoleResolutionBlocker[];
  readonly requiresHumanReview: true;
}

export interface ResolveDocumentPartyRolesInput {
  readonly ownerScope: string;
  readonly documentId: string;
  /** Opaque reference previously and explicitly bound to the workspace owner. */
  readonly ownerPartyRefId: string;
  readonly evidence: readonly RoleEvidenceInput[];
}

export interface AssessOwnerTaxRoleInput {
  readonly ownerScope: string;
  readonly documentId: string;
  /** Opaque reference previously and explicitly bound to the workspace owner. */
  readonly ownerPartyRefId: string;
  readonly assertions: readonly AdministrativeRoleAssertion[];
  readonly humanInputExplicit?: true;
}

const ADMINISTRATIVE_PARTY_ROLES = new Set<AdministrativePartyRole>([
  "TAX_DEBTOR",
  "THIRD_PARTY_PAYER",
  "BENEFICIARY",
  "SPOUSE",
  "CO_OWNER",
  "REPRESENTATIVE",
  "DEPOSITARY",
  "PUBLIC_BODY_CREDITOR",
  "COLLABORATING_ENTITY",
  "UNKNOWN",
]);

const ROLE_ASSERTION_TYPES = new Set([
  "EXPLICIT_IN_DOCUMENT",
  "USER_CONFIRMED",
] as const);
const RESOLUTION_INPUT_KEYS = new Set([
  "ownerScope",
  "documentId",
  "ownerPartyRefId",
  "evidence",
]);
const ASSESSMENT_INPUT_KEYS = new Set([
  "ownerScope",
  "documentId",
  "ownerPartyRefId",
  "assertions",
  "humanInputExplicit",
]);
const HUMAN_INPUT_CONTEXT_KEYS = new Set(["humanInputExplicit"]);
const ROLE_ASSERTION_KEYS = new Set([
  "id",
  "ownerScope",
  "documentId",
  "partyRefId",
  "role",
  "assertionType",
  "confidence",
  "evidenceIds",
  "createdAt",
  "supersedesAssertionId",
]);
const ROLE_EVIDENCE_KEYS = new Set([
  "assertionId",
  "ownerScope",
  "documentId",
  "partyRefId",
  "role",
  "assertionType",
  "confidence",
  "evidenceIds",
  "createdAt",
  "supersedesAssertionId",
  "humanInputExplicit",
]);
const MAX_ROLE_ASSERTIONS = 256;
const ISO_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/u;

/**
 * Resolves only role assertions that are explicit in the input. It does not
 * infer a role from a name, document family, order, or position and it never
 * authorizes creation of a debt, payment, accounting entry, or money fact.
 */
export function resolveDocumentPartyRoles(
  input: ResolveDocumentPartyRolesInput,
): RoleResolutionResult {
  const safeInput = snapshotRecord(input, "$", RESOLUTION_INPUT_KEYS);
  assertBoundedOwnerScope(safeInput.ownerScope, "ownerScope");
  assertBoundedId(safeInput.documentId, "documentId");
  assertBoundedId(safeInput.ownerPartyRefId, "ownerPartyRefId");
  const ownerScope = safeInput.ownerScope;
  const documentId = safeInput.documentId;
  const ownerPartyRefId = safeInput.ownerPartyRefId;
  const evidence = snapshotCollection(safeInput.evidence, "evidence");

  const assertions = evidence.map((item, index) =>
    normalizeRoleEvidence(
      item,
      index,
      ownerScope,
      documentId,
    ),
  );

  // This also checks duplicate IDs and the supersession graph in O(n).
  const validated = validateAndSnapshotRoleAssertions(
    assertions,
    ownerScope,
    documentId,
    true,
  );
  const assessment = assessValidatedOwnerRole(
    validated.assertions,
    ownerPartyRefId,
  );
  const effectiveOwnerRole =
    assessment.status === "UNKNOWN" || assessment.status === "CONFLICT"
      ? "UNKNOWN"
      : effectiveRoleForOwner(validated.assertions, ownerPartyRefId);

  return Object.freeze({
    assertions: freezeAssertions(validated.assertions),
    effectiveOwnerRole,
    blockers: freezeBlockers([...validated.blockers, ...assessment.blockers]),
    requiresHumanReview: true as const,
  });
}

/**
 * Validates structure and provenance without deciding any downstream fiscal
 * effect. Structural violations fail closed with path-only errors.
 */
export function validateRoleAssertions(
  assertions: readonly AdministrativeRoleAssertion[],
  expectedOwnerScope: string,
  expectedDocumentId: string,
  context?: Readonly<{ humanInputExplicit?: true }>,
): readonly RoleResolutionBlocker[] {
  const humanInputExplicit = readHumanInputContext(context);
  return validateAndSnapshotRoleAssertions(
    assertions,
    expectedOwnerScope,
    expectedDocumentId,
    humanInputExplicit,
  ).blockers;
}

function validateAndSnapshotRoleAssertions(
  assertions: unknown,
  expectedOwnerScope: string,
  expectedDocumentId: string,
  humanInputExplicit: boolean,
): Readonly<{
  assertions: readonly AdministrativeRoleAssertion[];
  blockers: readonly RoleResolutionBlocker[];
}> {
  assertBoundedOwnerScope(expectedOwnerScope, "expectedOwnerScope");
  assertBoundedId(expectedDocumentId, "expectedDocumentId");
  const assertionInputs = snapshotCollection(assertions, "assertions");

  const byId = new Map<string, AdministrativeRoleAssertion>();
  const rolesByParty = new Map<string, Set<AdministrativePartyRole>>();
  const normalizedAssertions: AdministrativeRoleAssertion[] = [];
  let evidenceMissing = false;
  let hasExplicitRole = false;

  for (let index = 0; index < assertionInputs.length; index += 1) {
    const path = `assertions[${index}]`;
    const assertion = snapshotRoleAssertion(
      assertionInputs[index],
      path,
      expectedOwnerScope,
      expectedDocumentId,
      humanInputExplicit,
    );
    normalizedAssertions.push(assertion);

    if (byId.has(assertion.id)) {
      fail(`${path}.id`);
    }
    byId.set(assertion.id, assertion);

    const partyRoles = rolesByParty.get(assertion.partyRefId) ?? new Set();
    partyRoles.add(assertion.role);
    rolesByParty.set(assertion.partyRefId, partyRoles);
    if (assertion.role !== "UNKNOWN") hasExplicitRole = true;
    if (assertion.evidenceIds.length === 0) evidenceMissing = true;
  }

  assertValidSupersessionGraph(normalizedAssertions, byId);

  const blockers: RoleResolutionBlocker[] = [];
  if (!hasExplicitRole) blockers.push("NO_EXPLICIT_ROLE");
  if (evidenceMissing) blockers.push("EVIDENCE_REQUIRED");
  if ([...rolesByParty.values()].some((roles) => roles.size > 1)) {
    blockers.push("CONFLICTING_ROLES");
  }
  return Object.freeze({
    assertions: freezeAssertions(normalizedAssertions),
    blockers: freezeBlockers(blockers),
  });
}

/**
 * Classifies an explicitly identified owner's role. Despite the status name,
 * this assessment is always subject to human review and cannot materialize or
 * authorize debt, payment, accounting, or any other fiscal effect.
 */
export function assessOwnerTaxRole(
  input: AssessOwnerTaxRoleInput,
): OwnerTaxRoleAssessment {
  const safeInput = snapshotRecord(input, "$", ASSESSMENT_INPUT_KEYS);
  assertBoundedOwnerScope(safeInput.ownerScope, "ownerScope");
  assertBoundedId(safeInput.documentId, "documentId");
  assertBoundedId(safeInput.ownerPartyRefId, "ownerPartyRefId");
  if (
    safeInput.humanInputExplicit !== undefined &&
    safeInput.humanInputExplicit !== true
  ) {
    fail("humanInputExplicit");
  }
  const validated = validateAndSnapshotRoleAssertions(
    safeInput.assertions,
    safeInput.ownerScope,
    safeInput.documentId,
    safeInput.humanInputExplicit === true,
  );
  const ownerAssessment = assessValidatedOwnerRole(
    validated.assertions,
    safeInput.ownerPartyRefId,
  );
  return assessment(ownerAssessment.status, [
    ...validated.blockers,
    ...ownerAssessment.blockers,
  ]);
}

function normalizeRoleEvidence(
  value: unknown,
  index: number,
  expectedOwnerScope: string,
  expectedDocumentId: string,
): AdministrativeRoleAssertion {
  const path = `evidence[${index}]`;
  const evidence = snapshotRecord(value, path, ROLE_EVIDENCE_KEYS);
  assertBoundedId(evidence.assertionId, `${path}.assertionId`);
  assertBoundedOwnerScope(evidence.ownerScope, `${path}.ownerScope`);
  if (evidence.ownerScope !== expectedOwnerScope) {
    throw new FiscalNotificationInputError(
      "OWNER_SCOPE_MISMATCH",
      `${path}.ownerScope`,
    );
  }
  assertBoundedId(evidence.documentId, `${path}.documentId`);
  if (evidence.documentId !== expectedDocumentId) fail(`${path}.documentId`);
  assertBoundedId(evidence.partyRefId, `${path}.partyRefId`);
  assertRole(evidence.role, `${path}.role`);
  assertAssertionType(evidence.assertionType, `${path}.assertionType`);
  assertConfidence(evidence.confidence, `${path}.confidence`);
  const evidenceIds = snapshotIdList(
    evidence.evidenceIds,
    `${path}.evidenceIds`,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds,
  );
  assertIsoTimestamp(evidence.createdAt, `${path}.createdAt`);
  if (evidence.supersedesAssertionId !== undefined) {
    assertBoundedId(
      evidence.supersedesAssertionId,
      `${path}.supersedesAssertionId`,
    );
  }
  if (
    evidence.assertionType === "USER_CONFIRMED" &&
    evidence.humanInputExplicit !== true
  ) {
    fail(`${path}.humanInputExplicit`);
  }
  if (
    evidence.assertionType === "EXPLICIT_IN_DOCUMENT" &&
    "humanInputExplicit" in evidence
  ) {
    fail(`${path}.humanInputExplicit`);
  }

  return Object.freeze({
    id: evidence.assertionId,
    ownerScope: evidence.ownerScope,
    documentId: evidence.documentId,
    partyRefId: evidence.partyRefId,
    role: evidence.role,
    assertionType: evidence.assertionType,
    confidence: evidence.confidence,
    evidenceIds,
    createdAt: evidence.createdAt,
    ...(evidence.supersedesAssertionId
      ? { supersedesAssertionId: evidence.supersedesAssertionId }
      : {}),
  });
}

function snapshotRoleAssertion(
  value: unknown,
  path: string,
  expectedOwnerScope: string,
  expectedDocumentId: string,
  humanInputExplicit: boolean,
): AdministrativeRoleAssertion {
  const assertion = snapshotRecord(value, path, ROLE_ASSERTION_KEYS);
  assertBoundedId(assertion.id, `${path}.id`);
  assertBoundedOwnerScope(assertion.ownerScope, `${path}.ownerScope`);
  if (assertion.ownerScope !== expectedOwnerScope) {
    throw new FiscalNotificationInputError(
      "OWNER_SCOPE_MISMATCH",
      `${path}.ownerScope`,
    );
  }
  assertBoundedId(assertion.documentId, `${path}.documentId`);
  if (assertion.documentId !== expectedDocumentId) fail(`${path}.documentId`);
  assertBoundedId(assertion.partyRefId, `${path}.partyRefId`);
  assertRole(assertion.role, `${path}.role`);
  assertAssertionType(assertion.assertionType, `${path}.assertionType`);
  assertConfidence(assertion.confidence, `${path}.confidence`);
  if (
    assertion.assertionType === "USER_CONFIRMED" &&
    !humanInputExplicit
  ) {
    fail(`${path}.assertionType`);
  }
  const evidenceIds = snapshotIdList(
    assertion.evidenceIds,
    `${path}.evidenceIds`,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds,
  );
  assertIsoTimestamp(assertion.createdAt, `${path}.createdAt`);
  if (assertion.supersedesAssertionId !== undefined) {
    assertBoundedId(
      assertion.supersedesAssertionId,
      `${path}.supersedesAssertionId`,
    );
  }
  return Object.freeze({
    id: assertion.id,
    ownerScope: assertion.ownerScope,
    documentId: assertion.documentId,
    partyRefId: assertion.partyRefId,
    role: assertion.role,
    assertionType: assertion.assertionType,
    confidence: assertion.confidence,
    evidenceIds,
    createdAt: assertion.createdAt,
    ...(assertion.supersedesAssertionId
      ? { supersedesAssertionId: assertion.supersedesAssertionId }
      : {}),
  });
}

function assessValidatedOwnerRole(
  assertions: readonly AdministrativeRoleAssertion[],
  ownerPartyRefId: string,
): OwnerTaxRoleAssessment {
  const ownerAssertions = assertions.filter(
    (assertion) => assertion.partyRefId === ownerPartyRefId,
  );
  if (ownerAssertions.length === 0) {
    return assessment("UNKNOWN", ["NO_EXPLICIT_ROLE"]);
  }
  if (ownerAssertions.some((assertion) => assertion.evidenceIds.length === 0)) {
    return assessment("UNKNOWN", ["EVIDENCE_REQUIRED"]);
  }

  const roles = new Set(ownerAssertions.map((assertion) => assertion.role));
  if (roles.size > 1) {
    return assessment("CONFLICT", ["CONFLICTING_ROLES"]);
  }
  const [role] = roles;
  if (!role || role === "UNKNOWN") {
    return assessment("UNKNOWN", ["NO_EXPLICIT_ROLE"]);
  }
  if (role === "TAX_DEBTOR") {
    return assessment("CONFIRMED_TAX_DEBTOR", []);
  }
  return assessment("THIRD_PARTY_OR_OTHER", ["OWNER_NOT_TAX_DEBTOR"]);
}

function effectiveRoleForOwner(
  assertions: readonly AdministrativeRoleAssertion[],
  ownerPartyRefId: string,
): AdministrativePartyRole {
  const roles = new Set(
    assertions
      .filter((assertion) => assertion.partyRefId === ownerPartyRefId)
      .map((assertion) => assertion.role),
  );
  return roles.size === 1 ? ([...roles][0] ?? "UNKNOWN") : "UNKNOWN";
}

function assessment(
  status: OwnerTaxRoleAssessmentStatus,
  blockers: readonly RoleResolutionBlocker[],
): OwnerTaxRoleAssessment {
  return Object.freeze({
    status,
    blockers: freezeBlockers(blockers),
    requiresHumanReview: true as const,
  });
}

function assertValidSupersessionGraph(
  assertions: readonly AdministrativeRoleAssertion[],
  byId: ReadonlyMap<string, AdministrativeRoleAssertion>,
): void {
  const resolved = new Set<string>();
  for (let index = 0; index < assertions.length; index += 1) {
    const start = assertions[index];
    const pathIds: string[] = [];
    const pathSet = new Set<string>();
    let current: AdministrativeRoleAssertion | undefined = start;

    while (current?.supersedesAssertionId) {
      if (current.supersedesAssertionId === current.id) {
        fail(`assertions[${index}].supersedesAssertionId`);
      }
      if (pathSet.has(current.id)) {
        fail(`assertions[${index}].supersedesAssertionId`);
      }
      pathSet.add(current.id);
      pathIds.push(current.id);
      const parent = byId.get(current.supersedesAssertionId);
      if (!parent) fail(`assertions[${index}].supersedesAssertionId`);
      if (resolved.has(parent.id)) break;
      current = parent;
    }
    for (const id of pathIds) resolved.add(id);
    if (current) resolved.add(current.id);
  }
}

function snapshotRecord(
  value: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      fail(path);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail(path);
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        typeof key !== "string" ||
        !allowedKeys.has(key) ||
        !descriptor ||
        !("value" in descriptor)
      ) {
        fail(path === "$" ? "$.$unknown" : `${path}.$unknown`);
      }
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch (error) {
    if (error instanceof FiscalNotificationInputError) throw error;
    fail(path);
  }
}

function snapshotCollection(
  value: unknown,
  path: string,
  max: number = MAX_ROLE_ASSERTIONS,
): readonly unknown[] {
  try {
    if (!Array.isArray(value)) fail(path);
    if (Object.getPrototypeOf(value) !== Array.prototype) fail(path);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      Number(lengthDescriptor.value) < 0
    ) {
      fail(path);
    }
    const length = Number(lengthDescriptor.value);
    if (length > max) {
      throw new FiscalNotificationInputError(
        "COLLECTION_LIMIT_EXCEEDED",
        path,
      );
    }
    for (const key of Reflect.ownKeys(value)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        fail(`${path}.$unknown`);
      }
      const numericKey = Number(key);
      if (
        !Number.isSafeInteger(numericKey) ||
        numericKey < 0 ||
        numericKey >= length
      ) {
        fail(`${path}.$unknown`);
      }
    }
    const snapshot: unknown[] = new Array(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) fail(`${path}[${index}]`);
      snapshot[index] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof FiscalNotificationInputError) throw error;
    fail(path);
  }
}

function snapshotIdList(
  value: unknown,
  path: string,
  max: number,
): readonly string[] {
  const items = snapshotCollection(value, path, max);
  const result: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const itemPath = `${path}[${index}]`;
    const item = items[index];
    assertBoundedId(item, itemPath);
    if (seen.has(item)) fail(itemPath);
    seen.add(item);
    result.push(item);
  }
  return Object.freeze(result);
}

function readHumanInputContext(
  context?: Readonly<{ humanInputExplicit?: true }>,
): boolean {
  if (context === undefined) return false;
  const safeContext = snapshotRecord(
    context,
    "context",
    HUMAN_INPUT_CONTEXT_KEYS,
  );
  if (
    safeContext.humanInputExplicit !== undefined &&
    safeContext.humanInputExplicit !== true
  ) {
    fail("context.humanInputExplicit");
  }
  return safeContext.humanInputExplicit === true;
}

function assertRole(
  value: unknown,
  path: string,
): asserts value is AdministrativePartyRole {
  if (
    typeof value !== "string" ||
    !ADMINISTRATIVE_PARTY_ROLES.has(value as AdministrativePartyRole)
  ) {
    fail(path);
  }
}

function assertAssertionType(
  value: unknown,
  path: string,
): asserts value is AdministrativeRoleAssertion["assertionType"] {
  if (
    typeof value !== "string" ||
    !ROLE_ASSERTION_TYPES.has(
      value as AdministrativeRoleAssertion["assertionType"],
    )
  ) {
    fail(path);
  }
}

function assertConfidence(value: unknown, path: string): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    fail(path);
  }
}

function assertIsoTimestamp(value: unknown, path: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !ISO_UTC_TIMESTAMP_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    fail(path);
  }
  const parsed = new Date(value).toISOString();
  if (parsed !== value) fail(path);
}

function freezeAssertions(
  assertions: readonly AdministrativeRoleAssertion[],
): readonly AdministrativeRoleAssertion[] {
  return Object.freeze(
    assertions.map((assertion) =>
      Object.freeze({
        ...assertion,
        evidenceIds: Object.freeze([...assertion.evidenceIds]),
      }),
    ),
  );
}

function freezeBlockers(
  blockers: readonly RoleResolutionBlocker[],
): readonly RoleResolutionBlocker[] {
  return Object.freeze([...new Set(blockers)]);
}

function fail(path: string): never {
  throw new FiscalNotificationInputError("INVALID_INPUT", path);
}
