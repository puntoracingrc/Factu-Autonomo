import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "./input-contract";
import { reconcileFiscalNotificationReviewAmountsV1 } from "./amount-reconciliation-engine.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
} from "./vertical-slice-review.v1";

const OWNER = "user:synthetic-reconciliation";

function moneyField(input: {
  fieldId: string;
  canonicalType: FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"];
  label: string;
  amountCents: number;
  page: number;
}) {
  const displayValue = `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(input.amountCents / 100)}\u00a0€`;
  return {
    fieldId: input.fieldId,
    semantic: "MONEY" as const,
    canonicalType: input.canonicalType,
    label: input.label,
    displayValue,
    normalizedValue: String(input.amountCents),
    amountCents: input.amountCents,
    currency: "EUR" as const,
    sourcePageNumbers: [input.page],
    sourceLabel: input.label,
    confidence: 0.74,
    reviewStatus: "REVIEW_REQUIRED" as const,
  };
}

function reviewFor(input: {
  familyId: string;
  extractorId: string;
  fields: readonly ReturnType<typeof moneyField>[];
}) {
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: `review-document:${input.familyId.replace(/\./gu, "-")}`,
        extractorId: input.extractorId,
        familyId: input.familyId,
        title:
          resolveFamilyRuleV2(input.familyId)?.canonicalTitle ??
          "Documento de recaudación",
        subtitle: "Datos estructurados listos para revisar",
        pageFrom: 1,
        pageTo: 1,
        confidence: 0.8,
        fields: input.fields,
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

function neutralInput(documentId: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId,
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        isBlank: false,
        text: "Documento sintético sin identificadores personales.",
      }),
    ]),
  });
}

describe("fiscal notification amount reconciliation v1", () => {
  it("reclassifies a repeated DNI-shaped OCR amount and excludes it from accounting", () => {
    const review = parseFiscalNotificationVerticalSliceReviewV1({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: [
        {
          reviewDocumentId: "review-document:synthetic-dni-money",
          extractorId: "payment-order",
          familyId: "collection.enforcement_order",
          title: "Providencia de apremio",
          subtitle: "Datos estructurados listos para revisar",
          pageFrom: 1,
          pageTo: 2,
          confidence: 0.8,
          fields: [
            moneyField({
              fieldId: "profile:money:OUTSTANDING_PRINCIPAL:0",
              canonicalType: "OUTSTANDING_PRINCIPAL",
              label: "Principal pendiente",
              amountCents: 14_955,
              page: 1,
            }),
            moneyField({
              fieldId: "profile:money:EXECUTIVE_SURCHARGE_20:0",
              canonicalType: "EXECUTIVE_SURCHARGE_20",
              label: "Recargo ordinario del 20 %",
              amountCents: 2_991,
              page: 1,
            }),
            moneyField({
              fieldId: "profile:money:TOTAL_CLAIMED:0",
              canonicalType: "TOTAL_CLAIMED",
              label: "Total reclamado",
              amountCents: 17_946,
              page: 1,
            }),
            moneyField({
              fieldId: "profile:money:TOTAL_CLAIMED:1",
              canonicalType: "TOTAL_CLAIMED",
              label: "Total reclamado",
              amountCents: 4_640_245_700,
              page: 1,
            }),
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
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "document:synthetic-dni-money",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          isBlank: false,
          text: [
            "AGENCIA TRIBUTARIA",
            "NIF del obligado: 46.402.457",
            "Principal pendiente: 149,55 EUR",
            "Recargo ordinario: 29,91 EUR",
            "Total: 179,46 EUR",
          ].join("\n"),
        }),
        Object.freeze({
          pageNumber: 2,
          isBlank: false,
          text: "Identificación fiscal del deudor: 46402457",
        }),
      ]),
    });

    const reconciled = reconcileFiscalNotificationReviewAmountsV1(
      review,
      input,
    );
    const document = reconciled.documents[0]!;

    expect(document.fields.map((field) => field.amountCents)).toEqual([
      14_955,
      2_991,
      17_946,
    ]);
    expect(document.amountReconciliation).toMatchObject({
      status: "MATCHED",
      passCount: 2,
      requiresManualReview: false,
      discardedCandidates: [
        {
          fieldId: "profile:money:TOTAL_CLAIMED:1",
          amountCents: 4_640_245_700,
          reason: "TAX_IDENTIFIER_REPEATED_CONTEXT",
          reclassifiedAs: "TAX_IDENTIFIER",
          sourcePageNumbers: [1, 2],
        },
      ],
      equations: [
        {
          status: "MATCHED",
          leftCents: 17_946,
          rightCents: 17_946,
          differenceCents: 0,
        },
      ],
      numericMutationPolicy: "NEVER_CHANGE_EXTRACTED_VALUES",
    });
    expect(JSON.stringify(document.amountReconciliation)).not.toContain(
      "46.402.457",
    );
  });

  it("keeps a mismatch unchanged and sends it to manual review", () => {
    const base = parseFiscalNotificationVerticalSliceReviewV1({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: [
        {
          reviewDocumentId: "review-document:synthetic-mismatch",
          extractorId: "payment-order",
          familyId: "collection.enforcement_order",
          title: "Providencia de apremio",
          subtitle: "Datos estructurados listos para revisar",
          pageFrom: 1,
          pageTo: 1,
          confidence: 0.8,
          fields: [
            moneyField({
              fieldId: "profile:money:OUTSTANDING_PRINCIPAL:0",
              canonicalType: "OUTSTANDING_PRINCIPAL",
              label: "Principal pendiente",
              amountCents: 10_000,
              page: 1,
            }),
            moneyField({
              fieldId: "profile:money:TOTAL_CLAIMED:0",
              canonicalType: "TOTAL_CLAIMED",
              label: "Total reclamado",
              amountCents: 12_345,
              page: 1,
            }),
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
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "document:synthetic-mismatch",
      pages: Object.freeze([
        Object.freeze({ pageNumber: 1, isBlank: false, text: "Sin otros importes" }),
      ]),
    });

    const reconciled = reconcileFiscalNotificationReviewAmountsV1(base, input);

    expect(reconciled.documents[0]?.fields.map((field) => field.amountCents)).toEqual([
      10_000,
      12_345,
    ]);
    expect(reconciled.documents[0]?.amountReconciliation).toMatchObject({
      status: "REVIEW_REQUIRED",
      requiresManualReview: true,
      equations: [
        {
          status: "MISMATCH_REVIEW_REQUIRED",
          leftCents: 10_000,
          rightCents: 12_345,
          differenceCents: -2_345,
        },
      ],
    });
  });

  it("does not discard a legitimate eight-digit currency amount", () => {
    const fields = [
      moneyField({
        fieldId: "amount:principal",
        canonicalType: "OUTSTANDING_PRINCIPAL",
        label: "Principal pendiente",
        amountCents: 1_234_567_800,
        page: 1,
      }),
      moneyField({
        fieldId: "amount:total",
        canonicalType: "TOTAL_CLAIMED",
        label: "Total del documento",
        amountCents: 1_234_567_800,
        page: 1,
      }),
    ];
    const document = reconcileFiscalNotificationReviewAmountsV1(
      reviewFor({
        familyId: "collection.enforcement_order",
        extractorId: "payment-order",
        fields,
      }),
      Object.freeze({
        ownerScope: OWNER,
        documentId: "document:synthetic-large-debt",
        pages: Object.freeze([
          Object.freeze({
            pageNumber: 1,
            isBlank: false,
            text: "Deuda del deudor: 12.345.678,00 EUR",
          }),
        ]),
      }),
    ).documents[0]!;

    expect(document.fields.map((field) => field.amountCents)).toEqual([
      1_234_567_800,
      1_234_567_800,
    ]);
    expect(document.amountReconciliation).toMatchObject({
      status: "MATCHED",
      discardedCandidates: [],
    });
  });

  it("applies the family equation for enforcement, offset, assessment and sanction", () => {
    const cases = [
      {
        familyId: "collection.enforcement_order",
        extractorId: "payment-order",
        formula:
          "PRINCIPAL_PLUS_SURCHARGE_PLUS_INTEREST_PLUS_COSTS_MINUS_PAYMENTS_EQUALS_TOTAL",
        fields: [
          moneyField({ fieldId: "amount:principal", canonicalType: "OUTSTANDING_PRINCIPAL", label: "Principal pendiente", amountCents: 10_000, page: 1 }),
          moneyField({ fieldId: "amount:surcharge", canonicalType: "EXECUTIVE_SURCHARGE_20", label: "Recargo ordinario del 20 %", amountCents: 2_000, page: 1 }),
          moneyField({ fieldId: "amount:total", canonicalType: "TOTAL_CLAIMED", label: "Total del documento", amountCents: 12_000, page: 1 }),
        ],
      },
      {
        familyId: "collection.offset_ex_officio",
        extractorId: "compensation",
        formula: "TOTAL_BEFORE_OFFSET_MINUS_OFFSET_EQUALS_REMAINING",
        fields: [
          moneyField({ fieldId: "amount:TOTAL_BEFORE_OFFSET:0", canonicalType: "TOTAL_CLAIMED", label: "Importe anterior", amountCents: 32_300, page: 1 }),
          moneyField({ fieldId: "amount:offset", canonicalType: "COMPENSATED_AMOUNT", label: "Compensación aplicada", amountCents: 10_000, page: 1 }),
          moneyField({ fieldId: "amount:remaining", canonicalType: "TOTAL_PENDING", label: "Saldo pendiente", amountCents: 22_300, page: 1 }),
        ],
      },
      {
        familyId: "assessment.final_provisional_assessment",
        extractorId: "assessment",
        formula: "QUOTA_PLUS_INTEREST_EQUALS_TOTAL",
        fields: [
          moneyField({ fieldId: "amount:quota", canonicalType: "TAX_QUOTA", label: "Cuota", amountCents: 9_000, page: 1 }),
          moneyField({ fieldId: "amount:interest", canonicalType: "LATE_INTEREST", label: "Intereses de demora", amountCents: 600, page: 1 }),
          moneyField({ fieldId: "amount:total", canonicalType: "TOTAL_CLAIMED", label: "Total", amountCents: 9_600, page: 1 }),
        ],
      },
      {
        familyId: "sanction.resolution",
        extractorId: "penalty",
        formula:
          "INITIAL_PENALTY_MINUS_REDUCTION_EQUALS_REDUCED_PENALTY",
        fields: [
          moneyField({ fieldId: "amount:INITIAL_FINE:0", canonicalType: "PENALTY", label: "Sanción inicial", amountCents: 20_000, page: 1 }),
          moneyField({ fieldId: "amount:REDUCTION:0", canonicalType: "PENALTY", label: "Reducción aplicada", amountCents: 5_000, page: 1 }),
          moneyField({ fieldId: "amount:REDUCED_FINE:0", canonicalType: "PENALTY", label: "Sanción reducida", amountCents: 15_000, page: 1 }),
        ],
      },
    ] as const;

    for (const candidate of cases) {
      const originalAmounts = candidate.fields.map((field) => field.amountCents);
      const result = reconcileFiscalNotificationReviewAmountsV1(
        reviewFor(candidate),
        neutralInput(`document:${candidate.familyId}`),
      ).documents[0]!;

      expect(result.amountReconciliation, candidate.familyId).toMatchObject({
        status: "MATCHED",
        requiresManualReview: false,
        equations: [
          expect.objectContaining({
            formula: candidate.formula,
            status: "MATCHED",
            differenceCents: 0,
          }),
        ],
      });
      expect(result.fields.map((field) => field.amountCents)).toEqual(
        originalAmounts,
      );
      expect(result.fields.every((field) => field.confidence >= 0.99)).toBe(
        true,
      );
    }
  });

  it("accepts a one-cent rounding difference without changing either side", () => {
    const fields = [
      moneyField({ fieldId: "amount:quota", canonicalType: "TAX_QUOTA", label: "Cuota", amountCents: 12_000, page: 1 }),
      moneyField({ fieldId: "amount:interest", canonicalType: "LATE_INTEREST", label: "Intereses", amountCents: 300, page: 1 }),
      moneyField({ fieldId: "amount:total", canonicalType: "TOTAL_CLAIMED", label: "Total", amountCents: 12_301, page: 1 }),
    ];
    const result = reconcileFiscalNotificationReviewAmountsV1(
      reviewFor({
        familyId: "assessment.final_provisional_assessment",
        extractorId: "assessment",
        fields,
      }),
      neutralInput("document:rounding"),
    ).documents[0]!;

    expect(result.amountReconciliation).toMatchObject({
      status: "MATCHED",
      equations: [
        {
          status: "MATCHED_WITH_ROUNDING",
          leftCents: 12_300,
          rightCents: 12_301,
          differenceCents: -1,
        },
      ],
    });
    expect(result.fields.map((field) => field.amountCents)).toEqual([
      12_000,
      300,
      12_301,
    ]);
  });
});
