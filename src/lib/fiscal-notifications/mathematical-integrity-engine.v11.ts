import { sha256Hex } from "../document-integrity/snapshot-hash";
import type { BoundedDocumentInput } from "./input-contract";
import type { DocumentSegmentV1 } from "./extractor-core/document-segment.v1";
import {
  AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
  resolveAeatMathematicalIntegrityFamilyV11,
  type AeatMathematicalIntegrityFamilyV11,
} from "./knowledge/mathematical-integrity-catalog.v11";
import {
  FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11,
  parseFiscalNotificationMathematicalIntegrityV11,
  type FiscalNotificationIntegrityNormalizedEvidenceV11,
  type FiscalNotificationIntegritySourcePartV11,
  type FiscalNotificationMathematicalIntegrityCheckV11,
  type FiscalNotificationMathematicalIntegrityStatusV11,
  type FiscalNotificationMathematicalIntegrityV11,
} from "./mathematical-integrity-contract.v11";
import type {
  FiscalNotificationAmountEquationStatusV1,
  FiscalNotificationAmountEquationV1,
} from "./amount-reconciliation-contract.v1";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewDocumentV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

const MAX_AUTOMATIC_PASSES = 2;
const ISO_DATE = /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;
const V7_FIELD_CODE = /^real-corpus-v7:([A-Z][A-Z0-9_]*):\d+$/u;
const P0_FIELD_CODE = /^p0-v10:([A-Z][A-Z0-9_]*):\d+$/u;
interface EvidenceProjectionV11 {
  readonly evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[];
  readonly evidenceByFieldId: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >;
  readonly equationEvidenceById: ReadonlyMap<
    number,
    Readonly<{
      readonly terms: readonly Readonly<{
        readonly evidence: FiscalNotificationIntegrityNormalizedEvidenceV11;
        readonly sign: 1 | -1;
      }>[];
      readonly result: FiscalNotificationIntegrityNormalizedEvidenceV11;
    }>
  >;
}

/**
 * Adds V11 validation to the existing review. Extraction fields and the V1
 * reconciliation remain unchanged and are only referenced by safe evidence IDs.
 */
export function validateFiscalNotificationMathematicalIntegrityV11(
  review: FiscalNotificationVerticalSliceReviewV1,
  _input: BoundedDocumentInput,
  segments: readonly DocumentSegmentV1[],
): FiscalNotificationVerticalSliceReviewV1 {
  if (review.status !== "REVIEW_REQUIRED") return review;
  return parseFiscalNotificationVerticalSliceReviewV1({
    ...review,
    documents: review.documents.map((document) =>
      validateDocument(document, segments),
    ),
  });
}

function validateDocument(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  segments: readonly DocumentSegmentV1[],
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const family = resolveAeatMathematicalIntegrityFamilyV11(document.familyId);
  if (!family) return document;
  const projection = projectEvidence(document, family, segments);
  const structuredChecks = structuredFamilyArithmeticChecks(
    document,
    family,
    projection.evidenceByFieldId,
  );
  const arithmetic = arithmeticChecks(
    document,
    family,
    projection.evidenceByFieldId,
    projection.equationEvidenceById,
  ).filter(
    (check) =>
      !structuredCheckSupersedesGeneric(check, structuredChecks, family),
  );
  const checks = enforceArithmeticSourcePartCompatibility(
    family,
    [
      ...arithmetic,
      ...structuredChecks,
      ...semanticLabelChecks(family, projection.evidence),
      ...countChecks(family, projection.evidence),
      ...temporalChecks(family, projection.evidence),
    ],
    projection.evidence,
    segments,
  );
  if (checks.length === 0) {
    checks.push(fallbackCheck(document, family));
  }
  const status = aggregateStatus(checks);
  const hardFailureCodes = hardFailuresForChecks(checks);
  const successfulEvidenceIds = new Set(
    checks
      .filter((check) =>
        ["VALIDATED_EXACT", "VALIDATED_WITH_ROUNDING"].includes(check.status),
      )
      .flatMap((check) => check.operands.map((operand) => operand.evidenceId)),
  );
  const validatedEvidenceIds = projection.evidence
    .filter((evidence) => successfulEvidenceIds.has(evidence.evidenceId))
    .map((evidence) => evidence.evidenceId);
  const integrity = parseFiscalNotificationMathematicalIntegrityV11(
    {
      schemaVersion: 11,
      integrityVersion: FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11,
      catalogReleaseId: AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
      familyId: family.id,
      archetypeId: family.archetypeId,
      validationMode: family.validationMode,
      status,
      passCount: document.amountReconciliation?.passCount ?? 1,
      automaticPassLimit: MAX_AUTOMATIC_PASSES,
      normalizedEvidence: projection.evidence,
      checks,
      hardFailureCodes,
      persistenceDecision:
        hardFailureCodes.length > 0
          ? "BLOCK_INCONSISTENT_PRINTED_CORE"
          : status === "REVIEW_REQUIRED" ||
              status === "SEMANTIC_LABEL_INCONSISTENT" ||
              status === "VALIDATED_PARTIAL_COMPONENTS"
            ? "ALLOW_CORE_WITH_WARNINGS"
            : "ALLOW_CORE",
      relationSupport: {
        existingRelationsOnly: true,
        requiresStrongIdentifier: true,
        permitsAmountOnlyRelations: false,
        validatedEvidenceIds,
      },
      originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE",
      retainedSourceContent: "NONE",
    },
    document.pageFrom,
    document.pageTo,
  );
  return Object.freeze({
    ...document,
    mathematicalIntegrity: integrity,
  });
}

function structuredCheckSupersedesGeneric(
  check: FiscalNotificationMathematicalIntegrityCheckV11,
  structuredChecks: readonly FiscalNotificationMathematicalIntegrityCheckV11[],
  family: AeatMathematicalIntegrityFamilyV11,
): boolean {
  if (!check.ruleId.includes(":arithmetic:")) return false;
  if (
    family.archetypeId === "OFFSET_LEDGER" &&
    structuredChecks.some((candidate) =>
      candidate.ruleId.includes(":offset-row:"),
    )
  ) {
    return true;
  }
  return (
    family.archetypeId === "SANCTION_CALCULATION" &&
    structuredChecks.some((candidate) =>
      candidate.ruleId.endsWith(":all-reductions"),
    )
  );
}

interface StructuredMoneyEvidenceV11 {
  readonly code: string;
  readonly field: FiscalNotificationVerticalSliceReviewFieldV1;
  readonly evidence: FiscalNotificationIntegrityNormalizedEvidenceV11;
}

function structuredFamilyArithmeticChecks(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  family: AeatMathematicalIntegrityFamilyV11,
  evidenceByFieldId: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  const money = document.fields.flatMap<StructuredMoneyEvidenceV11>((field) => {
    const evidence = evidenceByFieldId.get(field.fieldId);
    const code = structuredFieldCode(field.fieldId);
    return field.semantic === "MONEY" &&
      field.amountCents !== null &&
      evidence &&
      code
      ? [{ code, field, evidence }]
      : [];
  });
  if (money.length === 0) return [];
  return [
    ...offsetRowChecks(family, money),
    ...seizureLedgerChecks(family, money),
    ...refundLedgerChecks(family, money),
    ...interestScheduleChecks(family, money),
    ...sanctionReductionChecks(family, money),
    ...rectifyingResultChecks(family, money),
  ];
}

function interestScheduleChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  money: readonly StructuredMoneyEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.archetypeId !== "INTEREST_SCHEDULE") return [];
  const tranches = money.filter((item) =>
    /^(?:INTEREST_TRANCHE_AMOUNT|ASSESSED_INTEREST)_\d+$/u.test(item.code),
  );
  const total = uniqueStructuredMoney(money, [
    "TOTAL_INTEREST",
    "ASSESSED_INTEREST",
  ]);
  if (!total || tranches.length === 0) return [];
  return [
    structuredLinearCheck({
      family,
      ruleId: `v11:${family.archetypeId.toLowerCase()}:tranche-total`,
      result: total,
      terms: tranches.map((item) => ({ item, sign: 1 as const })),
      toleranceCents: 0,
    }),
    structuredPartialCheck(
      `v11:${family.archetypeId.toLowerCase()}:tranche-formula-inputs`,
      [...tranches, total],
      "Hay componentes impresos que no se pueden reconciliar sin completar su estructura.",
    ),
  ];
}

function structuredFieldCode(fieldId: string): string | null {
  return (
    /^real-corpus-v[2-7]:([A-Z][A-Z0-9_]*):\d+$/u.exec(fieldId)?.[1] ??
    /^profile:money:([A-Z][A-Z0-9_]*):\d+$/u.exec(fieldId)?.[1] ??
    /^p0-v10:([A-Z][A-Z0-9_]*):\d+$/u.exec(fieldId)?.[1] ??
    null
  );
}

function offsetRowChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  money: readonly StructuredMoneyEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.archetypeId !== "OFFSET_LEDGER") return [];
  const rows = new Map<
    number,
    Partial<
      Record<"BEFORE" | "APPLIED" | "REMAINING", StructuredMoneyEvidenceV11>
    >
  >();
  for (const item of money) {
    const match = /^OFFSET_(BEFORE|APPLIED|REMAINING)_(\d+)$/u.exec(item.code);
    if (!match) continue;
    const index = Number(match[2]);
    const row = rows.get(index) ?? {};
    row[match[1] as "BEFORE" | "APPLIED" | "REMAINING"] = item;
    rows.set(index, row);
  }
  const checks: FiscalNotificationMathematicalIntegrityCheckV11[] = [];
  const appliedRows: StructuredMoneyEvidenceV11[] = [];
  for (const [index, row] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    const observed = [row.BEFORE, row.APPLIED, row.REMAINING].filter(
      (item): item is StructuredMoneyEvidenceV11 => item !== undefined,
    );
    if (row.APPLIED) appliedRows.push(row.APPLIED);
    if (observed.length === 0) continue;
    if (!row.BEFORE || !row.APPLIED || !row.REMAINING) {
      checks.push(
        structuredPartialCheck(
          `v11:${family.archetypeId.toLowerCase()}:offset-row:${index}`,
          observed,
        ),
      );
      continue;
    }
    checks.push(
      structuredLinearCheck({
        family,
        ruleId: `v11:${family.archetypeId.toLowerCase()}:offset-row:${index}`,
        result: row.BEFORE,
        terms: [row.APPLIED, row.REMAINING].map((item) => ({
          item,
          sign: 1 as const,
        })),
        toleranceCents: 0,
      }),
    );
  }
  const totalApplied = uniqueStructuredMoney(money, [
    "OFFSET_CREDIT_APPLIED",
    "TOTAL_APPLIED",
  ]);
  if (totalApplied && appliedRows.length > 0) {
    checks.push(
      structuredLinearCheck({
        family,
        ruleId: `v11:${family.archetypeId.toLowerCase()}:offset-applied-total`,
        result: totalApplied,
        terms: appliedRows.map((item) => ({ item, sign: 1 as const })),
        toleranceCents: 0,
      }),
    );
  }
  return checks;
}

function seizureLedgerChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  money: readonly StructuredMoneyEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.archetypeId !== "SEIZURE_FLOW") return [];
  const checks: FiscalNotificationMathematicalIntegrityCheckV11[] = [];
  const debtRows = money.filter((item) =>
    /^SEIZURE_DEBT_AMOUNT_\d+$/u.test(item.code),
  );
  const subtotal = uniqueStructuredMoney(money, ["DEBT_SUBTOTAL"]);
  if (subtotal && debtRows.length > 0) {
    checks.push(
      structuredLinearCheck({
        family,
        ruleId: `v11:${family.archetypeId.toLowerCase()}:debt-subtotal`,
        result: subtotal,
        terms: debtRows.map((item) => ({ item, sign: 1 as const })),
        toleranceCents: 0,
      }),
    );
  } else if (debtRows.length > 0) {
    checks.push(
      structuredPartialCheck(
        `v11:${family.archetypeId.toLowerCase()}:debt-subtotal`,
        debtRows,
      ),
    );
  }
  const interest = uniqueStructuredMoney(money, ["PRINTED_INTEREST"]);
  const costs = uniqueStructuredMoney(money, ["PRINTED_COSTS"]);
  const limit = uniqueStructuredMoney(money, ["SEIZE_LIMIT"]);
  const observedLimitParts = money.filter((item) =>
    /^(?:DEBT_SUBTOTAL|PRINTED_INTEREST|PRINTED_COSTS|SEIZE_LIMIT|SEIZED_AMOUNT|RETAINED_AMOUNT|REMITTED_AMOUNT|OUTSTANDING_PRINCIPAL)$/u.test(
      item.code,
    ),
  );
  if (subtotal && interest && costs && limit) {
    checks.push(
      structuredLinearCheck({
        family,
        ruleId: `v11:${family.archetypeId.toLowerCase()}:seizure-limit`,
        result: limit,
        terms: [subtotal, interest, costs].map((item) => ({
          item,
          sign: 1 as const,
        })),
        toleranceCents: 0,
      }),
    );
  } else {
    if (
      observedLimitParts.length > 1 ||
      (limit === null && (observedLimitParts.length > 0 || debtRows.length > 0))
    ) {
      checks.push(
        structuredPartialCheck(
          `v11:${family.archetypeId.toLowerCase()}:seizure-limit`,
          observedLimitParts,
        ),
      );
    }
  }
  return checks;
}

function refundLedgerChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  money: readonly StructuredMoneyEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.archetypeId !== "REFUND_PAYMENT") return [];
  const ordered = uniqueStructuredMoney(money, [
    "REFUND_ORDERED",
    "ORDERED_AMOUNT",
  ]);
  const deductions = uniqueStructuredMoney(money, [
    "DEDUCTION_TOTAL",
    "DEDUCTIONS",
    "DEDUCTIONS_TOTAL",
  ]);
  const net = uniqueStructuredMoney(money, [
    "NET_REFUND_PAYMENT",
    "NET_REFUND",
  ]);
  const checks: FiscalNotificationMathematicalIntegrityCheckV11[] = [];
  const deductionRows = money.filter((item) =>
    /^(?:EXTERNAL_DEDUCTION|OFFSET_APPLIED|REFUND_RETENTION)_\d+$/u.test(
      item.code,
    ),
  );
  if (deductions && deductionRows.length > 0) {
    checks.push(
      structuredLinearCheck({
        family,
        ruleId: `v11:${family.archetypeId.toLowerCase()}:deductions-total`,
        result: deductions,
        terms: deductionRows.map((item) => ({ item, sign: 1 as const })),
        toleranceCents: 0,
      }),
    );
  }
  if (ordered && deductions && net) {
    checks.push(
      structuredLinearCheck({
        family,
        ruleId: `v11:${family.archetypeId.toLowerCase()}:net-refund`,
        result: net,
        terms: [
          { item: ordered, sign: 1 },
          { item: deductions, sign: -1 },
        ],
        toleranceCents: 0,
      }),
    );
  } else {
    const observedNetParts = [ordered, deductions, net].filter(
      (item): item is StructuredMoneyEvidenceV11 => item !== null,
    );
    if (
      observedNetParts.length > 1 ||
      (deductions !== null && deductionRows.length > 0)
    ) {
      checks.push(
        structuredPartialCheck(
          `v11:${family.archetypeId.toLowerCase()}:net-refund`,
          [...observedNetParts, ...deductionRows],
        ),
      );
    }
  }
  return checks;
}

function sanctionReductionChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  money: readonly StructuredMoneyEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.archetypeId !== "SANCTION_CALCULATION") return [];
  const initial = uniqueStructuredMoney(money, ["SANCTION_INITIAL"]);
  const reduced = uniqueStructuredMoney(money, ["SANCTION_REDUCED"]);
  const reductions = money.filter((item) =>
    /^SANCTION_REDUCTION(?:_\d+)?$/u.test(item.code),
  );
  if (!initial || !reduced || reductions.length < 2) return [];
  return [
    structuredLinearCheck({
      family,
      ruleId: `v11:${family.archetypeId.toLowerCase()}:all-reductions`,
      result: reduced,
      terms: [
        { item: initial, sign: 1 },
        ...reductions.map((item) => ({ item, sign: -1 as const })),
      ],
      toleranceCents: 0,
    }),
  ];
}

function rectifyingResultChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  money: readonly StructuredMoneyEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.archetypeId !== "RECTIFYING_FILING") return [];
  const previous = uniqueStructuredMoney(money, ["PREVIOUS_RESULT"]);
  const next = uniqueStructuredMoney(money, [
    "COMPLEMENTARY_RESULT",
    "RECTIFIED_RESULT",
  ]);
  const difference = uniqueStructuredMoney(money, [
    "ADDITIONAL_AMOUNT",
    "DIFFERENCE",
  ]);
  const checks: FiscalNotificationMathematicalIntegrityCheckV11[] = [];
  if (previous && next && difference) {
    checks.push(
      structuredLinearCheck({
        family,
        ruleId: `v11:${family.archetypeId.toLowerCase()}:signed-difference`,
        result: difference,
        terms: [
          { item: next, sign: 1 },
          { item: previous, sign: -1 },
        ],
        toleranceCents: 0,
      }),
    );
  }
  if (
    family.id === "filing.complementary_self_assessment_receipt" &&
    difference &&
    difference.evidence.amountCents! < 0
  ) {
    checks.push(
      Object.freeze({
        ruleId: `v11:${family.archetypeId.toLowerCase()}:negative-additional-amount`,
        checkKind: "STRUCTURAL" as const,
        status: "SEMANTIC_LABEL_INCONSISTENT" as const,
        operands: Object.freeze([
          { evidenceId: difference.evidence.evidenceId },
        ]),
        expectedCents: null,
        observedCents: null,
        deltaCents: null,
        toleranceCents: 0,
        calculation: Object.freeze({ kind: "NONE" as const }),
        safeMessage:
          "Validación de etiquetas: una complementaria no puede darse por correcta con una diferencia negativa.",
      }),
    );
  }
  return checks;
}

function uniqueStructuredMoney(
  money: readonly StructuredMoneyEvidenceV11[],
  codes: readonly string[],
): StructuredMoneyEvidenceV11 | null {
  const matches = money.filter((item) => codes.includes(item.code));
  return matches.length === 1 ? matches[0]! : null;
}

function enforceArithmeticSourcePartCompatibility(
  family: AeatMathematicalIntegrityFamilyV11,
  checks: readonly FiscalNotificationMathematicalIntegrityCheckV11[],
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
  segments: readonly DocumentSegmentV1[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  const evidenceById = new Map(evidence.map((item) => [item.evidenceId, item]));
  return checks.map((check) => {
    if (check.checkKind !== "ARITHMETIC" || check.calculation.kind === "NONE") {
      return check;
    }
    const checkEvidence = check.operands.flatMap((operand) => {
      const item = evidenceById.get(operand.evidenceId);
      return item ? [item] : [];
    });
    return hasIncompatibleArithmeticSourceParts(family, checkEvidence, segments)
      ? incompatibleSourcePartCheck(check.ruleId, checkEvidence)
      : check;
  });
}

function hasIncompatibleArithmeticSourceParts(
  family: AeatMathematicalIntegrityFamilyV11,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
  segments: readonly DocumentSegmentV1[] = [],
): boolean {
  const paymentDocumentIsPrimary =
    family.documentNature === "PAYMENT_EVIDENCE" ||
    family.documentNature === "PAYMENT_INSTRUMENT";
  if (paymentDocumentIsPrimary) return false;
  const annexIsExpected = family.expectedStructure.some((part) =>
    /\banexo\b/iu.test(part),
  );
  return evidence.some((item) => {
    if (item.semantic !== "MONEY") return false;
    if (item.sourcePart === "PAYMENT_DOCUMENT") return true;
    if (item.sourcePart === "ANNEX" && !annexIsExpected) return true;
    return item.pageNumbers.some((pageNumber) =>
      segments.some(
        (segment) =>
          (segment.segmentType === "PAYMENT_DOCUMENT" ||
            (segment.segmentType === "ANNEX" && !annexIsExpected)) &&
          pageNumber >= segment.pageFrom &&
          pageNumber <= segment.pageTo,
      ),
    );
  });
}

function incompatibleSourcePartCheck(
  ruleId: string,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11 {
  return Object.freeze({
    ruleId: `${ruleId}:source-part`,
    checkKind: "STRUCTURAL" as const,
    status: "INCONSISTENT_PRINTED_VALUES" as const,
    operands: Object.freeze(
      evidence.map((item) => Object.freeze({ evidenceId: item.evidenceId })),
    ),
    expectedCents: null,
    observedCents: null,
    deltaCents: null,
    toleranceCents: 0,
    calculation: Object.freeze({ kind: "NONE" as const }),
    safeMessage:
      "Los importes usados en la comprobación pertenecen a partes incompatibles del documento.",
  });
}

function structuredPartialCheck(
  ruleId: string,
  items: readonly StructuredMoneyEvidenceV11[],
  safeMessage = "Faltan componentes impresos por cuantificar.",
): FiscalNotificationMathematicalIntegrityCheckV11 {
  return Object.freeze({
    ruleId,
    checkKind: "ARITHMETIC",
    status: "VALIDATED_PARTIAL_COMPONENTS",
    operands: Object.freeze(
      items.map((item) =>
        Object.freeze({ evidenceId: item.evidence.evidenceId }),
      ),
    ),
    expectedCents: null,
    observedCents: null,
    deltaCents: null,
    toleranceCents: 0,
    calculation: Object.freeze({ kind: "NONE" as const }),
    safeMessage,
  });
}

function structuredLinearCheck(
  input: Readonly<{
    family: AeatMathematicalIntegrityFamilyV11;
    ruleId: string;
    result: StructuredMoneyEvidenceV11;
    terms: readonly Readonly<{
      item: StructuredMoneyEvidenceV11;
      sign: 1 | -1;
    }>[];
    toleranceCents: number;
  }>,
): FiscalNotificationMathematicalIntegrityCheckV11 {
  const evidence = [
    input.result.evidence,
    ...input.terms.map((term) => term.item.evidence),
  ];
  if (hasIncompatibleArithmeticSourceParts(input.family, evidence)) {
    return incompatibleSourcePartCheck(input.ruleId, evidence);
  }
  const expectedCents = input.terms.reduce(
    (total, term) => total + term.sign * term.item.evidence.amountCents!,
    0,
  );
  const observedCents = input.result.evidence.amountCents!;
  const deltaCents = observedCents - expectedCents;
  const status: FiscalNotificationMathematicalIntegrityStatusV11 =
    deltaCents === 0
      ? "VALIDATED_EXACT"
      : Math.abs(deltaCents) <= input.toleranceCents
        ? "VALIDATED_WITH_ROUNDING"
        : "INCONSISTENT_PRINTED_VALUES";
  return Object.freeze({
    ruleId: input.ruleId,
    checkKind: "ARITHMETIC",
    status,
    operands: Object.freeze([
      Object.freeze({ evidenceId: input.result.evidence.evidenceId }),
      ...input.terms.map((term) =>
        Object.freeze({ evidenceId: term.item.evidence.evidenceId }),
      ),
    ]),
    expectedCents,
    observedCents,
    deltaCents,
    toleranceCents: input.toleranceCents,
    calculation: Object.freeze({
      kind: "LINEAR_EQUALITY" as const,
      resultEvidenceId: input.result.evidence.evidenceId,
      terms: Object.freeze(
        input.terms.map((term) =>
          Object.freeze({
            evidenceId: term.item.evidence.evidenceId,
            sign: term.sign,
          }),
        ),
      ),
    }),
    safeMessage: safeMessage(status, deltaCents),
  });
}

function semanticLabelChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.id !== "assessment.final_provisional_assessment") return [];
  const quotas = evidence.filter(
    (item) =>
      item.semantic === "MONEY" &&
      item.canonicalType === "FINAL_QUOTA" &&
      item.amountCents !== null,
  );
  const interests = evidence.filter(
    (item) =>
      item.semantic === "MONEY" &&
      item.canonicalType === "LATE_PAYMENT_INTEREST" &&
      item.amountCents !== null,
  );
  const quotaAmounts = new Set(quotas.map((item) => item.amountCents));
  const distinctInterestAmounts = new Set(
    interests.map((item) => item.amountCents),
  );
  const duplicatedQuotaAsInterest =
    distinctInterestAmounts.size > 1 &&
    interests.some((item) => quotaAmounts.has(item.amountCents));
  if (!duplicatedQuotaAsInterest) return [];
  return [
    Object.freeze({
      ruleId: `v11:${family.archetypeId.toLowerCase()}:semantic-labels:1`,
      checkKind: "STRUCTURAL" as const,
      status: "SEMANTIC_LABEL_INCONSISTENT" as const,
      operands: Object.freeze(
        [...quotas, ...interests].map((item) =>
          Object.freeze({ evidenceId: item.evidenceId }),
        ),
      ),
      expectedCents: null,
      observedCents: null,
      deltaCents: null,
      toleranceCents: 0,
      calculation: Object.freeze({ kind: "NONE" as const }),
      safeMessage:
        "Validación de etiquetas: hay importes incompatibles clasificados como intereses de demora.",
    }),
  ];
}

function projectEvidence(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  family: AeatMathematicalIntegrityFamilyV11,
  segments: readonly DocumentSegmentV1[],
): EvidenceProjectionV11 {
  const evidenceByFieldId = new Map<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >();
  const evidence = document.fields.flatMap((field) => {
    const projected = normalizeField(field, family, segments);
    if (!projected) return [];
    evidenceByFieldId.set(field.fieldId, projected);
    return [projected];
  });
  const equationEvidenceById = new Map<
    number,
    Readonly<{
      readonly terms: readonly Readonly<{
        readonly evidence: FiscalNotificationIntegrityNormalizedEvidenceV11;
        readonly sign: 1 | -1;
      }>[];
      readonly result: FiscalNotificationIntegrityNormalizedEvidenceV11;
    }>
  >();
  for (const [equationIndex, equation] of (
    document.amountReconciliation?.equations ?? []
  ).entries()) {
    const directEvidenceComplete =
      equation.operands.every(
        (operand) =>
          operand.fieldIds.length > 0 &&
          operand.fieldIds.every((fieldId) => evidenceByFieldId.has(fieldId)),
      ) &&
      equation.result.fieldIds.some((fieldId) =>
        evidenceByFieldId.has(fieldId),
      );
    if (directEvidenceComplete) continue;
    const terms = equation.operands.map((operand, operandIndex) =>
      Object.freeze({
        evidence: derivedEquationEvidence(
          document,
          equation,
          operand,
          `${equationIndex}:operand:${operandIndex}`,
          segments,
        ),
        sign: operand.sign,
      }),
    );
    const result = derivedEquationEvidence(
      document,
      equation,
      equation.result,
      `${equationIndex}:result`,
      segments,
    );
    if (evidence.length + terms.length + 1 > 512) continue;
    evidence.push(...terms.map((term) => term.evidence), result);
    equationEvidenceById.set(
      equationIndex,
      Object.freeze({ terms: Object.freeze(terms), result }),
    );
  }
  return Object.freeze({
    evidence: Object.freeze(evidence),
    evidenceByFieldId,
    equationEvidenceById,
  });
}

function derivedEquationEvidence(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  equation: FiscalNotificationAmountEquationV1,
  operand: FiscalNotificationAmountEquationV1["result"],
  suffix: string,
  segments: readonly DocumentSegmentV1[],
): FiscalNotificationIntegrityNormalizedEvidenceV11 {
  const fingerprint = `sha256:${sha256Hex(
    `factu:mathematical-integrity:v11:equation:${equation.equationId}:${suffix}`,
  )}` as const;
  const pages = Object.freeze(
    [...new Set(operand.sourcePageNumbers)].sort((left, right) => left - right),
  );
  const boundedPages =
    pages.length > 0 ? pages : Object.freeze([document.pageFrom]);
  return Object.freeze({
    evidenceId: `math-v11:${fingerprint.slice(7, 39)}`,
    sourceFieldFingerprint: fingerprint,
    semantic: "MONEY",
    canonicalType: operand.role,
    originalClassification: operand.role,
    amountCents: operand.amountCents,
    dateValue: null,
    countValue: null,
    sign: operand.amountCents < 0 ? "NEGATIVE" : "POSITIVE",
    currency: "EUR",
    sourcePart: sourcePart(boundedPages, segments),
    pageNumbers: boundedPages,
    assertionType: "CALCULATED_FROM_PRINTED_VALUES",
    originalConfidence: document.confidence,
  });
}

function normalizeField(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
  family: AeatMathematicalIntegrityFamilyV11,
  segments: readonly DocumentSegmentV1[],
): FiscalNotificationIntegrityNormalizedEvidenceV11 | null {
  const fingerprint = `sha256:${sha256Hex(
    `factu:mathematical-integrity:v11:${field.fieldId}`,
  )}` as const;
  const evidenceId = `math-v11:${fingerprint.slice(7, 39)}`;
  const canonicalType = normalizedCanonicalType(field, family);
  const dateValue =
    field.semantic === "DATE" &&
    typeof field.normalizedValue === "string" &&
    isValidIsoDate(field.normalizedValue)
      ? field.normalizedValue
      : null;
  const encodedCount = /^V7:INTEGER:([A-Z][A-Z0-9_]*):(\d{1,6})$/u.exec(
    field.normalizedValue ?? "",
  );
  const countValue =
    field.semantic === "DETAIL" &&
    /COUNT|NUMBER_OF|SUBMITTED_DOCUMENT_COUNT/u.test(canonicalType) &&
    ((encodedCount && encodedCount[1] === canonicalType) ||
      /^\d{1,6}$/u.test(field.normalizedValue ?? ""))
      ? Number(encodedCount?.[2] ?? field.normalizedValue)
      : null;
  const printedNegative =
    field.semantic === "MONEY" &&
    (/^\s*[-−]/u.test(field.displayValue) ||
      /^\s*-/u.test(field.normalizedValue ?? ""));
  const amountCents =
    field.semantic === "MONEY" && field.amountCents !== null
      ? printedNegative
        ? -Math.abs(field.amountCents)
        : field.amountCents
      : null;
  const semantic: FiscalNotificationIntegrityNormalizedEvidenceV11["semantic"] =
    amountCents !== null
      ? "MONEY"
      : dateValue !== null
        ? "DATE"
        : countValue !== null
          ? "COUNT"
          : field.semantic === "REFERENCE"
            ? "REFERENCE"
            : field.semantic === "STATUS"
              ? "STATUS"
              : "OTHER";
  if (
    (semantic === "OTHER" || semantic === "STATUS") &&
    !family.factFields.includes(canonicalType) &&
    !family.participantRoles.includes(canonicalType)
  ) {
    return null;
  }
  const pages = Object.freeze(
    [...new Set(field.sourcePageNumbers)].sort((a, b) => a - b),
  );
  return Object.freeze({
    evidenceId,
    sourceFieldFingerprint: fingerprint,
    semantic,
    canonicalType,
    originalClassification: String(field.canonicalType),
    amountCents,
    dateValue,
    countValue,
    sign:
      amountCents === null
        ? "UNSPECIFIED"
        : amountCents < 0
          ? "NEGATIVE"
          : "POSITIVE",
    currency: amountCents === null ? null : "EUR",
    sourcePart: sourcePart(pages, segments),
    pageNumbers: pages,
    assertionType: "NORMALIZED",
    originalConfidence: field.confidence,
  });
}

function normalizedCanonicalType(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
  family: AeatMathematicalIntegrityFamilyV11,
): string {
  const producerCode =
    V7_FIELD_CODE.exec(field.fieldId)?.[1] ??
    P0_FIELD_CODE.exec(field.fieldId)?.[1];
  const formulaTypes = new Set(
    family.formulae.flatMap((formula) =>
      [...formula.matchAll(/\b[A-Z][A-Z0-9_]*\b/gu)].map((match) => match[0]),
    ),
  );
  if (
    producerCode &&
    ([
      ...family.moneyFields,
      ...family.referenceFields,
      ...family.dateFields,
      ...family.factFields,
    ].includes(producerCode) ||
      formulaTypes.has(producerCode))
  ) {
    return producerCode;
  }
  const original = String(field.canonicalType);
  if (
    [
      ...family.moneyFields,
      ...family.referenceFields,
      ...family.dateFields,
      ...family.factFields,
    ].includes(original)
  ) {
    return original;
  }
  const candidates = canonicalAliases(original);
  return (
    candidates.find((candidate) =>
      [
        ...family.moneyFields,
        ...family.referenceFields,
        ...family.dateFields,
        ...family.factFields,
      ].includes(candidate),
    ) ?? original
  );
}

function canonicalAliases(value: string): readonly string[] {
  const aliases: Readonly<Record<string, readonly string[]>> = Object.freeze({
    PRINCIPAL: [
      "ORIGINAL_TAX_PRINCIPAL",
      "OUTSTANDING_PRINCIPAL",
      "DEBT_AMOUNT",
    ],
    ORIGINAL_TAX_PRINCIPAL: ["ORIGINAL_TAX_PRINCIPAL", "OUTSTANDING_PRINCIPAL"],
    TAX_QUOTA: ["PROPOSED_QUOTA", "FINAL_QUOTA"],
    PENALTY: ["SANCTION_INITIAL", "SANCTION_REDUCED"],
    EXECUTIVE_SURCHARGE: [
      "EXECUTIVE_SURCHARGE_PRINTED",
      "EXECUTIVE_SURCHARGE_20",
    ],
    LATE_INTEREST: ["LATE_PAYMENT_INTEREST", "INTEREST"],
    TOTAL_CLAIMED: ["DOCUMENT_TOTAL", "ORDINARY_AMOUNT", "DEBT_AMOUNT"],
    TOTAL_PENDING: ["REMAINING_DEBT", "REMAINING_AFTER_OFFSET"],
    REFUND_REQUESTED: ["REQUESTED_REFUND", "REQUESTED_RESULT"],
    REFUND_RECOGNIZED: ["RECOGNIZED_REFUND", "REFUND_CREDIT"],
    REFUND_PAID: ["NET_REFUND_PAYMENT", "REFUND_AMOUNT"],
    COMPENSATED_AMOUNT: ["OFFSET_APPLIED"],
    PAYMENT_ON_ACCOUNT: ["PAYMENT_ON_ACCOUNT", "PAYMENT_CONFIRMED"],
    THIRD_PARTY_TRANSFERRED: ["REMITTED_AMOUNT"],
    SEIZURE_LIMIT: ["AMOUNT_REQUIRED_FOR_RELEASE", "DEBT_AMOUNT"],
  });
  return aliases[value] ?? [];
}

function sourcePart(
  pages: readonly number[],
  segments: readonly DocumentSegmentV1[],
): FiscalNotificationIntegritySourcePartV11 {
  const types = new Set(
    pages.flatMap((page) => {
      const segment = segments.find(
        (candidate) => page >= candidate.pageFrom && page <= candidate.pageTo,
      );
      return segment ? [segment.segmentType] : [];
    }),
  );
  if (types.size === 0) return "UNKNOWN";
  if (types.size > 1) return "MULTIPLE_PARTS";
  return [...types][0]!;
}

function arithmeticChecks(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  family: AeatMathematicalIntegrityFamilyV11,
  evidenceByFieldId: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
  equationEvidenceById: EvidenceProjectionV11["equationEvidenceById"],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  if (family.validationMode !== "ARITHMETIC_AND_LOGICAL") return [];
  const reconciliation = document.amountReconciliation;
  return [
    ...(reconciliation?.equations.map((equation, index) =>
      equationCheck(
        family,
        equation,
        index,
        evidenceByFieldId,
        equationEvidenceById.get(index),
      ),
    ) ?? []),
    ...contractArithmeticChecks(family, [...evidenceByFieldId.values()]),
  ];
}

interface ContractOperandV11 {
  readonly evidence: FiscalNotificationIntegrityNormalizedEvidenceV11;
  readonly sign: 1 | -1;
}

export type AeatMathematicalIntegrityFormulaHandlingV11 =
  | "AUTOMATIC_LINEAR_ARITHMETIC"
  | "AUTOMATIC_PERCENTAGE"
  | "AUTOMATIC_AMOUNT_ORDER"
  | "AUTOMATIC_TEMPORAL_ORDER"
  | "AUTOMATIC_COUNT"
  | "DECLARED_REVIEW_ONLY";

export function classifyAeatMathematicalIntegrityFormulaHandlingV11(
  family: AeatMathematicalIntegrityFamilyV11,
  formula: string,
): AeatMathematicalIntegrityFormulaHandlingV11 {
  const equality =
    /^\s*([A-Z][A-Z0-9_]*)\s*=\s*([A-Z][A-Z0-9_]*)\s*\+\s*([A-Z][A-Z0-9_]*)\b/u.exec(
      formula,
    );
  if (equality?.slice(1).every((token) => token?.includes("COUNT"))) {
    return "AUTOMATIC_COUNT";
  }
  if (
    /^\s*[A-Z][A-Z0-9_]*\s*≈\s*round\(\s*[A-Z][A-Z0-9_]*\s*×\s*0\.\d+\s*,\s*2\s*\)/u.test(
      formula,
    ) ||
    /^\s*[A-Z][A-Z0-9_]*\s*≈\s*([A-Z][A-Z0-9_]*)\s*\+\s*round\(\s*\1\s*×\s*0\.\d+\s*,\s*2\s*\)/u.test(
      formula,
    )
  ) {
    return "AUTOMATIC_PERCENTAGE";
  }
  const comparisons = [
    ...formula.matchAll(
      /\b([A-Z][A-Z0-9_]*)\s*(?:<=|>=)\s*([A-Z][A-Z0-9_]*)\b/gu,
    ),
  ];
  const moneyTypes = new Set(family.moneyFields);
  if (
    comparisons.some(
      (comparison) =>
        moneyTypes.has(comparison[1]!) && moneyTypes.has(comparison[2]!),
    )
  ) {
    return "AUTOMATIC_AMOUNT_ORDER";
  }
  const dateTypes = new Set(family.dateFields);
  if (
    comparisons.some((comparison) =>
      [comparison[1]!, comparison[2]!].some(
        (token) =>
          dateTypes.has(token) ||
          /(?:DATE|DEADLINE|START|END|ACCESS|AVAILABILITY|EFFECTIVE)/u.test(
            token,
          ),
      ),
    )
  ) {
    return "AUTOMATIC_TEMPORAL_ORDER";
  }
  if (isClosedLinearFormula(formula)) {
    return "AUTOMATIC_LINEAR_ARITHMETIC";
  }
  return "DECLARED_REVIEW_ONLY";
}

const FORMULA_TOKEN_ALIASES: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    PRINCIPAL: [
      "OUTSTANDING_PRINCIPAL",
      "ORIGINAL_TAX_PRINCIPAL",
      "BASE_PRINCIPAL",
      "DEBT_AMOUNT",
    ],
    QUOTA: ["TAX_QUOTA", "PROPOSED_QUOTA", "FINAL_QUOTA"],
    INTEREST: ["LATE_PAYMENT_INTEREST", "DEFERRAL_INTEREST", "REFUND_INTEREST"],
    SURCHARGE_20: ["EXECUTIVE_SURCHARGE_20"],
    SURCHARGE_5: ["EXECUTIVE_SURCHARGE_5"],
    SURCHARGE: ["EXECUTIVE_SURCHARGE_PRINTED", "EXECUTIVE_SURCHARGE"],
    ORDINARY_TOTAL: ["DOCUMENT_TOTAL", "ORDINARY_AMOUNT"],
    TOTAL: ["DOCUMENT_TOTAL", "TOTAL_CLAIMED"],
    RECOGNIZED: ["RECOGNIZED_REFUND"],
    REQUESTED: ["REQUESTED_REFUND", "REQUESTED_OR_CLAIMED_AMOUNT"],
    REDUCTION: ["SANCTION_REDUCTION"],
  });

const NON_OPERAND_TOKENS = new Set(["ABS", "MAX", "MIN", "ROUND", "EUR"]);

/**
 * Compiles only closed equations printed in the V11 contract. Formulae with
 * rows, implicit components, legal calendars or cross-document prerequisites
 * remain review-only instead of assuming missing values are zero.
 */
function contractArithmeticChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  const money = evidence.filter(
    (item) => item.semantic === "MONEY" && item.amountCents !== null,
  );
  if (money.length === 0) return [];
  return family.formulae.flatMap((formula, index) => {
    const inequalities = contractInequalityChecks(
      family,
      formula,
      index,
      money,
    );
    if (inequalities.length > 0) return inequalities;
    const percentage = contractLiteralPercentageCheck(
      family,
      formula,
      index,
      money,
    );
    if (percentage) return [percentage];
    const basePlusPercentage = contractBasePlusPercentageCheck(
      family,
      formula,
      index,
      money,
    );
    if (basePlusPercentage) return [basePlusPercentage];
    const equation = contractLinearEquationCheck(family, formula, index, money);
    return equation ? [equation] : [];
  });
}

function contractLinearEquationCheck(
  family: AeatMathematicalIntegrityFamilyV11,
  formula: string,
  index: number,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11 | null {
  if (!isClosedLinearFormula(formula)) return null;
  const match =
    /^\s*([A-Z][A-Z0-9_]*(?:\/[A-Z][A-Z0-9_]*)?)\s*=\s*([^,.;]+)[,.;]?/u.exec(
      formula,
    );
  if (!match) return null;
  const resultTokens = match[1]!.split("/");
  const result = uniqueEvidenceForTokens(resultTokens, evidence);
  const rhs = match[2]!;
  if (rhs.trim() === "0") {
    if (!result || result === "AMBIGUOUS") return null;
    return arithmeticResultCheck({
      family,
      index,
      suffix: "contract-zero",
      expectedCents: 0,
      observedCents: result.amountCents!,
      toleranceCents: 0,
      evidence: [result],
      calculation: Object.freeze({
        kind: "ZERO_EQUALITY" as const,
        resultEvidenceId: result.evidenceId,
      }),
    });
  }
  const tokenMatches = [
    ...rhs.matchAll(/([+-]?)\s*([A-Z][A-Z0-9_]*)/gu),
  ].filter((entry) => !NON_OPERAND_TOKENS.has(entry[2]!));
  if (tokenMatches.length === 0) return null;
  const operands: ContractOperandV11[] = [];
  let missing = false;
  let ambiguous = result === "AMBIGUOUS";
  for (const tokenMatch of tokenMatches) {
    const candidate = uniqueEvidenceForTokens([tokenMatch[2]!], evidence);
    if (!candidate) {
      missing = true;
      continue;
    }
    if (candidate === "AMBIGUOUS") {
      ambiguous = true;
      continue;
    }
    operands.push({
      evidence: candidate,
      sign: tokenMatch[1] === "-" ? -1 : 1,
    });
  }
  if (!result || result === "AMBIGUOUS" || operands.length === 0) {
    return null;
  }
  if (missing || ambiguous) {
    return contractReviewCheck(
      family,
      index,
      "VALIDATED_PARTIAL_COMPONENTS",
      [result, ...operands.map((operand) => operand.evidence)],
      "Hay componentes impresos que no se pueden reconciliar sin completar su estructura.",
    );
  }
  const expectedCents = operands.reduce(
    (total, operand) => total + operand.sign * operand.evidence.amountCents!,
    0,
  );
  return arithmeticResultCheck({
    family,
    index,
    suffix: "contract-equation",
    expectedCents,
    observedCents: result.amountCents!,
    toleranceCents: 0,
    evidence: [result, ...operands.map((operand) => operand.evidence)],
    calculation: Object.freeze({
      kind: "LINEAR_EQUALITY" as const,
      resultEvidenceId: result.evidenceId,
      terms: Object.freeze(
        operands.map((operand) =>
          Object.freeze({
            evidenceId: operand.evidence.evidenceId,
            sign: operand.sign,
          }),
        ),
      ),
    }),
  });
}

function isClosedLinearFormula(formula: string): boolean {
  if (
    formula.includes("≈") ||
    /\b(?:relación exacta|previamente|cuando la ejecución|si se reconoce|si el pago había|solo si)\b/iu.test(
      formula,
    ) ||
    /\b(?:suma|filas|componentes|ajustes|calendario|regla|compatible|importe del recibo|previamente aplicada)\b/iu.test(
      formula,
    ) ||
    /\b(?:max|min|abs)\s*\(/iu.test(formula)
  ) {
    return false;
  }
  const match =
    /^\s*[A-Z][A-Z0-9_]*(?:\/[A-Z][A-Z0-9_]*)?\s*=\s*([^,.;]+)[,.;]?/u.exec(
      formula,
    );
  if (!match) return false;
  const expression = match[1]!.trim();
  return (
    expression === "0" ||
    /^(?:[A-Z][A-Z0-9_]*)(?:\s*[+-]\s*[A-Z][A-Z0-9_]*)*$/u.test(expression)
  );
}

function contractLiteralPercentageCheck(
  family: AeatMathematicalIntegrityFamilyV11,
  formula: string,
  index: number,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11 | null {
  const match =
    /^\s*([A-Z][A-Z0-9_]*)\s*≈\s*round\(\s*([A-Z][A-Z0-9_]*)\s*×\s*(0\.\d+)\s*,\s*2\s*\)/u.exec(
      formula,
    );
  if (!match) return null;
  const result = uniqueEvidenceForTokens([match[1]!], evidence);
  const base = uniqueEvidenceForTokens([match[2]!], evidence);
  if (!result || result === "AMBIGUOUS" || !base || base === "AMBIGUOUS") {
    return null;
  }
  const rate = Number(match[3]);
  const expectedCents = Math.round(base.amountCents! * rate);
  return arithmeticResultCheck({
    family,
    index,
    suffix: "contract-percentage",
    expectedCents,
    observedCents: result.amountCents!,
    toleranceCents: 1,
    evidence: [result, base],
    calculation: Object.freeze({
      kind: "PERCENTAGE_EQUALITY" as const,
      resultEvidenceId: result.evidenceId,
      baseEvidenceId: base.evidenceId,
      rateBasisPoints: Math.round(rate * 10_000),
    }),
  });
}

function contractBasePlusPercentageCheck(
  family: AeatMathematicalIntegrityFamilyV11,
  formula: string,
  index: number,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11 | null {
  const match =
    /^\s*([A-Z][A-Z0-9_]*)\s*≈\s*([A-Z][A-Z0-9_]*)\s*\+\s*round\(\s*\2\s*×\s*(0\.\d+)\s*,\s*2\s*\)/u.exec(
      formula,
    );
  if (!match) return null;
  const result = uniqueEvidenceForTokens([match[1]!], evidence);
  const base = uniqueEvidenceForTokens([match[2]!], evidence);
  if (!result || result === "AMBIGUOUS" || !base || base === "AMBIGUOUS") {
    return null;
  }
  const rate = Number(match[3]);
  const expectedCents =
    base.amountCents! + Math.round(base.amountCents! * rate);
  return arithmeticResultCheck({
    family,
    index,
    suffix: "contract-base-plus-percentage",
    expectedCents,
    observedCents: result.amountCents!,
    toleranceCents: 1,
    evidence: [result, base],
    calculation: Object.freeze({
      kind: "BASE_PLUS_PERCENTAGE" as const,
      resultEvidenceId: result.evidenceId,
      baseEvidenceId: base.evidenceId,
      rateBasisPoints: Math.round(rate * 10_000),
    }),
  });
}

function contractInequalityChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  formula: string,
  index: number,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  const chain =
    /^\s*0\s*<=\s*([A-Z][A-Z0-9_]*)\s*<=\s*([A-Z][A-Z0-9_]*)\s*<=\s*([A-Z][A-Z0-9_]*)(?:\s+o\s+([A-Z][A-Z0-9_]*))?/u.exec(
      formula,
    );
  if (chain) {
    const first = uniqueEvidenceForTokens([chain[1]!], evidence);
    const second = uniqueEvidenceForTokens([chain[2]!], evidence);
    if (
      !first ||
      first === "AMBIGUOUS" ||
      !second ||
      second === "AMBIGUOUS"
    ) {
      return [];
    }
    const upperBounds = [chain[3]!, ...(chain[4] ? [chain[4]] : [])]
      .map((token) => uniqueEvidenceForTokens([token], evidence))
      .filter(
        (
          item,
        ): item is FiscalNotificationIntegrityNormalizedEvidenceV11 =>
          item !== null && item !== "AMBIGUOUS",
      )
      .filter(
        (item, boundIndex, items) =>
          items.findIndex(
            (candidate) => candidate.evidenceId === item.evidenceId,
          ) === boundIndex,
      );
    return upperBounds.map((third, boundIndex) => {
      const ordered =
        first.amountCents! >= 0 &&
        first.amountCents! <= second.amountCents! &&
        second.amountCents! <= third.amountCents!;
      return Object.freeze({
        ruleId: `v11:${family.archetypeId.toLowerCase()}:contract-inequality:${index + 1}:${boundIndex + 1}`,
        checkKind: "ARITHMETIC" as const,
        status: ordered
          ? ("VALIDATED_EXACT" as const)
          : ("INCONSISTENT_PRINTED_VALUES" as const),
        operands: Object.freeze(
          [first, second, third].map((item) =>
            Object.freeze({ evidenceId: item.evidenceId }),
          ),
        ),
        expectedCents: third.amountCents,
        observedCents: first.amountCents,
        deltaCents: first.amountCents! - third.amountCents!,
        toleranceCents: 0,
        calculation: Object.freeze({
          kind: "AMOUNT_CHAIN" as const,
          evidenceIds: Object.freeze([
            first.evidenceId,
            second.evidenceId,
            third.evidenceId,
          ]),
        }),
        safeMessage: ordered
          ? "Los importes impresos respetan los límites del documento."
          : "Los importes impresos no respetan los límites del documento.",
      });
    });
  }
  return [
    ...formula.matchAll(
      /\b([A-Z][A-Z0-9_]*)\s*(<=|>=)\s*([A-Z][A-Z0-9_]*)\b/gu,
    ),
  ].flatMap((match, comparisonIndex) => {
    const left = uniqueEvidenceForTokens([match[1]!], evidence);
    const right = uniqueEvidenceForTokens([match[3]!], evidence);
    if (!left || left === "AMBIGUOUS" || !right || right === "AMBIGUOUS") {
      return [];
    }
    const ordered =
      match[2] === "<="
        ? left.amountCents! <= right.amountCents!
        : left.amountCents! >= right.amountCents!;
    return [
      Object.freeze({
        ruleId: `v11:${family.archetypeId.toLowerCase()}:contract-inequality:${index + 1}:${comparisonIndex + 1}`,
        checkKind: "ARITHMETIC" as const,
        status: ordered
          ? ("VALIDATED_EXACT" as const)
          : ("INCONSISTENT_PRINTED_VALUES" as const),
        operands: Object.freeze([
          Object.freeze({ evidenceId: left.evidenceId }),
          Object.freeze({ evidenceId: right.evidenceId }),
        ]),
        expectedCents: right.amountCents,
        observedCents: left.amountCents,
        deltaCents: left.amountCents! - right.amountCents!,
        toleranceCents: 0,
        calculation: Object.freeze({
          kind: "AMOUNT_ORDER" as const,
          leftEvidenceId: left.evidenceId,
          operator: match[2] === "<=" ? ("LTE" as const) : ("GTE" as const),
          rightEvidenceId: right.evidenceId,
        }),
        safeMessage: ordered
          ? "Los límites impresos conservan el orden esperado."
          : "Los límites impresos no conservan el orden esperado.",
      }),
    ];
  });
}

function uniqueEvidenceForTokens(
  tokens: readonly string[],
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationIntegrityNormalizedEvidenceV11 | "AMBIGUOUS" | null {
  const accepted = new Set(
    tokens.flatMap((token) => [token, ...(FORMULA_TOKEN_ALIASES[token] ?? [])]),
  );
  const matches = evidence.filter((item) => accepted.has(item.canonicalType));
  return matches.length === 0
    ? null
    : matches.length === 1
      ? matches[0]!
      : "AMBIGUOUS";
}

function arithmeticResultCheck(
  input: Readonly<{
    family: AeatMathematicalIntegrityFamilyV11;
    index: number;
    suffix: string;
    expectedCents: number;
    observedCents: number;
    toleranceCents: number;
    evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[];
    calculation: FiscalNotificationMathematicalIntegrityCheckV11["calculation"];
  }>,
): FiscalNotificationMathematicalIntegrityCheckV11 {
  const delta = input.observedCents - input.expectedCents;
  const status: FiscalNotificationMathematicalIntegrityStatusV11 =
    delta === 0
      ? "VALIDATED_EXACT"
      : Math.abs(delta) <= input.toleranceCents
        ? "VALIDATED_WITH_ROUNDING"
        : "INCONSISTENT_PRINTED_VALUES";
  return Object.freeze({
    ruleId: `v11:${input.family.archetypeId.toLowerCase()}:${input.suffix}:${input.index + 1}`,
    checkKind: "ARITHMETIC",
    status,
    operands: Object.freeze(
      input.evidence.map((item) =>
        Object.freeze({ evidenceId: item.evidenceId }),
      ),
    ),
    expectedCents: input.expectedCents,
    observedCents: input.observedCents,
    deltaCents: delta,
    toleranceCents: input.toleranceCents,
    calculation: input.calculation,
    safeMessage: safeMessage(status, delta),
  });
}

function contractReviewCheck(
  family: AeatMathematicalIntegrityFamilyV11,
  index: number,
  status: "VALIDATED_PARTIAL_COMPONENTS" | "REVIEW_REQUIRED",
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
  safeMessage: string,
): FiscalNotificationMathematicalIntegrityCheckV11 {
  return Object.freeze({
    ruleId: `v11:${family.archetypeId.toLowerCase()}:contract-review:${index + 1}`,
    checkKind: "ARITHMETIC",
    status,
    operands: Object.freeze(
      evidence.map((item) => Object.freeze({ evidenceId: item.evidenceId })),
    ),
    expectedCents: null,
    observedCents: null,
    deltaCents: null,
    toleranceCents: 0,
    calculation: Object.freeze({ kind: "NONE" as const }),
    safeMessage,
  });
}

function equationCheck(
  family: AeatMathematicalIntegrityFamilyV11,
  equation: FiscalNotificationAmountEquationV1,
  index: number,
  evidenceByFieldId: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
  derivedEvidence:
    | Readonly<{
        readonly terms: readonly Readonly<{
          readonly evidence: FiscalNotificationIntegrityNormalizedEvidenceV11;
          readonly sign: 1 | -1;
        }>[];
        readonly result: FiscalNotificationIntegrityNormalizedEvidenceV11;
      }>
    | undefined,
): FiscalNotificationMathematicalIntegrityCheckV11 {
  const requestedStatus = equationStatusForFamily(family, equation);
  const directTerms = equation.operands.flatMap((operand) =>
    operand.fieldIds.flatMap((fieldId) => {
      const evidence = evidenceByFieldId.get(fieldId);
      return evidence
        ? [
            Object.freeze({
              evidenceId: evidence.evidenceId,
              sign: operand.sign,
            }),
          ]
        : [];
    }),
  );
  const directResultEvidence = equation.result.fieldIds
    .map((fieldId) => evidenceByFieldId.get(fieldId))
    .find(
      (
        evidence,
      ): evidence is FiscalNotificationIntegrityNormalizedEvidenceV11 =>
        evidence !== undefined,
    );
  const terms =
    derivedEvidence?.terms.map((term) =>
      Object.freeze({
        evidenceId: term.evidence.evidenceId,
        sign: term.sign,
      }),
    ) ?? directTerms;
  const resultEvidence = derivedEvidence?.result ?? directResultEvidence;
  const hasAllOperandEvidence =
    derivedEvidence !== undefined ||
    terms.length ===
      equation.operands.reduce(
        (total, operand) => total + operand.fieldIds.length,
        0,
      );
  const calculated =
    (requestedStatus === "VALIDATED_EXACT" ||
      requestedStatus === "VALIDATED_WITH_ROUNDING" ||
      requestedStatus === "INCONSISTENT_PRINTED_VALUES") &&
    resultEvidence &&
    terms.length > 0 &&
    hasAllOperandEvidence;
  const status =
    calculated ||
    requestedStatus === "REVIEW_REQUIRED" ||
    requestedStatus === "VALIDATED_PARTIAL_COMPONENTS"
      ? requestedStatus
      : "REVIEW_REQUIRED";
  const evidenceIds = calculated
    ? [resultEvidence.evidenceId, ...terms.map((term) => term.evidenceId)]
    : [
        ...equation.operands.flatMap((operand) => operand.fieldIds),
        ...equation.result.fieldIds,
      ].flatMap((fieldId) => {
        const evidence = evidenceByFieldId.get(fieldId);
        return evidence ? [evidence.evidenceId] : [];
      });
  return Object.freeze({
    ruleId: `v11:${family.archetypeId.toLowerCase()}:arithmetic:${index + 1}`,
    checkKind: "ARITHMETIC",
    status,
    operands: Object.freeze(
      [...new Set(evidenceIds)].map((evidenceId) =>
        Object.freeze({ evidenceId }),
      ),
    ),
    expectedCents: calculated ? equation.leftCents : null,
    observedCents: calculated ? equation.rightCents : null,
    deltaCents: calculated ? equation.rightCents - equation.leftCents : null,
    toleranceCents: equation.toleranceCents,
    calculation: calculated
      ? Object.freeze({
          kind: "LINEAR_EQUALITY" as const,
          resultEvidenceId: resultEvidence.evidenceId,
          terms: Object.freeze(terms),
        })
      : Object.freeze({ kind: "NONE" as const }),
    safeMessage: safeMessage(status, equation.differenceCents),
  });
}

function equationStatusForFamily(
  family: AeatMathematicalIntegrityFamilyV11,
  equation: FiscalNotificationAmountEquationV1,
): FiscalNotificationMathematicalIntegrityStatusV11 {
  if (
    equation.scope === "DOCUMENT" &&
    documentEquationHasMissingPrintedRoles(family, equation)
  ) {
    return "VALIDATED_PARTIAL_COMPONENTS";
  }
  if (
    equation.status === "AMBIGUOUS_REVIEW_REQUIRED" &&
    Math.abs(equation.differenceCents) <= equation.toleranceCents
  ) {
    return equation.differenceCents === 0
      ? "VALIDATED_EXACT"
      : "VALIDATED_WITH_ROUNDING";
  }
  if (
    equation.status === "MISMATCH_REVIEW_REQUIRED" &&
    equation.formula ===
      "INITIAL_PENALTY_MINUS_REDUCTION_EQUALS_REDUCED_PENALTY" &&
    family.formulae.some((formula) =>
      /suma de reducciones monetarias aplicables/iu.test(formula),
    )
  ) {
    return "REVIEW_REQUIRED";
  }
  return equationStatus(equation.status);
}

function documentEquationHasMissingPrintedRoles(
  family: AeatMathematicalIntegrityFamilyV11,
  equation: FiscalNotificationAmountEquationV1,
): boolean {
  const expectedRoles: Partial<
    Record<
      FiscalNotificationAmountEquationV1["formula"],
      readonly FiscalNotificationAmountEquationV1["operands"][number]["role"][]
    >
  > = {
    PRINCIPAL_PLUS_SURCHARGE_PLUS_INTEREST_PLUS_COSTS_MINUS_PAYMENTS_EQUALS_TOTAL:
      ["PRINCIPAL", "SURCHARGE", "INTEREST", "COSTS", "PAYMENT"],
    TOTAL_BEFORE_OFFSET_MINUS_OFFSET_EQUALS_REMAINING: [
      "TOTAL_BEFORE_OFFSET",
      "OFFSET",
    ],
    QUOTA_PLUS_INTEREST_EQUALS_TOTAL: ["QUOTA", "INTEREST"],
    INITIAL_PENALTY_MINUS_REDUCTION_EQUALS_REDUCED_PENALTY: [
      "INITIAL_PENALTY",
      "PENALTY_REDUCTION",
    ],
  };
  const isEnforcementTotal =
    family.id === "collection.enforcement_order" &&
    equation.formula ===
      "PRINCIPAL_PLUS_SURCHARGE_PLUS_INTEREST_PLUS_COSTS_MINUS_PAYMENTS_EQUALS_TOTAL";
  const required = isEnforcementTotal
    ? (["PRINCIPAL", "SURCHARGE"] as const)
    : expectedRoles[equation.formula];
  if (!required) return false;
  const observed = new Set(equation.operands.map((operand) => operand.role));
  if (required.some((role) => !observed.has(role))) return true;
  if (
    isEnforcementTotal &&
    Math.abs(equation.differenceCents) > equation.toleranceCents
  ) {
    return ["INTEREST", "COSTS", "PAYMENT"].some(
      (role) => !observed.has(role as "INTEREST" | "COSTS" | "PAYMENT"),
    );
  }
  return false;
}

function countChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  const counts = evidence.filter(
    (item) => item.semantic === "COUNT" && item.countValue !== null,
  );
  if (counts.length === 0) return [];
  return family.formulae.flatMap<FiscalNotificationMathematicalIntegrityCheckV11>(
    (formula, formulaIndex) => {
      const match =
        /^\s*([A-Z][A-Z0-9_]*)\s*=\s*([A-Z][A-Z0-9_]*)\s*\+\s*([A-Z][A-Z0-9_]*)\b/u.exec(
          formula,
        );
      if (!match) return [];
      const result = uniqueEvidenceForTokens([match[1]!], counts);
      const left = uniqueEvidenceForTokens([match[2]!], counts);
      const right = uniqueEvidenceForTokens([match[3]!], counts);
      const available = [result, left, right].filter(
        (item): item is FiscalNotificationIntegrityNormalizedEvidenceV11 =>
          Boolean(item && item !== "AMBIGUOUS"),
      );
      if (
        !result ||
        result === "AMBIGUOUS" ||
        !left ||
        left === "AMBIGUOUS" ||
        !right ||
        right === "AMBIGUOUS"
      ) {
        return [
          Object.freeze({
            ruleId: `v11:${family.archetypeId.toLowerCase()}:count-review:${formulaIndex + 1}`,
            checkKind: "STRUCTURAL" as const,
            status: "REVIEW_REQUIRED" as const,
            operands: Object.freeze(
              available.map((item) =>
                Object.freeze({ evidenceId: item.evidenceId }),
              ),
            ),
            expectedCents: null,
            observedCents: null,
            deltaCents: null,
            toleranceCents: 0,
            calculation: Object.freeze({ kind: "NONE" as const }),
            safeMessage:
              "Faltan conteos impresos para completar la comprobación.",
          }),
        ];
      }
      const exact = result.countValue === left.countValue! + right.countValue!;
      return [
        Object.freeze({
          ruleId: `v11:${family.archetypeId.toLowerCase()}:count:${formulaIndex + 1}`,
          checkKind: "STRUCTURAL" as const,
          status: exact
            ? ("VALIDATED_EXACT" as const)
            : ("INCONSISTENT_PRINTED_VALUES" as const),
          operands: Object.freeze(
            [result, left, right].map((item) =>
              Object.freeze({ evidenceId: item.evidenceId }),
            ),
          ),
          expectedCents: null,
          observedCents: null,
          deltaCents: null,
          toleranceCents: 0,
          calculation: Object.freeze({
            kind: "COUNT_EQUALITY" as const,
            resultEvidenceId: result.evidenceId,
            terms: Object.freeze([
              Object.freeze({ evidenceId: left.evidenceId, sign: 1 as const }),
              Object.freeze({ evidenceId: right.evidenceId, sign: 1 as const }),
            ]),
          }),
          safeMessage: exact
            ? "Los conteos impresos cuadran."
            : "Los conteos impresos no cuadran.",
        }),
      ];
    },
  );
}

function temporalChecks(
  family: AeatMathematicalIntegrityFamilyV11,
  evidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationMathematicalIntegrityCheckV11[] {
  const datesByType = new Map<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11[]
  >();
  for (const item of evidence) {
    if (item.semantic !== "DATE" || item.dateValue === null) continue;
    const group = datesByType.get(item.canonicalType) ?? [];
    group.push(item);
    datesByType.set(item.canonicalType, group);
  }
  const pairs = family.formulae.flatMap((formula, formulaIndex) =>
    [
      ...formula.matchAll(
        /\b([A-Z][A-Z0-9_]*)\s*(<=|>=)\s*([A-Z][A-Z0-9_]*)\b/gu,
      ),
    ].map((match, matchIndex) => ({
      leftType: match[1]!,
      operator: match[2]! as "<=" | ">=",
      rightType: match[3]!,
      ruleId: `v11:${family.archetypeId.toLowerCase()}:temporal:${formulaIndex + 1}:${matchIndex + 1}`,
    })),
  );
  return pairs.flatMap<FiscalNotificationMathematicalIntegrityCheckV11>(
    ({ leftType, operator, rightType, ruleId }) => {
      const leftCandidates = datesByType.get(leftType) ?? [];
      const rightCandidates = datesByType.get(rightType) ?? [];
      const left = uniqueDateEvidence(leftCandidates);
      const right = uniqueDateEvidence(rightCandidates);
      if (left === "AMBIGUOUS" || right === "AMBIGUOUS") {
        const ambiguousEvidence = [...leftCandidates, ...rightCandidates];
        return [
          Object.freeze({
            ruleId,
            checkKind: "TEMPORAL" as const,
            status: "REVIEW_REQUIRED" as const,
            operands: Object.freeze(
              ambiguousEvidence.map((item) =>
                Object.freeze({ evidenceId: item.evidenceId }),
              ),
            ),
            expectedCents: null,
            observedCents: null,
            deltaCents: null,
            toleranceCents: 0,
            calculation: Object.freeze({ kind: "NONE" as const }),
            safeMessage:
              "Hay varias fechas impresas para el mismo hito; revisa cuál corresponde al acto principal.",
          }),
        ];
      }
      if (!left || !right || !left.dateValue || !right.dateValue) return [];
      const ordered =
        operator === "<="
          ? left.dateValue <= right.dateValue
          : left.dateValue >= right.dateValue;
      const status: FiscalNotificationMathematicalIntegrityStatusV11 = ordered
        ? "VALIDATED_EXACT"
        : "INCONSISTENT_PRINTED_VALUES";
      return [
        Object.freeze({
          ruleId,
          checkKind: "TEMPORAL" as const,
          status,
          operands: Object.freeze([
            Object.freeze({ evidenceId: left.evidenceId }),
            Object.freeze({ evidenceId: right.evidenceId }),
          ]),
          expectedCents: null,
          observedCents: null,
          deltaCents: null,
          toleranceCents: 0,
          calculation: Object.freeze({
            kind: "DATE_ORDER" as const,
            leftEvidenceId: left.evidenceId,
            operator: operator === "<=" ? ("LTE" as const) : ("GTE" as const),
            rightEvidenceId: right.evidenceId,
          }),
          safeMessage:
            status === "VALIDATED_EXACT"
              ? "Las fechas impresas conservan el orden esperado."
              : "Las fechas impresas no conservan el orden esperado.",
        }),
      ];
    },
  );
}

function uniqueDateEvidence(
  candidates: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[],
): FiscalNotificationIntegrityNormalizedEvidenceV11 | "AMBIGUOUS" | null {
  if (candidates.length === 0) return null;
  return new Set(candidates.map((item) => item.dateValue)).size === 1
    ? candidates[0]!
    : "AMBIGUOUS";
}

function hardFailuresForChecks(
  checks: readonly FiscalNotificationMathematicalIntegrityCheckV11[],
): FiscalNotificationMathematicalIntegrityV11["hardFailureCodes"] {
  const failures = new Set<
    FiscalNotificationMathematicalIntegrityV11["hardFailureCodes"][number]
  >();
  for (const check of checks) {
    if (check.status !== "INCONSISTENT_PRINTED_VALUES") continue;
    failures.add(
      check.checkKind === "ARITHMETIC" &&
        !check.ruleId.includes(":contract-inequality:")
        ? "IMPOSSIBLE_BASIC_PRINTED_SUM"
        : "INCOMPATIBLE_REFERENCE_OR_PART",
    );
  }
  return Object.freeze([...failures].sort());
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

function fallbackCheck(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  family: AeatMathematicalIntegrityFamilyV11,
): FiscalNotificationMathematicalIntegrityCheckV11 {
  const hasMoney = document.fields.some(
    (field) => field.semantic === "MONEY" && field.amountCents !== null,
  );
  const status: FiscalNotificationMathematicalIntegrityStatusV11 =
    family.validationMode === "TEMPORAL_OR_COUNT_AND_LOGICAL" && !hasMoney
      ? "NOT_APPLICABLE_NO_ARITHMETIC"
      : hasUnquantifiedComponents(document)
        ? "VALIDATED_PARTIAL_COMPONENTS"
        : "REVIEW_REQUIRED";
  return Object.freeze({
    ruleId: `v11:${family.archetypeId.toLowerCase()}:coverage`,
    checkKind:
      family.validationMode === "ARITHMETIC_AND_LOGICAL"
        ? "ARITHMETIC"
        : "STRUCTURAL",
    status,
    operands: Object.freeze([]),
    expectedCents: null,
    observedCents: null,
    deltaCents: null,
    toleranceCents: 0,
    calculation: Object.freeze({ kind: "NONE" as const }),
    safeMessage: safeMessage(status, 0),
  });
}

function hasUnquantifiedComponents(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): boolean {
  return document.fields.some(
    (field) =>
      field.semantic !== "MONEY" &&
      /(?:INTERESES|COSTAS).*(?:SIN CUANTIFICAR|NO CUANTIFICAD|SE DEVENGAR)/u.test(
        `${field.sourceLabel} ${field.displayValue}`
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toUpperCase(),
      ),
  );
}

function equationStatus(
  status: FiscalNotificationAmountEquationStatusV1,
): FiscalNotificationMathematicalIntegrityStatusV11 {
  switch (status) {
    case "MATCHED":
      return "VALIDATED_EXACT";
    case "MATCHED_WITH_ROUNDING":
      return "VALIDATED_WITH_ROUNDING";
    case "MISMATCH_REVIEW_REQUIRED":
      return "INCONSISTENT_PRINTED_VALUES";
    case "AMBIGUOUS_REVIEW_REQUIRED":
      return "REVIEW_REQUIRED";
  }
}

function aggregateStatus(
  checks: readonly FiscalNotificationMathematicalIntegrityCheckV11[],
): FiscalNotificationMathematicalIntegrityStatusV11 {
  const priorities: readonly FiscalNotificationMathematicalIntegrityStatusV11[] =
    [
      "INCONSISTENT_PRINTED_VALUES",
      "SEMANTIC_LABEL_INCONSISTENT",
      "REVIEW_REQUIRED",
      "VALIDATED_PARTIAL_COMPONENTS",
      "VALIDATED_WITH_ROUNDING",
      "VALIDATED_EXACT",
      "NOT_APPLICABLE_NO_ARITHMETIC",
    ];
  return priorities.find((status) =>
    checks.some((check) => check.status === status),
  )!;
}

function safeMessage(
  status: FiscalNotificationMathematicalIntegrityStatusV11,
  differenceCents: number,
): string {
  switch (status) {
    case "VALIDATED_EXACT":
      return "Los importes cuadran con las cifras impresas.";
    case "VALIDATED_WITH_ROUNDING":
      return "Los importes cuadran con un redondeo de 0,01 €.";
    case "VALIDATED_PARTIAL_COMPONENTS":
      return "Faltan intereses o costas por cuantificar en el documento.";
    case "SEMANTIC_LABEL_INCONSISTENT":
      return "La suma cuadra, pero una cifra tiene una etiqueta incompatible.";
    case "REVIEW_REQUIRED":
      return "Revisa los importes y su estructura antes de confirmar.";
    case "INCONSISTENT_PRINTED_VALUES":
      return `Hay una diferencia de ${formatCents(Math.abs(differenceCents))} entre el total y sus componentes.`;
    case "NOT_APPLICABLE_NO_ARITHMETIC":
      return "Este documento no requiere una comprobación aritmética.";
  }
}

function formatCents(value: number): string {
  return `${(value / 100).toFixed(2).replace(".", ",")} €`;
}
