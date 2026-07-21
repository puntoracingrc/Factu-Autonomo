import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "./input-contract";
import type { DocumentSegmentV1 } from "./extractor-core/document-segment.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import { resolveAeatOfficialCatalogProfileV9 } from "./knowledge/official-catalog-expansion.v9";
import { resolveAeatP0DeepProfileV10 } from "./knowledge/p0-deep-contracts.v10";
import {
  AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11,
  resolveAeatMathematicalIntegrityArchetypeV11,
} from "./knowledge/mathematical-integrity-catalog.v11";
import { reconcileFiscalNotificationReviewAmountsV1 } from "./amount-reconciliation-engine.v1";
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
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId,
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, isBlank: false, text }),
    ]),
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
    Record<FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"], string>
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
    Record<FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"], string>
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
        pageTo: 1,
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

function validate(reviewValue: ReturnType<typeof review>, source: BoundedDocumentInput) {
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
      14_955,
      2_991,
      17_946,
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
        dateField(
          "real-corpus-v7:REQUEST_DATE:1",
          "ACTION_DATE",
          "2026-07-10",
        ),
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
      ]),
      exactSource,
    );
    expect(exact.mathematicalIntegrity).toMatchObject({
      archetypeId: "SEIZURE_FLOW",
      status: "VALIDATED_EXACT",
      hardFailureCodes: [],
      relationSupport: { permitsAmountOnlyRelations: false },
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
      review("payment.receipt", [
        formulaMoneyField("PAID_AMOUNT", 12_000),
      ]),
      receiptSource,
    );

    expect(form.familyId).not.toBe(receipt.familyId);
    expect(form.mathematicalIntegrity?.status).toBe("REVIEW_REQUIRED");
    expect(receipt.mathematicalIntegrity?.status).toBe("REVIEW_REQUIRED");
    expect(
      [form, receipt].flatMap((document) =>
        document.mathematicalIntegrity?.checks.map((check) => check.safeMessage) ?? [],
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
      10_000,
      3_000,
      6_000,
    ]);
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
      formulaCoverage.find(
        (entry) => entry.familyId === "seizure.release",
      )?.handling,
    ).toBe("AUTOMATIC_AMOUNT_ORDER");
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
        const positiveSource = input(
          `document:fixture:${family.id}:positive`,
        );
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
              moneyField("amount:false-identifier", "TOTAL_CLAIMED", 4_640_245_700),
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
          Object.freeze({ scenario: "INCOMPLETE" as const, document: incomplete }),
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
              fixture.document.mathematicalIntegrity?.archetypeId === archetype.id,
          )
          .map((fixture) => fixture.scenario),
        archetype.id,
      ).toEqual(["POSITIVE", "NEGATIVE", "INCOMPLETE"]);
    }
    for (const fixture of fixtures) {
      expect(fixture.document.mathematicalIntegrity?.hardFailureCodes).toEqual([]);
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
    expect(JSON.stringify(fixtures.map((fixture) => fixture.document.mathematicalIntegrity))).not.toMatch(
      /\b(?:\d{8}[A-Z]|ES\d{22}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/iu,
    );
  });
});
