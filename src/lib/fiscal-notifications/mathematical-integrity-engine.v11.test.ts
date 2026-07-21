import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "./input-contract";
import type { DocumentSegmentV1 } from "./extractor-core/document-segment.v1";
import { extractAeatP0DeepDocumentV10 } from "./extractor-core/p0-deep-extractor.v10";
import { extractAeatRealCorpusDocumentV6 } from "./extractor-core/real-corpus-extractor.v6";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import { resolveAeatOfficialCatalogProfileV9 } from "./knowledge/official-catalog-expansion.v9";
import { resolveAeatP0DeepProfileV10 } from "./knowledge/p0-deep-contracts.v10";
import {
  AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11,
  resolveAeatMathematicalIntegrityArchetypeV11,
} from "./knowledge/mathematical-integrity-catalog.v11";
import { reconcileFiscalNotificationReviewAmountsV1 } from "./amount-reconciliation-engine.v1";
import { projectAeatP0DeepReviewV10 } from "./p0-deep-review.v10";
import { projectRealCorpusReviewV6 } from "./real-corpus-review.v6";
import {
  classifyAeatMathematicalIntegrityFormulaHandlingV11,
  validateFiscalNotificationMathematicalIntegrityV11,
} from "./mathematical-integrity-engine.v11";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
} from "./vertical-slice-review.v1";

const OWNER = "user:synthetic-mathematical-integrity-v11";

function input(
  documentId: string,
  text = "Documento AEAT sintético sin identidad personal.",
  pageCount = 1,
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId,
    pages: Object.freeze(
      Array.from({ length: pageCount }, (_, index) =>
        Object.freeze({
          pageNumber: index + 1,
          isBlank: false,
          text,
        }),
      ),
    ),
  });
}

function segment(documentId: string): readonly DocumentSegmentV1[] {
  return Object.freeze([
    Object.freeze({
      segmentId: `segment:${documentId}`,
      documentId,
      segmentType: "MAIN_ADMINISTRATIVE_ACT",
      pageFrom: 1,
      pageTo: 1,
      detectedTitle: "Documento AEAT sintético",
      detectedAuthority: "AEAT",
      classificationConfidence: 0.99,
      extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
      contentHash: `sha256:${"a".repeat(64)}`,
      canGenerateAdministrativeFacts: true,
    }),
  ]);
}

function moneyField(
  fieldId: string,
  canonicalType: FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"],
  amountCents: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const labels: Partial<
    Record<
      FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"],
      string
    >
  > = {
    OUTSTANDING_PRINCIPAL: "Principal pendiente",
    EXECUTIVE_SURCHARGE_20: "Recargo ordinario del 20 %",
    LATE_INTEREST: "Intereses de demora",
    COSTS: "Costas",
    PAYMENT_ON_ACCOUNT: "Ingreso a cuenta",
    TOTAL_CLAIMED: "Total reclamado",
  };
  const label = labels[canonicalType] ?? "Importe";
  const displayValue = `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100)}\u00a0€`;
  return Object.freeze({
    fieldId,
    semantic: "MONEY",
    canonicalType,
    label,
    displayValue,
    normalizedValue: String(amountCents),
    amountCents,
    currency: "EUR",
    sourcePageNumbers: Object.freeze([1]),
    sourceLabel: label,
    confidence: 0.8,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function dateField(
  fieldId: string,
  canonicalType: FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"],
  date: string,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const labels: Partial<
    Record<
      FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"],
      string
    >
  > = {
    ISSUE_DATE: "Fecha de emisión",
    ACTION_DATE: "Fecha del acto",
    AVAILABILITY_DATE: "Puesta a disposición",
    ACCESS_DATE: "Fecha de acceso",
  };
  const label = labels[canonicalType] ?? "Fecha del acto";
  const [year, month, day] = date.split("-");
  return Object.freeze({
    fieldId,
    semantic: "DATE",
    canonicalType,
    label,
    displayValue: `${day}/${month}/${year}`,
    normalizedValue: date,
    amountCents: null,
    currency: null,
    sourcePageNumbers: Object.freeze([1]),
    sourceLabel: label,
    confidence: 0.84,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function formulaMoneyField(
  code: string,
  amountCents: number,
  index = 1,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return moneyField(
    `real-corpus-v7:${code}:${index}`,
    "TOTAL_CLAIMED",
    amountCents,
  );
}

function signedFormulaMoneyField(
  code: string,
  amountCents: number,
  index = 1,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const field = formulaMoneyField(code, Math.abs(amountCents), index);
  return Object.freeze({
    ...field,
    displayValue:
      amountCents < 0 ? `-${field.displayValue}` : field.displayValue,
  });
}

function signedP0MoneyField(
  code: string,
  amountCents: number,
  index = 1,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const field = signedFormulaMoneyField(code, amountCents, index);
  return Object.freeze({
    ...field,
    fieldId: `p0-v10:${code}:${index}`,
    canonicalType: "OTHER",
    normalizedValue: null,
  });
}

function fieldOnPage(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
  pageNumber: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    ...field,
    sourcePageNumbers: Object.freeze([pageNumber]),
  });
}

function countField(
  code: "SUBMITTED_COUNT" | "ACCEPTED_COUNT" | "REJECTED_COUNT",
  value: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    fieldId: `real-corpus-v7:${code}:1`,
    semantic: "DETAIL",
    canonicalType: "DOCUMENT_STATUS",
    label: "Estado del documento",
    displayValue: String(value),
    normalizedValue: `V7:INTEGER:${code}:${value}`,
    amountCents: null,
    currency: null,
    sourcePageNumbers: Object.freeze([1]),
    sourceLabel: "Estado del documento",
    confidence: 0.9,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function referenceField(): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    fieldId: "reference:document:1",
    semantic: "REFERENCE",
    canonicalType: "ACT_ID",
    label: "Acto o requerimiento",
    displayValue: "SYN-ACT-001",
    normalizedValue: "SYN-ACT-001",
    amountCents: null,
    currency: null,
    sourcePageNumbers: Object.freeze([1]),
    sourceLabel: "Acto o requerimiento",
    confidence: 0.91,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function review(
  familyId: string,
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
) {
  const rule = resolveFamilyRuleV2(familyId);
  const p0Profile = resolveAeatP0DeepProfileV10(familyId);
  const officialProfile = resolveAeatOfficialCatalogProfileV9(familyId);
  const title =
    rule?.canonicalTitle ?? p0Profile?.titleEs ?? officialProfile?.nameEs;
  if (!title) throw new Error(`Missing family title: ${familyId}`);
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: `review:${familyId}`,
        extractorId: rule?.extractorId ?? "informative-communication",
        familyId,
        title,
        subtitle: "Datos estructurados listos para revisar",
        pageFrom: 1,
        pageTo: Math.max(
          1,
          ...fields.flatMap((field) => field.sourcePageNumbers),
        ),
        confidence: 0.8,
        fields:
          fields.length > 0
            ? fields
            : [dateField("date:issue", "ISSUE_DATE", "2026-07-01")],
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

function validate(
  reviewValue: ReturnType<typeof review>,
  source: BoundedDocumentInput,
) {
  return validateFiscalNotificationMathematicalIntegrityV11(
    reconcileFiscalNotificationReviewAmountsV1(reviewValue, source),
    source,
    segment(source.documentId),
  ).documents[0]!;
}

describe("AEAT mathematical integrity engine V11", () => {
  it("validates printed enforcement amounts without mutating the extracted values", () => {
    const source = input("document:enforcement-exact");
    const fields = [
      moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 10_000),
      moneyField("amount:surcharge", "EXECUTIVE_SURCHARGE_20", 2_000),
      moneyField("amount:interest", "LATE_INTEREST", 0),
      moneyField("amount:costs", "COSTS", 0),
      moneyField("amount:payment", "PAYMENT_ON_ACCOUNT", 0),
      moneyField("amount:total", "TOTAL_CLAIMED", 12_000),
      referenceField(),
    ];
    const document = validate(
      review("collection.enforcement_order", fields),
      source,
    );

    expect(document.fields.map((field) => field.amountCents)).toEqual(
      fields.map((field) => field.amountCents),
    );
    expect(document.mathematicalIntegrity).toMatchObject({
      familyId: "collection.enforcement_order",
      archetypeId: "ENFORCEMENT_SCENARIOS",
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
      originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE",
      retainedSourceContent: "NONE",
      relationSupport: {
        existingRelationsOnly: true,
        requiresStrongIdentifier: true,
        permitsAmountOnlyRelations: false,
      },
    });
    expect(
      document.mathematicalIntegrity?.normalizedEvidence.every(
        (evidence) => evidence.sourcePart === "MAIN_ADMINISTRATIVE_ACT",
      ),
    ).toBe(true);
    expect(JSON.stringify(document.mathematicalIntegrity)).not.toContain(
      "SYN-ACT-001",
    );
    const referenceEvidence =
      document.mathematicalIntegrity?.normalizedEvidence.find(
        (evidence) => evidence.semantic === "REFERENCE",
      );
    expect(referenceEvidence).toBeDefined();
    expect(
      document.mathematicalIntegrity?.relationSupport.validatedEvidenceIds,
    ).not.toContain(referenceEvidence?.evidenceId);
  });

  it("keeps exact assessment arithmetic under review when the quota is also labeled as interest", () => {
    const source = input("document:assessment-semantic-label-conflict");
    const document = validate(
      review("assessment.final_provisional_assessment", [
        moneyField("amount:quota", "TAX_QUOTA", 22_800),
        moneyField("amount:interest:correct", "LATE_INTEREST", 307),
        moneyField("amount:interest:false-quota", "LATE_INTEREST", 22_800),
        moneyField("amount:total", "TOTAL_CLAIMED", 23_107),
      ]),
      source,
    );
    expect(document.amountReconciliation).toMatchObject({
      status: "MATCHED",
      equations: [
        expect.objectContaining({
          formula: "QUOTA_PLUS_INTEREST_EQUALS_TOTAL",
          status: "MATCHED",
          leftCents: 23_107,
          rightCents: 23_107,
        }),
      ],
    });
    expect(document.mathematicalIntegrity).toMatchObject({
      status: "SEMANTIC_LABEL_INCONSISTENT",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
      relationSupport: { permitsAmountOnlyRelations: false },
    });
    expect(document.mathematicalIntegrity?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkKind: "ARITHMETIC",
          status: "VALIDATED_EXACT",
        }),
        expect.objectContaining({
          checkKind: "STRUCTURAL",
          status: "SEMANTIC_LABEL_INCONSISTENT",
          safeMessage:
            "Validación de etiquetas: hay importes incompatibles clasificados como intereses de demora.",
        }),
      ]),
    );
  });

  it("does not infer a semantic conflict from one legitimate interest equal to the quota", () => {
    const source = input("document:assessment-equal-quota-and-interest");
    const document = validate(
      review("assessment.final_provisional_assessment", [
        moneyField("amount:quota", "TAX_QUOTA", 10_000),
        moneyField("amount:interest", "LATE_INTEREST", 10_000),
        moneyField("amount:total", "TOTAL_CLAIMED", 20_000),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity?.checks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "SEMANTIC_LABEL_INCONSISTENT" }),
      ]),
    );
  });

  it("validates a complete non-zero enforcement equation without dropping printed components", () => {
    const source = input("document:enforcement-complete-non-zero");
    const document = validate(
      review("collection.enforcement_order", [
        moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 10_000),
        moneyField("amount:surcharge", "EXECUTIVE_SURCHARGE_20", 2_000),
        moneyField("amount:interest", "LATE_INTEREST", 500),
        moneyField("amount:costs", "COSTS", 300),
        moneyField("amount:payment", "PAYMENT_ON_ACCOUNT", 200),
        moneyField("amount:total", "TOTAL_CLAIMED", 12_600),
      ]),
      source,
    );

    expect(document.amountReconciliation?.equations[0]).toMatchObject({
      status: "MATCHED",
      leftCents: 12_600,
      rightCents: 12_600,
      operands: expect.arrayContaining([
        expect.objectContaining({ role: "INTEREST", amountCents: 500 }),
        expect.objectContaining({ role: "COSTS", amountCents: 300 }),
        expect.objectContaining({
          role: "PAYMENT",
          sign: -1,
          amountCents: 200,
        }),
      ]),
    });
    expect(document.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE",
    });
    expect(document.mathematicalIntegrity?.checks).not.toContainEqual(
      expect.objectContaining({
        expectedCents: 12_000,
        observedCents: 12_600,
      }),
    );
  });

  it("validates the three alternative enforcement scenarios without requiring unprinted future costs", () => {
    const source = input("document:enforcement-alternatives-exact");
    const document = validate(
      review("collection.enforcement_order", [
        moneyField(
          "real-corpus-v7:OUTSTANDING_PRINCIPAL:1",
          "OUTSTANDING_PRINCIPAL",
          11_712,
        ),
        moneyField(
          "real-corpus-v7:ORDINARY_SURCHARGE_20:2",
          "EXECUTIVE_SURCHARGE_20",
          2_342,
        ),
        formulaMoneyField("ORDINARY_TOTAL", 14_054, 3),
        formulaMoneyField("REDUCED_10_TOTAL", 12_883, 4),
        moneyField(
          "real-corpus-v7:CONDITIONAL_EXECUTIVE_5_SURCHARGE:5",
          "EXECUTIVE_SURCHARGE_5",
          586,
        ),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE",
    });
    expect(document.mathematicalIntegrity?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: expect.stringContaining("contract-percentage:1"),
          status: "VALIDATED_EXACT",
          expectedCents: 2_342,
          observedCents: 2_342,
        }),
        expect.objectContaining({
          ruleId: expect.stringContaining("contract-base-plus-percentage:3"),
          status: "VALIDATED_EXACT",
          expectedCents: 12_883,
          observedCents: 12_883,
        }),
        expect.objectContaining({
          ruleId: expect.stringContaining("contract-percentage:4"),
          status: "VALIDATED_EXACT",
          expectedCents: 586,
          observedCents: 586,
        }),
      ]),
    );
    expect(
      document.mathematicalIntegrity?.checks.some(
        (check) => check.status === "VALIDATED_PARTIAL_COMPONENTS",
      ),
    ).toBe(false);
  });

  it("blocks only an impossible printed sum and leaves every figure unchanged", () => {
    const source = input("document:enforcement-mismatch");
    const fields = [
      moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 10_000),
      moneyField("amount:surcharge", "EXECUTIVE_SURCHARGE_20", 0),
      moneyField("amount:interest", "LATE_INTEREST", 0),
      moneyField("amount:costs", "COSTS", 0),
      moneyField("amount:payment", "PAYMENT_ON_ACCOUNT", 0),
      moneyField("amount:total", "TOTAL_CLAIMED", 12_345),
    ];
    const document = validate(
      review("collection.enforcement_order", fields),
      source,
    );

    expect(document.fields.map((field) => field.amountCents)).toEqual(
      fields.map((field) => field.amountCents),
    );
    expect(document.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["IMPOSSIBLE_BASIC_PRINTED_SUM"],
      persistenceDecision: "BLOCK_INCONSISTENT_PRINTED_CORE",
    });
  });

  it("rejects a printed 20 percent surcharge that is actually 25 percent even when the total adds up", () => {
    const source = input("document:enforcement-wrong-percentage");
    const document = validate(
      review("collection.enforcement_order", [
        moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 10_000),
        moneyField("amount:surcharge", "EXECUTIVE_SURCHARGE_20", 2_500),
        moneyField("amount:interest", "LATE_INTEREST", 0),
        moneyField("amount:costs", "COSTS", 0),
        moneyField("amount:payment", "PAYMENT_ON_ACCOUNT", 0),
        moneyField("amount:total", "TOTAL_CLAIMED", 12_500),
      ]),
      source,
    );

    expect(document.amountReconciliation?.equations[0]).toMatchObject({
      leftCents: 12_500,
      rightCents: 12_500,
    });
    expect(document.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["IMPOSSIBLE_BASIC_PRINTED_SUM"],
      persistenceDecision: "BLOCK_INCONSISTENT_PRINTED_CORE",
    });
    expect(document.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        ruleId: expect.stringContaining("contract-percentage"),
        status: "INCONSISTENT_PRINTED_VALUES",
        expectedCents: 2_000,
        observedCents: 2_500,
      }),
    );
  });

  it("keeps missing secondary monetary components under review instead of treating them as zero", () => {
    const source = input("document:enforcement-incomplete-components");
    const document = validate(
      review("collection.enforcement_order", [
        moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 10_000),
        moneyField("amount:total", "TOTAL_CLAIMED", 12_345),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_PARTIAL_COMPONENTS",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
  });

  it("never reintroduces a DNI-shaped value discarded by the existing OCR reconciliation", () => {
    const source = input(
      "document:identifier-shaped-amount",
      [
        "NIF del obligado: 46.402.457",
        "Principal pendiente: 149,55 EUR",
        "Recargo ordinario: 29,91 EUR",
        "Total: 179,46 EUR",
      ].join("\n"),
    );
    const document = validate(
      review("collection.enforcement_order", [
        moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 14_955),
        moneyField("amount:surcharge", "EXECUTIVE_SURCHARGE_20", 2_991),
        moneyField("amount:total", "TOTAL_CLAIMED", 17_946),
        moneyField("amount:false-dni", "TOTAL_CLAIMED", 4_640_245_700),
      ]),
      source,
    );

    expect(document.fields.map((field) => field.amountCents)).toEqual([
      14_955, 2_991, 17_946,
    ]);
    expect(
      document.mathematicalIntegrity?.normalizedEvidence.map(
        (evidence) => evidence.amountCents,
      ),
    ).not.toContain(4_640_245_700);
  });

  it("validates both <= and >= date rules and uses a temporal hard-failure code", () => {
    const notificationSource = input("document:notification-dates");
    const notification = validate(
      review("notification.delivery_attempt", [
        dateField("date:available", "AVAILABILITY_DATE", "2026-07-01"),
        dateField("date:access", "ACCESS_DATE", "2026-07-02"),
      ]),
      notificationSource,
    );
    expect(notification.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
    });

    const registrySource = input("document:registry-dates");
    const registry = validate(
      review("registry.tax_registration_resolution", [
        dateField("real-corpus-v7:REQUEST_DATE:1", "ACTION_DATE", "2026-07-10"),
        dateField(
          "real-corpus-v7:EFFECTIVE_DATE:1",
          "ACTION_DATE",
          "2026-07-01",
        ),
      ]),
      registrySource,
    );
    expect(registry.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
      persistenceDecision: "BLOCK_INCONSISTENT_PRINTED_CORE",
    });
  });

  it("executes the V11 technical count equation and keeps incomplete counts under review", () => {
    const exactSource = input("document:technical-counts-exact");
    const exact = validate(
      review("verifactu.technical_response", [
        countField("SUBMITTED_COUNT", 10),
        countField("ACCEPTED_COUNT", 8),
        countField("REJECTED_COUNT", 2),
      ]),
      exactSource,
    );
    expect(exact.mathematicalIntegrity).toMatchObject({
      archetypeId: "TECHNICAL_COUNTS",
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
    });
    expect(exact.mathematicalIntegrity?.checks[0]).toMatchObject({
      checkKind: "STRUCTURAL",
      status: "VALIDATED_EXACT",
      calculation: { kind: "COUNT_EQUALITY" },
    });

    const mismatchSource = input("document:technical-counts-mismatch");
    const mismatch = validate(
      review("verifactu.technical_response", [
        countField("SUBMITTED_COUNT", 10),
        countField("ACCEPTED_COUNT", 7),
        countField("REJECTED_COUNT", 2),
      ]),
      mismatchSource,
    );
    expect(mismatch.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
      persistenceDecision: "BLOCK_INCONSISTENT_PRINTED_CORE",
    });

    const incompleteSource = input("document:technical-counts-incomplete");
    const incomplete = validate(
      review("verifactu.technical_response", [
        countField("SUBMITTED_COUNT", 10),
        countField("ACCEPTED_COUNT", 8),
      ]),
      incompleteSource,
    );
    expect(incomplete.mathematicalIntegrity).toMatchObject({
      status: "REVIEW_REQUIRED",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
  });

  it("keeps distinct printed dates for one milestone under review instead of choosing one arbitrarily", () => {
    const source = input("document:notification-ambiguous-dates");
    const document = validate(
      review("notification.delivery_attempt", [
        dateField("date:available:first", "AVAILABILITY_DATE", "2026-07-01"),
        dateField("date:available:second", "AVAILABILITY_DATE", "2026-07-03"),
        dateField("date:access", "ACCESS_DATE", "2026-07-02"),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "REVIEW_REQUIRED",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
    expect(document.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        checkKind: "TEMPORAL",
        status: "REVIEW_REQUIRED",
        safeMessage:
          "Hay varias fechas impresas para el mismo hito; revisa cuál corresponde al acto principal.",
      }),
    );
  });

  it("compiles signed review equations from V11 and distinguishes exact, mismatch and incomplete data", () => {
    const exactSource = input("document:review-resolution-exact");
    const exact = validate(
      review("review.resolution", [
        formulaMoneyField("ORIGINAL_AMOUNT", 10_000),
        formulaMoneyField("CANCELLED_AMOUNT", 3_000),
        formulaMoneyField("ADDED_AMOUNT", 500),
        formulaMoneyField("NEW_AMOUNT", 7_500),
      ]),
      exactSource,
    );
    expect(exact.mathematicalIntegrity).toMatchObject({
      archetypeId: "REVIEW_RESOLUTION",
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
    });

    const mismatchSource = input("document:review-resolution-mismatch");
    const mismatch = validate(
      review("review.resolution", [
        formulaMoneyField("ORIGINAL_AMOUNT", 10_000),
        formulaMoneyField("CANCELLED_AMOUNT", 3_000),
        formulaMoneyField("ADDED_AMOUNT", 500),
        formulaMoneyField("NEW_AMOUNT", 7_600),
      ]),
      mismatchSource,
    );
    expect(mismatch.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["IMPOSSIBLE_BASIC_PRINTED_SUM"],
      persistenceDecision: "BLOCK_INCONSISTENT_PRINTED_CORE",
    });

    const incompleteSource = input("document:review-resolution-incomplete");
    const incomplete = validate(
      review("review.resolution", [
        formulaMoneyField("ORIGINAL_AMOUNT", 10_000),
        formulaMoneyField("CANCELLED_AMOUNT", 3_000),
        formulaMoneyField("NEW_AMOUNT", 7_000),
      ]),
      incompleteSource,
    );
    expect(incomplete.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_PARTIAL_COMPONENTS",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
  });

  it("validates refund deductions and payment reversal limits without creating a relation", () => {
    const refundSource = input("document:refund-payment");
    const refund = validate(
      review("refund.payment_communication", [
        formulaMoneyField("ORDERED_AMOUNT", 20_000),
        formulaMoneyField("DEDUCTIONS_TOTAL", 3_500),
        formulaMoneyField("NET_REFUND", 16_500),
        referenceField(),
      ]),
      refundSource,
    );
    expect(refund.mathematicalIntegrity).toMatchObject({
      archetypeId: "REFUND_PAYMENT",
      status: "VALIDATED_EXACT",
      relationSupport: {
        existingRelationsOnly: true,
        requiresStrongIdentifier: true,
        permitsAmountOnlyRelations: false,
      },
    });

    const reversalSource = input("document:payment-reversal");
    const reversal = validate(
      review("payment.failed_or_reversed", [
        formulaMoneyField("REVERSED_AMOUNT", 10_001),
        formulaMoneyField("ORIGINAL_PAID_AMOUNT", 10_000),
      ]),
      reversalSource,
    );
    expect(reversal.mathematicalIntegrity).toMatchObject({
      archetypeId: "PAYMENT_REVERSAL",
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
    });
  });

  it("checks seizure money-flow limits without treating amounts as relation identifiers", () => {
    const exactSource = input("document:seizure-flow-exact");
    const exact = validate(
      review("seizure.bank_account", [
        formulaMoneyField("REMITTED_AMOUNT", 4_000),
        formulaMoneyField("RETAINED_AMOUNT", 5_000),
        formulaMoneyField("SEIZED_AMOUNT", 8_000),
        formulaMoneyField("SEIZE_LIMIT", 8_000),
        formulaMoneyField("SEIZURE_DEBT_AMOUNT_1", 8_000),
        formulaMoneyField("DEBT_SUBTOTAL", 8_000),
        formulaMoneyField("PRINTED_INTEREST", 0),
        formulaMoneyField("PRINTED_COSTS", 0),
      ]),
      exactSource,
    );
    expect(exact.mathematicalIntegrity).toMatchObject({
      archetypeId: "SEIZURE_FLOW",
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
      relationSupport: { permitsAmountOnlyRelations: false },
    });

    const completeMismatchSource = input(
      "document:seizure-flow-complete-mismatch",
    );
    const completeMismatch = validate(
      review("seizure.bank_account", [
        formulaMoneyField("REMITTED_AMOUNT", 6_000),
        formulaMoneyField("RETAINED_AMOUNT", 5_000),
        formulaMoneyField("SEIZED_AMOUNT", 8_000),
        formulaMoneyField("SEIZE_LIMIT", 8_000),
        formulaMoneyField("SEIZURE_DEBT_AMOUNT_1", 8_000),
        formulaMoneyField("DEBT_SUBTOTAL", 8_000),
        formulaMoneyField("PRINTED_INTEREST", 0),
        formulaMoneyField("PRINTED_COSTS", 0),
      ]),
      completeMismatchSource,
    );
    expect(completeMismatch.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
    });

    const mismatchSource = input("document:seizure-flow-mismatch");
    const mismatch = validate(
      review("seizure.bank_account", [
        formulaMoneyField("REMITTED_AMOUNT", 6_000),
        formulaMoneyField("RETAINED_AMOUNT", 5_000),
        formulaMoneyField("SEIZED_AMOUNT", 8_000),
      ]),
      mismatchSource,
    );
    expect(mismatch.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
    });
  });

  it("evaluates a monetary comparison after a non-monetary clause in the same V11 formula", () => {
    const exactSource = input("document:seizure-release-exact");
    const exact = validate(
      review("seizure.release", [
        formulaMoneyField("RELEASED_AMOUNT", 5_000),
        formulaMoneyField("SEIZED_AMOUNT", 8_000),
      ]),
      exactSource,
    );
    expect(exact.mathematicalIntegrity).toMatchObject({
      archetypeId: "SEIZURE_RELEASE",
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
    });
    expect(
      exact.mathematicalIntegrity?.checks.some(
        (check) =>
          check.calculation.kind === "AMOUNT_ORDER" &&
          check.status === "VALIDATED_EXACT",
      ),
    ).toBe(true);

    const mismatchSource = input("document:seizure-release-mismatch");
    const mismatch = validate(
      review("seizure.release", [
        formulaMoneyField("RELEASED_AMOUNT", 9_000),
        formulaMoneyField("SEIZED_AMOUNT", 8_000),
      ]),
      mismatchSource,
    );
    expect(mismatch.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
    });
  });

  it("keeps payment forms and receipts distinct and never treats either as confirmed payment", () => {
    const formSource = input("document:payment-form");
    const form = validate(
      review("payment.payment_form", [
        formulaMoneyField("PAYMENT_OPTION_AMOUNT", 12_000),
      ]),
      formSource,
    );
    const receiptSource = input("document:payment-receipt");
    const receipt = validate(
      review("payment.receipt", [formulaMoneyField("PAID_AMOUNT", 12_000)]),
      receiptSource,
    );

    expect(form.familyId).not.toBe(receipt.familyId);
    expect(form.mathematicalIntegrity?.status).toBe("REVIEW_REQUIRED");
    expect(receipt.mathematicalIntegrity?.status).toBe("REVIEW_REQUIRED");
    expect(
      [form, receipt].flatMap(
        (document) =>
          document.mathematicalIntegrity?.checks.map(
            (check) => check.safeMessage,
          ) ?? [],
      ),
    ).not.toContain("Pago confirmado");
  });

  it("does not hard-block a sanction when the extractor cannot prove all reductions were aggregated", () => {
    const source = input("document:sanction-reductions-incomplete");
    const document = validate(
      review("sanction.initiation_and_hearing", [
        formulaMoneyField("INITIAL_FINE_PROPOSAL", 10_000),
        formulaMoneyField("PROPOSED_REDUCTION", 3_000),
        formulaMoneyField("PROPOSED_REDUCED_FINE", 6_000),
      ]),
      source,
    );

    expect(document.amountReconciliation?.equations[0]?.status).toBe(
      "MISMATCH_REVIEW_REQUIRED",
    );
    expect(document.mathematicalIntegrity).toMatchObject({
      archetypeId: "SANCTION_CALCULATION",
      status: "REVIEW_REQUIRED",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
    expect(document.fields.map((field) => field.amountCents)).toEqual([
      10_000, 3_000, 6_000,
    ]);
  });

  it("validates total and partial offset rows independently without adding cited amounts", () => {
    const exactSource = input("document:offset-row-ledger-exact");
    const exact = validate(
      review("collection.offset_ex_officio", [
        formulaMoneyField("OFFSET_BEFORE_1", 10_000, 1),
        formulaMoneyField("OFFSET_APPLIED_1", 10_000, 2),
        formulaMoneyField("OFFSET_REMAINING_1", 0, 3),
        formulaMoneyField("OFFSET_BEFORE_2", 8_000, 4),
        formulaMoneyField("OFFSET_APPLIED_2", 3_000, 5),
        formulaMoneyField("OFFSET_REMAINING_2", 5_000, 6),
        formulaMoneyField("OFFSET_CREDIT_APPLIED", 13_000, 7),
      ]),
      exactSource,
    );

    expect(exact.mathematicalIntegrity).toMatchObject({
      archetypeId: "OFFSET_LEDGER",
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
    });
    expect(
      exact.mathematicalIntegrity?.checks.filter((check) =>
        /:offset-row:|:offset-applied-total$/u.test(check.ruleId),
      ),
    ).toHaveLength(3);

    const partialSource = input("document:offset-row-ledger-partial");
    const partial = validate(
      review("collection.offset_requested", [
        formulaMoneyField("OFFSET_BEFORE_1", 10_000, 1),
        formulaMoneyField("OFFSET_APPLIED_1", 4_000, 2),
      ]),
      partialSource,
    );
    expect(partial.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_PARTIAL_COMPONENTS",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
  });

  it("validates seizure debt rows and its printed limit without inventing a transfer", () => {
    const source = input("document:seizure-ledger-without-transfer");
    const document = validate(
      review("seizure.bank_account", [
        formulaMoneyField("SEIZURE_DEBT_AMOUNT_1", 10_000, 1),
        formulaMoneyField("SEIZURE_DEBT_AMOUNT_2", 5_000, 2),
        formulaMoneyField("DEBT_SUBTOTAL", 15_000, 3),
        formulaMoneyField("PRINTED_INTEREST", 500, 4),
        formulaMoneyField("PRINTED_COSTS", 250, 5),
        formulaMoneyField("SEIZE_LIMIT", 15_750, 6),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity).toMatchObject({
      archetypeId: "SEIZURE_FLOW",
      status: "VALIDATED_EXACT",
    });
    expect(document.mathematicalIntegrity?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: expect.stringContaining(":debt-subtotal"),
          status: "VALIDATED_EXACT",
        }),
        expect.objectContaining({
          ruleId: expect.stringContaining(":seizure-limit"),
          expectedCents: 15_750,
          observedCents: 15_750,
        }),
      ]),
    );
    expect(
      document.mathematicalIntegrity?.normalizedEvidence.some((item) =>
        /REMITTED|TRANSFERRED/u.test(item.canonicalType),
      ),
    ).toBe(false);
  });

  it("keeps a seizure limit partial when one printed component is absent", () => {
    const source = input("document:seizure-ledger-incomplete-limit");
    const document = validate(
      review("seizure.bank_account", [
        formulaMoneyField("SEIZURE_DEBT_AMOUNT_1", 10_000, 1),
        formulaMoneyField("DEBT_SUBTOTAL", 10_000, 2),
        formulaMoneyField("PRINTED_INTEREST", 500, 3),
        formulaMoneyField("SEIZE_LIMIT", 10_500, 4),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_PARTIAL_COMPONENTS",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
    expect(document.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        ruleId: expect.stringContaining(":seizure-limit"),
        status: "VALIDATED_PARTIAL_COMPONENTS",
      }),
    );
  });

  it("keeps a seizure partial when the printed limit itself is absent", () => {
    const source = input("document:seizure-ledger-without-limit");
    const document = validate(
      review("seizure.bank_account", [
        formulaMoneyField("SEIZURE_DEBT_AMOUNT_1", 10_000, 1),
        formulaMoneyField("SEIZURE_DEBT_AMOUNT_2", 5_000, 2),
        formulaMoneyField("DEBT_SUBTOTAL", 15_000, 3),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_PARTIAL_COMPONENTS",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
    expect(document.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        ruleId: expect.stringContaining(":seizure-limit"),
        status: "VALIDATED_PARTIAL_COMPONENTS",
      }),
    );
  });

  it("validates refund deductions and multi-tranche interest totals", () => {
    const refundSource = input("document:refund-ledger-exact");
    const refund = validate(
      review("refund.payment_communication", [
        formulaMoneyField("REFUND_ORDERED", 125_130, 1),
        formulaMoneyField("DEDUCTION_TOTAL", 111_653, 2),
        formulaMoneyField("NET_REFUND_PAYMENT", 13_477, 3),
      ]),
      refundSource,
    );
    expect(refund.mathematicalIntegrity).toMatchObject({
      archetypeId: "REFUND_PAYMENT",
      status: "VALIDATED_EXACT",
    });

    const refundRowsSource = input("document:refund-deduction-rows");
    const refundRows = validate(
      review("refund.payment_communication", [
        formulaMoneyField("REFUND_ORDERED", 125_130, 1),
        formulaMoneyField("EXTERNAL_DEDUCTION_1", 100_000, 2),
        formulaMoneyField("EXTERNAL_DEDUCTION_2", 11_653, 3),
        formulaMoneyField("DEDUCTION_TOTAL", 111_653, 4),
        formulaMoneyField("NET_REFUND_PAYMENT", 13_477, 5),
      ]),
      refundRowsSource,
    );
    expect(refundRows.mathematicalIntegrity?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: expect.stringContaining(":deductions-total"),
          status: "VALIDATED_EXACT",
        }),
      ]),
    );

    const mismatchedRowsSource = input(
      "document:refund-deduction-rows-mismatch",
    );
    const mismatchedRows = validate(
      review("refund.payment_communication", [
        formulaMoneyField("REFUND_ORDERED", 125_130, 1),
        formulaMoneyField("EXTERNAL_DEDUCTION_1", 100_000, 2),
        formulaMoneyField("EXTERNAL_DEDUCTION_2", 11_652, 3),
        formulaMoneyField("DEDUCTION_TOTAL", 111_653, 4),
        formulaMoneyField("NET_REFUND_PAYMENT", 13_477, 5),
      ]),
      mismatchedRowsSource,
    );
    expect(mismatchedRows.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["IMPOSSIBLE_BASIC_PRINTED_SUM"],
    });

    const incompleteRefundSource = input(
      "document:refund-deduction-rows-without-net",
    );
    const incompleteRefund = validate(
      review("refund.payment_communication", [
        formulaMoneyField("EXTERNAL_DEDUCTION_1", 100_000, 1),
        formulaMoneyField("EXTERNAL_DEDUCTION_2", 11_653, 2),
        formulaMoneyField("DEDUCTION_TOTAL", 111_653, 3),
      ]),
      incompleteRefundSource,
    );
    expect(incompleteRefund.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_PARTIAL_COMPONENTS",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });

    const interestSource = input("document:interest-tranches-exact");
    const interest = validate(
      review("collection.interest_assessment", [
        formulaMoneyField("INTEREST_TRANCHE_AMOUNT_1", 150, 1),
        formulaMoneyField("INTEREST_TRANCHE_AMOUNT_2", 275, 2),
        formulaMoneyField("ASSESSED_INTEREST", 425, 3),
      ]),
      interestSource,
    );
    expect(interest.mathematicalIntegrity).toMatchObject({
      archetypeId: "INTEREST_SCHEDULE",
      status: "VALIDATED_PARTIAL_COMPONENTS",
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
    expect(interest.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        ruleId: expect.stringContaining(":tranche-total"),
        expectedCents: 425,
        observedCents: 425,
      }),
    );
    expect(interest.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        ruleId: expect.stringContaining(":tranche-formula-inputs"),
        status: "VALIDATED_PARTIAL_COMPONENTS",
      }),
    );

    const roundedTotalSource = input("document:interest-tranches-one-cent-off");
    const roundedTotal = validate(
      review("collection.interest_assessment", [
        formulaMoneyField("INTEREST_TRANCHE_AMOUNT_1", 150, 1),
        formulaMoneyField("INTEREST_TRANCHE_AMOUNT_2", 275, 2),
        formulaMoneyField("ASSESSED_INTEREST", 426, 3),
      ]),
      roundedTotalSource,
    );
    expect(roundedTotal.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["IMPOSSIBLE_BASIC_PRINTED_SUM"],
    });
  });

  it("sums all printed sanction reductions instead of validating only one", () => {
    const source = input("document:sanction-all-reductions");
    const document = validate(
      review("sanction.initiation_and_hearing", [
        formulaMoneyField("SANCTION_INITIAL", 10_000, 1),
        formulaMoneyField("SANCTION_REDUCTION_1", 2_000, 2),
        formulaMoneyField("SANCTION_REDUCTION_2", 1_000, 3),
        formulaMoneyField("SANCTION_REDUCED", 7_000, 4),
      ]),
      source,
    );

    expect(document.mathematicalIntegrity).toMatchObject({
      archetypeId: "SANCTION_CALCULATION",
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
    });
    expect(document.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        ruleId: expect.stringContaining(":all-reductions"),
        expectedCents: 7_000,
        observedCents: 7_000,
      }),
    );
  });

  it("validates signed rectification differences and flags a negative complementary result", () => {
    const rectificationSource = input(
      "document:rectification-signed-difference",
    );
    const rectification = validate(
      review("filing.rectifying_self_assessment_receipt", [
        signedP0MoneyField("PREVIOUS_RESULT", 10_000, 1),
        signedP0MoneyField("RECTIFIED_RESULT", 8_000, 2),
        signedP0MoneyField("DIFFERENCE", -2_000, 3),
      ]),
      rectificationSource,
    );
    expect(rectification.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
    });
    expect(
      rectification.mathematicalIntegrity?.normalizedEvidence.map((item) =>
        item.canonicalType,
      ),
    ).toEqual(
      expect.arrayContaining([
        "PREVIOUS_RESULT",
        "RECTIFIED_RESULT",
        "DIFFERENCE",
      ]),
    );

    const complementarySource = input("document:complementary-negative");
    const complementary = validate(
      review("filing.complementary_self_assessment_receipt", [
        formulaMoneyField("PREVIOUS_RESULT", 10_000, 1),
        formulaMoneyField("COMPLEMENTARY_RESULT", 8_000, 2),
        signedFormulaMoneyField("ADDITIONAL_AMOUNT", -2_000, 3),
      ]),
      complementarySource,
    );
    expect(complementary.mathematicalIntegrity).toMatchObject({
      status: "SEMANTIC_LABEL_INCONSISTENT",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
  });

  it("preserves signed P0 producer roles through validation and the audit projection", () => {
    const source = input(
      "document:p0-rectification-producer",
      [
        "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
        "Justificante de autoliquidación rectificativa",
        "AUTOLIQUIDACIÓN RECTIFICATIVA",
        "Número de justificante: REF-FILING-SYN-002",
        "Número de justificante anterior: REF-FILING-SYN-001",
        "NÚMERO DE JUSTIFICANTE ANTERIOR",
        "Modelo 303: 303",
        "Ejercicio: 2026",
        "Período: 2T",
        "Fecha y hora de presentación: 17/07/2026",
        "Autoliquidación rectificativa: Sí",
        "Resultado de la anterior: 100,00 €",
        "Resultado de la autoliquidación: 80,00 €",
        "Diferencia: -20,00 €",
      ].join("\n"),
    );
    const extracted = extractAeatP0DeepDocumentV10(source);
    expect(extracted).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "filing.rectifying_self_assessment_receipt",
    });
    const document = validateFiscalNotificationMathematicalIntegrityV11(
      reconcileFiscalNotificationReviewAmountsV1(
        projectAeatP0DeepReviewV10(extracted),
        source,
      ),
      source,
      segment(source.documentId),
    ).documents[0]!;

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
    });
    expect(document.mathematicalIntegrity?.normalizedEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalType: "PREVIOUS_RESULT",
          amountCents: 10_000,
        }),
        expect.objectContaining({
          canonicalType: "RECTIFIED_RESULT",
          amountCents: 8_000,
        }),
        expect.objectContaining({
          canonicalType: "DIFFERENCE",
          amountCents: -2_000,
          sign: "NEGATIVE",
        }),
      ]),
    );
  });

  it("keeps the current interest producer in review when no tranche rows were extracted", async () => {
    const source = input(
      "document:interest-producer-without-tranches",
      [
        "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
        "LIQUIDACIÓN INDEPENDIENTE DE INTERESES",
        "Fecha del documento: 01-09-2026",
        "Clave de la liquidación de intereses: SYN-INTEREST-LIQ-01",
        "Referencia de la solicitud: SYN-REQUEST-01",
        "Clave de la deuda principal: SYN-DEBT-01",
        "Principal de la deuda de origen: 500,00 €",
        "Intereses liquidados: 5,50 €",
        "Inicio del cálculo de intereses: 01-01-2026",
        "Fin del cálculo de intereses: 10-04-2026",
      ].join("\n"),
    );
    const extracted = await extractAeatRealCorpusDocumentV6(source);
    expect(extracted).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.interest_assessment",
    });
    const document = validateFiscalNotificationMathematicalIntegrityV11(
      reconcileFiscalNotificationReviewAmountsV1(
        projectRealCorpusReviewV6(extracted),
        source,
      ),
      source,
      segment(source.documentId),
    ).documents[0]!;

    expect(document.mathematicalIntegrity?.status).not.toBe("VALIDATED_EXACT");
    expect(document.mathematicalIntegrity).toMatchObject({
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
  });

  it("does not combine a payment document amount with the main administrative act", () => {
    const source = input(
      "document:enforcement-main-and-payment-form",
      "Documento AEAT sintético sin identidad personal.",
      2,
    );
    const reviewValue = review("collection.enforcement_order", [
      fieldOnPage(
        moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 10_000),
        1,
      ),
      fieldOnPage(
        moneyField("amount:surcharge", "EXECUTIVE_SURCHARGE_20", 2_000),
        1,
      ),
      fieldOnPage(moneyField("amount:total", "TOTAL_CLAIMED", 12_000), 2),
    ]);
    const segments = Object.freeze([
      Object.freeze({
        ...segment(source.documentId)[0]!,
        pageFrom: 1,
        pageTo: 1,
      }),
      Object.freeze({
        ...segment(source.documentId)[0]!,
        segmentId: `segment:${source.documentId}:payment`,
        segmentType: "PAYMENT_DOCUMENT" as const,
        pageFrom: 2,
        pageTo: 2,
        canGenerateAdministrativeFacts: false,
      }),
    ]);
    const document = validateFiscalNotificationMathematicalIntegrityV11(
      reconcileFiscalNotificationReviewAmountsV1(reviewValue, source),
      source,
      segments,
    ).documents[0]!;

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
    });
    expect(document.mathematicalIntegrity?.checks).toContainEqual(
      expect.objectContaining({
        checkKind: "STRUCTURAL",
        status: "INCONSISTENT_PRINTED_VALUES",
        safeMessage:
          "Los importes usados en la comprobación pertenecen a partes incompatibles del documento.",
      }),
    );
  });

  it("does not combine a refund resolution with a payment-document net amount", () => {
    const source = input(
      "document:refund-resolution-and-payment-document",
      "Documento AEAT sintético sin identidad personal.",
      2,
    );
    const reviewValue = review("refund.withholding_or_offset", [
      fieldOnPage(formulaMoneyField("REFUND_ORDERED", 20_000, 1), 1),
      fieldOnPage(formulaMoneyField("DEDUCTION_TOTAL", 3_500, 2), 1),
      fieldOnPage(formulaMoneyField("NET_REFUND_PAYMENT", 16_500, 3), 2),
    ]);
    const segments = Object.freeze([
      Object.freeze({
        ...segment(source.documentId)[0]!,
        pageFrom: 1,
        pageTo: 1,
      }),
      Object.freeze({
        ...segment(source.documentId)[0]!,
        segmentId: `segment:${source.documentId}:payment`,
        segmentType: "PAYMENT_DOCUMENT" as const,
        pageFrom: 2,
        pageTo: 2,
        canGenerateAdministrativeFacts: false,
      }),
    ]);
    const document = validateFiscalNotificationMathematicalIntegrityV11(
      reconcileFiscalNotificationReviewAmountsV1(reviewValue, source),
      source,
      segments,
    ).documents[0]!;

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
      persistenceDecision: "BLOCK_INCONSISTENT_PRINTED_CORE",
    });
  });

  it("does not let an undeclared generic annex replace the main act total", () => {
    const source = input(
      "document:enforcement-main-and-annex",
      "Documento AEAT sintético sin identidad personal.",
      2,
    );
    const reviewValue = review("collection.enforcement_order", [
      fieldOnPage(
        moneyField("amount:principal", "OUTSTANDING_PRINCIPAL", 10_000),
        1,
      ),
      fieldOnPage(
        moneyField("amount:surcharge", "EXECUTIVE_SURCHARGE_20", 2_000),
        1,
      ),
      fieldOnPage(moneyField("amount:total", "TOTAL_CLAIMED", 12_000), 2),
    ]);
    const segments = Object.freeze([
      Object.freeze({
        ...segment(source.documentId)[0]!,
        pageFrom: 1,
        pageTo: 1,
      }),
      Object.freeze({
        ...segment(source.documentId)[0]!,
        segmentId: `segment:${source.documentId}:annex`,
        segmentType: "ANNEX" as const,
        pageFrom: 2,
        pageTo: 2,
      }),
    ]);
    const document = validateFiscalNotificationMathematicalIntegrityV11(
      reconcileFiscalNotificationReviewAmountsV1(reviewValue, source),
      source,
      segments,
    ).documents[0]!;

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "INCONSISTENT_PRINTED_VALUES",
      hardFailureCodes: ["INCOMPATIBLE_REFERENCE_OR_PART"],
      persistenceDecision: "BLOCK_INCONSISTENT_PRINTED_CORE",
    });
  });

  it("allows annex arithmetic only when the V11 family structure declares annexes", () => {
    const source = input(
      "document:deferral-main-and-annex",
      "Documento AEAT sintético sin identidad personal.",
      2,
    );
    const reviewValue = review("seizure.bank_account", [
      fieldOnPage(formulaMoneyField("SEIZURE_DEBT_AMOUNT_1", 10_000, 1), 2),
      fieldOnPage(formulaMoneyField("SEIZURE_DEBT_AMOUNT_2", 5_000, 2), 2),
      fieldOnPage(formulaMoneyField("DEBT_SUBTOTAL", 15_000, 3), 2),
      fieldOnPage(formulaMoneyField("PRINTED_INTEREST", 500, 4), 2),
      fieldOnPage(formulaMoneyField("PRINTED_COSTS", 250, 5), 2),
      fieldOnPage(formulaMoneyField("SEIZE_LIMIT", 15_750, 6), 2),
    ]);
    const segments = Object.freeze([
      Object.freeze({
        ...segment(source.documentId)[0]!,
        pageFrom: 1,
        pageTo: 1,
      }),
      Object.freeze({
        ...segment(source.documentId)[0]!,
        segmentId: `segment:${source.documentId}:annex`,
        segmentType: "ANNEX" as const,
        pageFrom: 2,
        pageTo: 2,
      }),
    ]);
    const document = validateFiscalNotificationMathematicalIntegrityV11(
      reconcileFiscalNotificationReviewAmountsV1(reviewValue, source),
      source,
      segments,
    ).documents[0]!;

    expect(document.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE",
    });
  });

  it("executes the catalog-assigned archetype for all 122 family profiles", () => {
    const results = AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.map(
      (family) => {
        const source = input(`document:${family.id}`);
        const document = validate(review(family.id, []), source);
        return {
          familyId: family.id,
          archetypeId: document.mathematicalIntegrity?.archetypeId,
          status: document.mathematicalIntegrity?.status,
        };
      },
    );

    expect(results).toHaveLength(122);
    for (const result of results) {
      const family = AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.find(
        (candidate) => candidate.id === result.familyId,
      )!;
      expect(result.archetypeId, result.familyId).toBe(family.archetypeId);
      expect(result.status, result.familyId).toBe(
        family.validationMode === "ARITHMETIC_AND_LOGICAL"
          ? "REVIEW_REQUIRED"
          : "NOT_APPLICABLE_NO_ARITHMETIC",
      );
    }
  });

  it("classifies every V11 formula and explicitly keeps non-executable contract prose review-only", () => {
    const formulaCoverage =
      AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.flatMap((family) =>
        family.formulae.map((formula) => ({
          familyId: family.id,
          formula,
          handling: classifyAeatMathematicalIntegrityFormulaHandlingV11(
            family,
            formula,
          ),
        })),
      );
    const declarativeReviewOnlyCoverage =
      AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.flatMap((family) => [
        ...family.logicalChecks.map((rule) => ({
          familyId: family.id,
          ruleKind: "LOGICAL" as const,
          rule,
        })),
        ...family.crossDocumentChecks.map((rule) => ({
          familyId: family.id,
          ruleKind: "CROSS_DOCUMENT" as const,
          rule,
        })),
        ...family.hardFailures.map((rule) => ({
          familyId: family.id,
          ruleKind: "HARD_FAILURE" as const,
          rule,
        })),
      ]);

    expect(formulaCoverage.length).toBeGreaterThan(100);
    const handlings = new Set(formulaCoverage.map((entry) => entry.handling));
    for (const handling of [
      "AUTOMATIC_LINEAR_ARITHMETIC",
      "AUTOMATIC_PERCENTAGE",
      "AUTOMATIC_AMOUNT_ORDER",
      "AUTOMATIC_TEMPORAL_ORDER",
      "AUTOMATIC_COUNT",
      "DECLARED_REVIEW_ONLY",
    ] as const) {
      expect(handlings).toContain(handling);
    }
    expect(declarativeReviewOnlyCoverage.length).toBeGreaterThan(300);
    expect(
      formulaCoverage.find((entry) => entry.familyId === "seizure.release")
        ?.handling,
    ).toBe("AUTOMATIC_AMOUNT_ORDER");
    expect(
      formulaCoverage.find(
        (entry) =>
          entry.familyId === "collection.enforcement_order" &&
          entry.formula.startsWith("ORDINARY_TOTAL ="),
      )?.handling,
    ).toBe("DECLARED_REVIEW_ONLY");
    expect(
      declarativeReviewOnlyCoverage.every(
        (entry) =>
          entry.familyId.length > 0 &&
          entry.rule.trim().length > 0 &&
          ["LOGICAL", "CROSS_DOCUMENT", "HARD_FAILURE"].includes(
            entry.ruleKind,
          ),
      ),
    ).toBe(true);
  });

  it("provides positive, negative and incomplete synthetic fixtures for every archetype", () => {
    const fixtures = AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.archetypes.flatMap(
      (archetype) => {
        const family = AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.find(
          (candidate) => candidate.archetypeId === archetype.id,
        )!;
        const positiveSource = input(`document:fixture:${family.id}:positive`);
        const positive = validate(
          review(family.id, [referenceField()]),
          positiveSource,
        );
        const negativeSource = input(
          `document:fixture:${family.id}:negative`,
          "NIF del obligado: 46.402.457",
        );
        let negative: ReturnType<typeof validate>;
        try {
          negative = validate(
            review(family.id, [
              moneyField(
                "amount:false-identifier",
                "TOTAL_CLAIMED",
                4_640_245_700,
              ),
              dateField("date:negative-fixture", "ISSUE_DATE", "2026-07-01"),
            ]),
            negativeSource,
          );
        } catch (error) {
          throw new Error(`NEGATIVE_FIXTURE_FAILED:${family.id}`, {
            cause: error,
          });
        }
        const incompleteSource = input(
          `document:fixture:${family.id}:incomplete`,
        );
        const incomplete = validate(
          review(family.id, [
            moneyField("amount:isolated", "TOTAL_CLAIMED", 12_345),
          ]),
          incompleteSource,
        );
        return [
          Object.freeze({ scenario: "POSITIVE" as const, document: positive }),
          Object.freeze({ scenario: "NEGATIVE" as const, document: negative }),
          Object.freeze({
            scenario: "INCOMPLETE" as const,
            document: incomplete,
          }),
        ];
      },
    );

    expect(fixtures).toHaveLength(47 * 3);
    for (const archetype of AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.archetypes) {
      expect(resolveAeatMathematicalIntegrityArchetypeV11(archetype.id)).toBe(
        archetype,
      );
      expect(
        fixtures
          .filter(
            (fixture) =>
              fixture.document.mathematicalIntegrity?.archetypeId ===
              archetype.id,
          )
          .map((fixture) => fixture.scenario),
        archetype.id,
      ).toEqual(["POSITIVE", "NEGATIVE", "INCOMPLETE"]);
    }
    for (const fixture of fixtures) {
      expect(fixture.document.mathematicalIntegrity?.hardFailureCodes).toEqual(
        [],
      );
      if (fixture.scenario === "NEGATIVE") {
        expect(fixture.document.fields).toHaveLength(1);
        expect(
          fixture.document.mathematicalIntegrity?.normalizedEvidence.map(
            (item) => item.amountCents,
          ),
        ).not.toContain(4_640_245_700);
      }
      if (fixture.scenario === "INCOMPLETE") {
        expect(fixture.document.mathematicalIntegrity?.status).not.toBe(
          "INCONSISTENT_PRINTED_VALUES",
        );
      }
    }
    expect(
      JSON.stringify(
        fixtures.map((fixture) => fixture.document.mathematicalIntegrity),
      ),
    ).not.toMatch(
      /\b(?:\d{8}[A-Z]|ES\d{22}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/iu,
    );
  });
});
