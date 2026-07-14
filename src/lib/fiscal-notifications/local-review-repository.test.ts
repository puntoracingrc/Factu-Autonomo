import { describe, expect, it, vi } from "vitest";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { DISABLED_FISCAL_NOTIFICATION_OCR_PORT } from "./disabled-ocr-port";
import { FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM } from "./local-review-flow";
import { projectFiscalNotificationPdfWorkerAnalysis } from "./pdf-worker-analysis-contract";
import {
  FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS,
  createFiscalNotificationLocalReviewRepository,
  type FiscalNotificationReviewExclusiveLock,
  type FiscalNotificationReviewStorageLike,
} from "./local-review-repository";

const OWNER_A = "user:00000000-0000-4000-8000-000000000001";
const OWNER_B = "user:00000000-0000-4000-8000-000000000002";
const REVIEW_IDS = new Map<string, string>();

function opaqueReviewId(label: string): string {
  const existing = REVIEW_IDS.get(label);
  if (existing) return existing;
  const suffix = (REVIEW_IDS.size + 1).toString(16).padStart(12, "0");
  const value = `review:00000000-0000-4000-8000-${suffix}`;
  REVIEW_IDS.set(label, value);
  return value;
}

class MemoryStorage implements FiscalNotificationReviewStorageLike {
  readonly values = new Map<string, string>();
  readonly getItem = vi.fn((key: string) => this.values.get(key) ?? null);
  readonly setItem = vi.fn((key: string, value: string) => {
    this.values.set(key, value);
  });
  readonly removeItem = vi.fn((key: string) => {
    this.values.delete(key);
  });
}

class SerialLock implements FiscalNotificationReviewExclusiveLock {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(name: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(name) ?? Promise.resolve();
    let release!: () => void;
    const tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => tail);
    this.tails.set(name, queued);
    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.tails.get(name) === queued) this.tails.delete(name);
    }
  }
}

const immediateLock: FiscalNotificationReviewExclusiveLock = {
  runExclusive: async (_name, task) => task(),
};

function reviewResult(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    reason: "SUPPORTED_FAMILY_CANDIDATE",
    engineId: "fiscal-notification-family-candidate-engine",
    engineVersion: "1.0.0",
    pageCount: 2,
    byteLength: 1_024,
    sha256: "a".repeat(64),
    candidates: [
      {
        familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
        documentType: "AEAT_ENFORCEMENT_ORDER",
        authoritySignal: "AEAT_UNVERIFIED",
        handlerId: "aeat-enforcement-order-candidate",
        handlerVersion: "1.0.0",
        signalStatus: "COMPLETE_REQUIRED_ANCHORS",
        matchedAnchors: [
          { anchorId: "AEAT_AUTHORITY_LABEL", pageNumbers: [1] },
          { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [1] },
          { anchorId: "ENFORCEMENT_ORDER_TITLE", pageNumbers: [1, 2] },
          {
            anchorId: "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
            pageNumbers: [1],
          },
          {
            anchorId: "ENFORCEMENT_DEBT_AMOUNT_SECTION",
            pageNumbers: [1],
          },
          { anchorId: "STRUCTURAL_FIRST_PAGE_HEADER", pageNumbers: [1] },
        ],
        missingRequiredAnchorIds: [] as string[],
        conflictingAnchorIds: [] as string[],
        requiresHumanReview: true,
      },
    ],
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
    ...overrides,
  };
}

function deferralCandidate() {
  return {
    familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE",
    documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
    authoritySignal: "AEAT_UNVERIFIED",
    handlerId: "aeat-deferral-grant-candidate",
    handlerVersion: "1.0.0",
    signalStatus: "COMPLETE_REQUIRED_ANCHORS",
    matchedAnchors: [
      { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [1] },
      { anchorId: "DEFERRAL_GRANT_TITLE", pageNumbers: [1] },
      { anchorId: "DEFERRAL_INSTALLMENT_ANNEX", pageNumbers: [2] },
      { anchorId: "DEFERRAL_INTEREST_CALCULATION", pageNumbers: [2] },
      { anchorId: "STRUCTURAL_FIRST_PAGE_HEADER", pageNumbers: [1] },
    ],
    missingRequiredAnchorIds: [],
    conflictingAnchorIds: [],
    requiresHumanReview: true,
  };
}

function structuralEnforcementCandidate() {
  return {
    familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
    recognitionPolicyVersion: "1.3.0",
    segmentationVersion: "1.1.0",
    documentType: "AEAT_ENFORCEMENT_ORDER",
    authoritySignal: "AEAT_UNVERIFIED",
    handlerId: "aeat-enforcement-order-candidate",
    handlerVersion: "1.0.0",
    signalStatus: "COMPLETE_REQUIRED_ANCHORS",
    matchedAnchors: [
      { anchorId: "ENFORCEMENT_ORDER_TITLE", pageNumbers: [1] },
      {
        anchorId: "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
        pageNumbers: [1],
      },
      { anchorId: "ENFORCEMENT_DEBT_AMOUNT_SECTION", pageNumbers: [1] },
      { anchorId: "STRUCTURAL_PRIMARY_ACT_HEADER", pageNumbers: [1] },
    ],
    missingRequiredAnchorIds: [] as string[],
    conflictingAnchorIds: [] as string[],
    requiresHumanReview: true,
  };
}

function r1Candidate(
  familyId:
    | "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE"
    | "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE"
    | "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
) {
  if (familyId === "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE") {
    return {
      familyId,
      segmentationVersion: "1.1.0",
      documentType: "AEAT_SEIZURE_ORDER",
      authoritySignal: "AEAT_UNVERIFIED",
      handlerId: "aeat-real-estate-seizure-candidate",
      handlerVersion: "1.0.0",
      signalStatus: "COMPLETE_REQUIRED_ANCHORS",
      matchedAnchors: [
        { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [1] },
        { anchorId: "REAL_ESTATE_SEIZURE_TITLE", pageNumbers: [1] },
        { anchorId: "STRUCTURAL_FIRST_PAGE_HEADER", pageNumbers: [1] },
      ],
      missingRequiredAnchorIds: [],
      conflictingAnchorIds: [],
      requiresHumanReview: true,
    };
  }
  if (familyId === "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE") {
    return {
      familyId,
      segmentationVersion: "1.1.0",
      documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
      authoritySignal: "AEAT_UNVERIFIED",
      handlerId: "aeat-formal-filing-requirement-candidate",
      handlerVersion: "1.0.0",
      signalStatus: "COMPLETE_REQUIRED_ANCHORS",
      matchedAnchors: [
        { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [1] },
        { anchorId: "FORMAL_FILING_REQUIREMENT_TITLE", pageNumbers: [1] },
        {
          anchorId: "FORMAL_FILING_OMITTED_RETURNS_MARKER",
          pageNumbers: [1],
        },
        { anchorId: "STRUCTURAL_FIRST_PAGE_HEADER", pageNumbers: [1] },
      ],
      missingRequiredAnchorIds: [],
      conflictingAnchorIds: [],
      requiresHumanReview: true,
    };
  }
  return {
    familyId,
    segmentationVersion: "1.1.0",
    documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
    authoritySignal: "AEAT_UNVERIFIED",
    handlerId: "aeat-roi-registration-agreement-candidate",
    handlerVersion: "1.0.0",
    signalStatus: "COMPLETE_REQUIRED_ANCHORS",
    matchedAnchors: [
      { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [1] },
      { anchorId: "ROI_REGISTRATION_AGREEMENT_TITLE", pageNumbers: [1] },
      { anchorId: "STRUCTURAL_FIRST_PAGE_HEADER", pageNumbers: [1] },
    ],
    missingRequiredAnchorIds: [],
    conflictingAnchorIds: [],
    requiresHumanReview: true,
  };
}

function clonedResult(): ReturnType<typeof reviewResult> {
  return JSON.parse(JSON.stringify(reviewResult())) as ReturnType<
    typeof reviewResult
  >;
}

function appendInput(
  reviewId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    expectedRevision: 0,
    reviewId: opaqueReviewId(reviewId),
    createdAt: "2026-07-12T08:00:00.000Z",
    result: reviewResult(),
    ...overrides,
  };
}

function repository(
  storage: FiscalNotificationReviewStorageLike | null = new MemoryStorage(),
  lock: FiscalNotificationReviewExclusiveLock | null = immediateLock,
  ownerScope: unknown = OWNER_A,
) {
  return createFiscalNotificationLocalReviewRepository({
    storage,
    lock,
    ownerScope,
  });
}

describe("fiscal notification safe local review repository", () => {
  it("loads an explicit immutable empty snapshot without writing", () => {
    const storage = new MemoryStorage();
    const result = repository(storage).load();

    expect(result).toEqual({
      status: "empty",
      snapshot: {
        schemaVersion: 1,
        ownerScope: OWNER_A,
        revision: 0,
        reviews: [],
      },
    });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status !== "blocked") {
      expect(Object.isFrozen(result.snapshot)).toBe(true);
      expect(Object.isFrozen(result.snapshot.reviews)).toBe(true);
    }
  });

  it("persists only the allowlisted review projection and reads it back", async () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    const input = appendInput("review-safe-1");

    const written = await repo.append(input);
    expect(written).toMatchObject({
      status: "applied",
      snapshot: { ownerScope: OWNER_A, revision: 1 },
    });
    const loaded = repo.load();
    expect(loaded).toEqual(
      expect.objectContaining({
        status: "loaded",
        snapshot: expect.objectContaining({ revision: 1 }),
      }),
    );
    if (loaded.status !== "blocked") {
      expect(loaded.snapshot.reviews[0]).toMatchObject({
        reviewId: opaqueReviewId("review-safe-1"),
        ownerScope: OWNER_A,
        result: {
          status: "REVIEW_REQUIRED",
          selectedFamilyId: null,
          requiresHumanReview: true,
          materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
          retainedSourceContent: "NONE",
        },
      });
    }

    const serialized = [...storage.values.values()][0] ?? "";
    for (const forbidden of [
      "%PDF",
      "originalFilename",
      "storageReference",
      "textNormalized",
      "textSnippet",
      "rawValue",
      "taxId",
      "CSV",
      "NRC",
      "IBAN",
      "amountCents",
      "deadline",
      "PRIVATE_NIF_SENTINEL",
    ]) {
      expect(serialized, forbidden).not.toContain(forbidden);
    }
    expect(input).toEqual(appendInput("review-safe-1"));
  });

  it("round-trips the exact output of the deterministic local review flow", async () => {
    if (!FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM) {
      throw new Error("Local review test seam is unavailable");
    }
    const analysis = await FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM.analyzeEphemeralWithDependencies(
      {},
      {
        readPdf: async () =>
          Object.freeze({
            schemaVersion: 4 as const,
            adapterVersion: "4.0.0" as const,
            status: "TEXT_LAYER_AVAILABLE" as const,
            sourceContentPolicy:
              "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const,
            fileIntegrity: Object.freeze({
              mimeType: "application/pdf" as const,
              byteLength: 2_048,
              sha256: "c".repeat(64),
            }),
            analysis: projectFiscalNotificationPdfWorkerAnalysis({
              textLayerStatus: "TEXT_LAYER_AVAILABLE",
              pageCount: 1,
              familyAnalysis: Object.freeze({
                schemaVersion: 1 as const,
                engineId:
                  "fiscal-notification-family-candidate-engine" as const,
                engineVersion: "1.1.0" as const,
                ownerScope: OWNER_A,
                documentId: "document:synthetic-round-trip",
                status: "REVIEW_REQUIRED" as const,
                reason: "SUPPORTED_FAMILY_CANDIDATE" as const,
                candidates: Object.freeze([
                  Object.freeze({
                    familyId:
                      "AEAT_ENFORCEMENT_ORDER_CANDIDATE" as const,
                    documentType: "AEAT_ENFORCEMENT_ORDER" as const,
                    authoritySignal: "AEAT_UNVERIFIED" as const,
                    handlerId:
                      "aeat-enforcement-order-candidate" as const,
                    handlerVersion: "1.0.0" as const,
                    signalStatus: "COMPLETE_REQUIRED_ANCHORS" as const,
                    matchedAnchors: Object.freeze([
                      Object.freeze({
                        anchorId: "AEAT_AUTHORITY_LABEL" as const,
                        pageNumbers: Object.freeze([1]),
                      }),
                      Object.freeze({
                        anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL" as const,
                        pageNumbers: Object.freeze([1]),
                      }),
                      Object.freeze({
                        anchorId: "ENFORCEMENT_ORDER_TITLE" as const,
                        pageNumbers: Object.freeze([1]),
                      }),
                      Object.freeze({
                        anchorId:
                          "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION" as const,
                        pageNumbers: Object.freeze([1]),
                      }),
                      Object.freeze({
                        anchorId:
                          "ENFORCEMENT_DEBT_AMOUNT_SECTION" as const,
                        pageNumbers: Object.freeze([1]),
                      }),
                      Object.freeze({
                        anchorId: "STRUCTURAL_FIRST_PAGE_HEADER" as const,
                        pageNumbers: Object.freeze([1]),
                      }),
                    ]),
                    missingRequiredAnchorIds: Object.freeze([]),
                    conflictingAnchorIds: Object.freeze([]),
                    requiresHumanReview: true as const,
                  }),
                ]),
                selectedFamilyId: null,
                requiresHumanReview: true as const,
                materializationPolicy:
                  "PROHIBITED_UNTIL_REVIEW" as const,
                retainedSourceContent: "NONE" as const,
              }),
              enforcementMoneyFacts: Object.freeze({
                schemaVersion: 1 as const,
                engineId: "aeat-enforcement-money-facts" as const,
                engineVersion: "1.0.0" as const,
                documentType: "AEAT_ENFORCEMENT_ORDER" as const,
                status: "REVIEW_REQUIRED" as const,
                outcome: "FACTS_AVAILABLE" as const,
                facts: Object.freeze([
                  Object.freeze({
                    kind: "OUTSTANDING_PRINCIPAL" as const,
                    amountCents: 10_000,
                    currency: "EUR" as const,
                    evidence: Object.freeze([
                      Object.freeze({
                        pageNumber: 1,
                        label: "OUTSTANDING_PRINCIPAL_LABEL" as const,
                        extractionMethod: "RULE" as const,
                        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
                      }),
                    ]),
                    reviewStatus: "REVIEW_REQUIRED" as const,
                  }),
                ]),
                issues: Object.freeze([
                  Object.freeze({
                    code: "NO_CLOSED_LABEL_MATCH" as const,
                    kind: "ORDINARY_ENFORCEMENT_SURCHARGE" as const,
                    pageNumbers: Object.freeze([1]),
                  }),
                  Object.freeze({
                    code: "NO_CLOSED_LABEL_MATCH" as const,
                    kind: "PAYMENT_ON_ACCOUNT" as const,
                    pageNumbers: Object.freeze([1]),
                  }),
                  Object.freeze({
                    code: "NO_CLOSED_LABEL_MATCH" as const,
                    kind: "DOCUMENT_TOTAL" as const,
                    pageNumbers: Object.freeze([1]),
                  }),
                ]),
                selectedPaymentAmountKind: null,
                semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY" as const,
                legalRuleStatus: "NOT_APPLIED" as const,
                requiresHumanReview: true as const,
                materializationPolicy:
                  "PROHIBITED_UNTIL_REVIEW" as const,
                retainedSourceContent: "NONE" as const,
              }),
              enforcementExplicitFields:
                extractAeatEnforcementExplicitFieldsV2(Object.freeze({
                  ownerScope: OWNER_A,
                  documentId: "document:synthetic-round-trip",
                  pages: Object.freeze([
                    Object.freeze({
                      pageNumber: 1,
                      text: [
                        "AGENCIA TRIBUTARIA",
                        "sede.agenciatributaria.gob.es",
                        "PROVIDENCIA DE APREMIO",
                        "IDENTIFICACION DEL DOCUMENTO",
                        "IMPORTE DE LA DEUDA",
                        "Clave de liquidación: PRIVATE_REFERENCE_SENTINEL",
                      ].join("\n"),
                      isBlank: false,
                    }),
                  ]),
                })),
            }),
            reviewContext: Object.freeze({
              ownerScope: OWNER_A,
              documentId: "document:synthetic-round-trip",
            }),
            requiresHumanReview: true as const,
            materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
          }),
        ocrPort: DISABLED_FISCAL_NOTIFICATION_OCR_PORT,
      },
    );
    const actual = analysis.technicalReview;
    expect(JSON.stringify(analysis)).toContain("PRIVATE_REFERENCE_SENTINEL");
    expect(JSON.stringify(actual)).not.toContain("PRIVATE_REFERENCE_SENTINEL");

    const storage = new MemoryStorage();
    await expect(
      repository(storage).append(
        appendInput("review-ephemeral-envelope-rejected", {
          result: analysis,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    expect(storage.values.size).toBe(0);
    expect(storage.setItem).not.toHaveBeenCalled();

    await expect(
      repository(storage).append(
        appendInput("review-real-flow-round-trip", { result: actual }),
      ),
    ).resolves.toMatchObject({ status: "applied" });
    const serialized = [...storage.values.values()].join("|");
    expect(serialized).not.toContain("PRIVATE_DOCUMENT_TEXT_SENTINEL");
    expect(serialized).not.toContain("amountCents");
    expect(serialized).not.toContain("ephemeralEnforcementMoneyFacts");
    expect(serialized).not.toContain("PRIVATE_REFERENCE_SENTINEL");
  });

  it("accepts historical and current engine versions but rejects a historical trace relabelled current", async () => {
    const storage = new MemoryStorage();
    const reviews = repository(storage);

    const historical = await reviews.append(appendInput("review-version-100"));
    expect(historical.status).toBe("applied");

    const current = clonedResult();
    current.engineVersion = "1.1.0";
    current.candidates[0]!.matchedAnchors.find(
      (anchor) => anchor.anchorId === "ENFORCEMENT_ORDER_TITLE",
    )!.pageNumbers = [1];
    const currentWrite = await reviews.append(
      appendInput("review-version-110", {
        expectedRevision: 1,
        createdAt: "2026-07-12T08:01:00.000Z",
        result: current,
      }),
    );
    expect(currentWrite.status).toBe("applied");
    expect(reviews.load()).toMatchObject({
      status: "loaded",
      snapshot: {
        reviews: [
          { result: { engineVersion: "1.0.0" } },
          {
            result: {
              engineVersion: "1.1.0",
              candidates: [{ handlerVersion: "1.0.0" }],
            },
          },
        ],
      },
    });

    const mixed = structuredClone(current);
    mixed.candidates[0]!.matchedAnchors.find(
      (anchor) => anchor.anchorId === "ENFORCEMENT_ORDER_TITLE",
    )!.pageNumbers = [1, 2];
    const rawBefore = [...storage.values.values()][0];
    await expect(
      reviews.append(
        appendInput("review-version-mixed", {
          expectedRevision: 2,
          createdAt: "2026-07-12T08:02:00.000Z",
          result: mixed,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    expect([...storage.values.values()][0]).toBe(rawBefore);
  });

  it.each([
    "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
    "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
    "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
  ] as const)("persists the R1 candidate %s only under engine 1.2", async (familyId) => {
    const storage = new MemoryStorage();
    const reviews = repository(storage);
    const current = reviewResult({
      engineVersion: "1.2.0",
      candidates: [r1Candidate(familyId)],
    });

    await expect(
      reviews.append(
        appendInput(`review-r1-${familyId}`, { result: current }),
      ),
    ).resolves.toMatchObject({ status: "applied" });
    expect(reviews.load()).toMatchObject({
      status: "loaded",
      snapshot: {
        reviews: [
          {
            result: {
              engineVersion: "1.2.0",
              candidates: [{ familyId }],
              selectedFamilyId: null,
              materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
              retainedSourceContent: "NONE",
            },
          },
        ],
      },
    });

    const downgraded = structuredClone(current);
    downgraded.engineVersion = "1.1.0";
    await expect(
      repository(new MemoryStorage()).append(
        appendInput(`review-r1-downgraded-${familyId}`, {
          result: downgraded,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
  });

  it("binds engine 1.2 to segmentation 1.1 without rewriting engine 1.1 history", async () => {
    const historicalUntraced = clonedResult();
    historicalUntraced.engineVersion = "1.1.0";
    historicalUntraced.candidates[0]!.matchedAnchors.find(
      (anchor) => anchor.anchorId === "ENFORCEMENT_ORDER_TITLE",
    )!.pageNumbers = [1];
    await expect(
      repository(new MemoryStorage()).append(
        appendInput("review-history-untraced-110", {
          result: historicalUntraced,
        }),
      ),
    ).resolves.toMatchObject({ status: "applied" });

    const historicalStorage = new MemoryStorage();
    const historicalTraced = structuredClone(historicalUntraced);
    (historicalTraced.candidates[0]! as Record<string, unknown>)
      .segmentationVersion = "1.0.0";
    await expect(
      repository(historicalStorage).append(
        appendInput("review-history-traced-110", {
          result: historicalTraced,
        }),
      ),
    ).resolves.toMatchObject({ status: "applied" });
    expect(repository(historicalStorage).load()).toMatchObject({
      status: "loaded",
      snapshot: {
        reviews: [
          {
            result: {
              engineVersion: "1.1.0",
              candidates: [{ segmentationVersion: "1.0.0" }],
            },
          },
        ],
      },
    });

    const relabelledHistorical = structuredClone(historicalTraced);
    (relabelledHistorical.candidates[0]! as Record<string, unknown>)
      .segmentationVersion = "1.1.0";
    await expect(
      repository(new MemoryStorage()).append(
        appendInput("review-history-relabelled-110", {
          result: relabelledHistorical,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });

    const current = reviewResult({
      engineVersion: "1.2.0",
      candidates: [r1Candidate("AEAT_REAL_ESTATE_SEIZURE_CANDIDATE")],
    });
    const missingCurrentTrace = structuredClone(current);
    delete (missingCurrentTrace.candidates[0]! as Record<string, unknown>)
      .segmentationVersion;
    const wrongCurrentTrace = structuredClone(current);
    (wrongCurrentTrace.candidates[0]! as Record<string, unknown>)
      .segmentationVersion = "1.0.0";
    for (const [label, result] of [
      ["missing", missingCurrentTrace],
      ["wrong", wrongCurrentTrace],
    ] as const) {
      await expect(
        repository(new MemoryStorage()).append(
          appendInput(`review-current-${label}-trace-120`, { result }),
        ),
      ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    }
  });

  it("persists engine 1.3 structural recognition without relabelling 1.2 history", async () => {
    const storage = new MemoryStorage();
    const current = reviewResult({
      engineVersion: "1.3.0",
      candidates: [structuralEnforcementCandidate()],
    });

    await expect(
      repository(storage).append(
        appendInput("review-structural-130", { result: current }),
      ),
    ).resolves.toMatchObject({ status: "applied" });
    expect(repository(storage).load()).toMatchObject({
      status: "loaded",
      snapshot: {
        reviews: [
          {
            result: {
              engineVersion: "1.3.0",
              candidates: [
                expect.objectContaining({
                  signalStatus: "COMPLETE_REQUIRED_ANCHORS",
                  missingRequiredAnchorIds: [],
                }),
              ],
            },
          },
        ],
      },
    });

    const relabelled = structuredClone(current);
    relabelled.engineVersion = "1.2.0";
    await expect(
      repository(new MemoryStorage()).append(
        appendInput("review-structural-relabelled-120", {
          result: relabelled,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });

    const historicalRelabelled = reviewResult({
      engineVersion: "1.3.0",
      candidates: [
        {
          ...deferralCandidate(),
          segmentationVersion: "1.1.0",
        },
      ],
    });
    await expect(
      repository(new MemoryStorage()).append(
        appendInput("review-historical-relabelled-130", {
          result: historicalRelabelled,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
  });

  it("persists a fake-host structural match only as an authority conflict", async () => {
    const candidate = structuralEnforcementCandidate();
    candidate.signalStatus = "CONFLICTING_AUTHORITY_OR_TERRITORY";
    candidate.matchedAnchors.push({
      anchorId: "CONFLICTING_AEAT_HOST_LINE",
      pageNumbers: [1],
    });
    candidate.conflictingAnchorIds = ["CONFLICTING_AEAT_HOST_LINE"];
    const result = reviewResult({
      engineVersion: "1.3.0",
      reason: "CONFLICTING_AUTHORITY_OR_TERRITORY",
      candidates: [candidate],
    });

    await expect(
      repository(new MemoryStorage()).append(
        appendInput("review-structural-fake-host", { result }),
      ),
    ).resolves.toMatchObject({ status: "applied" });
  });

  it("accepts a current incomplete attached act but rejects it as complete", async () => {
    const storage = new MemoryStorage();
    const reviews = repository(storage);
    const attached = clonedResult();
    attached.engineVersion = "1.1.0";
    attached.status = "INFORMATION_PENDING";
    attached.reason = "PARTIAL_SUPPORTED_FAMILY_SIGNAL";
    attached.pageCount = 4;
    attached.candidates[0]!.signalStatus = "INCOMPLETE_REQUIRED_ANCHORS";
    attached.candidates[0]!.matchedAnchors = [
      { anchorId: "AEAT_AUTHORITY_LABEL", pageNumbers: [3] },
      { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [3] },
      { anchorId: "ENFORCEMENT_ORDER_TITLE", pageNumbers: [3] },
      {
        anchorId: "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
        pageNumbers: [3],
      },
      { anchorId: "ENFORCEMENT_DEBT_AMOUNT_SECTION", pageNumbers: [4] },
    ];
    attached.candidates[0]!.missingRequiredAnchorIds = [
      "STRUCTURAL_FIRST_PAGE_HEADER",
    ];

    await expect(
      reviews.append(
        appendInput("review-attached-110", {
          result: attached,
        }),
      ),
    ).resolves.toMatchObject({ status: "applied" });
    expect(reviews.load()).toMatchObject({
      status: "loaded",
      snapshot: {
        reviews: [
          {
            result: {
              engineVersion: "1.1.0",
              status: "INFORMATION_PENDING",
              candidates: [
                {
                  signalStatus: "INCOMPLETE_REQUIRED_ANCHORS",
                  matchedAnchors: expect.arrayContaining([
                    {
                      anchorId: "ENFORCEMENT_ORDER_TITLE",
                      pageNumbers: [3],
                    },
                  ]),
                },
              ],
            },
          },
        ],
      },
    });

    const forgedComplete = structuredClone(attached);
    forgedComplete.status = "REVIEW_REQUIRED";
    forgedComplete.reason = "SUPPORTED_FAMILY_CANDIDATE";
    forgedComplete.candidates[0]!.signalStatus = "COMPLETE_REQUIRED_ANCHORS";
    forgedComplete.candidates[0]!.missingRequiredAnchorIds = [];
    forgedComplete.candidates[0]!.matchedAnchors.push({
      anchorId: "STRUCTURAL_FIRST_PAGE_HEADER",
      pageNumbers: [1],
    });
    const rawBefore = [...storage.values.values()][0];
    await expect(
      reviews.append(
        appendInput("review-attached-forged-complete", {
          expectedRevision: 1,
          createdAt: "2026-07-12T08:03:00.000Z",
          result: forgedComplete,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    expect([...storage.values.values()][0]).toBe(rawBefore);
  });

  it("preserves the exact v1 wrapper domain rule and rejects a later v1 domain", async () => {
    const storage = new MemoryStorage();
    const reviews = repository(storage);
    const historicalWrapper = clonedResult();
    historicalWrapper.status = "INFORMATION_PENDING";
    historicalWrapper.reason = "PARTIAL_SUPPORTED_FAMILY_SIGNAL";
    historicalWrapper.pageCount = 4;
    historicalWrapper.candidates[0]!.signalStatus =
      "INCOMPLETE_REQUIRED_ANCHORS";
    historicalWrapper.candidates[0]!.matchedAnchors = [
      { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [1] },
      { anchorId: "ENFORCEMENT_ORDER_TITLE", pageNumbers: [3] },
      {
        anchorId: "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
        pageNumbers: [3],
      },
      { anchorId: "ENFORCEMENT_DEBT_AMOUNT_SECTION", pageNumbers: [4] },
    ];
    historicalWrapper.candidates[0]!.missingRequiredAnchorIds = [
      "STRUCTURAL_FIRST_PAGE_HEADER",
    ];

    await expect(
      reviews.append(
        appendInput("review-historical-wrapper-domain-page-one", {
          result: historicalWrapper,
        }),
      ),
    ).resolves.toMatchObject({ status: "applied" });

    const invalidHistoricalDomain = structuredClone(historicalWrapper);
    invalidHistoricalDomain.candidates[0]!.matchedAnchors.find(
      (anchor) => anchor.anchorId === "AEAT_OFFICIAL_DOMAIN_LABEL",
    )!.pageNumbers = [3];
    const rawBefore = [...storage.values.values()][0];
    await expect(
      reviews.append(
        appendInput("review-historical-wrapper-domain-page-three", {
          expectedRevision: 1,
          createdAt: "2026-07-12T08:04:00.000Z",
          result: invalidHistoricalDomain,
        }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    expect([...storage.values.values()][0]).toBe(rawBefore);
  });

  it("isolates owners into independent keys and envelopes", async () => {
    const storage = new MemoryStorage();
    const repoA = repository(storage, immediateLock, OWNER_A);
    const repoB = repository(storage, immediateLock, OWNER_B);

    await expect(repoA.append(appendInput("review-a"))).resolves.toMatchObject({
      status: "applied",
    });
    await expect(
      repoB.append(
        appendInput("review-b", {
          result: reviewResult({ sha256: "b".repeat(64) }),
        }),
      ),
    ).resolves.toMatchObject({ status: "applied" });

    expect(storage.values).toHaveLength(2);
    const a = repoA.load();
    const b = repoB.load();
    expect(a.status === "blocked" ? null : a.snapshot.reviews[0]?.reviewId).toBe(
      opaqueReviewId("review-a"),
    );
    expect(b.status === "blocked" ? null : b.snapshot.reviews[0]?.reviewId).toBe(
      opaqueReviewId("review-b"),
    );
  });

  it.each([
    "",
    "user:",
    "tenant:synthetic",
    " user:synthetic",
    "user:synthetic ",
    "user:a:b",
    "user:bad\u0000scope",
  ])("rejects a non-canonical owner before touching storage: %j", async (ownerScope) => {
    const storage = new MemoryStorage();
    const repo = repository(storage, immediateLock, ownerScope);

    expect(repo.load()).toEqual({
      status: "blocked",
      reason: "INVALID_INPUT",
    });
    await expect(
      repo.append(appendInput("review-invalid-owner")),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects unknown, accessor, symbol and hostile proxy inputs", async () => {
    const cases: unknown[] = [
      { ...appendInput("review-unknown"), filename: "PRIVATE_FILE_SENTINEL.pdf" },
      { ...appendInput("review-foreign-owner"), ownerScope: OWNER_B },
      Object.defineProperty(
        { ...appendInput("review-accessor") },
        "result",
        { get: () => reviewResult() },
      ),
      Object.assign(appendInput("review-symbol"), {
        [Symbol("PRIVATE")]: "PRIVATE_SYMBOL_SENTINEL",
      }),
      new Proxy(appendInput("review-proxy"), {
        ownKeys() {
          throw new Error("PRIVATE_PROXY_SENTINEL");
        },
      }),
    ];

    for (const value of cases) {
      const storage = new MemoryStorage();
      await expect(repository(storage).append(value)).resolves.toEqual({
        status: "blocked",
        reason: "INVALID_INPUT",
      });
      expect(storage.getItem).not.toHaveBeenCalled();
    }
  });

  it("rejects hostile nested arrays and prototype-shaped keys", async () => {
    const accessorCandidates = reviewResult().candidates.slice();
    Object.defineProperty(accessorCandidates, "0", {
      get: () => reviewResult().candidates[0],
    });
    const protoResult = JSON.parse(JSON.stringify(reviewResult())) as Record<
      string,
      unknown
    >;
    Object.defineProperty(protoResult, "__proto__", {
      value: { polluted: true },
      enumerable: true,
    });

    for (const result of [
      reviewResult({ candidates: accessorCandidates }),
      protoResult,
    ]) {
      await expect(
        repository().append(appendInput("review-hostile", { result })),
      ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    }
    expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("keeps corrupt, oversized, future and foreign stored data fail-closed", () => {
    const values = [
      "{truncated",
      "x".repeat(
        FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxStoredCharacters +
          1,
      ),
      JSON.stringify({
        schemaVersion: 2,
        ownerScope: OWNER_A,
        revision: 0,
        reviews: [],
      }),
      JSON.stringify({
        schemaVersion: 1,
        ownerScope: OWNER_B,
        revision: 0,
        reviews: [],
      }),
    ];
    const reasons = [
      "CORRUPT_STORED_DATA",
      "STORED_DATA_TOO_LARGE",
      "UNSUPPORTED_SCHEMA",
      "OWNER_SCOPE_MISMATCH",
    ];

    values.forEach((raw, index) => {
      const storage = new MemoryStorage();
      storage.values.set(
        `factu:fiscal-notifications:safe-reviews:v1:${OWNER_A}`,
        raw,
      );
      expect(repository(storage).load()).toEqual({
        status: "blocked",
        reason: reasons[index],
      });
      expect([...storage.values.values()]).toEqual([raw]);
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(storage.removeItem).not.toHaveBeenCalled();
    });
  });

  it("rejects truncated history and a future flow version without overwriting raw", async () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    await repo.append(appendInput("review-stored-version"));
    const key = [...storage.values.keys()][0]!;
    const valid = JSON.parse(storage.values.get(key)!) as {
      revision: number;
      reviews: Array<{ result: { flowVersion: string } }>;
    };

    const truncated = JSON.stringify({ ...valid, revision: 2 });
    storage.values.set(key, truncated);
    expect(repo.load()).toEqual({
      status: "blocked",
      reason: "CORRUPT_STORED_DATA",
    });
    expect(storage.values.get(key)).toBe(truncated);

    valid.reviews[0]!.result.flowVersion = "2.0.0";
    const future = JSON.stringify(valid);
    storage.values.set(key, future);
    expect(repo.load()).toEqual({
      status: "blocked",
      reason: "UNSUPPORTED_SCHEMA",
    });
    expect(storage.values.get(key)).toBe(future);
  });

  it.each([
    "PRIVATE_NIF_SENTINEL.pdf",
    "%PDF-PRIVATE-CONTENT",
    "CSV_PRIVATE_SENTINEL",
    "12345678Z",
  ])("rejects non-opaque review IDs before persistence: %s", async (reviewId) => {
    const storage = new MemoryStorage();
    await expect(
      repository(storage).append(
        appendInput("review-invalid-id", { reviewId }),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
    expect(storage.getItem).not.toHaveBeenCalled();
    expect([...storage.values.values()].join("|")).not.toContain(reviewId);
  });

  it("is idempotent for an exact replay and blocks ID collisions", async () => {
    const repo = repository();
    const original = appendInput("review-idempotent");
    await expect(repo.append(original)).resolves.toMatchObject({
      status: "applied",
    });
    await expect(repo.append(original)).resolves.toMatchObject({
      status: "existing",
      snapshot: { revision: 1 },
    });
    await expect(
      repo.append(
        appendInput("review-idempotent", {
          createdAt: "2026-07-12T08:01:00.000Z",
        }),
      ),
    ).resolves.toEqual({
      status: "blocked",
      reason: "REVIEW_ID_COLLISION",
    });
  });

  it("rejects a stale revision without mutating storage", async () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    await repo.append(appendInput("review-first"));
    const before = [...storage.values.values()][0];

    await expect(repo.append(appendInput("review-stale"))).resolves.toEqual({
      status: "blocked",
      reason: "STALE_REVISION",
    });
    expect([...storage.values.values()][0]).toBe(before);
  });

  it("serializes concurrent writes so only one matching revision applies", async () => {
    const storage = new MemoryStorage();
    const repo = repository(storage, new SerialLock());
    const [first, second] = await Promise.all([
      repo.append(appendInput("review-race-a")),
      repo.append(
        appendInput("review-race-b", {
          result: reviewResult({ sha256: "b".repeat(64) }),
        }),
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual(["applied", "blocked"]);
    const blocked = first.status === "blocked" ? first : second;
    expect(blocked).toEqual({ status: "blocked", reason: "STALE_REVISION" });
    const loaded = repo.load();
    expect(loaded.status === "blocked" ? -1 : loaded.snapshot.reviews.length).toBe(
      1,
    );
  });

  it("fails closed when storage or the exclusive lock is unavailable", async () => {
    expect(repository(null).load()).toEqual({
      status: "blocked",
      reason: "STORAGE_UNAVAILABLE",
    });
    await expect(repository(null).append(appendInput("review-no-storage"))).resolves.toEqual({
      status: "blocked",
      reason: "STORAGE_UNAVAILABLE",
    });
    await expect(
      repository(new MemoryStorage(), null).append(appendInput("review-no-lock")),
    ).resolves.toEqual({ status: "blocked", reason: "LOCK_UNAVAILABLE" });
  });

  it("preserves the old state on quota and generic write failures", async () => {
    for (const error of [
      Object.assign(new Error("PRIVATE_QUOTA_SENTINEL"), {
        name: "QuotaExceededError",
      }),
      new Error("PRIVATE_WRITE_SENTINEL"),
    ]) {
      const storage = new MemoryStorage();
      storage.setItem.mockImplementation(() => {
        throw error;
      });
      const result = await repository(storage).append(
        appendInput("review-write-failure"),
      );
      expect(result).toEqual({
        status: "blocked",
        reason:
          error.name === "QuotaExceededError" ? "QUOTA_EXCEEDED" : "WRITE_FAILED",
      });
      expect(storage.values.size).toBe(0);
    }
  });

  it("rolls back a write that throws after storing its full candidate value", async () => {
    const storage = new MemoryStorage();
    storage.setItem.mockImplementation((key, value) => {
      storage.values.set(key, value);
      throw new Error("PRIVATE_PARTIAL_WRITE_SENTINEL");
    });

    await expect(
      repository(storage).append(appendInput("review-partial")),
    ).resolves.toEqual({ status: "blocked", reason: "WRITE_FAILED" });
    expect(storage.values.size).toBe(0);
  });

  it("preserves a third-party raw value and reports an indeterminate race", async () => {
    const storage = new MemoryStorage();
    storage.setItem.mockImplementation((key) => {
      storage.values.set(key, "FOREIGN_CONCURRENT_RAW");
    });

    await expect(
      repository(storage).append(appendInput("review-third-raw")),
    ).resolves.toEqual({
      status: "indeterminate",
      reason: "STORAGE_STATE_UNKNOWN",
    });
    expect([...storage.values.values()]).toEqual(["FOREIGN_CONCURRENT_RAW"]);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("never reports success when the lock fails before or after the task", async () => {
    const beforeLock: FiscalNotificationReviewExclusiveLock = {
      runExclusive: async () => {
        throw new Error("PRIVATE_LOCK_SENTINEL");
      },
    };
    await expect(
      repository(new MemoryStorage(), beforeLock).append(
        appendInput("review-lock-before"),
      ),
    ).resolves.toEqual({ status: "blocked", reason: "LOCK_UNAVAILABLE" });

    const storage = new MemoryStorage();
    const afterLock: FiscalNotificationReviewExclusiveLock = {
      runExclusive: async (_name, task) => {
        await task();
        throw new Error("PRIVATE_LOCK_AFTER_SENTINEL");
      },
    };
    await expect(
      repository(storage, afterLock).append(appendInput("review-lock-after")),
    ).resolves.toEqual({
      status: "indeterminate",
      reason: "STORAGE_STATE_UNKNOWN",
    });
  });

  it("enforces result, page, candidate, SHA and timestamp limits before storage", async () => {
    const invalidInputs = [
      appendInput("review-bad-time", { createdAt: "2026-07-12" }),
      appendInput("review-bad-sha", { result: reviewResult({ sha256: "abc" }) }),
      appendInput("review-too-many-pages", {
        result: reviewResult({
          pageCount:
            FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxPages + 1,
        }),
      }),
      appendInput("review-too-large", {
        result: reviewResult({
          byteLength:
            FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxByteLength + 1,
        }),
      }),
      appendInput("review-too-many-candidates", {
        result: reviewResult({
          candidates: [
            ...reviewResult().candidates,
            ...reviewResult().candidates,
            ...reviewResult().candidates,
          ],
        }),
      }),
    ];

    for (const input of invalidInputs) {
      const storage = new MemoryStorage();
      await expect(repository(storage).append(input)).resolves.toEqual({
        status: "blocked",
        reason: "INVALID_INPUT",
      });
      expect(storage.getItem).not.toHaveBeenCalled();
    }
  });

  it("rejects impossible status, reason and deterministic candidate traces", async () => {
    const wrongStatus = reviewResult({ status: "INFORMATION_PENDING" });
    const unsupportedWithCandidate = reviewResult({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
    });
    const ambiguousWithOne = reviewResult({
      reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
    });
    const bypassedOcrPort = reviewResult({
      status: "INFORMATION_PENDING",
      reason: "NO_EXTRACTABLE_TEXT",
      candidates: [],
    });

    const missingTitle = clonedResult();
    const missingTitleCandidate = missingTitle.candidates[0]!;
    missingTitleCandidate.signalStatus = "INCOMPLETE_REQUIRED_ANCHORS";
    missingTitleCandidate.matchedAnchors =
      missingTitleCandidate.matchedAnchors.filter(
        (anchor) => anchor.anchorId !== "ENFORCEMENT_ORDER_TITLE",
      );
    missingTitleCandidate.missingRequiredAnchorIds = [
      "ENFORCEMENT_ORDER_TITLE",
    ];
    missingTitle.status = "INFORMATION_PENDING";
    missingTitle.reason = "PARTIAL_SUPPORTED_FAMILY_SIGNAL";

    const fabricatedComplete = clonedResult();
    fabricatedComplete.candidates[0]!.matchedAnchors =
      fabricatedComplete.candidates[0]!.matchedAnchors.filter(
        (anchor) =>
          anchor.anchorId !== "ENFORCEMENT_DEBT_AMOUNT_SECTION",
      );

    const impossiblePageTrace = clonedResult();
    for (const anchor of impossiblePageTrace.candidates[0]!.matchedAnchors) {
      if (
        anchor.anchorId === "AEAT_OFFICIAL_DOMAIN_LABEL" ||
        anchor.anchorId === "STRUCTURAL_FIRST_PAGE_HEADER" ||
        anchor.anchorId === "ENFORCEMENT_ORDER_TITLE"
      ) {
        anchor.pageNumbers = [2];
      }
    }

    const ambiguousConflict = clonedResult();
    const firstCandidate = ambiguousConflict.candidates[0]!;
    firstCandidate.signalStatus = "CONFLICTING_DOCUMENT_SIGNAL";
    firstCandidate.matchedAnchors.push({
      anchorId: "CONFLICTING_NON_DOCUMENT_GUIDE",
      pageNumbers: [1],
    });
    firstCandidate.conflictingAnchorIds = ["CONFLICTING_NON_DOCUMENT_GUIDE"];
    ambiguousConflict.reason = "AMBIGUOUS_SUPPORTED_FAMILIES";
    ambiguousConflict.candidates.push(deferralCandidate());
    const mixedConflictSignals = JSON.parse(
      JSON.stringify(ambiguousConflict),
    ) as ReturnType<typeof reviewResult>;
    mixedConflictSignals.reason = "CONFLICTING_DOCUMENT_SIGNAL";

    for (const result of [
      wrongStatus,
      unsupportedWithCandidate,
      ambiguousWithOne,
      bypassedOcrPort,
      missingTitle,
      fabricatedComplete,
      impossiblePageTrace,
      ambiguousConflict,
      mixedConflictSignals,
    ]) {
      const storage = new MemoryStorage();
      await expect(
        repository(storage).append(
          appendInput("review-impossible-trace", { result }),
        ),
      ).resolves.toEqual({ status: "blocked", reason: "INVALID_INPUT" });
      expect(storage.getItem).not.toHaveBeenCalled();
    }
  });

  it("accepts the exact two-family ambiguous shape without selecting either", async () => {
    const written = await repository().append(
      appendInput("review-ambiguous", {
        result: reviewResult({
          reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
          candidates: [reviewResult().candidates[0], deferralCandidate()],
        }),
      }),
    );

    expect(written).toMatchObject({
      status: "applied",
      snapshot: {
        reviews: [
          {
            result: {
              status: "REVIEW_REQUIRED",
              reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
              candidates: [{}, {}],
              selectedFamilyId: null,
              materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
            },
          },
        ],
      },
    });
  });

  it("accepts the OCR-disabled metadata-only result without inventing facts", async () => {
    const result = reviewResult({
      status: "INFORMATION_PENDING",
      reason: "OCR_DISABLED",
      engineId: null,
      engineVersion: null,
      candidates: [],
    });
    const written = await repository().append(
      appendInput("review-ocr-disabled", { result }),
    );

    expect(written).toMatchObject({
      status: "applied",
      snapshot: {
        reviews: [
          {
            result: {
              status: "INFORMATION_PENDING",
              reason: "OCR_DISABLED",
              candidates: [],
              materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
            },
          },
        ],
      },
    });
  });

  it("blocks the fifty-first review without evicting existing history", async () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    for (
      let index = 0;
      index < FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxReviews;
      index += 1
    ) {
      const result = await repo.append(
        appendInput(`review-${index}`, {
          expectedRevision: index,
          createdAt: `2026-07-12T08:${String(index).padStart(2, "0")}:00.000Z`,
          result: reviewResult({ sha256: index.toString(16).padStart(64, "0") }),
        }),
      );
      expect(result.status, String(index)).toBe("applied");
    }
    const before = [...storage.values.values()][0];
    await expect(
      repo.append(
        appendInput("review-over-limit", {
          expectedRevision:
            FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxReviews,
        }),
      ),
    ).resolves.toEqual({
      status: "blocked",
      reason: "COLLECTION_LIMIT_EXCEEDED",
    });
    expect([...storage.values.values()][0]).toBe(before);
  });

  it("returns defensive frozen outputs that cannot contaminate later loads", async () => {
    const repo = repository();
    const written = await repo.append(appendInput("review-frozen"));
    expect(written.status).toBe("applied");
    if (written.status !== "applied" && written.status !== "existing") return;

    expect(Object.isFrozen(written.snapshot)).toBe(true);
    expect(Object.isFrozen(written.snapshot.reviews)).toBe(true);
    expect(Object.isFrozen(written.snapshot.reviews[0]?.result)).toBe(true);
    expect(
      Object.isFrozen(written.snapshot.reviews[0]?.result.candidates[0]),
    ).toBe(true);
    expect(() => {
      (written.snapshot.reviews as unknown[]).push({});
    }).toThrow();

    const loaded = repo.load();
    expect(loaded.status === "blocked" ? null : loaded.snapshot.revision).toBe(1);
    expect(
      loaded.status === "blocked"
        ? null
        : loaded.snapshot.reviews[0]?.reviewId,
    ).toBe(opaqueReviewId("review-frozen"));
  });
});
