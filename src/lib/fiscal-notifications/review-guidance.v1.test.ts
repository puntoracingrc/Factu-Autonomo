import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AeatEnforcementMoneyFactsResult } from "./aeat-enforcement-money-facts";
import type {
  FiscalNotificationLocalReviewCandidate,
  FiscalNotificationLocalReviewReason,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import {
  FISCAL_NOTIFICATION_REVIEW_GUIDANCE_SCHEMA_VERSION_V1,
  FISCAL_NOTIFICATION_REVIEW_GUIDANCE_VERSION_V1,
  projectFiscalNotificationReviewGuidanceV1,
  type FiscalNotificationReviewGuidanceInputV1,
} from "./review-guidance.v1";

const HASH = "a".repeat(64);

describe("review guidance v1", () => {
  it("projects a complete enforcement candidate without retaining its printed amount", () => {
    const input = analysisInput({
      candidates: [completeEnforcementCandidate()],
      money: moneyResult("FACTS_AVAILABLE"),
    });
    const before = JSON.stringify(input);

    const result = projectFiscalNotificationReviewGuidanceV1(input);

    expect(result).toMatchObject({
      schemaVersion: FISCAL_NOTIFICATION_REVIEW_GUIDANCE_SCHEMA_VERSION_V1,
      guidanceVersion: FISCAL_NOTIFICATION_REVIEW_GUIDANCE_VERSION_V1,
      projectionStatus: "GUIDANCE_AVAILABLE",
      candidateContext: {
        familyId: "collection.enforcement_order",
        classificationPolicy: "CANDIDATE_CONTEXT_ONLY",
      },
      completionTracking: "DISABLED",
      userInputPolicy: "NONE",
      persistencePolicy: "DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      legalRuleStatus: "NOT_APPLIED",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(result.officialProcedureContexts).toEqual([
      expect.objectContaining({
        sourceId: "aeat.collection.enforcement",
        canonicalUrl:
          "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA19.shtml",
        usagePolicy: "PROCEDURE_CONTEXT_ONLY",
        legalReviewStatus: "LEGAL_REVIEW_PENDING",
        permitsLegalRuleActivation: false,
      }),
    ]);
    expect(result.steps.map((item) => item.id)).toEqual([
      "VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY",
      "REVIEW_CANDIDATE_CLASSIFICATION",
      "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
      "VERIFY_DATES_AND_RESPONSE_CHANNELS_EXTERNALLY",
      "CONSULT_OFFICIAL_PROCEDURE_CONTEXT",
      "SEEK_HUMAN_FISCAL_REVIEW",
    ]);
    expect(result.steps[2]).toEqual({
      id: "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
      state: "MANUAL_REVIEW_REQUIRED",
      reason: "PRINTED_FACTS_REVIEW_ONLY",
    });
    expect(JSON.stringify(input)).toBe(before);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(HASH);
    expect(serialized).not.toContain("12345");
    expect(collectKeys(result)).not.toEqual(
      expect.arrayContaining([
        "amountCents",
        "sha256",
        "ownerScope",
        "reviewId",
        "documentId",
        "text",
        "nif",
        "csv",
        "deadline",
      ]),
    );
    expectDeepFrozen(result);
  });

  it("maps a complete deferral candidate to context-only RB01 without a money step", () => {
    const result = projectFiscalNotificationReviewGuidanceV1(
      analysisInput({ candidates: [completeDeferralCandidate()] }),
    );

    expect(result.projectionStatus).toBe("GUIDANCE_AVAILABLE");
    expect(result.candidateContext).toEqual({
      familyId: "collection.deferral_grant",
      classificationPolicy: "CANDIDATE_CONTEXT_ONLY",
    });
    expect(result.officialProcedureContexts).toEqual([
      expect.objectContaining({
        sourceId: "aeat.collection.deferral",
        canonicalUrl:
          "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RB01.shtml",
      }),
    ]);
    expect(result.steps).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
        }),
      ]),
    );
    expect(result.steps).toHaveLength(5);
  });

  it.each([
    {
      outcome: "INFORMATION_PENDING" as const,
      state: "INFORMATION_PENDING",
      reason: "PRINTED_FACTS_INFORMATION_PENDING",
    },
    {
      outcome: "AMBIGUOUS" as const,
      state: "BLOCKED_BY_ANALYSIS",
      reason: "PRINTED_FACTS_AMBIGUOUS_OR_BLOCKED",
    },
    {
      outcome: "PROCESSING_BLOCKED" as const,
      state: "BLOCKED_BY_ANALYSIS",
      reason: "PRINTED_FACTS_AMBIGUOUS_OR_BLOCKED",
    },
  ])("keeps $outcome monetary information fail-closed", (sample) => {
    const result = projectFiscalNotificationReviewGuidanceV1(
      analysisInput({
        candidates: [completeEnforcementCandidate()],
        money: moneyResult(sample.outcome),
      }),
    );
    expect(
      result.steps.find(
        (item) => item.id === "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
      ),
    ).toEqual({
      id: "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
      state: sample.state,
      reason: sample.reason,
    });
  });

  it("distinguishes incomplete, ambiguous and processing-blocked family review", () => {
    const partial = projectFiscalNotificationReviewGuidanceV1(
      analysisInput({
        status: "INFORMATION_PENDING",
        reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
        candidates: [partialEnforcementCandidate()],
      }),
    );
    expect(partial.projectionStatus).toBe("GUIDANCE_AVAILABLE");
    expect(partial.candidateContext).toBeNull();
    expect(partial.officialProcedureContexts).toEqual([]);
    expect(partial.steps[1]).toEqual({
      id: "REVIEW_CANDIDATE_CLASSIFICATION",
      state: "INFORMATION_PENDING",
      reason: "CANDIDATE_INFORMATION_INCOMPLETE",
    });

    const ambiguous = projectFiscalNotificationReviewGuidanceV1(
      analysisInput({
        reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
        candidates: [
          completeEnforcementCandidate(),
          completeDeferralCandidate(),
        ],
      }),
    );
    expect(ambiguous.candidateContext).toBeNull();
    expect(ambiguous.steps[1]).toMatchObject({
      state: "BLOCKED_BY_ANALYSIS",
      reason: "CANDIDATE_AMBIGUOUS_OR_CONFLICTING",
    });

    const blocked = projectFiscalNotificationReviewGuidanceV1(
      analysisInput({
        reason: "UNSUPPORTED_TEXT_CONTROLS",
        candidates: [],
      }),
    );
    expect(blocked.projectionStatus).toBe("GUIDANCE_AVAILABLE");
    expect(blocked.steps[1]).toMatchObject({
      state: "BLOCKED_BY_ANALYSIS",
      reason: "CANDIDATE_ANALYSIS_BLOCKED",
    });
  });

  it("turns absent family information into pending rather than a negative conclusion", () => {
    for (const reason of [
      "NO_SUPPORTED_FAMILY_SIGNAL",
      "OCR_DISABLED",
    ] as const) {
      const result = projectFiscalNotificationReviewGuidanceV1(
        analysisInput({
          status: "INFORMATION_PENDING",
          reason,
          candidates: [],
          engineId: reason === "OCR_DISABLED" ? null : undefined,
          engineVersion: reason === "OCR_DISABLED" ? null : undefined,
        }),
      );
      expect(result.projectionStatus).toBe("GUIDANCE_AVAILABLE");
      expect(result.steps[1]).toMatchObject({
        state: "INFORMATION_PENDING",
        reason: "CANDIDATE_INFORMATION_INCOMPLETE",
      });
      expect(result.candidateContext).toBeNull();
      expect(result.officialProcedureContexts).toEqual([]);
    }
    expect(
      projectFiscalNotificationReviewGuidanceV1(
        analysisInput({
          status: "INFORMATION_PENDING",
          reason: "NO_EXTRACTABLE_TEXT",
          candidates: [],
        }),
      ).projectionStatus,
    ).toBe("GUIDANCE_BLOCKED");
  });

  it("blocks malformed envelopes, forged facts and incoherent family-money pairs", () => {
    const valid = analysisInput({
      candidates: [completeEnforcementCandidate()],
      money: moneyResult("FACTS_AVAILABLE"),
    });
    const cases: unknown[] = [
      { ...valid, privateTaxId: "PRIVATE_TAX_ID" },
      {
        ...valid,
        ephemeralEnforcementMoneyFacts: {
          ...valid.ephemeralEnforcementMoneyFacts,
          facts: [{}],
        },
      },
      analysisInput({
        candidates: [completeDeferralCandidate()],
        money: moneyResult("FACTS_AVAILABLE"),
      }),
      analysisInput({ candidates: [completeEnforcementCandidate()] }),
      {
        ...valid,
        technicalReview: {
          ...valid.technicalReview,
          engineId: null,
          engineVersion: null,
        },
      },
      analysisInput({
        candidates: [forgedCompleteEnforcementCandidate()],
        money: moneyResult("FACTS_AVAILABLE"),
      }),
      analysisInput({
        candidates: [duplicateAnchorCandidate()],
        money: moneyResult("FACTS_AVAILABLE"),
      }),
      analysisInput({
        candidates: [crossFamilyAnchorCandidate()],
        money: moneyResult("FACTS_AVAILABLE"),
      }),
      analysisInput({
        candidates: [wrongFirstPageCandidate()],
        money: moneyResult("FACTS_AVAILABLE"),
      }),
      analysisInput({
        reason: "CONFLICTING_DOCUMENT_SIGNAL",
        candidates: [authorityConflictCandidate()],
      }),
      analysisInput({
        reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
        candidates: [authorityConflictCandidate(), completeDeferralCandidate()],
      }),
      {
        ...valid,
        ephemeralEnforcementMoneyFacts: {
          ...valid.ephemeralEnforcementMoneyFacts,
          facts: [
            moneyFact("DOCUMENT_TOTAL"),
            moneyFact("OUTSTANDING_PRINCIPAL"),
          ],
        },
      },
      {
        ...valid,
        ephemeralEnforcementMoneyFacts: {
          ...valid.ephemeralEnforcementMoneyFacts,
          issues: [
            {
              code: "DUPLICATE_AMOUNT_SECTION",
              kind: null,
              pageNumbers: [1],
            },
          ],
        },
      },
      {
        ...valid,
        ephemeralEnforcementMoneyFacts: {
          ...valid.ephemeralEnforcementMoneyFacts,
          outcome: "INFORMATION_PENDING",
          status: "INFORMATION_PENDING",
          facts: [],
          issues: [
            {
              code: "NO_AMOUNT_SECTION",
              kind: "DOCUMENT_TOTAL",
              pageNumbers: [],
            },
          ],
        },
      },
      {
        ...valid,
        ephemeralEnforcementMoneyFacts: {
          ...valid.ephemeralEnforcementMoneyFacts,
          facts: [
            {
              ...moneyFact("OUTSTANDING_PRINCIPAL"),
              evidence: [
                {
                  ...moneyFact("OUTSTANDING_PRINCIPAL").evidence[0],
                  pageNumber: 2,
                },
              ],
            },
          ],
        },
      },
    ];

    for (const value of cases) {
      expect(projectFiscalNotificationReviewGuidanceV1(value)).toMatchObject({
        projectionStatus: "GUIDANCE_BLOCKED",
        candidateContext: null,
        officialProcedureContexts: [],
        completionTracking: "DISABLED",
        userInputPolicy: "NONE",
        persistencePolicy: "DO_NOT_PERSIST",
        legalRuleStatus: "NOT_APPLIED",
        requiresHumanReview: true,
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      });
    }
  });

  it("rejects accessors without invoking them and bounds oversized collections", () => {
    let getterCalls = 0;
    const accessor = Object.defineProperties(
      {},
      {
        technicalReview: {
          enumerable: true,
          get() {
            getterCalls += 1;
            return completeReview([completeEnforcementCandidate()]);
          },
        },
        ephemeralEnforcementMoneyFacts: {
          enumerable: true,
          value: null,
        },
      },
    );
    expect(projectFiscalNotificationReviewGuidanceV1(accessor).projectionStatus).toBe(
      "GUIDANCE_BLOCKED",
    );
    expect(getterCalls).toBe(0);

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(
      projectFiscalNotificationReviewGuidanceV1(revoked.proxy)
        .projectionStatus,
    ).toBe("GUIDANCE_BLOCKED");
    expect(
      projectFiscalNotificationReviewGuidanceV1(
        new Proxy(
          {},
          {
            getPrototypeOf() {
              throw new Error("PRIVATE_PROXY_TRAP");
            },
          },
        ),
      ).projectionStatus,
    ).toBe("GUIDANCE_BLOCKED");

    expect(
      projectFiscalNotificationReviewGuidanceV1(
        analysisInput({
          reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
          candidates: [
            completeEnforcementCandidate(),
            completeDeferralCandidate(),
            completeEnforcementCandidate(),
          ],
        }),
      ).projectionStatus,
    ).toBe("GUIDANCE_BLOCKED");
  });

  it("returns isolated deeply frozen outputs and does not use network, storage or clocks", () => {
    const input = analysisInput({ candidates: [completeDeferralCandidate()] });
    const first = projectFiscalNotificationReviewGuidanceV1(input);
    const second = projectFiscalNotificationReviewGuidanceV1(input);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Reflect.set(first.steps, "0", null)).toBe(false);
    expect(second.steps[0]?.id).toBe(
      "VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY",
    );
    expectDeepFrozen(first);

    const source = readFileSync(
      new URL("./review-guidance.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random)\b/u,
    );
  });
});

function analysisInput(options: {
  readonly status?: FiscalNotificationLocalReviewResult["status"];
  readonly reason?: FiscalNotificationLocalReviewReason;
  readonly candidates?: readonly FiscalNotificationLocalReviewCandidate[];
  readonly money?: AeatEnforcementMoneyFactsResult | null;
  readonly engineId?: FiscalNotificationLocalReviewResult["engineId"];
  readonly engineVersion?: FiscalNotificationLocalReviewResult["engineVersion"];
} = {}): FiscalNotificationReviewGuidanceInputV1 {
  return {
    technicalReview: completeReview(options.candidates ?? [], options),
    ephemeralEnforcementMoneyFacts: options.money ?? null,
  };
}

function completeReview(
  candidates: readonly FiscalNotificationLocalReviewCandidate[],
  options: {
    readonly status?: FiscalNotificationLocalReviewResult["status"];
    readonly reason?: FiscalNotificationLocalReviewReason;
    readonly engineId?: FiscalNotificationLocalReviewResult["engineId"];
    readonly engineVersion?: FiscalNotificationLocalReviewResult["engineVersion"];
  } = {},
): FiscalNotificationLocalReviewResult {
  return {
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: options.status ?? "REVIEW_REQUIRED",
    reason: options.reason ?? "SUPPORTED_FAMILY_CANDIDATE",
    engineId:
      options.engineId === undefined
        ? "fiscal-notification-family-candidate-engine"
        : options.engineId,
    engineVersion:
      options.engineVersion === undefined ? "1.0.0" : options.engineVersion,
    pageCount: 2,
    byteLength: 2_048,
    sha256: HASH,
    candidates,
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  };
}

function completeEnforcementCandidate(): FiscalNotificationLocalReviewCandidate {
  return candidate(
    "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
    [
      "AEAT_OFFICIAL_DOMAIN_LABEL",
      "ENFORCEMENT_ORDER_TITLE",
      "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
      "ENFORCEMENT_DEBT_AMOUNT_SECTION",
      "STRUCTURAL_FIRST_PAGE_HEADER",
    ],
    [],
  );
}

function completeDeferralCandidate(): FiscalNotificationLocalReviewCandidate {
  return candidate(
    "AEAT_DEFERRAL_GRANT_CANDIDATE",
    [
      "AEAT_OFFICIAL_DOMAIN_LABEL",
      "DEFERRAL_GRANT_TITLE",
      "DEFERRAL_INSTALLMENT_ANNEX",
      "DEFERRAL_INTEREST_CALCULATION",
      "STRUCTURAL_FIRST_PAGE_HEADER",
    ],
    [],
  );
}

function partialEnforcementCandidate(): FiscalNotificationLocalReviewCandidate {
  return candidate(
    "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
    [
      "AEAT_OFFICIAL_DOMAIN_LABEL",
      "ENFORCEMENT_ORDER_TITLE",
      "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
      "STRUCTURAL_FIRST_PAGE_HEADER",
    ],
    ["ENFORCEMENT_DEBT_AMOUNT_SECTION"],
  );
}

function forgedCompleteEnforcementCandidate(): FiscalNotificationLocalReviewCandidate {
  return {
    ...candidate(
      "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
      ["ENFORCEMENT_ORDER_TITLE"],
      [
        "AEAT_OFFICIAL_DOMAIN_LABEL",
        "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
        "ENFORCEMENT_DEBT_AMOUNT_SECTION",
        "STRUCTURAL_FIRST_PAGE_HEADER",
      ],
    ),
    signalStatus: "COMPLETE_REQUIRED_ANCHORS",
  };
}

function duplicateAnchorCandidate(): FiscalNotificationLocalReviewCandidate {
  const base = completeEnforcementCandidate();
  return {
    ...base,
    matchedAnchors: [...base.matchedAnchors, base.matchedAnchors[0]!],
  };
}

function crossFamilyAnchorCandidate(): FiscalNotificationLocalReviewCandidate {
  const base = completeEnforcementCandidate();
  return {
    ...base,
    matchedAnchors: [
      ...base.matchedAnchors,
      { anchorId: "DEFERRAL_INSTALLMENT_ANNEX", pageNumbers: [1] },
    ],
  };
}

function wrongFirstPageCandidate(): FiscalNotificationLocalReviewCandidate {
  const base = completeEnforcementCandidate();
  return {
    ...base,
    matchedAnchors: base.matchedAnchors.map((anchor) =>
      anchor.anchorId === "AEAT_OFFICIAL_DOMAIN_LABEL"
        ? { ...anchor, pageNumbers: [2] }
        : anchor,
    ),
  };
}

function authorityConflictCandidate(): FiscalNotificationLocalReviewCandidate {
  const base = completeEnforcementCandidate();
  return {
    ...base,
    signalStatus: "CONFLICTING_AUTHORITY_OR_TERRITORY",
    matchedAnchors: [
      ...base.matchedAnchors,
      { anchorId: "CONFLICTING_AUTHORITY_TGSS", pageNumbers: [1] },
    ],
    conflictingAnchorIds: ["CONFLICTING_AUTHORITY_TGSS"],
  };
}

function candidate(
  familyId: FiscalNotificationLocalReviewCandidate["familyId"],
  matchedIds: readonly FiscalNotificationLocalReviewCandidate["matchedAnchors"][number]["anchorId"][],
  missingRequiredAnchorIds: readonly FiscalNotificationLocalReviewCandidate["missingRequiredAnchorIds"][number][],
): FiscalNotificationLocalReviewCandidate {
  const enforcement = familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE";
  return {
    familyId,
    documentType: enforcement
      ? "AEAT_ENFORCEMENT_ORDER"
      : "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
    authoritySignal: "AEAT_UNVERIFIED",
    handlerId: enforcement
      ? "aeat-enforcement-order-candidate"
      : "aeat-deferral-grant-candidate",
    handlerVersion: "1.0.0",
    signalStatus:
      missingRequiredAnchorIds.length === 0
        ? "COMPLETE_REQUIRED_ANCHORS"
        : "INCOMPLETE_REQUIRED_ANCHORS",
    matchedAnchors: matchedIds.map((anchorId) => ({
      anchorId,
      pageNumbers: [1],
    })),
    missingRequiredAnchorIds,
    conflictingAnchorIds: [],
    requiresHumanReview: true,
  };
}

function moneyResult(
  outcome: AeatEnforcementMoneyFactsResult["outcome"],
): AeatEnforcementMoneyFactsResult {
  const available = outcome === "FACTS_AVAILABLE";
  return {
    schemaVersion: 1,
    engineId: "aeat-enforcement-money-facts",
    engineVersion: "1.0.0",
    documentType: "AEAT_ENFORCEMENT_ORDER",
    status: outcome === "INFORMATION_PENDING" ? "INFORMATION_PENDING" : "REVIEW_REQUIRED",
    outcome,
    facts: available ? [moneyFact("OUTSTANDING_PRINCIPAL")] : [],
    issues: available
      ? [
          "ORDINARY_ENFORCEMENT_SURCHARGE",
          "PAYMENT_ON_ACCOUNT",
          "DOCUMENT_TOTAL",
        ].map((kind) => ({
          code: "NO_CLOSED_LABEL_MATCH" as const,
          kind: kind as AeatEnforcementMoneyFactsResult["issues"][number]["kind"],
          pageNumbers: [1],
        }))
      : [
          {
            code:
              outcome === "AMBIGUOUS"
                ? "DUPLICATE_AMOUNT_SECTION"
                : outcome === "PROCESSING_BLOCKED"
                  ? "SECTION_SCAN_LIMIT_EXCEEDED"
                  : "NO_AMOUNT_SECTION",
            kind: null,
            pageNumbers: outcome === "INFORMATION_PENDING" ? [] : [1],
          },
        ],
    selectedPaymentAmountKind: null,
    semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY",
    legalRuleStatus: "NOT_APPLIED",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  };
}

function moneyFact(
  kind: "OUTSTANDING_PRINCIPAL" | "DOCUMENT_TOTAL",
): AeatEnforcementMoneyFactsResult["facts"][number] {
  return {
    kind,
    amountCents: 12_345,
    currency: "EUR",
    evidence: [
      {
        pageNumber: 1,
        label:
          kind === "OUTSTANDING_PRINCIPAL"
            ? "OUTSTANDING_PRINCIPAL_LABEL"
            : "DOCUMENT_TOTAL_LABEL",
        extractionMethod: "RULE",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
    ],
    reviewStatus: "REVIEW_REQUIRED",
  };
}

function collectKeys(value: unknown, output: string[] = []): string[] {
  if (value === null || typeof value !== "object") return output;
  for (const [key, nested] of Object.entries(value)) {
    output.push(key);
    collectKeys(nested, output);
  }
  return output;
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}
