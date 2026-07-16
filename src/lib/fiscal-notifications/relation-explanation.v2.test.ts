import { describe, expect, it } from "vitest";
import {
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_RELATION_TYPES_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
} from "./knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
  FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2,
  FISCAL_NOTIFICATION_RELATION_STATUSES_V2,
  FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
  FISCAL_NOTIFICATION_USER_LINK_NEUTRAL_PHRASE_V2,
  FiscalNotificationRelationExplanationErrorV2,
  explainFiscalNotificationRelationV2,
} from "./relation-explanation.v2";

function explain(overrides: Partial<{
  readonly relationType: unknown;
  readonly status: unknown;
  readonly exactReferenceConfirmed: boolean;
  readonly userConfirmed: boolean;
  readonly printedEffectProven: boolean;
}> = {}) {
  return explainFiscalNotificationRelationV2({
    relationType: "CONTINUES",
    status: "SUGGESTED",
    exactReferenceConfirmed: false,
    userConfirmed: false,
    printedEffectProven: false,
    ...overrides,
  });
}

describe("relation explanation v2", () => {
  it("compiles a closed immutable catalog for all 48 relation types", () => {
    expect(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).toHaveLength(48);
    expect(FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2).toHaveLength(48);
    expect(new Set(
      FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2.map(
        (entry) => entry.relationType,
      ),
    ).size).toBe(48);
    expect(FISCAL_NOTIFICATION_RELATION_STATUSES_V2).toEqual([
      "SYSTEM_CONFIRMED_EXACT",
      "USER_CONFIRMED",
      "SUGGESTED",
    ]);
    for (const relationType of AEAT_DOCUMENT_RELATION_TYPE_IDS_V1) {
      expect(FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2).toContainEqual({
        relationType,
        exactPhrase: AEAT_DOCUMENT_RELATION_TYPES_V1[relationType].exactPhrase,
        registeredSuggestedPhrase:
          AEAT_DOCUMENT_RELATION_TYPES_V1[relationType].suggestedPhrase,
        exactPhraseRequiresPrintedEffect: true,
      });
    }
    expect(Object.isFrozen(FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2)).toBe(
      true,
    );
    expect(FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2.every(Object.isFrozen)).toBe(
      true,
    );
  });

  it("uses the global cautious phrase literally for SUGGESTED across all 48 types", () => {
    expect(FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2).toBe(
      AEAT_DOCUMENT_KNOWLEDGE_V1.globalPolicy.explanationUi
        .suggestedRelationOnlyPhrase,
    );
    for (const relationType of AEAT_DOCUMENT_RELATION_TYPE_IDS_V1) {
      const output = explain({ relationType });
      expect(output.phrase).toBe(
        AEAT_DOCUMENT_KNOWLEDGE_V1.globalPolicy.explanationUi
          .suggestedRelationOnlyPhrase,
      );
      expect(output).toMatchObject({
        relationType,
        status: "SUGGESTED",
        phraseSource: "GLOBAL_SUGGESTED_PHRASE",
        linkConfirmation: "NOT_CONFIRMED",
        effectAssertion: "NOT_ASSERTED",
        automaticEffect: "NONE",
        materializationPolicy: "PROHIBITED",
      });
    }
  });

  it("confirms an exact reference link without asserting an unproven effect", () => {
    const output = explain({
      relationType: "COMPENSATES",
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceConfirmed: true,
      printedEffectProven: false,
    });

    expect(output).toMatchObject({
      phrase: FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
      phraseSource: "NEUTRAL_CONFIRMED_LINK_PHRASE",
      linkConfirmation: "EXACT_REFERENCE",
      effectAssertion: "NOT_ASSERTED",
    });
    expect(output.phrase).not.toBe(
      AEAT_DOCUMENT_RELATION_TYPES_V1.COMPENSATES.exactPhrase,
    );
  });

  it("uses a registered exact phrase only when the printed effect is proven", () => {
    for (const relationType of AEAT_DOCUMENT_RELATION_TYPE_IDS_V1) {
      const output = explain({
        relationType,
        status: "SYSTEM_CONFIRMED_EXACT",
        exactReferenceConfirmed: true,
        printedEffectProven: true,
      });
      expect(output.phrase).toBe(
        AEAT_DOCUMENT_RELATION_TYPES_V1[relationType].exactPhrase,
      );
      expect(output).toMatchObject({
        phraseSource: "REGISTERED_EXACT_PHRASE",
        linkConfirmation: "EXACT_REFERENCE",
        effectAssertion: "EXPLICIT_IN_DOCUMENT",
      });
    }
  });

  it("does not let user confirmation stand in for printed effect evidence", () => {
    const neutral = explain({
      relationType: "RELEASES_SEIZURE",
      status: "USER_CONFIRMED",
      userConfirmed: true,
      printedEffectProven: false,
    });
    expect(neutral).toMatchObject({
      phrase: FISCAL_NOTIFICATION_USER_LINK_NEUTRAL_PHRASE_V2,
      linkConfirmation: "USER_CONFIRMED",
      effectAssertion: "NOT_ASSERTED",
    });

    const explicit = explain({
      relationType: "RELEASES_SEIZURE",
      status: "USER_CONFIRMED",
      userConfirmed: true,
      printedEffectProven: true,
    });
    expect(explicit.phrase).toBe(
      AEAT_DOCUMENT_RELATION_TYPES_V1.RELEASES_SEIZURE.exactPhrase,
    );
    expect(explicit.effectAssertion).toBe("EXPLICIT_IN_DOCUMENT");
  });

  it("keeps proposal/final and appeal/suspension meanings separate", () => {
    const proposalToFinal = explain({
      relationType: "RESOLVES",
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceConfirmed: true,
      printedEffectProven: false,
    });
    expect(proposalToFinal.effectAssertion).toBe("NOT_ASSERTED");
    expect(proposalToFinal.phrase).toBe(
      FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
    );

    const suspensionRequest = explain({
      relationType: "REQUESTS_SUSPENSION",
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceConfirmed: true,
      printedEffectProven: true,
    });
    const suspensionDecision = explain({
      relationType: "DECIDES_SUSPENSION",
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceConfirmed: true,
      printedEffectProven: true,
    });
    expect(suspensionRequest.phrase).toBe(
      AEAT_DOCUMENT_RELATION_TYPES_V1.REQUESTS_SUSPENSION.exactPhrase,
    );
    expect(suspensionDecision.phrase).toBe(
      AEAT_DOCUMENT_RELATION_TYPES_V1.DECIDES_SUSPENSION.exactPhrase,
    );
    expect(suspensionRequest.phrase).not.toBe(suspensionDecision.phrase);
  });

  it("keeps neutral phrases free of definitive fiscal-effect terms", () => {
    const forbidden =
      /pago|cancelaci[oó]n|suspensi[oó]n|extinci[oó]n|resoluci[oó]n|responsabilidad|levantamiento/iu;
    expect(FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2).not.toMatch(
      forbidden,
    );
    expect(FISCAL_NOTIFICATION_USER_LINK_NEUTRAL_PHRASE_V2).not.toMatch(
      forbidden,
    );
  });

  it("rejects unknown types, statuses and unsupported confirmation claims", () => {
    expect(() => explain({ relationType: "UNKNOWN_RELATION" })).toThrowError(
      FiscalNotificationRelationExplanationErrorV2,
    );
    expect(() => explain({ status: "CONFIRMED" })).toThrowError(
      FiscalNotificationRelationExplanationErrorV2,
    );
    expect(() => explain({
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceConfirmed: false,
    })).toThrowError(FiscalNotificationRelationExplanationErrorV2);
    expect(() => explain({
      status: "USER_CONFIRMED",
      userConfirmed: false,
    })).toThrowError(FiscalNotificationRelationExplanationErrorV2);
    expect(() => explain({ printedEffectProven: "yes" as never })).toThrowError(
      FiscalNotificationRelationExplanationErrorV2,
    );
  });

  it("returns immutable output without mutating the input or knowledge catalog", () => {
    const input = Object.freeze({
      relationType: "PAYS_REFUND",
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceConfirmed: true,
      userConfirmed: false,
      printedEffectProven: false,
    } as const);
    const before = JSON.stringify(AEAT_DOCUMENT_RELATION_TYPES_V1);
    const output = explainFiscalNotificationRelationV2(input);

    expect(Object.isFrozen(output)).toBe(true);
    expect(input).toEqual({
      relationType: "PAYS_REFUND",
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceConfirmed: true,
      userConfirmed: false,
      printedEffectProven: false,
    });
    expect(JSON.stringify(AEAT_DOCUMENT_RELATION_TYPES_V1)).toBe(before);
    expect(() => {
      (output as { phrase: string }).phrase = "mutated";
    }).toThrow();
  });
});
