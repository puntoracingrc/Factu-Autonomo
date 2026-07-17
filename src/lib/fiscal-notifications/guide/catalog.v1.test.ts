import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
  resolveFiscalNotificationGuideSelectionV1,
} from "@/lib/fiscal-notifications/guide/catalog.v1";
import {
  FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2,
  FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2,
} from "@/lib/fiscal-notifications/document-chain-rules.v2";
import {
  AEAT_DOCUMENT_PROFILES_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
} from "@/lib/fiscal-notifications/knowledge/aeat-document-knowledge.v1";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2 } from "@/lib/fiscal-notifications/knowledge/document-families.v2";
import { AEAT_OFFICIAL_CATALOG_PROFILES_V9 } from "@/lib/fiscal-notifications/knowledge/official-catalog-expansion.v9";
import { resolveAeatP0DeepProfileV10 } from "@/lib/fiscal-notifications/knowledge/p0-deep-contracts.v10";

describe("fiscal notification guide catalog v1", () => {
  it("projects the 87 existing families and 35 additive V9 profiles without activating operations", () => {
    expect(FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1).toHaveLength(122);
    expect(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.map((entry) => entry.familyId),
    ).toEqual(
      [
        ...FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map((family) => family.id),
        ...AEAT_OFFICIAL_CATALOG_PROFILES_V9.map((profile) => profile.id),
      ],
    );

    for (const entry of FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.slice(0, 87)) {
      expect(entry.schemaVersion).toBe(1);
      expect(entry.legalReviewStatus).toBe("LEGAL_REVIEW_PENDING");
      expect(entry.requiresHumanReview).toBe(true);
      expect(entry.printedDocumentPolicy).toBe(
        "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW",
      );
      expect(entry.officialContextPolicy).toBe(
        "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT",
      );
      expect(entry.coverage.legalRuleActive).toBe(false);
      expect(entry.coverage.operationalActionActive).toBe(false);
      expect(entry.coverage.automaticRelationConfirmationActive).toBe(false);
      expect(entry.coverage.status).toBe("AUTOMATIC_REVIEW_ONLY");
      expect(entry.coverage.candidateHandlerImplemented).toBe(true);
      expect(entry.coverage.explicitFactExtractorImplemented).toBe(true);
      expect(entry.coverage.syntheticTestCaseAvailable).toBe(true);
      expect(entry.coverage.blockers).not.toContain("CANDIDATE_HANDLER_MISSING");
      expect(entry.coverage.blockers).not.toContain(
        "EXPLICIT_FACT_EXTRACTOR_MISSING",
      );
      expect(entry.coverage.blockers).not.toContain("SYNTHETIC_FIXTURE_MISSING");
      expect(entry.permitsDebtCreation).toBe(false);
      expect(entry.permitsDeadlineCreation).toBe(false);
      expect(entry.permitsPaymentAction).toBe(false);
      expect(entry.permitsAccountingAction).toBe(false);
      expect(entry.permitsAutomaticRelationConfirmation).toBe(false);
      expect(entry.documentChecks.length).toBeGreaterThan(0);
      expect(entry.prohibitions).toHaveLength(10);
      expect(entry.plainLanguage.status).toBe("GENERAL_CONTEXT_EXPLAINED");
      expect(entry.sources.length).toBeGreaterThan(0);
    }
  });

  it("keeps carta de pago separate from evidence that a payment occurred", () => {
    const paymentForm = resolveFiscalNotificationGuideSelectionV1(
      "payment.payment_form",
    );
    const paymentReceipt =
      resolveFiscalNotificationGuideSelectionV1("payment.receipt");
    expect(paymentForm.status).toBe("SELECTED");
    expect(paymentReceipt.status).toBe("SELECTED");
    if (
      paymentForm.status !== "SELECTED" ||
      paymentReceipt.status !== "SELECTED"
    ) {
      throw new Error("Expected distinct guide entries");
    }

    expect(paymentForm.entry.familyId).not.toBe(paymentReceipt.entry.familyId);
    expect(paymentForm.entry.category).toBe("PAYMENT_INSTRUMENT");
    expect(paymentReceipt.entry.category).toBe("PAYMENT_EVIDENCE");
    expect(
      paymentForm.entry.prohibitions.find(
        (item) => item.id === "PAYMENT_FORM_IS_PAYMENT_RECEIPT",
      )?.label,
    ).toContain("no acredita");
    expect(
      paymentForm.entry.possibleNext.some(
        (related) => related.familyId === "payment.receipt",
      ),
    ).toBe(true);
    expect(
      paymentForm.entry.possibleNext.every(
        (related) =>
          related.status === "SUGGESTED_ONLY" && !related.autoConfirm,
      ),
    ).toBe(true);
    expect(paymentForm.entry.plainLanguage.keyPoints).toContain(
      "Permite pagar, pero no acredita que el pago ya se haya realizado.",
    );
    expect(paymentReceipt.entry.plainLanguage.inShort).toContain("evidencia");
  });

  it("adds individual official guidance to all 122 families", () => {
    const explained = FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1;
    expect(explained).toHaveLength(122);
    expect(
      explained.filter(
        (entry) => entry.recognitionMode === "AUTOMATIC_REVIEW_ONLY",
      ),
    ).toHaveLength(118);
    expect(
      explained.filter(
        (entry) => entry.recognitionMode === "MANUAL_REVIEW_ONLY",
      ),
    ).toHaveLength(4);

    expect(
      explained.find((entry) => entry.familyId === "collection.deferral_denial")
        ?.plainLanguage,
    ).toMatchObject({
      profileId: "collection.deferral_denial",
      status: "GENERAL_CONTEXT_EXPLAINED",
    });

    const enforcement = explained.find(
      (entry) => entry.familyId === "collection.enforcement_order",
    );
    expect(enforcement?.summary).toContain("vía ejecutiva");
    expect(enforcement?.plainLanguage).toMatchObject({
      profileId: "collection.enforcement_order",
      profileVersion: "1.0.0",
      networkPolicy: "NO_RUNTIME_NETWORK",
      deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE",
    });
    expect(enforcement?.sources.map((source) => source.sourceId)).toEqual(
      expect.arrayContaining([
        "aeat.collection.enforcement_surcharges",
        "aeat.collection.enforcement_nonpayment",
        "aeat.collection.enforcement_resources",
      ]),
    );

    const sanction = explained.find(
      (entry) => entry.familyId === "sanction.resolution",
    );
    expect(sanction).toMatchObject({
      recognitionMode: "AUTOMATIC_REVIEW_ONLY",
      plainLanguage: {
        status: "GENERAL_CONTEXT_EXPLAINED",
        networkPolicy: "NO_RUNTIME_NETWORK",
      },
    });
    expect(sanction?.summary).not.toContain("El catálogo registra");
  });

  it("exposes V9 maturity, official sources and sector gates without generic fallback", () => {
    const rectification = resolveFiscalNotificationGuideSelectionV1(
      "assessment.rectification_request",
    );
    const verifactu = resolveFiscalNotificationGuideSelectionV1(
      "verifactu.technical_response",
    );
    expect(rectification.status).toBe("SELECTED");
    expect(verifactu.status).toBe("SELECTED");
    if (rectification.status !== "SELECTED" || verifactu.status !== "SELECTED") {
      throw new Error("Expected V9 guide entries");
    }
    expect(rectification.entry).toMatchObject({
      recognitionMode: "AUTOMATIC_REVIEW_ONLY",
      recognitionMaturity: "OFFICIAL_ONLY",
      plainLanguage: {
        familyId: "assessment.rectification_request",
        networkPolicy: "NO_RUNTIME_NETWORK",
      },
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
    expect(rectification.entry.sources.length).toBeGreaterThan(0);
    expect(rectification.entry.summary).toBe(
      resolveAeatP0DeepProfileV10("assessment.rectification_request")?.explanationTemplate.whatItIs,
    );
    expect(rectification.entry.coverage).toMatchObject({
      explicitFactExtractorImplemented: true,
      legalRuleActive: false,
      operationalActionActive: false,
      blockers: ["LEGAL_REVIEW_PENDING", "OPERATIONAL_ACTIVATION_PROHIBITED"],
    });
    expect(rectification.entry.plainLanguage.usualNextStep).toContain("presentación original");
    expect(verifactu.entry.recognitionMode).toBe("MANUAL_REVIEW_ONLY");
    expect(verifactu.entry.recognitionMaturity).toBe("OFFICIAL_ONLY");
  });

  it("derives only suggested before/after context from all 15 declared chains", () => {
    expect(FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2).toHaveLength(15);
    expect(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).toHaveLength(48);
    const enforcement = resolveFiscalNotificationGuideSelectionV1(
      "collection.enforcement_order",
    );
    expect(enforcement.status).toBe("SELECTED");
    if (enforcement.status !== "SELECTED") {
      throw new Error("Expected enforcement guide entry");
    }

    expect(
      enforcement.entry.possiblePrevious.map((entry) => entry.familyId),
    ).toEqual(
      expect.arrayContaining([
        "collection.deferral_breach",
        "assessment.final_provisional_assessment",
        "liability.final_resolution",
        "liability.successors",
      ]),
    );
    expect(enforcement.entry.abstractRelationContexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contextKind: "DECLARED_CHAIN_WILDCARD",
          chainId: "enforcement_seizure_chain",
          relationType: "ENFORCES",
          abstractNodeId: "ANY_SEIZURE",
          direction: "POSSIBLE_NEXT",
          status: "SUGGESTED_ONLY",
          autoConfirm: false,
        }),
      ]),
    );
    for (const related of [
      ...enforcement.entry.possiblePrevious,
      ...enforcement.entry.possibleNext,
    ]) {
      expect(related.matchPolicy).toBe(
        "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED",
      );
      expect(related.status).toBe("SUGGESTED_ONLY");
      expect(related.autoConfirm).toBe(false);
      const declaredEdge = FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2.find(
        (edge) =>
          edge.chainId === related.chainId &&
          edge.relationType === related.relationType &&
          (related.direction === "POSSIBLE_PREVIOUS"
            ? edge.fromFamilyId === related.familyId &&
              edge.toFamilyId === enforcement.entry.familyId
            : edge.fromFamilyId === enforcement.entry.familyId &&
              edge.toFamilyId === related.familyId),
      );
      expect(declaredEdge).toBeDefined();
      expect(declaredEdge?.rawFromNode).not.toMatch(/^ANY_/u);
      expect(declaredEdge?.rawToNode).not.toMatch(/^ANY_/u);
    }
  });

  it("keeps wildcard and targetless roles abstract while covering every declared chain role", () => {
    const entriesByFamily = new Map(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.map((entry) => [
        entry.familyId,
        entry,
      ] as const),
    );
    const representedChainIds = new Set<string>();

    for (const profile of AEAT_DOCUMENT_PROFILES_V1) {
      const entry = entriesByFamily.get(profile.id);
      expect(entry, profile.id).toBeDefined();
      if (!entry) continue;
      const related = [...entry.possiblePrevious, ...entry.possibleNext];
      for (const item of related) {
        representedChainIds.add(item.chainId);
        expect(item.status, profile.id).toBe("SUGGESTED_ONLY");
        expect(item.autoConfirm, profile.id).toBe(false);
        expect(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).toContain(item.relationType);
      }
      for (const context of entry.abstractRelationContexts) {
        if (context.chainId) representedChainIds.add(context.chainId);
        expect(context.status, profile.id).toBe("SUGGESTED_ONLY");
        expect(context.autoConfirm, profile.id).toBe(false);
        expect(context.prudentPhrase.length, profile.id).toBeGreaterThan(0);
        expect(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).toContain(
          context.relationType,
        );
        if (context.contextKind === "DECLARED_RELATION_WITHOUT_TARGET") {
          expect(context.chainId, profile.id).toBeNull();
          expect(context.abstractNodeId, profile.id).toBeNull();
          expect(context.counterpartFamilyId, profile.id).toBeNull();
          expect(context.direction, profile.id).toBe("CONTEXT_ONLY");
        } else {
          expect(context.chainId, profile.id).not.toBeNull();
          expect(context.abstractNodeId, profile.id).toMatch(/^ANY_/u);
        }
      }
      if (profile.chainRole.length > 0) {
        expect(
          related.length + entry.abstractRelationContexts.length,
          profile.id,
        ).toBeGreaterThan(0);
      }
      expect(related.length, profile.id).toBeLessThanOrEqual(10);
    }

    expect([...representedChainIds].sort()).toEqual(
      FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2.map((chain) => chain.id).sort(),
    );
    expect(
      entriesByFamily.get("information.tax_data_report")?.possibleNext,
    ).toEqual([]);
    expect(
      entriesByFamily.get("information.tax_data_report")
        ?.abstractRelationContexts,
    ).toEqual([
      {
        contextKind: "DECLARED_RELATION_WITHOUT_TARGET",
        chainId: null,
        relationType: "INFORMATIONAL_CONTEXT_FOR",
        abstractNodeId: null,
        counterpartFamilyId: null,
        direction: "CONTEXT_ONLY",
        status: "SUGGESTED_ONLY",
        prudentPhrase:
          "Puede aportar contexto a otro documento. No lo uses para crear una obligación o un pago.",
        requiresPrintedFavorableOutcome: false,
        autoConfirm: false,
      },
    ]);
  });

  it("resolves query selections exactly and fails closed for malformed or unknown values", () => {
    expect(resolveFiscalNotificationGuideSelectionV1(undefined)).toEqual({
      status: "INDEX",
      entry: null,
    });
    expect(
      resolveFiscalNotificationGuideSelectionV1(
        "compliance.formal_filing_requirement",
      ),
    ).toMatchObject({
      status: "SELECTED",
      entry: { familyId: "compliance.formal_filing_requirement" },
    });

    for (const value of [
      "unknown.family",
      " compliance.formal_filing_requirement",
      "compliance.formal_filing_requirement ",
      "compliance.formal_filing_requirement\n",
      ["compliance.formal_filing_requirement"],
      1,
      "x".repeat(161),
    ]) {
      const result = resolveFiscalNotificationGuideSelectionV1(value);
      expect(result).toEqual({ status: "UNKNOWN_OR_INVALID", entry: null });
      expect(Object.isFrozen(result)).toBe(true);
    }
  });

  it("publishes defensive immutable guide projections", () => {
    const first = FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1[0];
    expect(Object.isFrozen(FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.aliases)).toBe(true);
    expect(Object.isFrozen(first.sources)).toBe(true);
    expect(Object.isFrozen(first.coverage)).toBe(true);
    expect(Object.isFrozen(first.coverage.blockers)).toBe(true);
    expect(Object.isFrozen(first.possiblePrevious)).toBe(true);
    expect(Object.isFrozen(first.possibleNext)).toBe(true);
    expect(Object.isFrozen(first.abstractRelationContexts)).toBe(true);
    expect(Object.isFrozen(first.prohibitions)).toBe(true);
    const explained = FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1[0];
    expect(Object.isFrozen(explained?.plainLanguage)).toBe(true);
    expect(Object.isFrozen(explained?.plainLanguage?.deadline)).toBe(true);
  });
});
