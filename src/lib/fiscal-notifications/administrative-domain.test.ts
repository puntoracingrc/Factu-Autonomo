import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
} from "./input-contract";
import {
  assertAdministrativeDomainProjection,
  createEmptyAdministrativeDomainProjection,
  validateAdministrativeDomainProjection,
} from "./administrative-domain";

const OWNER = "user:synthetic";
const DOCUMENT = "document-synthetic-1";
const CREATED_AT = "2026-07-12T08:00:00.000Z";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function validProjection(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    ownerScope: OWNER,
    documentId: DOCUMENT,
    extractorId: "synthetic-extractor",
    extractorVersion: "synthetic-extractor.v1",
    createdAt: CREATED_AT,
    familyId: "aeat.synthetic.family",
    status: "REVIEW_REQUIRED",
    roleAssertions: [
      {
        id: "role-1",
        ownerScope: OWNER,
        documentId: DOCUMENT,
        partyRefId: "party-1",
        role: "TAX_DEBTOR",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        confidence: 0.9,
        evidenceIds: ["evidence-role-1"],
        createdAt: CREATED_AT,
      },
    ],
    moneyFacts: [
      {
        id: "money-1",
        ownerScope: OWNER,
        documentId: DOCUMENT,
        kind: "ORIGINAL_TAX_PRINCIPAL",
        amountCents: 10_000,
        currency: "EUR",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: ["evidence-money-1"],
        lineageParentIds: [],
        status: "PROPOSED",
        createdAt: CREATED_AT,
      },
      {
        id: "money-2",
        ownerScope: OWNER,
        documentId: DOCUMENT,
        kind: "OFFSET_APPLIED",
        amountCents: 2_500,
        currency: "EUR",
        assertionType: "CALCULATED",
        evidenceIds: ["evidence-money-2"],
        sourceActRefId: "act-ref-1",
        lineageParentIds: ["money-1"],
        status: "PROPOSED",
        createdAt: CREATED_AT,
      },
    ],
    missingFieldIds: ["field.pending.synthetic"],
    alternativeFamilyIds: ["aeat.synthetic.alternative"],
    validationIssues: [
      {
        code: "INVALID_VALUE",
        severity: "WARNING",
        path: "moneyFacts[1]",
      },
    ],
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    requiresHumanReview: true,
  };
}

function moneyFact(id: string): Record<string, unknown> {
  return {
    id,
    ownerScope: OWNER,
    documentId: DOCUMENT,
    kind: "ORIGINAL_TAX_PRINCIPAL",
    amountCents: 0,
    currency: "EUR",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    evidenceIds: [],
    lineageParentIds: [],
    status: "PROPOSED",
    createdAt: CREATED_AT,
  };
}

describe("administrative domain projection", () => {
  it("creates an isolated, immutable and review-only empty projection", () => {
    const first = createEmptyAdministrativeDomainProjection({
      ownerScope: OWNER,
      documentId: DOCUMENT,
      extractorId: "synthetic-extractor",
      extractorVersion: "synthetic-extractor.v1",
      createdAt: CREATED_AT,
    });
    const second = createEmptyAdministrativeDomainProjection({
      ownerScope: OWNER,
      documentId: DOCUMENT,
      extractorId: "synthetic-extractor",
      extractorVersion: "synthetic-extractor.v1",
      createdAt: CREATED_AT,
    });

    expect(first).toMatchObject({
      schemaVersion: 1,
      familyId: null,
      status: "REVIEW_REQUIRED",
      roleAssertions: [],
      moneyFacts: [],
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      requiresHumanReview: true,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.moneyFacts)).toBe(true);
    expect(first.moneyFacts).not.toBe(second.moneyFacts);
    expect(() =>
      (first.moneyFacts as unknown as unknown[]).push({}),
    ).toThrow();
    expect(second.moneyFacts).toEqual([]);
  });

  it("requires explicit creation time and rejects unknown empty-input keys", () => {
    expect(() =>
      createEmptyAdministrativeDomainProjection({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        extractorId: "synthetic-extractor",
        extractorVersion: "v1",
      } as never),
    ).toThrowError(expect.objectContaining({ path: "createdAt" }));
    expect(() =>
      createEmptyAdministrativeDomainProjection({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        extractorId: "synthetic-extractor",
        extractorVersion: "v1",
        createdAt: CREATED_AT,
        taxIdPrivate: "never-retained",
      } as never),
    ).toThrowError(expect.objectContaining({ path: "$.$unknown" }));
  });

  it("validates, defensively copies and deeply freezes a bounded projection", () => {
    const input = validProjection();
    const before = structuredClone(input);
    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(input).toEqual(before);
    expect(result.projection).not.toBe(input);
    expect(Object.isFrozen(result.projection)).toBe(true);
    expect(Object.isFrozen(result.projection?.moneyFacts[0]?.evidenceIds)).toBe(true);

    const inputFacts = input.moneyFacts as Record<string, unknown>[];
    (inputFacts[0]?.evidenceIds as string[]).push("later-input-change");
    expect(result.projection?.moneyFacts[0]?.evidenceIds).toEqual([
      "evidence-money-1",
    ]);
    expect(() =>
      (result.projection?.moneyFacts as unknown as unknown[]).push({}),
    ).toThrow();
  });

  it("keeps every explicitly user-confirmed input behind human review", () => {
    const input = validProjection();
    input.status = "USER_CONFIRMED";
    const assertions = input.roleAssertions as Record<string, unknown>[];
    assertions[0]!.assertionType = "USER_CONFIRMED";
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts[0]!.status = "USER_CONFIRMED";
    facts[0]!.assertionType = "USER_CONFIRMED";

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT, {
      humanInputExplicit: true,
    });

    expect(result.valid).toBe(true);
    expect(result.projection).toMatchObject({
      status: "USER_CONFIRMED",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  });

  it("rejects USER_CONFIRMED without an explicit human-input context", () => {
    const input = validProjection();
    input.status = "USER_CONFIRMED";

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "HUMAN_INPUT_REQUIRED" }),
    );
  });

  it("requires explicit human context for confirmed nested assertions and facts", () => {
    const roleInput = validProjection();
    (roleInput.roleAssertions as Record<string, unknown>[])[0]!.assertionType =
      "USER_CONFIRMED";
    expect(
      validateAdministrativeDomainProjection(roleInput, OWNER, DOCUMENT).issues,
    ).toContainEqual(expect.objectContaining({ code: "HUMAN_INPUT_REQUIRED" }));

    const factInput = validProjection();
    const fact = (factInput.moneyFacts as Record<string, unknown>[])[0]!;
    fact.assertionType = "USER_CONFIRMED";
    fact.status = "USER_CONFIRMED";
    expect(
      validateAdministrativeDomainProjection(factInput, OWNER, DOCUMENT).issues,
    ).toContainEqual(expect.objectContaining({ code: "HUMAN_INPUT_REQUIRED" }));
  });

  it.each([-0.01, 1.01, Number.NaN, Infinity, "HIGH"])(
    "rejects confidence outside the closed finite 0..1 contract",
    (confidence) => {
      const input = validProjection();
      const assertions = input.roleAssertions as Record<string, unknown>[];
      assertions[0]!.confidence = confidence;

      const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

      expect(result.valid).toBe(false);
      expect(result.projection).toBeNull();
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_CONFIDENCE",
          path: "roleAssertions[0].confidence",
        }),
      );
    },
  );

  it("rejects open assertion types and role enums", () => {
    const input = validProjection();
    const assertions = input.roleAssertions as Record<string, unknown>[];
    assertions[0]!.assertionType = "MODEL_CONFIRMED";
    assertions[0]!.role = "AUTOMATIC_DEBTOR";
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts[0]!.assertionType = "MODEL_CONFIRMED";

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "INVALID_ENUM")).toHaveLength(
      3,
    );
  });

  it.each([
    "OUTSTANDING_PRINCIPAL",
    "PAYMENT_ON_ACCOUNT",
    "DOCUMENT_TOTAL",
  ])("accepts exact printed enforcement money kind %s", (kind) => {
    const input = validProjection();
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts[0]!.kind = kind;

    const result = validateAdministrativeDomainProjection(
      input,
      OWNER,
      DOCUMENT,
    );

    expect(result.valid).toBe(true);
    expect(result.projection?.moneyFacts[0]?.kind).toBe(kind);
    expect(result.projection?.moneyFacts[0]?.status).toBe("PROPOSED");
    expect(result.projection?.materializationPolicy).toBe(
      "PROHIBITED_UNTIL_REVIEW",
    );
  });

  it("preserves an explicitly unknown currency without inventing EUR", () => {
    const input = validProjection();
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts[0]!.currency = "UNKNOWN";

    const result = validateAdministrativeDomainProjection(
      input,
      OWNER,
      DOCUMENT,
    );

    expect(result.valid).toBe(true);
    expect(result.projection?.moneyFacts[0]?.currency).toBe("UNKNOWN");
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe or non-integer cents",
    (amountCents) => {
      const input = validProjection();
      const facts = input.moneyFacts as Record<string, unknown>[];
      facts[0]!.amountCents = amountCents;

      const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_AMOUNT",
          path: "moneyFacts[0].amountCents",
        }),
      );
    },
  );

  it("requires an explicit canonical ISO timestamp", () => {
    const input = validProjection();
    const assertions = input.roleAssertions as Record<string, unknown>[];
    delete assertions[0]!.createdAt;

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "INVALID_TIMESTAMP",
        path: "roleAssertions[0].createdAt",
      }),
    );

    const projectionTimestamp = validProjection();
    projectionTimestamp.createdAt = "2026-07-12T08:00:00Z";
    expect(
      validateAdministrativeDomainProjection(
        projectionTimestamp,
        OWNER,
        DOCUMENT,
      ).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "INVALID_TIMESTAMP",
        path: "createdAt",
      }),
    );

    const moneyTimestamp = validProjection();
    delete (moneyTimestamp.moneyFacts as Record<string, unknown>[])[0]!.createdAt;
    expect(
      validateAdministrativeDomainProjection(moneyTimestamp, OWNER, DOCUMENT)
        .issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "INVALID_TIMESTAMP",
        path: "moneyFacts[0].createdAt",
      }),
    );
  });

  it("rejects owner, document and identifier normalization or mismatch", () => {
    const input = validProjection();
    input.ownerScope = `${OWNER} `;
    input.documentId = "different-document";
    input.extractorId = " extractor";

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "INVALID_OWNER_SCOPE",
        "OWNER_SCOPE_MISMATCH",
        "DOCUMENT_ID_MISMATCH",
        "INVALID_ID",
      ]),
    );
  });

  it("rejects unknown projection and nested keys without retaining them", () => {
    const marker = "synthetic-sensitive-marker";
    const input = validProjection();
    input[`nif_${marker}`] = marker;
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts[0]![`rawText_${marker}`] = marker;

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);
    const serialized = JSON.stringify(result);

    expect(result.valid).toBe(false);
    expect(result.projection).toBeNull();
    expect(result.issues.filter((issue) => issue.code === "UNKNOWN_KEY")).toHaveLength(
      2,
    );
    expect(serialized).not.toContain(marker);
  });

  it("converts hostile accessors into a path-only validation error", () => {
    const input = validProjection();
    Object.defineProperty(input, "status", {
      enumerable: true,
      get() {
        throw new Error("SYNTHETIC_PRIVATE_VALUE");
      },
    });

    expect(() =>
      validateAdministrativeDomainProjection(input, OWNER, DOCUMENT),
    ).not.toThrow();
    expect(validateAdministrativeDomainProjection(input, OWNER, DOCUMENT)).toEqual({
      projection: null,
      valid: false,
      issues: [
        { code: "INVALID_VALUE", severity: "ERROR", path: "$" },
      ],
    });
  });

  it("validates and copies proxy-backed records from one defensive snapshot", () => {
    const input = validProjection();
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts[0] = new Proxy(facts[0]!, {
      get(target, property, receiver) {
        if (property === "amountCents") return -1;
        return Reflect.get(target, property, receiver);
      },
    });
    const proxiedProjection = new Proxy(input, {
      get(target, property, receiver) {
        if (property === "extractorId") return " invalid ";
        return Reflect.get(target, property, receiver);
      },
    });

    const result = validateAdministrativeDomainProjection(
      proxiedProjection,
      OWNER,
      DOCUMENT,
    );

    expect(result.valid).toBe(true);
    expect(result.projection?.extractorId).toBe("synthetic-extractor");
    expect(result.projection?.moneyFacts[0]?.amountCents).toBe(10_000);
  });

  it("rejects unknown keys inside supplied validation issues", () => {
    const input = validProjection();
    const suppliedIssues = input.validationIssues as Record<string, unknown>[];
    suppliedIssues[0]!.rawValue = "synthetic-sensitive-value";

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "UNKNOWN_KEY",
        path: "validationIssues[0].$unknown",
      }),
    );
    expect(JSON.stringify(result)).not.toContain("synthetic-sensitive-value");
  });

  it("rejects arbitrary or PII-like segments in supplied issue paths", () => {
    const marker = "NIF_SYNTHETIC_PRIVATE";
    const input = validProjection();
    const suppliedIssues = input.validationIssues as Record<string, unknown>[];
    suppliedIssues[0]!.path = `moneyFacts[0].${marker}`;

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "INVALID_VALUE",
        path: "validationIssues[0].path",
      }),
    );
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("rejects sparse and decorated projection arrays", () => {
    const decorated = validProjection();
    const roles = decorated.roleAssertions as Array<Record<string, unknown>> & {
      privateMarker?: string;
    };
    roles.privateMarker = "SYNTHETIC_PRIVATE_VALUE";
    expect(
      validateAdministrativeDomainProjection(decorated, OWNER, DOCUMENT).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "INVALID_VALUE",
        path: "roleAssertions",
      }),
    );

    const sparse = validProjection();
    sparse.moneyFacts = new Array(1);
    expect(
      validateAdministrativeDomainProjection(sparse, OWNER, DOCUMENT).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "INVALID_VALUE",
        path: "moneyFacts",
      }),
    );

    const symbolic = validProjection();
    const supplied = symbolic.validationIssues as unknown as Record<
      PropertyKey,
      unknown
    >;
    supplied[Symbol("private")] = "SYNTHETIC_PRIVATE_VALUE";
    expect(
      validateAdministrativeDomainProjection(symbolic, OWNER, DOCUMENT).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "INVALID_VALUE",
        path: "validationIssues",
      }),
    );
  });

  it.each([
    ["self", ["money-1"], "SELF_LINEAGE"],
    ["dangling", ["money-missing"], "DANGLING_LINEAGE"],
  ])("rejects %s monetary lineage", (_label, lineageParentIds, code) => {
    const input = validProjection();
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts.splice(1, 1);
    facts[0]!.lineageParentIds = lineageParentIds;

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code }));
  });

  it("rejects cycles in monetary lineage", () => {
    const input = validProjection();
    const facts = input.moneyFacts as Record<string, unknown>[];
    facts[0]!.lineageParentIds = ["money-2"];
    facts[1]!.lineageParentIds = ["money-1"];

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "CYCLIC_LINEAGE" }),
    );
  });

  it("rejects dangling and cyclic role supersession", () => {
    const dangling = validProjection();
    const danglingAssertions = dangling.roleAssertions as Record<string, unknown>[];
    danglingAssertions[0]!.supersedesAssertionId = "role-missing";
    expect(
      validateAdministrativeDomainProjection(dangling, OWNER, DOCUMENT).issues,
    ).toContainEqual(expect.objectContaining({ code: "DANGLING_LINEAGE" }));

    const cyclic = validProjection();
    const cyclicAssertions = cyclic.roleAssertions as Record<string, unknown>[];
    cyclicAssertions.push({
      ...cyclicAssertions[0],
      id: "role-2",
      partyRefId: "party-2",
      supersedesAssertionId: "role-1",
    });
    cyclicAssertions[0]!.supersedesAssertionId = "role-2";
    expect(
      validateAdministrativeDomainProjection(cyclic, OWNER, DOCUMENT).issues,
    ).toContainEqual(expect.objectContaining({ code: "CYCLIC_LINEAGE" }));
  });

  it("accepts the maximum projection fact count with linear set/map checks", () => {
    const input = validProjection();
    input.roleAssertions = [];
    input.moneyFacts = Array.from(
      { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts },
      (_, index) => moneyFact(`money-${index}`),
    );

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(true);
    expect(result.projection?.moneyFacts).toHaveLength(
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts,
    );
  });

  it("reuses one array snapshot when enforcing the combined fact limit", () => {
    const input = validProjection();
    const itemCount =
      Math.floor(FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts / 2) + 1;
    const roleSeed = (input.roleAssertions as Record<string, unknown>[])[0]!;
    const roles = Array.from({ length: itemCount }, (_, index) => ({
      ...roleSeed,
      id: `role-${index}`,
      partyRefId: `party-${index}`,
    }));
    const facts = Array.from({ length: itemCount }, (_, index) =>
      moneyFact(`money-${index}`),
    );
    let roleLengthReads = 0;
    let moneyLengthReads = 0;

    input.roleAssertions = new Proxy(roles, {
      getOwnPropertyDescriptor(target, property) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
        if (property === "length" && descriptor) {
          roleLengthReads += 1;
          return {
            ...descriptor,
            value: roleLengthReads === 1 ? 0 : descriptor.value,
          };
        }
        return descriptor;
      },
    });
    input.moneyFacts = new Proxy(facts, {
      getOwnPropertyDescriptor(target, property) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
        if (property === "length" && descriptor) {
          moneyLengthReads += 1;
          return {
            ...descriptor,
            value: moneyLengthReads === 1 ? 0 : descriptor.value,
          };
        }
        return descriptor;
      },
    });

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.projection).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_VALUE", path: "roleAssertions" }),
        expect.objectContaining({ code: "INVALID_VALUE", path: "moneyFacts" }),
      ]),
    );
    expect(roleLengthReads).toBe(1);
    expect(moneyLengthReads).toBe(1);
  });

  it("rejects a combined projection limit before reading entries", () => {
    const unreadable = new Proxy(
      {},
      {
        get: () => {
          throw new Error("entry must not be read");
        },
      },
    );
    const input = validProjection();
    input.roleAssertions = [unreadable];
    input.moneyFacts = Array.from(
      { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts },
      () => unreadable,
    );

    const result = validateAdministrativeDomainProjection(input, OWNER, DOCUMENT);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "COLLECTION_LIMIT_EXCEEDED" }),
    );
  });

  it("offers assertion semantics while retaining generic errors", () => {
    const valid: unknown = deepFreeze(validProjection());
    expect(() =>
      assertAdministrativeDomainProjection(valid, OWNER, DOCUMENT),
    ).not.toThrow();

    const invalid = { ...validProjection(), requiresHumanReview: false };
    expect(() =>
      assertAdministrativeDomainProjection(invalid, OWNER, DOCUMENT),
    ).toThrowError(FiscalNotificationInputError);

    const mutable = validProjection();
    const proxy = new Proxy(mutable, {
      get(target, property, receiver) {
        if (property === "status") return "AUTO_CONFIRMED";
        return Reflect.get(target, property, receiver);
      },
    });
    expect(() =>
      assertAdministrativeDomainProjection(proxy, OWNER, DOCUMENT),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "$frozen" }),
    );
  });
});
