import { describe, expect, it } from "vitest";
import {
  AEAT_DOCUMENT_CHAIN_WILDCARDS_V1,
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
} from "./knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_ABSTRACT_NODES_V2,
  FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2,
  FISCAL_NOTIFICATION_DOCUMENT_CHAIN_ADJACENCY_V2,
  FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2,
  FISCAL_NOTIFICATION_DOCUMENT_CHAIN_IDS_V2,
  FISCAL_NOTIFICATION_DOCUMENT_CHAIN_VALIDATION_V2,
  FiscalNotificationDocumentChainRulesErrorV2,
  evaluateFiscalNotificationDocumentChainEdgeV2,
  getFiscalNotificationFamilyChainAdjacencyV2,
  matchesFiscalNotificationAbstractNodeV2,
} from "./document-chain-rules.v2";

function evaluate(input: {
  readonly chainId: unknown;
  readonly fromFamilyId: unknown;
  readonly toFamilyId: unknown;
  readonly relationType: unknown;
  readonly printedFavorableOutcome?: boolean;
}) {
  return evaluateFiscalNotificationDocumentChainEdgeV2(input);
}

describe("document-chain rules v2", () => {
  it("compiles exactly the 15 chains and closed 48 relation types", () => {
    expect(FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2).toHaveLength(15);
    expect(FISCAL_NOTIFICATION_DOCUMENT_CHAIN_IDS_V2).toHaveLength(15);
    expect(new Set(FISCAL_NOTIFICATION_DOCUMENT_CHAIN_IDS_V2).size).toBe(15);
    expect(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).toHaveLength(48);
    expect(Object.keys(AEAT_DOCUMENT_KNOWLEDGE_V1.relationTypes)).toHaveLength(48);
    expect(FISCAL_NOTIFICATION_DOCUMENT_CHAIN_VALIDATION_V2).toMatchObject({
      chainCount: 15,
      relationTypeCount: 48,
      profileCount: 87,
      abstractNodeCount: 6,
      matchingPolicy: "DECLARED_EDGES_AND_EXPLICIT_MEMBERS_ONLY",
      undeclaredEdgePolicy: "INACTIVE",
    });
    expect(FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2.map((chain) => chain.id)).toEqual(
      FISCAL_NOTIFICATION_DOCUMENT_CHAIN_IDS_V2,
    );
  });

  it("normalizes every declared edge endpoint into its chain nodes", () => {
    for (const chain of FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2) {
      for (const edge of chain.edges) {
        expect(chain.nodes).toContain(edge.from);
        expect(chain.nodes).toContain(edge.to);
        expect(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).toContain(edge.relationType);
      }
    }
  });

  it("defines all six wildcard memberships as closed explicit sets", () => {
    expect(Object.keys(FISCAL_NOTIFICATION_ABSTRACT_NODES_V2).sort()).toEqual(
      [...AEAT_DOCUMENT_CHAIN_WILDCARDS_V1].sort(),
    );
    for (const definition of Object.values(
      FISCAL_NOTIFICATION_ABSTRACT_NODES_V2,
    )) {
      expect(definition.matchingPolicy).toBe("EXPLICIT_MEMBERS_ONLY");
      expect(definition.members.length).toBeGreaterThan(0);
      expect(new Set(definition.members).size).toBe(definition.members.length);
      for (const familyId of definition.members) {
        expect(AEAT_DOCUMENT_PROFILE_IDS_V1).toContain(familyId);
      }
    }
  });

  it("does not treat a shared family prefix as wildcard membership", () => {
    expect(matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_SEIZURE",
      familyId: "seizure.bank_account",
    })).toBe(true);
    expect(matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_SEIZURE",
      familyId: "seizure.release",
    })).toBe(false);
    expect(matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_THIRD_PARTY_SEIZURE",
      familyId: "seizure.bank_account",
    })).toBe(false);
    expect(matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_ASSET_SEIZURE",
      familyId: "seizure.movable_asset",
    })).toBe(true);
    expect(matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_ASSET_SEIZURE",
      familyId: "seizure.cash_or_refund",
    })).toBe(false);
  });

  it("requires a printed favorable condition for ANY_FAVORABLE_ACT", () => {
    expect(matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_FAVORABLE_ACT",
      familyId: "assessment.no_adjustment_resolution",
    })).toBe(false);
    expect(matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_FAVORABLE_ACT",
      familyId: "assessment.no_adjustment_resolution",
      printedFavorableOutcome: true,
    })).toBe(true);

    expect(evaluate({
      chainId: "special_review_chain",
      fromFamilyId: "assessment.no_adjustment_resolution",
      toFamilyId: "review.lesivity",
      relationType: "CONTINUES",
    })).toMatchObject({
      declared: false,
      reason: "PRINTED_FAVORABLE_OUTCOME_NOT_PROVEN",
    });
    expect(evaluate({
      chainId: "special_review_chain",
      fromFamilyId: "assessment.no_adjustment_resolution",
      toFamilyId: "review.lesivity",
      relationType: "CONTINUES",
      printedFavorableOutcome: true,
    })).toMatchObject({ declared: true, reason: "DECLARED_TOPOLOGY" });
  });

  it("activates only concrete pairs expanded from declared wildcard edges", () => {
    expect(evaluate({
      chainId: "notification_to_act",
      fromFamilyId: "notification.delivery_attempt",
      toFamilyId: "assessment.final_provisional_assessment",
      relationType: "NOTIFICATION_EVIDENCE_FOR",
    })).toMatchObject({ declared: true, reason: "DECLARED_TOPOLOGY" });
    expect(evaluate({
      chainId: "notification_to_act",
      fromFamilyId: "notification.delivery_attempt",
      toFamilyId: "information.tax_data_report",
      relationType: "NOTIFICATION_EVIDENCE_FOR",
    })).toEqual({
      declared: false,
      reason: "EDGE_NOT_DECLARED",
      relationEvidenceStatus: "NOT_EVALUATED",
      edge: null,
    });

    expect(evaluate({
      chainId: "enforcement_seizure_chain",
      fromFamilyId: "collection.enforcement_order",
      toFamilyId: "seizure.bank_account",
      relationType: "ENFORCES",
    })).toMatchObject({ declared: true });
    expect(evaluate({
      chainId: "enforcement_seizure_chain",
      fromFamilyId: "seizure.commercial_credits",
      toFamilyId: "seizure.third_party_response",
      relationType: "RESPONDS_TO_SEIZURE",
    })).toMatchObject({ declared: true });
    expect(evaluate({
      chainId: "enforcement_seizure_chain",
      fromFamilyId: "seizure.bank_account",
      toFamilyId: "seizure.third_party_response",
      relationType: "RESPONDS_TO_SEIZURE",
    })).toMatchObject({ declared: false, reason: "EDGE_NOT_DECLARED" });
  });

  it("keeps proposal and final assessment edges directional and separate", () => {
    expect(evaluate({
      chainId: "assessment_chain",
      fromFamilyId: "assessment.allegations_and_proposal",
      toFamilyId: "assessment.final_provisional_assessment",
      relationType: "RESOLVES",
    })).toMatchObject({ declared: true });
    expect(evaluate({
      chainId: "assessment_chain",
      fromFamilyId: "assessment.final_provisional_assessment",
      toFamilyId: "assessment.allegations_and_proposal",
      relationType: "RESOLVES",
    })).toMatchObject({ declared: false, reason: "EDGE_NOT_DECLARED" });
    expect(evaluate({
      chainId: "assessment_to_collection",
      fromFamilyId: "assessment.allegations_and_proposal",
      toFamilyId: "payment.payment_form",
      relationType: "PAYMENT_FORM_FOR",
    })).toMatchObject({ declared: false, reason: "EDGE_NOT_DECLARED" });
  });

  it("keeps appeal, suspension request and suspension decision separate", () => {
    expect(evaluate({
      chainId: "review_suspension_chain",
      fromFamilyId: "review.recurso_reposicion",
      toFamilyId: "review.suspension_request",
      relationType: "REQUESTS_SUSPENSION",
    })).toMatchObject({ declared: true });
    expect(evaluate({
      chainId: "review_suspension_chain",
      fromFamilyId: "review.recurso_reposicion",
      toFamilyId: "review.suspension_decision",
      relationType: "DECIDES_SUSPENSION",
    })).toMatchObject({ declared: false, reason: "EDGE_NOT_DECLARED" });
    expect(evaluate({
      chainId: "review_suspension_chain",
      fromFamilyId: "review.suspension_request",
      toFamilyId: "review.suspension_decision",
      relationType: "DECIDES_SUSPENSION",
    })).toMatchObject({ declared: true });
  });

  it("derives immutable incoming and outgoing entries for every family", () => {
    expect(Object.keys(FISCAL_NOTIFICATION_DOCUMENT_CHAIN_ADJACENCY_V2)).toHaveLength(
      87,
    );
    const assessment = getFiscalNotificationFamilyChainAdjacencyV2(
      "assessment.final_provisional_assessment",
    );
    expect(assessment.incoming).toContainEqual(expect.objectContaining({
      chainId: "assessment_chain",
      fromFamilyId: "assessment.allegations_and_proposal",
      relationType: "RESOLVES",
    }));
    expect(assessment.outgoing).toContainEqual(expect.objectContaining({
      chainId: "assessment_to_collection",
      toFamilyId: "payment.payment_form",
      relationType: "PAYMENT_FORM_FOR",
    }));
    expect(Object.isFrozen(assessment)).toBe(true);
    expect(Object.isFrozen(assessment.incoming)).toBe(true);
    expect(Object.isFrozen(assessment.outgoing)).toBe(true);
  });

  it("rejects unknown chain, family, relation and wildcard identifiers", () => {
    const valid = {
      chainId: "assessment_chain",
      fromFamilyId: "assessment.allegations_and_proposal",
      toFamilyId: "assessment.final_provisional_assessment",
      relationType: "RESOLVES",
    } as const;
    expect(() => evaluate({ ...valid, chainId: "unknown_chain" })).toThrowError(
      FiscalNotificationDocumentChainRulesErrorV2,
    );
    expect(() => evaluate({ ...valid, fromFamilyId: "assessment.unknown" })).toThrowError(
      FiscalNotificationDocumentChainRulesErrorV2,
    );
    expect(() => evaluate({ ...valid, relationType: "UNKNOWN_RELATION" })).toThrowError(
      FiscalNotificationDocumentChainRulesErrorV2,
    );
    expect(() => matchesFiscalNotificationAbstractNodeV2({
      nodeId: "ANY_PREFIX_MATCH",
      familyId: "seizure.bank_account",
    })).toThrowError(FiscalNotificationDocumentChainRulesErrorV2);
  });

  it("does not mutate knowledge, inputs, compiled chains or adjacency", () => {
    const before = JSON.stringify(AEAT_DOCUMENT_KNOWLEDGE_V1.documentChains);
    const input = Object.freeze({
      chainId: "assessment_chain",
      fromFamilyId: "assessment.allegations_and_proposal",
      toFamilyId: "assessment.final_provisional_assessment",
      relationType: "RESOLVES",
    });
    expect(evaluate(input)).toMatchObject({
      declared: true,
      reason: "DECLARED_TOPOLOGY",
      relationEvidenceStatus: "NOT_EVALUATED",
    });
    expect(JSON.stringify(AEAT_DOCUMENT_KNOWLEDGE_V1.documentChains)).toBe(before);
    expect(Object.isFrozen(FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2)).toBe(true);
    expect(Object.isFrozen(FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2)).toBe(true);
    expect(() => {
      (FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2 as unknown[]).push({});
    }).toThrow();
    expect(() => {
      (
        getFiscalNotificationFamilyChainAdjacencyV2(
          "assessment.final_provisional_assessment",
        ).outgoing as unknown[]
      ).push({});
    }).toThrow();
  });
});
