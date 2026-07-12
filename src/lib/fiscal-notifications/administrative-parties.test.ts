import { describe, expect, it } from "vitest";
import type { AdministrativeRoleAssertion } from "./administrative-domain";
import {
  assessOwnerTaxRole,
  resolveDocumentPartyRoles,
  validateRoleAssertions,
  type RoleEvidenceInput,
} from "./administrative-parties";
import { FiscalNotificationInputError } from "./input-contract";

const OWNER = "user:synthetic-owner";
const DOCUMENT = "document-synthetic-1";
const OWNER_PARTY = "party-owner-opaque";
const THIRD_PARTY = "party-third-opaque";
const NOW = "2026-07-12T09:30:00.000Z";

function evidence(
  overrides: Record<string, unknown> = {},
): RoleEvidenceInput {
  return {
    assertionId: "assertion-synthetic-1",
    ownerScope: OWNER,
    documentId: DOCUMENT,
    partyRefId: OWNER_PARTY,
    role: "TAX_DEBTOR",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    confidence: 0.75,
    evidenceIds: ["evidence-synthetic-1"],
    createdAt: NOW,
    ...overrides,
  } as RoleEvidenceInput;
}

function assertion(
  overrides: Partial<AdministrativeRoleAssertion> = {},
): AdministrativeRoleAssertion {
  return {
    id: "assertion-synthetic-1",
    ownerScope: OWNER,
    documentId: DOCUMENT,
    partyRefId: OWNER_PARTY,
    role: "TAX_DEBTOR",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    confidence: 0.75,
    evidenceIds: ["evidence-synthetic-1"],
    createdAt: NOW,
    ...overrides,
  };
}

function resolve(evidenceInput: readonly RoleEvidenceInput[]) {
  return resolveDocumentPartyRoles({
    ownerScope: OWNER,
    documentId: DOCUMENT,
    ownerPartyRefId: OWNER_PARTY,
    evidence: evidenceInput,
  });
}

describe("administrative party roles", () => {
  it("classifies only an explicitly identified owner party as tax debtor", () => {
    const result = resolve([
      evidence({
        assertionId: "assertion-third",
        partyRefId: THIRD_PARTY,
        role: "TAX_DEBTOR",
      }),
      evidence({
        assertionId: "assertion-owner",
        role: "REPRESENTATIVE",
      }),
    ]);

    expect(result.assertions).toHaveLength(2);
    expect(result.effectiveOwnerRole).toBe("REPRESENTATIVE");
    expect(result.blockers).toEqual(["OWNER_NOT_TAX_DEBTOR"]);
    expect(result.requiresHumanReview).toBe(true);
    expect(result).not.toHaveProperty("eligible");
    expect(result).not.toHaveProperty("allowed");
    expect(
      assessOwnerTaxRole({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        ownerPartyRefId: OWNER_PARTY,
        assertions: result.assertions,
        humanInputExplicit: true,
      }),
    ).toEqual({
      status: "THIRD_PARTY_OR_OTHER",
      blockers: ["OWNER_NOT_TAX_DEBTOR"],
      requiresHumanReview: true,
    });
  });

  it("never infers the owner's role from family, order, name, or another party", () => {
    const thirdPartyOnly = resolve([
      evidence({
        partyRefId: THIRD_PARTY,
        role: "TAX_DEBTOR",
        confidence: 1,
      }),
    ]);

    expect(thirdPartyOnly.effectiveOwnerRole).toBe("UNKNOWN");
    expect(thirdPartyOnly.blockers).toEqual(["NO_EXPLICIT_ROLE"]);
  });

  it("requires an explicit human-origin marker for USER_CONFIRMED", () => {
    expect(() =>
      resolve([
        evidence({
          assertionType: "USER_CONFIRMED",
          humanInputExplicit: true,
        }),
      ]),
    ).not.toThrow();

    expect(() =>
      resolve([
        evidence({
          assertionType: "USER_CONFIRMED",
        }) as RoleEvidenceInput,
      ]),
    ).toThrowError(
      expect.objectContaining({ path: "evidence[0].humanInputExplicit" }),
    );
    expect(() =>
      resolve([
        evidence({
          assertionType: "USER_CONFIRMED",
          humanInputExplicit: false,
        }) as RoleEvidenceInput,
      ]),
    ).toThrow(FiscalNotificationInputError);
  });

  it("keeps human-confirmed role evidence review-only", () => {
    const result = resolve([
      evidence({
        assertionType: "USER_CONFIRMED",
        humanInputExplicit: true,
        confidence: 1,
      }),
    ]);

    expect(result).toMatchObject({
      effectiveOwnerRole: "TAX_DEBTOR",
      requiresHumanReview: true,
    });
    expect(result.assertions[0]).not.toHaveProperty("humanInputExplicit");
    expect(
      assessOwnerTaxRole({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        ownerPartyRefId: OWNER_PARTY,
        assertions: result.assertions,
        humanInputExplicit: true,
      }),
    ).toMatchObject({
      status: "CONFIRMED_TAX_DEBTOR",
      requiresHumanReview: true,
    });
  });

  it("does not let confidence create or remove role confirmation", () => {
    for (const confidence of [0, 0.25, 1]) {
      const result = resolve([evidence({ confidence })]);
      expect(result.effectiveOwnerRole).toBe("TAX_DEBTOR");
      expect(result.requiresHumanReview).toBe(true);
    }
  });

  it("requires human provenance when USER_CONFIRMED is assessed directly", () => {
    const confirmed = assertion({ assertionType: "USER_CONFIRMED" });
    expect(() =>
      assessOwnerTaxRole({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        ownerPartyRefId: OWNER_PARTY,
        assertions: [confirmed],
      }),
    ).toThrowError(
      expect.objectContaining({ path: "assertions[0].assertionType" }),
    );
    expect(
      assessOwnerTaxRole({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        ownerPartyRefId: OWNER_PARTY,
        assertions: [confirmed],
        humanInputExplicit: true,
      }),
    ).toMatchObject({
      status: "CONFIRMED_TAX_DEBTOR",
      requiresHumanReview: true,
    });
  });

  it("returns UNKNOWN when owner evidence is absent or incomplete", () => {
    expect(resolve([])).toMatchObject({
      effectiveOwnerRole: "UNKNOWN",
      blockers: ["NO_EXPLICIT_ROLE"],
      requiresHumanReview: true,
    });
    expect(resolve([evidence({ evidenceIds: [] })])).toMatchObject({
      effectiveOwnerRole: "UNKNOWN",
      blockers: ["EVIDENCE_REQUIRED"],
      requiresHumanReview: true,
    });
    expect(resolve([evidence({ role: "UNKNOWN" })])).toMatchObject({
      effectiveOwnerRole: "UNKNOWN",
      blockers: ["NO_EXPLICIT_ROLE"],
      requiresHumanReview: true,
    });
  });

  it("returns CONFLICT for distinct roles asserted for the owner", () => {
    const result = resolve([
      evidence({ assertionId: "assertion-tax", role: "TAX_DEBTOR" }),
      evidence({ assertionId: "assertion-third", role: "DEPOSITARY" }),
    ]);

    expect(result).toMatchObject({
      effectiveOwnerRole: "UNKNOWN",
      blockers: ["CONFLICTING_ROLES"],
      requiresHumanReview: true,
    });
    expect(
      assessOwnerTaxRole({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        ownerPartyRefId: OWNER_PARTY,
        assertions: result.assertions,
      }).status,
    ).toBe("CONFLICT");
  });

  it("validates conflicts per opaque party instead of across unrelated parties", () => {
    const blockers = validateRoleAssertions(
      [
        assertion({ id: "assertion-owner", role: "TAX_DEBTOR" }),
        assertion({
          id: "assertion-third",
          partyRefId: THIRD_PARTY,
          role: "REPRESENTATIVE",
        }),
      ],
      OWNER,
      DOCUMENT,
    );

    expect(blockers).toEqual([]);
  });

  it("preserves structural blockers even when the owner role is explicit", () => {
    const result = resolve([
      evidence({ assertionId: "assertion-owner" }),
      evidence({
        assertionId: "assertion-third",
        partyRefId: THIRD_PARTY,
        role: "REPRESENTATIVE",
        evidenceIds: [],
      }),
    ]);

    expect(result).toMatchObject({
      effectiveOwnerRole: "TAX_DEBTOR",
      blockers: ["EVIDENCE_REQUIRED"],
      requiresHumanReview: true,
    });
    expect(
      assessOwnerTaxRole({
        ownerScope: OWNER,
        documentId: DOCUMENT,
        ownerPartyRefId: OWNER_PARTY,
        assertions: result.assertions,
      }),
    ).toMatchObject({
      status: "CONFIRMED_TAX_DEBTOR",
      blockers: ["EVIDENCE_REQUIRED"],
      requiresHumanReview: true,
    });
  });

  it("rejects non-closed assertions, confidence, timestamps and evidence IDs", () => {
    const invalidInputs: Array<[Record<string, unknown>, string]> = [
      [{ role: "DEBTOR_BY_GUESS" }, "evidence[0].role"],
      [{ assertionType: "INFERRED" }, "evidence[0].assertionType"],
      [{ confidence: Number.NaN }, "evidence[0].confidence"],
      [{ confidence: -0.01 }, "evidence[0].confidence"],
      [{ confidence: 1.01 }, "evidence[0].confidence"],
      [{ createdAt: "2026-02-31T00:00:00.000Z" }, "evidence[0].createdAt"],
      [{ createdAt: "2026-07-12T09:30:00Z" }, "evidence[0].createdAt"],
      [{ evidenceIds: [" duplicate", "evidence-2"] }, "evidence[0].evidenceIds[0]"],
    ];

    for (const [override, path] of invalidInputs) {
      expect(() => resolve([evidence(override)])).toThrowError(
        expect.objectContaining({ path }),
      );
    }
  });

  it("rejects owner, document and opaque IDs without trimming or coercion", () => {
    const invalidOwner = {
      ownerScope: ` ${OWNER}`,
      documentId: DOCUMENT,
      ownerPartyRefId: OWNER_PARTY,
      evidence: [],
    };
    expect(() => resolveDocumentPartyRoles(invalidOwner)).toThrowError(
      expect.objectContaining({ path: "ownerScope" }),
    );
    expect(() => resolve([evidence({ partyRefId: "party\u0000owner" })])).toThrowError(
      expect.objectContaining({ path: "evidence[0].partyRefId" }),
    );
    expect(() =>
      resolve([evidence({ documentId: `${DOCUMENT}-different` })]),
    ).toThrowError(expect.objectContaining({ path: "evidence[0].documentId" }));
  });

  it("rejects unknown and PII-like keys without echoing their values", () => {
    const privateLookingValue = "SYNTHETIC-PRIVATE-VALUE";
    let thrown: unknown;
    try {
      resolve([evidence({ taxId: privateLookingValue })]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(FiscalNotificationInputError);
    expect(thrown).toMatchObject({ path: "evidence[0].$unknown" });
    expect((thrown as Error).message).not.toContain(privateLookingValue);
  });

  it("rejects inherited, symbolic and accessor-backed role inputs", () => {
    const inherited = Object.create({ taxId: "private-inherited" });
    Object.assign(inherited, evidence());
    expect(() => resolve([inherited])).toThrowError(
      expect.objectContaining({ path: "evidence[0]" }),
    );

    const symbolic = evidence();
    (symbolic as unknown as Record<PropertyKey, unknown>)[Symbol("private")] =
      "private-symbol-value";
    expect(() => resolve([symbolic])).toThrowError(
      expect.objectContaining({ path: "evidence[0].$unknown" }),
    );

    const accessor = evidence();
    Object.defineProperty(accessor, "ownerScope", {
      enumerable: true,
      get() {
        throw new Error("SYNTHETIC_PRIVATE_VALUE");
      },
    });
    expect(() => resolve([accessor])).toThrowError(
      expect.objectContaining({ path: "evidence[0].$unknown" }),
    );
  });

  it("validates supersession references, self-reference and cycles", () => {
    expect(() =>
      validateRoleAssertions(
        [assertion({ supersedesAssertionId: "assertion-missing" })],
        OWNER,
        DOCUMENT,
      ),
    ).toThrowError(
      expect.objectContaining({
        path: "assertions[0].supersedesAssertionId",
      }),
    );
    expect(() =>
      validateRoleAssertions(
        [assertion({ supersedesAssertionId: "assertion-synthetic-1" })],
        OWNER,
        DOCUMENT,
      ),
    ).toThrow(FiscalNotificationInputError);
    expect(() =>
      validateRoleAssertions(
        [
          assertion({ id: "assertion-a", supersedesAssertionId: "assertion-b" }),
          assertion({ id: "assertion-b", supersedesAssertionId: "assertion-a" }),
        ],
        OWNER,
        DOCUMENT,
      ),
    ).toThrow(FiscalNotificationInputError);
  });

  it("rejects an oversized collection before inspecting its entries", () => {
    const inaccessibleEntry = Object.create(null) as RoleEvidenceInput;
    Object.defineProperty(inaccessibleEntry, "assertionId", {
      get: () => {
        throw new Error("entry must not be inspected");
      },
    });
    const oversized = Array.from({ length: 257 }, () => inaccessibleEntry);

    expect(() => resolve(oversized)).toThrowError(
      expect.objectContaining({
        code: "COLLECTION_LIMIT_EXCEEDED",
        path: "evidence",
      }),
    );
  });

  it("rejects sparse and decorated assertion collections", () => {
    const sparse = new Array(1) as RoleEvidenceInput[];
    expect(() => resolve(sparse)).toThrowError(
      expect.objectContaining({ path: "evidence[0]" }),
    );

    const decorated = [evidence()] as RoleEvidenceInput[] & {
      privateMarker?: string;
    };
    decorated.privateMarker = "SYNTHETIC_PRIVATE_VALUE";
    expect(() => resolve(decorated)).toThrowError(
      expect.objectContaining({ path: "evidence.$unknown" }),
    );

    const symbolic = [evidence()];
    (symbolic as unknown as Record<PropertyKey, unknown>)[Symbol("private")] =
      "SYNTHETIC_PRIVATE_VALUE";
    expect(() => resolve(symbolic)).toThrowError(
      expect.objectContaining({ path: "evidence.$unknown" }),
    );
  });

  it("uses one defensive snapshot for proxy-backed role evidence", () => {
    const source = evidence();
    const proxied = new Proxy(source, {
      get(target, property, receiver) {
        if (property === "role") return "AUTOMATIC_DEBTOR";
        if (property === "confidence") return Number.NaN;
        return Reflect.get(target, property, receiver);
      },
    });

    const result = resolve([proxied]);
    expect(result.assertions[0]).toMatchObject({
      role: "TAX_DEBTOR",
      confidence: 0.75,
    });
    expect(result.effectiveOwnerRole).toBe("TAX_DEBTOR");
  });

  it("does not mutate input and returns isolated immutable outputs", () => {
    const item = Object.freeze({
      ...evidence(),
      evidenceIds: Object.freeze(["evidence-synthetic-1"]),
    }) as RoleEvidenceInput;
    const input = Object.freeze([item]);
    const before = structuredClone(input);

    const first = resolve(input);
    expect(input).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.assertions)).toBe(true);
    expect(Object.isFrozen(first.assertions[0]?.evidenceIds)).toBe(true);
    expect(() =>
      (first.assertions as AdministrativeRoleAssertion[]).push(assertion()),
    ).toThrow();

    const second = resolve(input);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.assertions).not.toBe(first.assertions);
    expect(second.blockers).not.toBe(first.blockers);
  });
});
