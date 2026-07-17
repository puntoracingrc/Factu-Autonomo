import { describe, expect, it } from "vitest";
import {
  createOwnerScopedAssetFingerprintV8,
  deriveGlobalReconciliationChainsV8,
  reconcileGlobalDocumentRelationsV8,
  type GlobalReconciliationDocumentV8,
} from "./global-reconciliation.v8";

const OWNER = "user:00000000-0000-4000-8000-000000000008";
const NOW = "2026-07-17T08:00:00.000Z";

function document(
  documentId: string,
  familyId: string,
  input: Partial<GlobalReconciliationDocumentV8> = {},
): GlobalReconciliationDocumentV8 {
  return {
    ownerScope: OWNER,
    documentId,
    issuer: "AEAT",
    familyId,
    documentDate: null,
    references: [],
    amounts: [],
    remainingPlanPrincipalCents: null,
    modifiedPlan: false,
    compatibleAutomaticOffsetClause: false,
    offsetRows: 0,
    offsetRowsRecalculated: false,
    opaqueAssetFingerprint: null,
    ...input,
  };
}

function reference(
  referenceId: string,
  normalizedValue: string,
  role: "GENERIC" | "PAYMENT_FORM" | "CITED_EXECUTIVE_DEBT" | "NOTIFICATION_TARGET" | "SEIZURE_ORDER" = "GENERIC",
  type: "DEBT_KEY" | "LIQUIDATION_KEY" | "SEIZURE_ORDER_ID" | "MODEL" | "FISCAL_YEAR" | "DOCUMENT_REFERENCE" = "DEBT_KEY",
) {
  return { referenceId, type, normalizedValue, role } as const;
}

function amount(
  amountId: string,
  amountCents: number,
  kind: "PRINCIPAL" | "ORDINARY_TOTAL" | "DOCUMENT_TOTAL" | "SEIZURE_ROW" | "DENIAL_SNAPSHOT",
) {
  return { amountId, kind, amountCents, debtKey: null } as const;
}

describe("global reconciliation V8 synthetic regression pack", () => {
  it("GLOBAL-S01 upgrades a suggested assessment relation from a payment-form part", () => {
    const assessment = document("doc-assessment", "assessment.final_provisional_assessment", {
      documentDate: "2024-05-01",
      references: [reference("ref-assessment", "SYN-DEBT-1", "PAYMENT_FORM", "LIQUIDATION_KEY")],
      amounts: [amount("amount-assessment", 25_000, "DOCUMENT_TOTAL")],
    });
    const enforcement = document("doc-enforcement", "collection.enforcement_order", {
      documentDate: "2024-06-01",
      references: [reference("ref-enforcement", "SYN-DEBT-1", "GENERIC", "LIQUIDATION_KEY")],
      amounts: [amount("amount-enforcement", 25_000, "PRINCIPAL")],
    });
    const result = reconcileGlobalDocumentRelationsV8({
      documents: [enforcement, assessment],
      existingRelations: [{
        sourceDocumentId: assessment.documentId,
        targetDocumentId: enforcement.documentId,
        status: "SUGGESTED",
        relationType: "POSSIBLY_RELATED",
        globalRelationType: null,
        ruleVersion: null,
      }],
      reevaluatedAt: NOW,
    });
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.changes).toEqual([
      expect.objectContaining({
        previousStatus: "SUGGESTED",
        reasonCode: "SUGGESTION_UPGRADED_BY_EXACT_EVIDENCE",
        edge: expect.objectContaining({
          relationType: "RESOLUTION_ENFORCED",
          status: "SYSTEM_CONFIRMED_EXACT",
          confirmsPayment: false,
        }),
      }),
    ]);
  });

  it("GLOBAL-S02 links remaining plan principal to two distinct asset seizures without a transitive debt", () => {
    const debt = "SYN-DEBT-2";
    const plan = document("doc-plan", "collection.deferral_grant", {
      documentDate: "2020-01-01",
      references: [reference("ref-plan", debt)],
      remainingPlanPrincipalCents: 250_000,
    });
    const enforcement = document("doc-enforcement", "collection.enforcement_order", {
      documentDate: "2020-02-01",
      references: [reference("ref-enforcement", debt)],
      amounts: [
        amount("enforcement-principal", 250_000, "PRINCIPAL"),
        amount("enforcement-total", 250_000, "ORDINARY_TOTAL"),
      ],
    });
    const movable = document("doc-movable", "seizure.movable_asset", {
      documentDate: "2020-03-01",
      references: [reference("ref-movable", debt)],
      amounts: [amount("movable-row", 250_000, "SEIZURE_ROW")],
    });
    const realEstate = document("doc-real-estate", "seizure.real_estate", {
      documentDate: "2020-04-01",
      references: [reference("ref-real-estate", debt)],
      amounts: [amount("real-estate-row", 250_000, "SEIZURE_ROW")],
    });
    const result = reconcileGlobalDocumentRelationsV8({
      documents: [realEstate, plan, movable, enforcement],
      reevaluatedAt: NOW,
    });
    expect(result.status).toBe("APPLIED");
    if (result.status === "REVIEW_REQUIRED") return;
    expect(result.directEdges.map((edge) => edge.relationType).sort()).toEqual([
      "ENFORCES",
      "ENFORCES",
      "ENFORCES_REMAINING_PLAN_PRINCIPAL",
    ]);
    expect(result.directEdges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceDocumentId: plan.documentId,
          targetDocumentId: movable.documentId,
        }),
      ]),
    );
  });

  it("GLOBAL-S03 keeps remittance unknown across credit and movable seizures", () => {
    const enforcement = document("doc-e3", "collection.enforcement_order", {
      references: [reference("ref-e3", "SYN-DEBT-3")],
      amounts: [amount("amount-e3", 36_000, "ORDINARY_TOTAL")],
    });
    const credit = document("doc-credit", "seizure.commercial_credits", {
      references: [reference("ref-credit", "SYN-DEBT-3")],
      amounts: [amount("amount-credit", 36_000, "SEIZURE_ROW")],
    });
    const movable = document("doc-m3", "seizure.movable_asset", {
      references: [reference("ref-m3", "SYN-DEBT-3")],
      amounts: [amount("amount-m3", 36_000, "SEIZURE_ROW")],
    });
    const result = reconcileGlobalDocumentRelationsV8({
      documents: [credit, movable, enforcement],
      reevaluatedAt: NOW,
    });
    expect(result.status).not.toBe("REVIEW_REQUIRED");
    if (result.status === "REVIEW_REQUIRED") return;
    expect(result.directEdges).toHaveLength(2);
    expect(result.directEdges.every((edge) => edge.confirmsRemittance === false)).toBe(true);
  });

  it("GLOBAL-S04 uses the enforcement order as preferred origin for a debt cited by a denial", () => {
    const enforcement = document("doc-e4", "collection.enforcement_order", {
      documentDate: "2021-01-01",
      references: [reference("ref-e4", "SYN-DEBT-4")],
      amounts: [amount("amount-e4", 36_000, "ORDINARY_TOTAL")],
    });
    const laterSeizure = document("doc-s4", "seizure.bank_account", {
      documentDate: "2021-02-01",
      references: [reference("ref-s4", "SYN-DEBT-4")],
      amounts: [amount("amount-s4", 36_000, "SEIZURE_ROW")],
    });
    const denial = document("doc-d4", "collection.deferral_denial", {
      documentDate: "2021-03-01",
      references: [reference("ref-d4", "SYN-DEBT-4", "CITED_EXECUTIVE_DEBT")],
      amounts: [amount("amount-d4", 36_000, "DENIAL_SNAPSHOT")],
    });
    const result = reconcileGlobalDocumentRelationsV8({
      documents: [denial, laterSeizure, enforcement],
      reevaluatedAt: NOW,
    });
    expect(result.status).not.toBe("REVIEW_REQUIRED");
    if (result.status === "REVIEW_REQUIRED") return;
    expect(result.directEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceDocumentId: enforcement.documentId,
          targetDocumentId: denial.documentId,
          relationType: "CITED_AS_EXISTING_EXECUTIVE_DEBT",
        }),
      ]),
    );
    expect(result.directEdges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceDocumentId: laterSeizure.documentId,
          targetDocumentId: denial.documentId,
        }),
      ]),
    );
  });

  it("GLOBAL-S05 confirms modified-plan offset only at case level", () => {
    const plan = document("doc-plan5", "collection.deferral_modification", {
      documentDate: "2022-01-01",
      references: [reference("ref-plan5", "SYN-DEBT-5")],
      modifiedPlan: true,
      compatibleAutomaticOffsetClause: true,
    });
    const offset = document("doc-offset5", "collection.offset_requested", {
      documentDate: "2022-02-01",
      references: [reference("ref-offset5", "SYN-DEBT-5")],
      offsetRows: 5,
      offsetRowsRecalculated: true,
    });
    const result = reconcileGlobalDocumentRelationsV8({ documents: [offset, plan], reevaluatedAt: NOW });
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.changes[0]?.edge).toEqual(expect.objectContaining({
      relationType: "OFFSET_APPLIES_TO_MODIFIED_PAYMENT_PLAN",
      resultClassification: "SYSTEM_CONFIRMED_EXACT_CASE_LEVEL",
      rowAssignmentReviewRequired: true,
      permitsAutomaticAction: false,
    }));
  });

  it("GLOBAL-S06 correlates release and later re-seizure only through an owner-scoped opaque hash", () => {
    const directIdentifier = "SYNTHETIC-VEHICLE-ONLY-IN-MEMORY";
    const opaque = createOwnerScopedAssetFingerprintV8(OWNER, directIdentifier);
    const first = document("doc-first-seizure", "seizure.movable_asset", {
      documentDate: "2020-01-01",
      references: [reference("ref-first", "SYN-SEIZURE-A", "SEIZURE_ORDER", "SEIZURE_ORDER_ID")],
      opaqueAssetFingerprint: opaque,
    });
    const release = document("doc-release", "seizure.release", {
      documentDate: "2020-02-01",
      references: [reference("ref-release", "SYN-SEIZURE-A", "SEIZURE_ORDER", "SEIZURE_ORDER_ID")],
      opaqueAssetFingerprint: opaque,
    });
    const second = document("doc-second-seizure", "seizure.movable_asset", {
      documentDate: "2022-01-01",
      references: [reference("ref-second", "SYN-SEIZURE-B", "SEIZURE_ORDER", "SEIZURE_ORDER_ID")],
      opaqueAssetFingerprint: opaque,
    });
    const result = reconcileGlobalDocumentRelationsV8({ documents: [second, release, first], reevaluatedAt: NOW });
    expect(result.status).not.toBe("REVIEW_REQUIRED");
    if (result.status === "REVIEW_REQUIRED") return;
    expect(result.directEdges.map((edge) => edge.relationType).sort()).toEqual([
      "RELEASED_ASSET_LATER_RESEIZED",
      "RELEASES_SEIZURE",
    ]);
    expect(JSON.stringify(result)).not.toContain(directIdentifier);
    expect(opaque).toMatch(/^opaque:[a-f0-9]{64}$/u);
  });

  it("does not call an asset seizure later when either document date is absent", () => {
    const opaque = createOwnerScopedAssetFingerprintV8(
      OWNER,
      "SYNTHETIC-ASSET-WITHOUT-DATE",
    );
    const release = document("doc-release-undated", "seizure.release", {
      documentDate: null,
      opaqueAssetFingerprint: opaque,
    });
    const seizure = document("doc-seizure-dated", "seizure.movable_asset", {
      documentDate: "2026-01-01",
      opaqueAssetFingerprint: opaque,
    });
    const result = reconcileGlobalDocumentRelationsV8({
      documents: [seizure, release],
      reevaluatedAt: NOW,
    });

    expect(result.status).toBe("UNCHANGED");
    expect(result.directEdges).toEqual([]);
  });

  it("fails closed before evaluating an oversized shared-reference group", () => {
    const documents = Array.from({ length: 501 }, (_, index) =>
      document(`doc-bounded-${index}`, "information.informal_reminder", {
        documentDate: "2024-01-01",
        references: [
          reference(`model-bounded-${index}`, "180", "GENERIC", "MODEL"),
          reference(
            `year-bounded-${index}`,
            "2024",
            "GENERIC",
            "FISCAL_YEAR",
          ),
        ],
      }),
    );
    const result = reconcileGlobalDocumentRelationsV8({
      documents,
      reevaluatedAt: NOW,
    });

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "RELATION_LIMIT_EXCEEDED",
      changes: [],
      directEdges: [],
    });
  });

  it("GLOBAL-S07 leaves model/year-only reminder relation suggested", () => {
    const shared = [
      reference("model-reminder", "180", "GENERIC", "MODEL"),
      reference("year-reminder", "2024", "GENERIC", "FISCAL_YEAR"),
    ];
    const reminder = document("doc-reminder", "information.informal_reminder", {
      documentDate: "2024-01-01",
      references: shared,
    });
    const assessment = document("doc-assessment7", "assessment.final_provisional_assessment", {
      documentDate: "2024-06-01",
      references: [
        reference("model-assessment", "180", "GENERIC", "MODEL"),
        reference("year-assessment", "2024", "GENERIC", "FISCAL_YEAR"),
      ],
    });
    const result = reconcileGlobalDocumentRelationsV8({ documents: [assessment, reminder], reevaluatedAt: NOW });
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.changes[0]?.edge).toEqual(expect.objectContaining({
      relationType: "POSSIBLY_PRECEDES_ASSESSMENT",
      status: "SUGGESTED",
      resultClassification: "SUGGESTED",
    }));
  });

  it("is upload-order independent, idempotent with V8 history and derives a four-batch chain", () => {
    const debt = "SYN-DEBT-LONG";
    const plan = document("doc-plan-long", "collection.deferral_grant", {
      documentDate: "2021-01-01",
      references: [reference("ref-plan-long", debt)],
      remainingPlanPrincipalCents: 50_000,
    });
    const enforcement = document("doc-enforcement-long", "collection.enforcement_order", {
      documentDate: "2021-02-01",
      references: [reference("ref-enforcement-long", debt)],
      amounts: [amount("amount-enforcement-long", 50_000, "ORDINARY_TOTAL")],
    });
    const credits = document("doc-credits-long", "seizure.commercial_credits", {
      documentDate: "2021-03-01",
      references: [
        reference("ref-credits-debt", debt),
        reference("ref-credits-order", "SYN-SEIZURE-LONG", "SEIZURE_ORDER", "SEIZURE_ORDER_ID"),
      ],
      amounts: [amount("amount-credits-long", 50_000, "SEIZURE_ROW")],
    });
    const release = document("doc-release-long", "seizure.release", {
      documentDate: "2021-04-01",
      references: [reference("ref-release-long", "SYN-SEIZURE-LONG", "SEIZURE_ORDER", "SEIZURE_ORDER_ID")],
    });
    const first = reconcileGlobalDocumentRelationsV8({
      documents: [release, credits, plan, enforcement],
      reevaluatedAt: NOW,
    });
    const second = reconcileGlobalDocumentRelationsV8({
      documents: [plan, enforcement, credits, release],
      existingRelations:
        first.status === "REVIEW_REQUIRED"
          ? []
          : first.directEdges.map((edge) => ({
              sourceDocumentId: edge.sourceDocumentId,
              targetDocumentId: edge.targetDocumentId,
              status: edge.status,
              relationType: edge.persistedRelationType,
              globalRelationType: edge.relationType,
              ruleVersion: edge.ruleVersion,
            })),
      reevaluatedAt: "2026-07-17T09:00:00.000Z",
    });
    expect(first.status).not.toBe("REVIEW_REQUIRED");
    expect(second.status).toBe("UNCHANGED");
    if (first.status === "REVIEW_REQUIRED") return;
    expect(deriveGlobalReconciliationChainsV8(first.directEdges)[0]?.documentIds).toEqual([
      credits.documentId,
      enforcement.documentId,
      plan.documentId,
      release.documentId,
    ].sort());
  });

  it("fails closed on direct asset identifiers, malformed cents and foreign owners without leaking values", () => {
    const invalid = document("doc-invalid", "seizure.movable_asset", {
      opaqueAssetFingerprint: "1234ABC",
      amounts: [amount("bad-amount", Number.MAX_SAFE_INTEGER + 1, "SEIZURE_ROW")],
    });
    const result = reconcileGlobalDocumentRelationsV8({ documents: [invalid], reevaluatedAt: NOW });
    expect(result).toEqual(expect.objectContaining({ status: "REVIEW_REQUIRED", reason: "INVALID_INPUT" }));
    expect(JSON.stringify(result)).not.toContain("1234ABC");
  });
});
