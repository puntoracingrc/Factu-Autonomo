import type { AssertionType } from "./types";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedId,
  assertBoundedIdList,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";

export const ADMINISTRATIVE_DOMAIN_SCHEMA_VERSION = 1 as const;

export type AdministrativePartyRole =
  | "TAX_DEBTOR"
  | "THIRD_PARTY_PAYER"
  | "BENEFICIARY"
  | "SPOUSE"
  | "CO_OWNER"
  | "REPRESENTATIVE"
  | "DEPOSITARY"
  | "PUBLIC_BODY_CREDITOR"
  | "COLLABORATING_ENTITY"
  | "UNKNOWN";

export type AdministrativeMoneyKind =
  | "ORIGINAL_TAX_PRINCIPAL"
  | "PROPOSED_QUOTA"
  | "FINAL_QUOTA"
  | "DEFERRAL_INTEREST"
  | "LATE_PAYMENT_INTEREST"
  | "EXECUTIVE_SURCHARGE_5"
  | "EXECUTIVE_SURCHARGE_10"
  | "EXECUTIVE_SURCHARGE_20"
  | "SANCTION_INITIAL"
  | "SANCTION_REDUCTION"
  | "SANCTION_REDUCED"
  | "COSTS"
  | "REFUND_CREDIT"
  | "OFFSET_APPLIED"
  | "NET_REFUND_PAYMENT"
  | "SEIZED_AMOUNT"
  | "RETAINED_AMOUNT"
  | "REMITTED_AMOUNT"
  | "PAYMENT_CONFIRMED";

export type AdministrativeProjectionStatus =
  | "UNKNOWN"
  | "INCOMPLETE"
  | "REVIEW_REQUIRED"
  | "USER_CONFIRMED";

export type AdministrativeMaterializationPolicy =
  "PROHIBITED_UNTIL_REVIEW";

export interface AdministrativeRoleAssertion {
  readonly id: string;
  readonly ownerScope: string;
  readonly documentId: string;
  readonly partyRefId: string;
  readonly role: AdministrativePartyRole;
  readonly assertionType: "EXPLICIT_IN_DOCUMENT" | "USER_CONFIRMED";
  /** Finite score in [0, 1]. It never authorizes automatic confirmation. */
  readonly confidence: number;
  readonly evidenceIds: readonly string[];
  readonly createdAt: string;
  readonly supersedesAssertionId?: string;
}

export interface AdministrativeMoneyFact {
  readonly id: string;
  readonly ownerScope: string;
  readonly documentId: string;
  readonly kind: AdministrativeMoneyKind;
  readonly amountCents: number;
  readonly currency: "EUR";
  readonly assertionType: AssertionType;
  readonly evidenceIds: readonly string[];
  readonly sourceActRefId?: string;
  readonly lineageParentIds: readonly string[];
  readonly status: "PROPOSED" | "USER_CONFIRMED" | "SUPERSEDED" | "UNKNOWN";
  readonly createdAt: string;
}

export type AdministrativeDomainValidationIssueCode =
  | "UNKNOWN_KEY"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_SCHEMA_VERSION"
  | "INVALID_OWNER_SCOPE"
  | "OWNER_SCOPE_MISMATCH"
  | "INVALID_DOCUMENT_ID"
  | "DOCUMENT_ID_MISMATCH"
  | "INVALID_ID"
  | "INVALID_TIMESTAMP"
  | "INVALID_ENUM"
  | "INVALID_CONFIDENCE"
  | "HUMAN_INPUT_REQUIRED"
  | "INVALID_AMOUNT"
  | "INVALID_VALUE"
  | "DUPLICATE_ID"
  | "DANGLING_LINEAGE"
  | "SELF_LINEAGE"
  | "CYCLIC_LINEAGE"
  | "COLLECTION_LIMIT_EXCEEDED";

export interface AdministrativeDomainValidationIssue {
  readonly code: AdministrativeDomainValidationIssueCode;
  readonly severity: "ERROR" | "WARNING";
  readonly path: string;
}

export interface AdministrativeDomainProjection {
  readonly schemaVersion: 1;
  readonly ownerScope: string;
  readonly documentId: string;
  readonly extractorId: string;
  readonly extractorVersion: string;
  readonly createdAt: string;
  readonly familyId: string | null;
  readonly status: AdministrativeProjectionStatus;
  readonly roleAssertions: readonly AdministrativeRoleAssertion[];
  readonly moneyFacts: readonly AdministrativeMoneyFact[];
  readonly missingFieldIds: readonly string[];
  readonly alternativeFamilyIds: readonly string[];
  readonly validationIssues: readonly AdministrativeDomainValidationIssue[];
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly requiresHumanReview: true;
}

export interface AdministrativeDomainProjectionValidationResult {
  readonly projection: AdministrativeDomainProjection | null;
  readonly issues: readonly AdministrativeDomainValidationIssue[];
  readonly valid: boolean;
}

export interface EmptyAdministrativeDomainProjectionInput {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly extractorId: string;
  readonly extractorVersion: string;
  readonly createdAt: string;
}

const PARTY_ROLES: ReadonlySet<AdministrativePartyRole> = new Set([
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

const MONEY_KINDS: ReadonlySet<AdministrativeMoneyKind> = new Set([
  "ORIGINAL_TAX_PRINCIPAL",
  "PROPOSED_QUOTA",
  "FINAL_QUOTA",
  "DEFERRAL_INTEREST",
  "LATE_PAYMENT_INTEREST",
  "EXECUTIVE_SURCHARGE_5",
  "EXECUTIVE_SURCHARGE_10",
  "EXECUTIVE_SURCHARGE_20",
  "SANCTION_INITIAL",
  "SANCTION_REDUCTION",
  "SANCTION_REDUCED",
  "COSTS",
  "REFUND_CREDIT",
  "OFFSET_APPLIED",
  "NET_REFUND_PAYMENT",
  "SEIZED_AMOUNT",
  "RETAINED_AMOUNT",
  "REMITTED_AMOUNT",
  "PAYMENT_CONFIRMED",
]);

const PROJECTION_STATUSES: ReadonlySet<AdministrativeProjectionStatus> = new Set([
  "UNKNOWN",
  "INCOMPLETE",
  "REVIEW_REQUIRED",
  "USER_CONFIRMED",
]);
const ROLE_ASSERTION_TYPES = new Set([
  "EXPLICIT_IN_DOCUMENT",
  "USER_CONFIRMED",
] as const);
const ASSERTION_TYPES: ReadonlySet<AssertionType> = new Set([
  "EXPLICIT_IN_DOCUMENT",
  "CALCULATED",
  "INFERRED",
  "USER_CONFIRMED",
]);
const MONEY_STATUSES = new Set([
  "PROPOSED",
  "USER_CONFIRMED",
  "SUPERSEDED",
  "UNKNOWN",
] as const);
const ISSUE_CODES: ReadonlySet<AdministrativeDomainValidationIssueCode> =
  new Set([
    "UNKNOWN_KEY",
    "MISSING_REQUIRED_FIELD",
    "INVALID_SCHEMA_VERSION",
    "INVALID_OWNER_SCOPE",
    "OWNER_SCOPE_MISMATCH",
    "INVALID_DOCUMENT_ID",
    "DOCUMENT_ID_MISMATCH",
    "INVALID_ID",
    "INVALID_TIMESTAMP",
    "INVALID_ENUM",
    "INVALID_CONFIDENCE",
    "HUMAN_INPUT_REQUIRED",
    "INVALID_AMOUNT",
    "INVALID_VALUE",
    "DUPLICATE_ID",
    "DANGLING_LINEAGE",
    "SELF_LINEAGE",
    "CYCLIC_LINEAGE",
    "COLLECTION_LIMIT_EXCEEDED",
  ]);

const PROJECTION_KEYS = new Set([
  "schemaVersion",
  "ownerScope",
  "documentId",
  "extractorId",
  "extractorVersion",
  "createdAt",
  "familyId",
  "status",
  "roleAssertions",
  "moneyFacts",
  "missingFieldIds",
  "alternativeFamilyIds",
  "validationIssues",
  "materializationPolicy",
  "requiresHumanReview",
]);
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
const MONEY_FACT_KEYS = new Set([
  "id",
  "ownerScope",
  "documentId",
  "kind",
  "amountCents",
  "currency",
  "assertionType",
  "evidenceIds",
  "sourceActRefId",
  "lineageParentIds",
  "status",
  "createdAt",
]);
const VALIDATION_ISSUE_KEYS = new Set(["code", "severity", "path"]);
const EMPTY_PROJECTION_INPUT_KEYS = new Set([
  "ownerScope",
  "documentId",
  "extractorId",
  "extractorVersion",
  "createdAt",
]);
const SAFE_VALIDATION_PATH_ROOTS = new Set(PROJECTION_KEYS);
const SAFE_VALIDATION_PATH_SEGMENTS = new Set([
  ...PROJECTION_KEYS,
  ...ROLE_ASSERTION_KEYS,
  ...MONEY_FACT_KEYS,
  ...VALIDATION_ISSUE_KEYS,
]);
const MAX_DOMAIN_VALIDATION_ISSUES = 256;
const ARRAY_LIMIT_EXCEEDED = Symbol("ARRAY_LIMIT_EXCEEDED");

export function createEmptyAdministrativeDomainProjection(
  input: EmptyAdministrativeDomainProjectionInput,
): AdministrativeDomainProjection {
  const safeInput = snapshotDataRecord(input);
  if (!safeInput) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "$");
  }
  const unknownInputKey = Reflect.ownKeys(safeInput).some(
    (key) => typeof key !== "string" || !EMPTY_PROJECTION_INPUT_KEYS.has(key),
  );
  if (unknownInputKey) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "$.$unknown");
  }
  assertBoundedOwnerScope(safeInput.ownerScope, "ownerScope");
  assertBoundedId(safeInput.documentId, "documentId");
  assertBoundedId(safeInput.extractorId, "extractorId");
  assertBoundedId(safeInput.extractorVersion, "extractorVersion");
  if (!isIsoTimestamp(safeInput.createdAt)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "createdAt");
  }

  return freezeProjection({
    schemaVersion: ADMINISTRATIVE_DOMAIN_SCHEMA_VERSION,
    ownerScope: safeInput.ownerScope,
    documentId: safeInput.documentId,
    extractorId: safeInput.extractorId,
    extractorVersion: safeInput.extractorVersion,
    createdAt: safeInput.createdAt,
    familyId: null,
    status: "REVIEW_REQUIRED",
    roleAssertions: [],
    moneyFacts: [],
    missingFieldIds: [],
    alternativeFamilyIds: [],
    validationIssues: [],
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    requiresHumanReview: true,
  });
}

export function validateAdministrativeDomainProjection(
  value: unknown,
  expectedOwnerScope: string,
  expectedDocumentId: string,
  context?: Readonly<{ humanInputExplicit?: true }>,
): AdministrativeDomainProjectionValidationResult {
  const issues: AdministrativeDomainValidationIssue[] = [];
  try {
  let humanInputExplicit = false;
  if (context !== undefined) {
    const safeContext = snapshotDataRecord(context);
    if (!safeContext) {
      addIssue(issues, "INVALID_VALUE", "context", "ERROR");
    } else {
      const contextKeys = Reflect.ownKeys(safeContext);
      if (
        contextKeys.some(
          (key) => key !== "humanInputExplicit",
        ) ||
        ("humanInputExplicit" in safeContext &&
          safeContext.humanInputExplicit !== true)
      ) {
        addIssue(issues, "INVALID_VALUE", "context", "ERROR");
      } else {
        humanInputExplicit = safeContext.humanInputExplicit === true;
      }
    }
  }
  validateExpectedContext(expectedOwnerScope, expectedDocumentId, issues);
  const input = snapshotDataRecord(value);
  if (!input) {
    addIssue(issues, "INVALID_VALUE", "$", "ERROR");
    return invalidResult(issues);
  }
  validateKnownKeys(input, PROJECTION_KEYS, "$", issues);

  if (input.schemaVersion !== ADMINISTRATIVE_DOMAIN_SCHEMA_VERSION) {
    addIssue(issues, "INVALID_SCHEMA_VERSION", "schemaVersion", "ERROR");
  }
  validateOwnerScope(input.ownerScope, "ownerScope", issues);
  if (input.ownerScope !== expectedOwnerScope) {
    addIssue(issues, "OWNER_SCOPE_MISMATCH", "ownerScope", "ERROR");
  }
  validateId(input.documentId, "documentId", "INVALID_DOCUMENT_ID", issues);
  if (input.documentId !== expectedDocumentId) {
    addIssue(issues, "DOCUMENT_ID_MISMATCH", "documentId", "ERROR");
  }
  validateId(input.extractorId, "extractorId", "INVALID_ID", issues);
  validateId(input.extractorVersion, "extractorVersion", "INVALID_ID", issues);
  if (!isIsoTimestamp(input.createdAt)) {
    addIssue(issues, "INVALID_TIMESTAMP", "createdAt", "ERROR");
  }
  if (input.familyId !== null) {
    validateId(input.familyId, "familyId", "INVALID_ID", issues);
  }
  if (!PROJECTION_STATUSES.has(input.status as AdministrativeProjectionStatus)) {
    addIssue(issues, "INVALID_ENUM", "status", "ERROR");
  }
  if (input.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW") {
    addIssue(issues, "INVALID_ENUM", "materializationPolicy", "ERROR");
  }
  if (input.requiresHumanReview !== true) {
    addIssue(issues, "INVALID_VALUE", "requiresHumanReview", "ERROR");
  }

  const roleAssertionInputs = snapshotProjectionCollection(
    input.roleAssertions,
    "roleAssertions",
    issues,
  );
  const moneyFactInputs = snapshotProjectionCollection(
    input.moneyFacts,
    "moneyFacts",
    issues,
  );
  const projectionFactLimitExceeded =
    roleAssertionInputs !== null &&
    moneyFactInputs !== null &&
    roleAssertionInputs.length + moneyFactInputs.length >
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts;
  if (projectionFactLimitExceeded) {
    addIssue(
      issues,
      "COLLECTION_LIMIT_EXCEEDED",
      "roleAssertions",
      "ERROR",
    );
  }

  const roleAssertions = projectionFactLimitExceeded || !roleAssertionInputs
    ? []
    : validateRoleAssertions(
    roleAssertionInputs,
    expectedOwnerScope,
    expectedDocumentId,
    issues,
  );
  const moneyFacts = projectionFactLimitExceeded || !moneyFactInputs
    ? []
    : validateMoneyFacts(
    moneyFactInputs,
    expectedOwnerScope,
    expectedDocumentId,
    issues,
  );

  const missingFieldIds = validateIdList(
    input.missingFieldIds,
    "missingFieldIds",
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts,
    issues,
  );
  const alternativeFamilyIds = validateIdList(
    input.alternativeFamilyIds,
    "alternativeFamilyIds",
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxRelationKeys,
    issues,
  );
  const suppliedValidationIssues = validateSuppliedIssues(
    input.validationIssues,
    issues,
  );

  validateUniqueEntityIds(roleAssertions, moneyFacts, issues);
  validateRoleSupersession(roleAssertions, issues);
  validateMoneyLineage(moneyFacts, issues);
  const hasUserConfirmedInput =
    input.status === "USER_CONFIRMED" ||
    roleAssertions.some((item) => item.assertionType === "USER_CONFIRMED") ||
    moneyFacts.some(
      (item) =>
        item.assertionType === "USER_CONFIRMED" || item.status === "USER_CONFIRMED",
    );
  if (hasUserConfirmedInput && !humanInputExplicit) {
    addIssue(issues, "HUMAN_INPUT_REQUIRED", "status", "ERROR");
  }

  if (issues.some((issue) => issue.severity === "ERROR")) {
    return invalidResult(issues);
  }

  const projection = freezeProjection({
    schemaVersion: ADMINISTRATIVE_DOMAIN_SCHEMA_VERSION,
    ownerScope: expectedOwnerScope,
    documentId: expectedDocumentId,
    extractorId: input.extractorId as string,
    extractorVersion: input.extractorVersion as string,
    createdAt: input.createdAt as string,
    familyId: input.familyId as string | null,
    status: input.status as AdministrativeProjectionStatus,
    roleAssertions,
    moneyFacts,
    missingFieldIds,
    alternativeFamilyIds,
    validationIssues: suppliedValidationIssues,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    requiresHumanReview: true,
  });
  return Object.freeze({
    projection,
    issues: Object.freeze(issues.map(freezeIssue)),
    valid: true,
  });
  } catch {
    addIssue(issues, "INVALID_VALUE", "$", "ERROR");
    return invalidResult(issues);
  }
}

export function assertAdministrativeDomainProjection(
  value: unknown,
  expectedOwnerScope: string,
  expectedDocumentId: string,
  context?: Readonly<{ humanInputExplicit?: true }>,
): asserts value is AdministrativeDomainProjection {
  const result = validateAdministrativeDomainProjection(
    value,
    expectedOwnerScope,
    expectedDocumentId,
    context,
  );
  if (!result.valid || !result.projection) {
    throw new FiscalNotificationInputError(
      "INVALID_INPUT",
      result.issues[0]?.path ?? "$",
    );
  }
  if (!isDeepFrozenPlainData(value)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "$frozen");
  }
}

function validateExpectedContext(
  ownerScope: unknown,
  documentId: unknown,
  issues: AdministrativeDomainValidationIssue[],
): void {
  validateOwnerScope(ownerScope, "expectedOwnerScope", issues);
  validateId(documentId, "expectedDocumentId", "INVALID_DOCUMENT_ID", issues);
}

function snapshotProjectionCollection(
  value: unknown,
  path: "roleAssertions" | "moneyFacts",
  issues: AdministrativeDomainValidationIssue[],
): readonly unknown[] | null {
  if (!Array.isArray(value)) {
    addIssue(issues, "MISSING_REQUIRED_FIELD", path, "ERROR");
    return null;
  }
  const snapshot = snapshotDataArray(
    value,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts,
  );
  if (snapshot === ARRAY_LIMIT_EXCEEDED) {
    addIssue(issues, "COLLECTION_LIMIT_EXCEEDED", path, "ERROR");
    return null;
  }
  if (!snapshot) {
    addIssue(issues, "INVALID_VALUE", path, "ERROR");
    return null;
  }
  return snapshot;
}

function validateRoleAssertions(
  assertions: readonly unknown[],
  expectedOwnerScope: string,
  expectedDocumentId: string,
  issues: AdministrativeDomainValidationIssue[],
): AdministrativeRoleAssertion[] {
  const result: AdministrativeRoleAssertion[] = [];
  for (let index = 0; index < assertions.length; index += 1) {
    const path = `roleAssertions[${index}]`;
    const assertion = snapshotDataRecord(assertions[index]);
    if (!assertion) {
      addIssue(issues, "INVALID_VALUE", path, "ERROR");
      continue;
    }
    validateKnownKeys(assertion, ROLE_ASSERTION_KEYS, path, issues);
    validateId(assertion.id, `${path}.id`, "INVALID_ID", issues);
    validateOwnerScope(assertion.ownerScope, `${path}.ownerScope`, issues);
    if (assertion.ownerScope !== expectedOwnerScope) {
      addIssue(issues, "OWNER_SCOPE_MISMATCH", `${path}.ownerScope`, "ERROR");
    }
    validateId(
      assertion.documentId,
      `${path}.documentId`,
      "INVALID_DOCUMENT_ID",
      issues,
    );
    if (assertion.documentId !== expectedDocumentId) {
      addIssue(issues, "DOCUMENT_ID_MISMATCH", `${path}.documentId`, "ERROR");
    }
    validateId(assertion.partyRefId, `${path}.partyRefId`, "INVALID_ID", issues);
    if (!PARTY_ROLES.has(assertion.role as AdministrativePartyRole)) {
      addIssue(issues, "INVALID_ENUM", `${path}.role`, "ERROR");
    }
    if (!ROLE_ASSERTION_TYPES.has(assertion.assertionType as never)) {
      addIssue(issues, "INVALID_ENUM", `${path}.assertionType`, "ERROR");
    }
    if (
      typeof assertion.confidence !== "number" ||
      !Number.isFinite(assertion.confidence) ||
      assertion.confidence < 0 ||
      assertion.confidence > 1
    ) {
      addIssue(issues, "INVALID_CONFIDENCE", `${path}.confidence`, "ERROR");
    }
    const evidenceIds = validateIdList(
      assertion.evidenceIds,
      `${path}.evidenceIds`,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds,
      issues,
    );
    if (!isIsoTimestamp(assertion.createdAt)) {
      addIssue(issues, "INVALID_TIMESTAMP", `${path}.createdAt`, "ERROR");
    }
    if (assertion.supersedesAssertionId !== undefined) {
      validateId(
        assertion.supersedesAssertionId,
        `${path}.supersedesAssertionId`,
        "INVALID_ID",
        issues,
      );
      if (assertion.supersedesAssertionId === assertion.id) {
        addIssue(
          issues,
          "SELF_LINEAGE",
          `${path}.supersedesAssertionId`,
          "ERROR",
        );
      }
    }

    result.push({
      id: assertion.id as string,
      ownerScope: assertion.ownerScope as string,
      documentId: assertion.documentId as string,
      partyRefId: assertion.partyRefId as string,
      role: assertion.role as AdministrativePartyRole,
      assertionType: assertion.assertionType as AdministrativeRoleAssertion["assertionType"],
      confidence: assertion.confidence as number,
      evidenceIds,
      createdAt: assertion.createdAt as string,
      ...(assertion.supersedesAssertionId === undefined
        ? {}
        : { supersedesAssertionId: assertion.supersedesAssertionId as string }),
    });
  }
  return result;
}

function validateMoneyFacts(
  facts: readonly unknown[],
  expectedOwnerScope: string,
  expectedDocumentId: string,
  issues: AdministrativeDomainValidationIssue[],
): AdministrativeMoneyFact[] {
  const result: AdministrativeMoneyFact[] = [];
  for (let index = 0; index < facts.length; index += 1) {
    const path = `moneyFacts[${index}]`;
    const fact = snapshotDataRecord(facts[index]);
    if (!fact) {
      addIssue(issues, "INVALID_VALUE", path, "ERROR");
      continue;
    }
    validateKnownKeys(fact, MONEY_FACT_KEYS, path, issues);
    validateId(fact.id, `${path}.id`, "INVALID_ID", issues);
    validateOwnerScope(fact.ownerScope, `${path}.ownerScope`, issues);
    if (fact.ownerScope !== expectedOwnerScope) {
      addIssue(issues, "OWNER_SCOPE_MISMATCH", `${path}.ownerScope`, "ERROR");
    }
    validateId(fact.documentId, `${path}.documentId`, "INVALID_DOCUMENT_ID", issues);
    if (fact.documentId !== expectedDocumentId) {
      addIssue(issues, "DOCUMENT_ID_MISMATCH", `${path}.documentId`, "ERROR");
    }
    if (!MONEY_KINDS.has(fact.kind as AdministrativeMoneyKind)) {
      addIssue(issues, "INVALID_ENUM", `${path}.kind`, "ERROR");
    }
    try {
      assertNonNegativeIntegerCents(fact.amountCents, `${path}.amountCents`);
    } catch {
      addIssue(issues, "INVALID_AMOUNT", `${path}.amountCents`, "ERROR");
    }
    if (fact.currency !== "EUR") {
      addIssue(issues, "INVALID_ENUM", `${path}.currency`, "ERROR");
    }
    if (!ASSERTION_TYPES.has(fact.assertionType as AssertionType)) {
      addIssue(issues, "INVALID_ENUM", `${path}.assertionType`, "ERROR");
    }
    const evidenceIds = validateIdList(
      fact.evidenceIds,
      `${path}.evidenceIds`,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds,
      issues,
    );
    if (fact.sourceActRefId !== undefined) {
      validateId(fact.sourceActRefId, `${path}.sourceActRefId`, "INVALID_ID", issues);
    }
    const lineageParentIds = validateIdList(
      fact.lineageParentIds,
      `${path}.lineageParentIds`,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxRelationKeys,
      issues,
    );
    if (!MONEY_STATUSES.has(fact.status as never)) {
      addIssue(issues, "INVALID_ENUM", `${path}.status`, "ERROR");
    }
    if (!isIsoTimestamp(fact.createdAt)) {
      addIssue(issues, "INVALID_TIMESTAMP", `${path}.createdAt`, "ERROR");
    }

    result.push({
      id: fact.id as string,
      ownerScope: fact.ownerScope as string,
      documentId: fact.documentId as string,
      kind: fact.kind as AdministrativeMoneyKind,
      amountCents: fact.amountCents as number,
      currency: "EUR",
      assertionType: fact.assertionType as AssertionType,
      evidenceIds,
      ...(fact.sourceActRefId === undefined
        ? {}
        : { sourceActRefId: fact.sourceActRefId as string }),
      lineageParentIds,
      status: fact.status as AdministrativeMoneyFact["status"],
      createdAt: fact.createdAt as string,
    });
  }
  return result;
}

function validateSuppliedIssues(
  value: unknown,
  issues: AdministrativeDomainValidationIssue[],
): AdministrativeDomainValidationIssue[] {
  if (!Array.isArray(value)) {
    addIssue(issues, "MISSING_REQUIRED_FIELD", "validationIssues", "ERROR");
    return [];
  }
  const suppliedIssues = snapshotDataArray(
    value,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts,
  );
  if (suppliedIssues === ARRAY_LIMIT_EXCEEDED) {
    addIssue(issues, "COLLECTION_LIMIT_EXCEEDED", "validationIssues", "ERROR");
    return [];
  }
  if (!suppliedIssues) {
    addIssue(issues, "INVALID_VALUE", "validationIssues", "ERROR");
    return [];
  }

  const result: AdministrativeDomainValidationIssue[] = [];
  for (let index = 0; index < suppliedIssues.length; index += 1) {
    const path = `validationIssues[${index}]`;
    const issue = snapshotDataRecord(suppliedIssues[index]);
    if (!issue) {
      addIssue(issues, "INVALID_VALUE", path, "ERROR");
      continue;
    }
    validateKnownKeys(issue, VALIDATION_ISSUE_KEYS, path, issues);
    if (!ISSUE_CODES.has(issue.code as AdministrativeDomainValidationIssueCode)) {
      addIssue(issues, "INVALID_ENUM", `${path}.code`, "ERROR");
    }
    if (issue.severity !== "ERROR" && issue.severity !== "WARNING") {
      addIssue(issues, "INVALID_ENUM", `${path}.severity`, "ERROR");
    }
    if (!isSafeInternalPath(issue.path)) {
      addIssue(issues, "INVALID_VALUE", `${path}.path`, "ERROR");
    }
    result.push({
      code: issue.code as AdministrativeDomainValidationIssueCode,
      severity: issue.severity as "ERROR" | "WARNING",
      path: issue.path as string,
    });
  }
  return result;
}

function validateUniqueEntityIds(
  roleAssertions: readonly AdministrativeRoleAssertion[],
  moneyFacts: readonly AdministrativeMoneyFact[],
  issues: AdministrativeDomainValidationIssue[],
): void {
  const ids = new Set<string>();
  for (let index = 0; index < roleAssertions.length; index += 1) {
    const id = roleAssertions[index]?.id;
    if (ids.has(id)) {
      addIssue(issues, "DUPLICATE_ID", `roleAssertions[${index}].id`, "ERROR");
    }
    ids.add(id);
  }
  for (let index = 0; index < moneyFacts.length; index += 1) {
    const id = moneyFacts[index]?.id;
    if (ids.has(id)) {
      addIssue(issues, "DUPLICATE_ID", `moneyFacts[${index}].id`, "ERROR");
    }
    ids.add(id);
  }
}

function validateMoneyLineage(
  moneyFacts: readonly AdministrativeMoneyFact[],
  issues: AdministrativeDomainValidationIssue[],
): void {
  const factsById = new Map<string, AdministrativeMoneyFact>();
  const factIndexById = new Map<string, number>();
  for (let index = 0; index < moneyFacts.length; index += 1) {
    const fact = moneyFacts[index];
    if (!factsById.has(fact.id)) {
      factsById.set(fact.id, fact);
      factIndexById.set(fact.id, index);
    }
  }

  for (let index = 0; index < moneyFacts.length; index += 1) {
    const fact = moneyFacts[index];
    for (let parentIndex = 0; parentIndex < fact.lineageParentIds.length; parentIndex += 1) {
      const parentId = fact.lineageParentIds[parentIndex];
      const path = `moneyFacts[${index}].lineageParentIds[${parentIndex}]`;
      if (parentId === fact.id) {
        addIssue(issues, "SELF_LINEAGE", path, "ERROR");
      } else if (!factsById.has(parentId)) {
        addIssue(issues, "DANGLING_LINEAGE", path, "ERROR");
      }
    }
  }

  const state = new Map<string, 0 | 1 | 2>();
  for (const fact of moneyFacts) {
    if ((state.get(fact.id) ?? 0) !== 0) continue;
    const stack: Array<{ id: string; parentIndex: number }> = [
      { id: fact.id, parentIndex: 0 },
    ];
    state.set(fact.id, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const current = factsById.get(frame.id);
      if (!current || frame.parentIndex >= current.lineageParentIds.length) {
        state.set(frame.id, 2);
        stack.pop();
        continue;
      }
      const parentId = current.lineageParentIds[frame.parentIndex];
      frame.parentIndex += 1;
      if (!factsById.has(parentId) || parentId === frame.id) continue;
      const parentState = state.get(parentId) ?? 0;
      if (parentState === 1) {
        const factIndex = factIndexById.get(frame.id) ?? 0;
        addIssue(issues, "CYCLIC_LINEAGE", `moneyFacts[${factIndex}].lineageParentIds`, "ERROR");
      } else if (parentState === 0) {
        state.set(parentId, 1);
        stack.push({ id: parentId, parentIndex: 0 });
      }
    }
  }
}

function validateRoleSupersession(
  assertions: readonly AdministrativeRoleAssertion[],
  issues: AdministrativeDomainValidationIssue[],
): void {
  const assertionIndexById = new Map<string, number>();
  for (let index = 0; index < assertions.length; index += 1) {
    if (!assertionIndexById.has(assertions[index].id)) {
      assertionIndexById.set(assertions[index].id, index);
    }
  }

  const state = new Map<string, 0 | 1 | 2>();
  for (let index = 0; index < assertions.length; index += 1) {
    const assertion = assertions[index];
    const parentId = assertion.supersedesAssertionId;
    if (parentId && !assertionIndexById.has(parentId)) {
      addIssue(
        issues,
        "DANGLING_LINEAGE",
        `roleAssertions[${index}].supersedesAssertionId`,
        "ERROR",
      );
    }
  }

  for (const assertion of assertions) {
    if ((state.get(assertion.id) ?? 0) !== 0) continue;
    let current: AdministrativeRoleAssertion | undefined = assertion;
    const visiting: string[] = [];
    while (current && (state.get(current.id) ?? 0) === 0) {
      state.set(current.id, 1);
      visiting.push(current.id);
      const parentIndex: number | undefined = current.supersedesAssertionId
        ? assertionIndexById.get(current.supersedesAssertionId)
        : undefined;
      current = parentIndex === undefined ? undefined : assertions[parentIndex];
    }
    if (current && state.get(current.id) === 1) {
      const cycleIndex = assertionIndexById.get(current.id) ?? 0;
      addIssue(
        issues,
        "CYCLIC_LINEAGE",
        `roleAssertions[${cycleIndex}].supersedesAssertionId`,
        "ERROR",
      );
    }
    for (const id of visiting) state.set(id, 2);
  }
}

function validateIdList(
  value: unknown,
  path: string,
  max: number,
  issues: AdministrativeDomainValidationIssue[],
): string[] {
  const snapshot = snapshotDataArray(value, max);
  if (snapshot === ARRAY_LIMIT_EXCEEDED) {
    addIssue(issues, "COLLECTION_LIMIT_EXCEEDED", path, "ERROR");
    return [];
  }
  if (!snapshot) {
    addIssue(issues, "INVALID_ID", path, "ERROR");
    return [];
  }
  try {
    assertBoundedIdList(snapshot, path, max);
    return [...snapshot] as string[];
  } catch {
    addIssue(
      issues,
      "INVALID_ID",
      path,
      "ERROR",
    );
    return [];
  }
}

function validateOwnerScope(
  value: unknown,
  path: string,
  issues: AdministrativeDomainValidationIssue[],
): void {
  try {
    assertBoundedOwnerScope(value, path);
  } catch {
    addIssue(issues, "INVALID_OWNER_SCOPE", path, "ERROR");
  }
}

function validateId(
  value: unknown,
  path: string,
  code: "INVALID_ID" | "INVALID_DOCUMENT_ID",
  issues: AdministrativeDomainValidationIssue[],
): void {
  try {
    assertBoundedId(value, path);
  } catch {
    addIssue(issues, code, path, "ERROR");
  }
}

function validateKnownKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
  issues: AdministrativeDomainValidationIssue[],
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      addIssue(
        issues,
        "UNKNOWN_KEY",
        path === "$" ? "$.$unknown" : `${path}.$unknown`,
        "ERROR",
      );
      return;
    }
  }
}

function addIssue(
  issues: AdministrativeDomainValidationIssue[],
  code: AdministrativeDomainValidationIssueCode,
  path: string,
  severity: "ERROR" | "WARNING",
): void {
  if (issues.length >= MAX_DOMAIN_VALIDATION_ISSUES) return;
  issues.push({ code, severity, path });
}

function invalidResult(
  issues: readonly AdministrativeDomainValidationIssue[],
): AdministrativeDomainProjectionValidationResult {
  return Object.freeze({
    projection: null,
    issues: Object.freeze(issues.map(freezeIssue)),
    valid: false,
  });
}

function freezeProjection(
  projection: AdministrativeDomainProjection,
): AdministrativeDomainProjection {
  const roleAssertions = Object.freeze(
    projection.roleAssertions.map((assertion) =>
      Object.freeze({
        ...assertion,
        evidenceIds: Object.freeze([...assertion.evidenceIds]),
      }),
    ),
  );
  const moneyFacts = Object.freeze(
    projection.moneyFacts.map((fact) =>
      Object.freeze({
        ...fact,
        evidenceIds: Object.freeze([...fact.evidenceIds]),
        lineageParentIds: Object.freeze([...fact.lineageParentIds]),
      }),
    ),
  );
  return Object.freeze({
    ...projection,
    roleAssertions,
    moneyFacts,
    missingFieldIds: Object.freeze([...projection.missingFieldIds]),
    alternativeFamilyIds: Object.freeze([...projection.alternativeFamilyIds]),
    validationIssues: Object.freeze(projection.validationIssues.map(freezeIssue)),
  });
}

function freezeIssue(
  issue: AdministrativeDomainValidationIssue,
): AdministrativeDomainValidationIssue {
  return Object.freeze({ ...issue });
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isSafeInternalPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    value !== value.trim()
  ) {
    return false;
  }
  if (value === "$") return true;
  if (!/^\$?(?:\.?[A-Za-z][A-Za-z0-9]*|\[\d+\])+$/u.test(value)) {
    return false;
  }
  const withoutRootMarker = value.startsWith("$.")
    ? value.slice(2)
    : value.startsWith("$")
      ? value.slice(1)
      : value;
  const root = withoutRootMarker.split(/[.[]/u, 1)[0];
  if (!SAFE_VALIDATION_PATH_ROOTS.has(root)) return false;
  const segments = withoutRootMarker.match(/[A-Za-z][A-Za-z0-9]*/gu) ?? [];
  return segments.every((segment) => SAFE_VALIDATION_PATH_SEGMENTS.has(segment));
}

function snapshotDataRecord(
  value: unknown,
): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function snapshotDataArray(
  value: unknown,
  max: number,
): readonly unknown[] | null | typeof ARRAY_LIMIT_EXCEEDED {
  try {
    if (!Array.isArray(value)) return null;
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      Number(lengthDescriptor.value) < 0
    ) {
      return null;
    }
    const length = Number(lengthDescriptor.value);
    if (length > max) return ARRAY_LIMIT_EXCEEDED;
    for (const key of Reflect.ownKeys(value)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        return null;
      }
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
        return null;
      }
    }
    const snapshot: unknown[] = new Array(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[index] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function isDeepFrozenPlainData(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const pending: object[] = [value];
  const seen = new WeakSet<object>();
  let visited = 0;
  try {
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      visited += 1;
      if (
        visited > FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts * 20 ||
        !Object.isFrozen(current)
      ) {
        return false;
      }
      const prototype = Object.getPrototypeOf(current);
      if (
        prototype !== Object.prototype &&
        prototype !== Array.prototype &&
        prototype !== null
      ) {
        return false;
      }
      for (const key of Reflect.ownKeys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !("value" in descriptor)) return false;
        const child = descriptor.value;
        if (child !== null && typeof child === "object") pending.push(child);
      }
    }
    return true;
  } catch {
    return false;
  }
}
