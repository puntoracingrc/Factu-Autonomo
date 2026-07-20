import { describe, expect, it } from "vitest";
import {
  resolveProfileFieldAdapterV2,
  type ProfileFieldCandidateV2,
  type ProfileFieldEvidenceV2,
} from "./extractor-core/profile-field-adapter.v2";
import { extractProfileDrivenFamilyV2 } from "./extractor-core/profile-driven-extractor.v2";
import {
  createEmptyFiscalNotificationVerticalSliceReviewV1,
  parseFiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";
import {
  mergeProfileDrivenReviewV2,
  mergeProfileDrivenReviewsV2,
  projectProfileDrivenReviewV2,
} from "./profile-driven-review.v2";

function evidence(index: number): ProfileFieldEvidenceV2 {
  return Object.freeze({
    evidenceId: `evidence-profile-review-${index}`,
    pageNumber: 1,
    evidenceBasis: "EXPLICIT_DOCUMENT_FIELD",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    confidence: 1,
  });
}

function interestReview(input: {
  readonly instanceId: string;
  readonly pageNumber: number;
  readonly liquidationKey: string;
  readonly agreementId: string;
  readonly interestCents?: number;
}) {
  const adapter = resolveProfileFieldAdapterV2(
    "collection.interest_assessment",
  )!;
  const candidates: ProfileFieldCandidateV2[] = [
    {
      candidateId: `${input.instanceId}:liquidation`,
      candidateStatus: "EXACT",
      evidence: Object.freeze({
        ...evidence(input.pageNumber * 10 + 1),
        pageNumber: input.pageNumber,
      }),
      kind: "REFERENCE",
      fieldCode: "LIQUIDATION_KEY",
      normalizedValue: input.liquidationKey,
      sensitiveReference: null,
    },
    {
      candidateId: `${input.instanceId}:agreement`,
      candidateStatus: "EXACT",
      evidence: Object.freeze({
        ...evidence(input.pageNumber * 10 + 2),
        pageNumber: input.pageNumber,
      }),
      kind: "REFERENCE",
      fieldCode: "AGREEMENT_ID",
      normalizedValue: input.agreementId,
      sensitiveReference: null,
    },
    ...(input.interestCents === undefined
      ? []
      : [
          {
            candidateId: `${input.instanceId}:interest`,
            candidateStatus: "EXACT" as const,
            evidence: Object.freeze({
              ...evidence(input.pageNumber * 10 + 3),
              pageNumber: input.pageNumber,
            }),
            kind: "MONEY" as const,
            fieldCode: "LATE_PAYMENT_INTEREST" as const,
            amountCents: input.interestCents,
            currency: "EUR" as const,
          },
        ]),
  ];
  const outcome = adapter.adapt({
    ownerScope: "user:test",
    documentId: "document:synthetic-interest-bundle",
    selection: {
      selectionStatus: "SELECTED",
      familyId: "collection.interest_assessment",
      basis: "SYSTEM_EXACT",
    },
    candidates,
  });
  return projectProfileDrivenReviewV2({
    outcome,
    extractorId: "payment-order",
    canonicalTitle: "Liquidación de intereses de demora",
    titlePageNumbers: [input.pageNumber],
    pageCount: 6,
    documentInstanceId: input.instanceId,
  });
}

function identityReview(input: {
  readonly instanceId: string;
  readonly canonicalType: "LIQUIDATION_KEY" | "EXPEDIENTE_ID";
  readonly value: string;
  readonly amountCents: number;
  readonly pageNumber?: number;
}) {
  const pageNumber = input.pageNumber ?? 1;
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: `review-document:profile:collection.interest_assessment:${input.instanceId}`,
        extractorId: "payment-order",
        familyId: "collection.interest_assessment",
        title: "Liquidación de intereses de demora",
        subtitle: "Datos observados en el documento",
        pageFrom: pageNumber,
        pageTo: pageNumber,
        confidence: 1,
        fields: [
          {
            fieldId: `reference:${input.instanceId}`,
            semantic: "REFERENCE",
            canonicalType: input.canonicalType,
            label:
              input.canonicalType === "LIQUIDATION_KEY"
                ? "Clave de liquidación"
                : "Número de expediente",
            displayValue: input.value,
            normalizedValue: input.value,
            amountCents: null,
            currency: null,
            sourcePageNumbers: [pageNumber],
            sourceLabel:
              input.canonicalType === "LIQUIDATION_KEY"
                ? "Clave de liquidación"
                : "Número de expediente",
            confidence: 1,
            reviewStatus: "REVIEW_REQUIRED",
          },
          {
            fieldId: `money:${input.instanceId}`,
            semantic: "MONEY",
            canonicalType: "LATE_INTEREST",
            label: "Intereses de demora",
            displayValue: "12,34\u00a0€",
            normalizedValue: String(input.amountCents),
            amountCents: input.amountCents,
            currency: "EUR",
            sourcePageNumbers: [pageNumber],
            sourceLabel: "Intereses de demora",
            confidence: 1,
            reviewStatus: "REVIEW_REQUIRED",
          },
        ],
        warnings: [],
        requiresHumanReview: true,
      },
    ],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

function globalIdentityReview(input: {
  readonly pageNumber: number;
  readonly value: string;
}) {
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: "review-document:real-corpus-v7:synthetic-global",
        extractorId: "payment-order",
        familyId: "collection.interest_assessment",
        title: "Liquidación de intereses de demora",
        subtitle: "Datos observados en el documento",
        pageFrom: 1,
        pageTo: 2,
        confidence: 1,
        fields: [
          {
            fieldId: "real-corpus-v7:LIQUIDATION_KEY:0",
            semantic: "REFERENCE",
            canonicalType: "LIQUIDATION_KEY",
            label: "Clave de liquidación",
            displayValue: input.value,
            normalizedValue: input.value,
            amountCents: null,
            currency: null,
            sourcePageNumbers: [input.pageNumber],
            sourceLabel: "Clave de liquidación",
            confidence: 1,
            reviewStatus: "REVIEW_REQUIRED",
          },
        ],
        warnings: [],
        requiresHumanReview: true,
      },
    ],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

function exactOutcome() {
  const adapter = resolveProfileFieldAdapterV2("collection.enforcement_order")!;
  const candidates: ProfileFieldCandidateV2[] = [
    {
      candidateId: "reference-1",
      candidateStatus: "EXACT",
      evidence: evidence(1),
      kind: "REFERENCE",
      fieldCode: "LIQUIDATION_KEY",
      normalizedValue: "REF/X20/26/001",
      sensitiveReference: null,
    },
    {
      candidateId: "date-1",
      candidateStatus: "EXACT",
      evidence: evidence(2),
      kind: "DATE",
      fieldCode: "ISSUE_DATE",
      valueIso: "2026-07-16",
    },
    {
      candidateId: "money-1",
      candidateStatus: "EXACT",
      evidence: evidence(3),
      kind: "MONEY",
      fieldCode: "OUTSTANDING_PRINCIPAL",
      amountCents: 14_955,
      currency: "EUR",
    },
    {
      candidateId: "fact-1",
      candidateStatus: "EXACT",
      evidence: evidence(4),
      kind: "FACT",
      fieldCode: "APPEAL_INFORMATION",
      observed: true,
    },
  ];
  return adapter.adapt({
    ownerScope: "user:test",
    documentId: "document:synthetic",
    selection: {
      selectionStatus: "SELECTED",
      familyId: "collection.enforcement_order",
      basis: "SYSTEM_EXACT",
    },
    candidates,
  });
}

describe("profile-driven review v2", () => {
  it("projects safe structured fields into the durable review contract", () => {
    const review = projectProfileDrivenReviewV2({
      outcome: exactOutcome(),
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 2,
    });

    expect(review).toMatchObject({
      status: "REVIEW_REQUIRED",
      requiresHumanReview: true,
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      documents: [
        {
          familyId: "collection.enforcement_order",
          extractorId: "payment-order",
          title: "Providencia de apremio",
        },
      ],
    });
    expect(review.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semantic: "DATE",
          canonicalType: "ISSUE_DATE",
          normalizedValue: "2026-07-16",
        }),
        expect.objectContaining({
          semantic: "MONEY",
          canonicalType: "OUTSTANDING_PRINCIPAL",
          amountCents: 14_955,
          currency: "EUR",
        }),
      ]),
    );
    expect(() =>
      parseFiscalNotificationVerticalSliceReviewV1(review),
    ).not.toThrow();
  });

  it("does not expose adapter issue tokens as review warnings", () => {
    const review = projectProfileDrivenReviewV2({
      outcome: {
        ...exactOutcome(),
        issues: ["CONFLICTING_EXACT_FIELD_VALUES"],
      },
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 2,
    });

    expect(review.documents[0]?.warnings).toEqual([]);
    expect(JSON.stringify(review)).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:/u,
    );
  });

  it("does not serialize recognition or printed-effect contract tokens as document facts", () => {
    const adapter = resolveProfileFieldAdapterV2("review.suspension_decision")!;
    const outcome = Object.freeze({
      ...adapter.adapt({
        ownerScope: "user:test",
        documentId: "document:synthetic-suspension-decision",
        selection: {
          selectionStatus: "SELECTED",
          familyId: "review.suspension_decision",
          basis: "SYSTEM_EXACT",
        },
        candidates: [],
      }),
      printedEffects: Object.freeze([
        Object.freeze({
          effectCode: "SUSPENSION_GRANTED" as const,
          pageNumbers: Object.freeze([1]),
          detectionBasis: "CLOSED_PRINTED_PHRASE" as const,
        }),
      ]),
    });

    const review = projectProfileDrivenReviewV2({
      outcome,
      extractorId: "appeal-and-review",
      canonicalTitle: "Acuerdo sobre la suspensión solicitada",
      titlePageNumbers: [1],
      pageCount: 1,
    });

    expect(review).toMatchObject({
      status: "INFORMATION_PENDING",
      documents: [],
    });
    expect(JSON.stringify(review)).not.toMatch(/EXACT_|EFFECT:/u);
    expect(() =>
      parseFiscalNotificationVerticalSliceReviewV1(review),
    ).not.toThrow();
  });

  it("keeps a detected printed effect ephemeral when no source-valued fact was extracted", async () => {
    const outcome = await extractProfileDrivenFamilyV2({
      document: Object.freeze({
        ownerScope: "user:synthetic-variable-effect-e2e",
        documentId: "document:synthetic-variable-effect-e2e",
        pages: Object.freeze([
          Object.freeze({
            pageNumber: 1,
            text: [
              "Agencia Estatal de Administración Tributaria",
              "Acuerdo sobre la suspensión solicitada",
              "Suspensión concedida",
            ].join("\n"),
            isBlank: false,
          }),
        ]),
      }),
    });
    expect(outcome.adaptedFields).not.toBeNull();
    const review = projectProfileDrivenReviewV2({
      outcome: outcome.adaptedFields!,
      extractorId: "appeal-and-review",
      canonicalTitle: "Acuerdo sobre la suspensión solicitada",
      titlePageNumbers: [1],
      pageCount: 1,
    });
    expect(outcome.adaptedFields?.printedEffects).toEqual([
      expect.objectContaining({ effectCode: "SUSPENSION_GRANTED" }),
    ]);
    expect(review).toMatchObject({
      status: "INFORMATION_PENDING",
      documents: [],
    });
    expect(JSON.stringify(review)).not.toMatch(
      /EXACT_|EFFECT:|SUSPENSION_GRANTED/u,
    );
  });

  it("stays empty without an exact system selection", () => {
    const outcome = {
      ...exactOutcome(),
      familyId: null,
      selectionBasis: null,
    } as const;
    const review = projectProfileDrivenReviewV2({
      outcome,
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 1,
    });
    expect(review).toMatchObject({
      status: "INFORMATION_PENDING",
      documents: [],
    });
  });

  it("preserves interest period date identities without turning them into document chronology", () => {
    const adapter = resolveProfileFieldAdapterV2(
      "collection.interest_assessment",
    )!;
    const outcome = adapter.adapt({
      ownerScope: "user:test",
      documentId: "document:synthetic-interest-dates",
      selection: {
        selectionStatus: "SELECTED",
        familyId: "collection.interest_assessment",
        basis: "SYSTEM_EXACT",
      },
      candidates: [
        {
          candidateId: "interest-start-date",
          candidateStatus: "EXACT",
          evidence: evidence(20),
          kind: "DATE",
          fieldCode: "INTEREST_START_DATE",
          valueIso: "2025-01-01",
        },
        {
          candidateId: "interest-end-date",
          candidateStatus: "EXACT",
          evidence: evidence(21),
          kind: "DATE",
          fieldCode: "INTEREST_END_DATE",
          valueIso: "2025-12-31",
        },
      ],
    });

    const review = projectProfileDrivenReviewV2({
      outcome,
      extractorId: "payment-order",
      canonicalTitle: "Liquidación de intereses de demora",
      titlePageNumbers: [1],
      pageCount: 1,
    });

    expect(outcome.chronology).toEqual({
      schemaVersion: 2,
      chronologyDate: null,
      chronologyDateBasis: null,
    });
    expect(
      review.documents[0]?.fields
        .filter((field) => field.semantic === "DATE")
        .map((field) => ({
          fieldId: field.fieldId,
          normalizedValue: field.normalizedValue,
        })),
    ).toEqual([
      {
        fieldId: "profile:date:INTEREST_START_DATE:0",
        normalizedValue: "2025-01-01",
      },
      {
        fieldId: "profile:date:INTEREST_END_DATE:1",
        normalizedValue: "2025-12-31",
      },
    ]);
    expect(() =>
      parseFiscalNotificationVerticalSliceReviewV1(review),
    ).not.toThrow();
  });

  it("merges a recognized profile into the existing review without mutating it", () => {
    const legacy = createEmptyFiscalNotificationVerticalSliceReviewV1();
    const before = structuredClone(legacy);
    const profile = projectProfileDrivenReviewV2({
      outcome: exactOutcome(),
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 1,
    });
    const merged = mergeProfileDrivenReviewV2(legacy, profile);
    expect(legacy).toEqual(before);
    expect(merged.documents).toHaveLength(1);
    expect(Object.isFrozen(merged.documents[0]?.fields)).toBe(true);
  });

  it("coalesces repeated pages of one act by exact primary identity", () => {
    const first = interestReview({
      instanceId: "interest-main",
      pageNumber: 1,
      liquidationKey: "SYN-LIQ-001",
      agreementId: "SYN-AGREEMENT-001",
    });
    const annex = interestReview({
      instanceId: "interest-annex",
      pageNumber: 5,
      liquidationKey: "SYN-LIQ-001",
      agreementId: "SYN-AGREEMENT-001",
      interestCents: 1_234,
    });

    const merged = mergeProfileDrivenReviewsV2(
      createEmptyFiscalNotificationVerticalSliceReviewV1(),
      [first, annex],
    );

    expect(merged.documents).toHaveLength(1);
    expect(merged.documents[0]).toMatchObject({ pageFrom: 1, pageTo: 5 });
    expect(merged.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalType: "LIQUIDATION_KEY",
          sourcePageNumbers: [1, 5],
        }),
        expect.objectContaining({
          canonicalType: "LATE_INTEREST",
          amountCents: 1_234,
          sourcePageNumbers: [5],
        }),
      ]),
    );
  });

  it("does not coalesce distinct acts by agreement or equal amount", () => {
    const first = interestReview({
      instanceId: "interest-one",
      pageNumber: 1,
      liquidationKey: "SYN-LIQ-001",
      agreementId: "SYN-AGREEMENT-099",
      interestCents: 1_234,
    });
    const second = interestReview({
      instanceId: "interest-two",
      pageNumber: 5,
      liquidationKey: "SYN-LIQ-002",
      agreementId: "SYN-AGREEMENT-099",
      interestCents: 1_234,
    });

    const merged = mergeProfileDrivenReviewsV2(
      createEmptyFiscalNotificationVerticalSliceReviewV1(),
      [first, second],
    );

    expect(merged.documents).toHaveLength(2);
  });

  it("does not coalesce overlapping acts with different strong identities", () => {
    const first = interestReview({
      instanceId: "interest-overlap-one",
      pageNumber: 1,
      liquidationKey: "SYN-LIQ-OVERLAP-001",
      agreementId: "SYN-AGREEMENT-OVERLAP-001",
    });
    const second = interestReview({
      instanceId: "interest-overlap-two",
      pageNumber: 1,
      liquidationKey: "SYN-LIQ-OVERLAP-002",
      agreementId: "SYN-AGREEMENT-OVERLAP-001",
    });

    const merged = mergeProfileDrivenReviewsV2(
      createEmptyFiscalNotificationVerticalSliceReviewV1(),
      [first, second],
    );

    expect(merged.documents).toHaveLength(2);
    expect(
      merged.documents.map(
        (document) =>
          document.fields.find(
            (field) => field.canonicalType === "LIQUIDATION_KEY",
          )?.normalizedValue,
      ),
    ).toEqual(["SYN-LIQ-OVERLAP-001", "SYN-LIQ-OVERLAP-002"]);
  });

  it("does not coalesce overlapping acts with different identity kinds and the same amount", () => {
    const first = identityReview({
      instanceId: "overlap-liquidation",
      canonicalType: "LIQUIDATION_KEY",
      value: "SYN-LIQ-IDENTITY-001",
      amountCents: 1_234,
    });
    const second = identityReview({
      instanceId: "overlap-case",
      canonicalType: "EXPEDIENTE_ID",
      value: "SYN-EXP-IDENTITY-002",
      amountCents: 1_234,
    });

    const merged = mergeProfileDrivenReviewsV2(
      createEmptyFiscalNotificationVerticalSliceReviewV1(),
      [first, second],
    );

    expect(merged.documents).toHaveLength(2);
    expect(
      merged.documents.every((document) =>
        document.fields.some(
          (field) => field.semantic === "MONEY" && field.amountCents === 1_234,
        ),
      ),
    ).toBe(true);
  });

  it("attaches a global extraction layer to the segment identified by provenance", () => {
    const first = identityReview({
      instanceId: "segment-one",
      canonicalType: "EXPEDIENTE_ID",
      value: "SYN-EXP-SEGMENT-001",
      amountCents: 1_111,
      pageNumber: 1,
    });
    const second = identityReview({
      instanceId: "segment-two",
      canonicalType: "EXPEDIENTE_ID",
      value: "SYN-EXP-SEGMENT-002",
      amountCents: 2_222,
      pageNumber: 2,
    });
    const globalLayer = parseFiscalNotificationVerticalSliceReviewV1({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: [
        {
          reviewDocumentId: "review-document:real-corpus-v7:synthetic-bundle",
          extractorId: "payment-order",
          familyId: "collection.interest_assessment",
          title: "Liquidación de intereses de demora",
          subtitle: "Datos observados en el documento",
          pageFrom: 1,
          pageTo: 2,
          confidence: 1,
          fields: [
            {
              fieldId: "real-corpus-v7:LIQUIDATION_KEY:0",
              semantic: "REFERENCE",
              canonicalType: "LIQUIDATION_KEY",
              label: "Clave de liquidación",
              displayValue: "SYN-LIQ-SEGMENT-002",
              normalizedValue: "SYN-LIQ-SEGMENT-002",
              amountCents: null,
              currency: null,
              sourcePageNumbers: [2],
              sourceLabel: "Clave de liquidación",
              confidence: 1,
              reviewStatus: "REVIEW_REQUIRED",
            },
          ],
          warnings: [],
          requiresHumanReview: true,
        },
      ],
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });

    const merged = mergeProfileDrivenReviewsV2(
      createEmptyFiscalNotificationVerticalSliceReviewV1(),
      [globalLayer, first, second],
    );

    expect(merged.documents).toHaveLength(2);
    expect(
      merged.documents[0]?.fields.some(
        (field) => field.normalizedValue === "SYN-LIQ-SEGMENT-002",
      ),
    ).toBe(false);
    expect(merged.documents[1]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalType: "EXPEDIENTE_ID",
          normalizedValue: "SYN-EXP-SEGMENT-002",
        }),
        expect.objectContaining({
          canonicalType: "LIQUIDATION_KEY",
          normalizedValue: "SYN-LIQ-SEGMENT-002",
          sourcePageNumbers: [2],
        }),
      ]),
    );
  });

  it("does not attach a global identity observed outside the only segment", () => {
    const segment = identityReview({
      instanceId: "single-segment",
      canonicalType: "EXPEDIENTE_ID",
      value: "SYN-EXP-SINGLE-001",
      amountCents: 3_333,
      pageNumber: 1,
    });
    const globalLayer = globalIdentityReview({
      pageNumber: 2,
      value: "SYN-LIQ-OUTSIDE-002",
    });

    const merged = mergeProfileDrivenReviewsV2(
      createEmptyFiscalNotificationVerticalSliceReviewV1(),
      [segment, globalLayer],
    );

    expect(merged.documents).toHaveLength(2);
    expect(merged.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalType: "EXPEDIENTE_ID",
          normalizedValue: "SYN-EXP-SINGLE-001",
        }),
      ]),
    );
    expect(
      merged.documents[0]?.fields.some(
        (field) => field.normalizedValue === "SYN-LIQ-OUTSIDE-002",
      ),
    ).toBe(false);
    expect(merged.documents[1]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalType: "LIQUIDATION_KEY",
          normalizedValue: "SYN-LIQ-OUTSIDE-002",
          sourcePageNumbers: [2],
        }),
      ]),
    );
  });

  it("keeps overlapping acts from different families when their strong identities conflict", () => {
    const legacy = parseFiscalNotificationVerticalSliceReviewV1({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: [
        {
          reviewDocumentId: "review-document:synthetic-enforcement",
          extractorId: "payment-order",
          familyId: "collection.enforcement_order",
          title: "Providencia de apremio",
          subtitle: "Datos estructurados listos para revisar",
          pageFrom: 1,
          pageTo: 1,
          confidence: 1,
          fields: [
            {
              fieldId: "reference:legacy:LIQUIDATION_KEY",
              semantic: "REFERENCE",
              canonicalType: "LIQUIDATION_KEY",
              label: "Clave de liquidación",
              displayValue: "SYN-LIQ-LEGACY-001",
              normalizedValue: "SYN-LIQ-LEGACY-001",
              amountCents: null,
              currency: null,
              sourcePageNumbers: [1],
              sourceLabel: "Clave de liquidación",
              confidence: 1,
              reviewStatus: "REVIEW_REQUIRED",
            },
          ],
          warnings: [],
          requiresHumanReview: true,
        },
      ],
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
    const interest = interestReview({
      instanceId: "interest-overlapping-other-family",
      pageNumber: 1,
      liquidationKey: "SYN-LIQ-INTEREST-002",
      agreementId: "SYN-AGREEMENT-INTEREST-002",
    });

    const merged = mergeProfileDrivenReviewsV2(legacy, [interest]);

    expect(merged.documents).toHaveLength(2);
    expect(
      merged.documents.map((document) => document.familyId).sort(),
    ).toEqual([
      "collection.enforcement_order",
      "collection.interest_assessment",
    ]);
  });

  it("keeps same-family specialized presentation while adding profile fields", () => {
    const profile = projectProfileDrivenReviewV2({
      outcome: exactOutcome(),
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 1,
    });
    const specialized = parseFiscalNotificationVerticalSliceReviewV1({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: [
        {
          reviewDocumentId: "review-document:specialized:enforcement",
          extractorId: "payment-order",
          familyId: "collection.enforcement_order",
          title: "Providencia de apremio",
          subtitle: "Datos estructurados listos para revisar",
          pageFrom: 1,
          pageTo: 1,
          confidence: 1,
          fields: [
            {
              fieldId: "reference:1:DEBT_KEY",
              semantic: "REFERENCE",
              canonicalType: "DEBT_KEY",
              label: "Clave de deuda",
              displayValue: "SYN-DEBT-SPECIALIZED-1",
              normalizedValue: "SYN-DEBT-SPECIALIZED-1",
              amountCents: null,
              currency: null,
              sourcePageNumbers: [1],
              sourceLabel: "Clave de deuda",
              confidence: 1,
              reviewStatus: "REVIEW_REQUIRED",
            },
            {
              fieldId: "reference:shared:LIQUIDATION_KEY",
              semantic: "REFERENCE",
              canonicalType: "LIQUIDATION_KEY",
              label: "Clave de liquidación",
              displayValue: "REF/X20/26/001",
              normalizedValue: "REF/X20/26/001",
              amountCents: null,
              currency: null,
              sourcePageNumbers: [1],
              sourceLabel: "Clave de liquidación",
              confidence: 1,
              reviewStatus: "REVIEW_REQUIRED",
            },
          ],
          warnings: [],
          requiresHumanReview: true,
        },
      ],
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });

    const merged = mergeProfileDrivenReviewV2(specialized, profile);

    expect(merged.documents).toHaveLength(1);
    expect(merged.documents[0]).toMatchObject({
      reviewDocumentId: "review-document:specialized:enforcement",
      title: "Providencia de apremio",
      subtitle: "Datos estructurados listos para revisar",
    });
    expect(merged.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: "reference:1:DEBT_KEY" }),
        expect.objectContaining({
          canonicalType: "LIQUIDATION_KEY",
          normalizedValue: "REF/X20/26/001",
          sourcePageNumbers: [1],
        }),
      ]),
    );
  });

  it("reconciles a broad legacy family that already uses the same extractor", () => {
    const legacy = parseFiscalNotificationVerticalSliceReviewV1({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: [
        {
          reviewDocumentId: "legacy-payment-order",
          extractorId: "payment-order",
          familyId: "collection.enforcement_order",
          title: "Documento de recaudación",
          subtitle: "Clasificación histórica amplia",
          pageFrom: 1,
          pageTo: 2,
          confidence: 1,
          fields: [
            {
              fieldId: "legacy:money:total",
              semantic: "MONEY",
              canonicalType: "TOTAL_CLAIMED",
              label: "Total",
              displayValue: "149,55 €",
              normalizedValue: "14955",
              amountCents: 14_955,
              currency: "EUR",
              sourcePageNumbers: [2],
              sourceLabel: "Total",
              confidence: 1,
              reviewStatus: "REVIEW_REQUIRED",
            },
          ],
          warnings: [],
          requiresHumanReview: true,
        },
      ],
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
    const interestAdapter = resolveProfileFieldAdapterV2(
      "collection.interest_assessment",
    )!;
    const profile = projectProfileDrivenReviewV2({
      outcome: interestAdapter.adapt({
        ownerScope: "user:test",
        documentId: "document:synthetic-interest",
        selection: {
          selectionStatus: "SELECTED",
          familyId: "collection.interest_assessment",
          basis: "SYSTEM_EXACT",
        },
        candidates: [
          {
            candidateId: "interest-money-1",
            candidateStatus: "EXACT",
            evidence: evidence(5),
            kind: "MONEY",
            fieldCode: "LATE_PAYMENT_INTEREST",
            amountCents: 2_991,
            currency: "EUR",
          },
        ],
      }),
      extractorId: "payment-order",
      canonicalTitle: "Liquidación de intereses de demora",
      titlePageNumbers: [1],
      pageCount: 2,
    });

    const merged = mergeProfileDrivenReviewV2(legacy, profile);

    expect(merged.documents).toHaveLength(1);
    expect(merged.documents[0]).toMatchObject({
      reviewDocumentId:
        "review-document:profile:collection.interest_assessment",
      extractorId: "payment-order",
      familyId: "collection.interest_assessment",
      title: "Liquidación de intereses de demora",
      pageFrom: 1,
      pageTo: 2,
    });
    expect(merged.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: "legacy:money:total" }),
        expect.objectContaining({
          fieldId: "profile:money:LATE_PAYMENT_INTEREST:0",
        }),
      ]),
    );
    expect(() =>
      parseFiscalNotificationVerticalSliceReviewV1(merged),
    ).not.toThrow();
  });
});
