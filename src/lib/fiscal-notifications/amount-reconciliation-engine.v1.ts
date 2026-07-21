import type { BoundedDocumentInput } from "./input-contract";
import {
  FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_VERSION_V1,
  parseFiscalNotificationAmountReconciliationV1,
  type FiscalNotificationAmountEquationFormulaV1,
  type FiscalNotificationAmountEquationStatusV1,
  type FiscalNotificationAmountEquationV1,
  type FiscalNotificationAmountOperandV1,
  type FiscalNotificationAmountReconciliationV1,
  type FiscalNotificationAmountRoleV1,
  type FiscalNotificationDiscardedAmountCandidateV1,
  type FiscalNotificationReconciledInstallmentV1,
  type FiscalNotificationReconciledPlanTotalsV1,
} from "./amount-reconciliation-contract.v1";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewDocumentV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

const TOLERANCE_CENTS = 1;
const MAX_AUTOMATIC_PASSES = 2;
const MAX_COMBINATIONS = 256;
const INSTALLMENT_FIELD = /^real-corpus-v[3-7]:installment:\d+$/u;
const INSTALLMENT_VALUE =
  /^Vence ((?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2}) · (?:principal|base) (\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s(?:€|EUR) · interés (\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s(?:€|EUR)(?: · recargo (\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s(?:€|EUR))? · total (\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s(?:€|EUR)$/u;

interface MoneyCandidateV1 {
  readonly field: FiscalNotificationVerticalSliceReviewFieldV1;
  readonly role: FiscalNotificationAmountRoleV1;
}

interface EquationCandidateV1 {
  readonly formula: FiscalNotificationAmountEquationFormulaV1;
  readonly operands: readonly MoneyCandidateV1[];
  readonly result: MoneyCandidateV1;
  readonly leftCents: number;
  readonly rightCents: number;
}

/**
 * Reconciles only figures already present in the review. Raw page text is used
 * solely to reject identifier-shaped OCR candidates; it is never retained.
 */
export function reconcileFiscalNotificationReviewAmountsV1(
  review: FiscalNotificationVerticalSliceReviewV1,
  documentInput: BoundedDocumentInput,
): FiscalNotificationVerticalSliceReviewV1 {
  if (review.status !== "REVIEW_REQUIRED") return review;
  const documents = review.documents.map((document) =>
    reconcileDocument(document, documentInput),
  );
  return parseFiscalNotificationVerticalSliceReviewV1({
    ...review,
    documents,
  });
}

function reconcileDocument(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  documentInput: BoundedDocumentInput,
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const discardedCandidates = document.fields.flatMap((field) => {
    const discarded = classifyIdentifierShapedMoney(
      field,
      document,
      documentInput,
    );
    return discarded ? [discarded] : [];
  });
  const discardedFieldIds = new Set(
    discardedCandidates.map((item) => item.fieldId),
  );
  const retainedFields = document.fields.filter(
    (field) => !discardedFieldIds.has(field.fieldId),
  );
  const installments = retainedFields.flatMap((field) => {
    const installment = parseInstallmentField(field);
    return installment ? [installment] : [];
  });
  const installmentEquations = installments.map((installment) =>
    installmentEquation(installment),
  );
  const totals =
    installments.length > 0
      ? planTotals(installments, retainedFields)
      : null;
  const totalsEquations = totals
    ? planTotalsEquations(totals, retainedFields)
    : [];
  const documentEquations =
    installments.length === 0
      ? reconcileDocumentEquation(document.familyId, retainedFields)
      : [];
  const equations = [
    ...installmentEquations,
    ...totalsEquations,
    ...documentEquations,
  ];
  const hasMoney = retainedFields.some((field) => field.semantic === "MONEY");
  if (
    equations.length === 0 &&
    discardedCandidates.length === 0 &&
    !hasMoney
  ) {
    return document;
  }
  const hasReviewEquation = equations.some((equation) =>
    equation.status.endsWith("REVIEW_REQUIRED"),
  );
  const allMatched =
    equations.length > 0 &&
    equations.every(
      (equation) =>
        equation.status === "MATCHED" ||
        equation.status === "MATCHED_WITH_ROUNDING",
    );
  const status: FiscalNotificationAmountReconciliationV1["status"] =
    hasReviewEquation
      ? "REVIEW_REQUIRED"
      : allMatched
        ? "MATCHED"
        : "NO_EQUATION_AVAILABLE";
  const matchedFieldIds = new Set(
    equations.flatMap((equation) =>
      equation.status === "MATCHED" ||
      equation.status === "MATCHED_WITH_ROUNDING"
        ? [
            ...equation.operands.flatMap((operand) => operand.fieldIds),
            ...equation.result.fieldIds,
          ]
        : [],
    ),
  );
  const reconciliation = parseFiscalNotificationAmountReconciliationV1(
    {
      schemaVersion: 1,
      reconciliationVersion:
        FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_VERSION_V1,
      status,
      passCount: discardedCandidates.length > 0 ? 2 : 1,
      automaticPassLimit: MAX_AUTOMATIC_PASSES,
      toleranceCents: TOLERANCE_CENTS,
      equations,
      discardedCandidates,
      installments,
      totals,
      confidenceEffect:
        matchedFieldIds.size > 0
          ? "RAISED_FOR_MATCHED_FIELDS"
          : "UNCHANGED",
      requiresManualReview: status !== "MATCHED",
      numericMutationPolicy: "NEVER_CHANGE_EXTRACTED_VALUES",
    },
    document.pageFrom,
    document.pageTo,
  );
  const warnings = new Set(document.warnings);
  if (discardedCandidates.length > 0) {
    warnings.add("AMOUNT_CANDIDATE_RECLASSIFIED_AS_IDENTIFIER");
  }
  warnings.add(
    status === "MATCHED"
      ? "ARITHMETIC_RECONCILIATION_MATCHED"
      : "ARITHMETIC_RECONCILIATION_REVIEW_REQUIRED",
  );
  return Object.freeze({
    ...document,
    confidence:
      status === "MATCHED" ? Math.max(document.confidence, 0.99) : document.confidence,
    fields: Object.freeze(
      retainedFields.map((field) =>
        matchedFieldIds.has(field.fieldId)
          ? Object.freeze({ ...field, confidence: Math.max(field.confidence, 0.99) })
          : field,
      ),
    ),
    warnings: Object.freeze([...warnings]),
    amountReconciliation: reconciliation,
  });
}

function classifyIdentifierShapedMoney(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  input: BoundedDocumentInput,
): FiscalNotificationDiscardedAmountCandidateV1 | null {
  if (
    field.semantic !== "MONEY" ||
    field.amountCents === null ||
    field.amountCents % 100 !== 0
  ) {
    return null;
  }
  const integerValue = field.amountCents / 100;
  const digits = String(integerValue);
  if (!/^\d{8}$/u.test(digits)) return null;
  const occurrences = input.pages.flatMap((page) => {
    if (page.pageNumber < document.pageFrom || page.pageNumber > document.pageTo) {
      return [];
    }
    return page.text.split(/\r\n|[\n\r\u2028\u2029]/u).flatMap((line) => {
      const normalized = normalizeText(line);
      const compactDigits = line.replace(/\D/gu, "");
      return compactDigits.includes(digits)
        ? [
            Object.freeze({
              pageNumber: page.pageNumber,
              hasStrongIdentifierLabel:
                /\b(?:DNI|NIF|N\.I\.F|IDENTIFICACION FISCAL)\b/u.test(
                  normalized,
                ) || new RegExp(`${digits}[A-Z]\\b`, "u").test(compactIdentity(line)),
              hasRoleLabel: /\b(?:OBLIGADO|DEUDOR)\b/u.test(normalized),
              looksLikeCurrencyAmount:
                /(?:€|\bEUR\b)/u.test(normalized) &&
                compactDigits.includes(`${digits}00`),
            }),
          ]
        : [];
    });
  });
  const labeled = occurrences.some(
    (item) => item.hasStrongIdentifierLabel && !item.looksLikeCurrencyAmount,
  );
  const repeatedRoleContext =
    new Set(
      occurrences
        .filter((item) => item.hasRoleLabel && !item.looksLikeCurrencyAmount)
        .map((item) => item.pageNumber),
    ).size > 1;
  if (!labeled && !repeatedRoleContext) return null;
  const pageNumbers = uniqueNumbers([
    ...field.sourcePageNumbers,
    ...occurrences.map((item) => item.pageNumber),
  ]).filter(
    (pageNumber) =>
      pageNumber >= document.pageFrom && pageNumber <= document.pageTo,
  );
  return Object.freeze({
    fieldId: field.fieldId,
    amountCents: field.amountCents,
    reason:
      new Set(occurrences.map((item) => item.pageNumber)).size > 1
        ? "TAX_IDENTIFIER_REPEATED_CONTEXT"
        : "TAX_IDENTIFIER_LABEL_CONTEXT",
    reclassifiedAs: "TAX_IDENTIFIER",
    sourcePageNumbers: Object.freeze(pageNumbers),
  });
}

function parseInstallmentField(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): FiscalNotificationReconciledInstallmentV1 | null {
  if (!INSTALLMENT_FIELD.test(field.fieldId)) return null;
  const sequence = /^Cuota ([1-9]\d*)$/u.exec(field.label)?.[1];
  const match = INSTALLMENT_VALUE.exec(field.displayValue);
  if (!sequence || !match) return null;
  const principalCents = moneyParts(match[2]!, match[3]!);
  const interestCents = moneyParts(match[4]!, match[5]!);
  const surchargeCents = match[6] && match[7]
    ? moneyParts(match[6], match[7])
    : 0;
  const totalCents = moneyParts(match[8]!, match[9]!);
  const difference = principalCents + interestCents + surchargeCents - totalCents;
  return Object.freeze({
    sequence: Number(sequence),
    dueDate: match[1]!.split("/").reverse().join("-"),
    principalCents,
    interestCents,
    surchargeCents,
    totalCents,
    sourceFieldId: field.fieldId,
    sourcePageNumbers: Object.freeze([...field.sourcePageNumbers]),
    equationStatus: equationStatus(difference, false),
    carriedForwardRoles: Object.freeze([]),
  });
}

function installmentEquation(
  installment: FiscalNotificationReconciledInstallmentV1,
): FiscalNotificationAmountEquationV1 {
  const pages = installment.sourcePageNumbers;
  const fieldIds = Object.freeze([installment.sourceFieldId]);
  const operands = Object.freeze([
    operand("PRINCIPAL", 1, installment.principalCents, fieldIds, pages),
    operand("INTEREST", 1, installment.interestCents, fieldIds, pages),
    operand("SURCHARGE", 1, installment.surchargeCents, fieldIds, pages),
  ]);
  const leftCents = operands.reduce(
    (sum, item) => sum + item.sign * item.amountCents,
    0,
  );
  return freezeEquation({
    equationId: `installment:${installment.sequence}`,
    formula: "INSTALLMENT_COMPONENTS_EQUAL_INSTALLMENT_TOTAL",
    scope: "INSTALLMENT",
    status: installment.equationStatus,
    leftCents,
    rightCents: installment.totalCents,
    operands,
    result: operand("TOTAL", 1, installment.totalCents, fieldIds, pages),
  });
}

function planTotals(
  installments: readonly FiscalNotificationReconciledInstallmentV1[],
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
): FiscalNotificationReconciledPlanTotalsV1 {
  const principal = sum(installments.map((item) => item.principalCents));
  const interest = sum(installments.map((item) => item.interestCents));
  const surcharge = sum(installments.map((item) => item.surchargeCents));
  const total = sum(installments.map((item) => item.totalCents));
  const printedPrincipal = findMoneyField(fields, ["PLAN_PRINCIPAL"], [
    "principal del plan",
    "principal total",
  ]);
  const printedInterest = findMoneyField(fields, ["PLAN_INTEREST"], [
    "intereses del plan",
    "intereses del aplazamiento",
    "intereses totales",
  ]);
  const printedSurcharge = findMoneyField(fields, ["PLAN_SURCHARGE"], [
    "recargo del plan",
    "recargo ejecutivo total",
  ]);
  const printedTotal = findMoneyField(fields, ["PLAN_TOTAL"], [
    "total del plan",
    "total programado",
  ]);
  const sources = [
    printedPrincipal,
    printedInterest,
    printedSurcharge,
    printedTotal,
  ].filter(
    (field): field is FiscalNotificationVerticalSliceReviewFieldV1 =>
      field !== null,
  );
  return Object.freeze({
    installmentCount: installments.length,
    principalCents: principal,
    interestCents: interest,
    surchargeCents: surcharge,
    totalCents: total,
    printedPrincipalCents: printedPrincipal?.amountCents ?? null,
    printedInterestCents: printedInterest?.amountCents ?? null,
    printedSurchargeCents: printedSurcharge?.amountCents ?? null,
    printedTotalCents: printedTotal?.amountCents ?? null,
    sourceFieldIds: Object.freeze(uniqueStrings([
      ...installments.map((item) => item.sourceFieldId),
      ...sources.map((field) => field.fieldId),
    ])),
    sourcePageNumbers: Object.freeze(uniqueNumbers([
      ...installments.flatMap((item) => item.sourcePageNumbers),
      ...sources.flatMap((field) => field.sourcePageNumbers),
    ])),
  });
}

function planTotalsEquations(
  totals: FiscalNotificationReconciledPlanTotalsV1,
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
): readonly FiscalNotificationAmountEquationV1[] {
  const fieldIds = Object.freeze([...totals.sourceFieldIds]);
  const pages = Object.freeze([...totals.sourcePageNumbers]);
  const componentTotal =
    totals.principalCents + totals.interestCents + totals.surchargeCents;
  const equations: FiscalNotificationAmountEquationV1[] = [freezeEquation({
    equationId: "plan-totals",
    formula: "INSTALLMENT_ROWS_EQUAL_PLAN_TOTALS",
    scope: "PLAN_TOTALS",
    status: equationStatus(componentTotal - totals.totalCents, false),
    leftCents: componentTotal,
    rightCents: totals.totalCents,
    operands: Object.freeze([
      operand("PRINCIPAL", 1, totals.principalCents, fieldIds, pages),
      operand("INTEREST", 1, totals.interestCents, fieldIds, pages),
      operand("SURCHARGE", 1, totals.surchargeCents, fieldIds, pages),
    ]),
    result: operand("TOTAL", 1, totals.totalCents, fieldIds, pages),
  })];
  const printedComparisons = [
    {
      formula: "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_PRINCIPAL" as const,
      role: "PRINCIPAL" as const,
      calculated: totals.principalCents,
      printed: totals.printedPrincipalCents,
      field: findMoneyField(fields, ["PLAN_PRINCIPAL"], [
        "principal del plan",
        "principal total",
      ]),
    },
    {
      formula: "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_INTEREST" as const,
      role: "INTEREST" as const,
      calculated: totals.interestCents,
      printed: totals.printedInterestCents,
      field: findMoneyField(fields, ["PLAN_INTEREST"], [
        "intereses del plan",
        "intereses del aplazamiento",
        "intereses totales",
      ]),
    },
    {
      formula: "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_SURCHARGE" as const,
      role: "SURCHARGE" as const,
      calculated: totals.surchargeCents,
      printed: totals.printedSurchargeCents,
      field: findMoneyField(fields, ["PLAN_SURCHARGE"], [
        "recargo del plan",
        "recargo ejecutivo total",
      ]),
    },
    {
      formula: "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_TOTAL" as const,
      role: "TOTAL" as const,
      calculated: totals.totalCents,
      printed: totals.printedTotalCents,
      field: findMoneyField(fields, ["PLAN_TOTAL"], [
        "total del plan",
        "total programado",
      ]),
    },
  ];
  for (const comparison of printedComparisons) {
    if (comparison.printed === null || comparison.field === null) continue;
    equations.push(
      freezeEquation({
        equationId: `plan-printed:${comparison.role.toLocaleLowerCase("en-US")}`,
        formula: comparison.formula,
        scope: "PLAN_TOTALS",
        status: equationStatus(
          comparison.calculated - comparison.printed,
          false,
        ),
        leftCents: comparison.calculated,
        rightCents: comparison.printed,
        operands: Object.freeze([
          operand(
            comparison.role,
            1,
            comparison.calculated,
            fieldIds,
            pages,
          ),
        ]),
        result: operand(
          comparison.role,
          1,
          comparison.printed,
          Object.freeze([comparison.field.fieldId]),
          comparison.field.sourcePageNumbers,
        ),
      }),
    );
  }
  return Object.freeze(equations);
}

function reconcileDocumentEquation(
  familyId: string,
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
): readonly FiscalNotificationAmountEquationV1[] {
  if (familyId === "collection.enforcement_order" || familyId === "collection.external_debt") {
    return bestEquation(
      "PRINCIPAL_PLUS_SURCHARGE_PLUS_INTEREST_PLUS_COSTS_MINUS_PAYMENTS_EQUALS_TOTAL",
      fields,
      [
        ["PRINCIPAL", 1],
        ["SURCHARGE", 1],
        ["INTEREST", 1],
        ["COSTS", 1],
        ["PAYMENT", -1],
      ],
      "TOTAL",
    );
  }
  if (familyId === "collection.offset_ex_officio" || familyId === "collection.offset_requested") {
    return bestEquation(
      "TOTAL_BEFORE_OFFSET_MINUS_OFFSET_EQUALS_REMAINING",
      fields,
      [
        ["TOTAL_BEFORE_OFFSET", 1],
        ["OFFSET", -1],
      ],
      "REMAINING",
    );
  }
  if (familyId.startsWith("assessment.")) {
    return bestEquation(
      "QUOTA_PLUS_INTEREST_EQUALS_TOTAL",
      fields,
      [
        ["QUOTA", 1],
        ["INTEREST", 1],
      ],
      "TOTAL",
    );
  }
  if (familyId.startsWith("sanction.")) {
    return bestEquation(
      "INITIAL_PENALTY_MINUS_REDUCTION_EQUALS_REDUCED_PENALTY",
      fields,
      [
        ["INITIAL_PENALTY", 1],
        ["PENALTY_REDUCTION", -1],
      ],
      "TOTAL",
    );
  }
  return Object.freeze([]);
}

function bestEquation(
  formula: FiscalNotificationAmountEquationFormulaV1,
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
  operandRoles: readonly (readonly [FiscalNotificationAmountRoleV1, 1 | -1])[],
  resultRole: FiscalNotificationAmountRoleV1,
): readonly FiscalNotificationAmountEquationV1[] {
  const roleCandidates = operandRoles.map(([role]) => moneyCandidates(fields, role));
  const requiredFirst = roleCandidates[0] ?? [];
  const resultCandidates = moneyCandidates(fields, resultRole);
  if (requiredFirst.length === 0 || resultCandidates.length === 0) {
    return Object.freeze([]);
  }
  let combinations: readonly (MoneyCandidateV1 | null)[][] = requiredFirst.map(
    (candidate) => [candidate],
  );
  for (let index = 1; index < roleCandidates.length; index += 1) {
    const optional = [null, ...roleCandidates[index]!];
    combinations = combinations.flatMap((combination) =>
      optional.map((candidate) => [...combination, candidate]),
    );
    if (combinations.length > MAX_COMBINATIONS) {
      combinations = combinations.slice(0, MAX_COMBINATIONS);
    }
  }
  const candidates: EquationCandidateV1[] = [];
  for (const combination of combinations) {
    const operands = combination.filter(
      (candidate): candidate is MoneyCandidateV1 => candidate !== null,
    );
    const leftCents = operands.reduce((total, candidate) => {
      const definition = operandRoles.find(([role]) => role === candidate.role);
      return total + (definition?.[1] ?? 1) * candidate.field.amountCents!;
    }, 0);
    for (const result of resultCandidates) {
      candidates.push({
        formula,
        operands,
        result,
        leftCents,
        rightCents: result.field.amountCents!,
      });
    }
  }
  if (candidates.length === 0) return Object.freeze([]);
  const sorted = [...candidates].sort(
    (left, right) =>
      Math.abs(left.leftCents - left.rightCents) -
        Math.abs(right.leftCents - right.rightCents) ||
      right.operands.length - left.operands.length,
  );
  const best = sorted[0]!;
  const bestDifference = Math.abs(best.leftCents - best.rightCents);
  const equallyBest = sorted.filter(
    (candidate) =>
      Math.abs(candidate.leftCents - candidate.rightCents) === bestDifference,
  );
  const ambiguous =
    bestDifference <= TOLERANCE_CENTS &&
    new Set(
      equallyBest.map((candidate) =>
        candidate.operands.map((item) => item.field.fieldId).sort().join("|"),
      ),
    ).size > 1;
  const operandValues = best.operands.map((candidate) => {
    const sign = operandRoles.find(([role]) => role === candidate.role)?.[1] ?? 1;
    return operand(
      candidate.role,
      sign,
      candidate.field.amountCents!,
      Object.freeze([candidate.field.fieldId]),
      candidate.field.sourcePageNumbers,
    );
  });
  return Object.freeze([
    freezeEquation({
      equationId: `document:${formula.toLocaleLowerCase("es-ES")}`,
      formula,
      scope: "DOCUMENT",
      status: equationStatus(best.leftCents - best.rightCents, ambiguous),
      leftCents: best.leftCents,
      rightCents: best.rightCents,
      operands: Object.freeze(operandValues),
      result: operand(
        resultRole,
        1,
        best.result.field.amountCents!,
        Object.freeze([best.result.field.fieldId]),
        best.result.field.sourcePageNumbers,
      ),
    }),
  ]);
}

function moneyCandidates(
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
  role: FiscalNotificationAmountRoleV1,
): readonly MoneyCandidateV1[] {
  return Object.freeze(
    fields.flatMap((field) =>
      field.semantic === "MONEY" &&
      field.amountCents !== null &&
      fieldRole(field) === role
        ? [Object.freeze({ field, role })]
        : [],
    ),
  );
}

function fieldRole(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): FiscalNotificationAmountRoleV1 | null {
  const id = normalizeText(field.fieldId);
  const label = normalizeText(field.label);
  if (/INITIAL_FINE|INITIAL_PENALTY|SANCTION_INITIAL/u.test(id)) return "INITIAL_PENALTY";
  if (/REDUCTION/u.test(id) && !/REDUCED_FINE|REDUCED_PENALTY/u.test(id)) return "PENALTY_REDUCTION";
  if (field.canonicalType === "TAX_QUOTA") return "QUOTA";
  if (
    field.canonicalType === "PRINCIPAL" ||
    field.canonicalType === "ORIGINAL_TAX_PRINCIPAL" ||
    field.canonicalType === "OUTSTANDING_PRINCIPAL"
  ) return "PRINCIPAL";
  if (
    field.canonicalType === "SURCHARGE" ||
    field.canonicalType === "EXECUTIVE_SURCHARGE" ||
    field.canonicalType === "EXECUTIVE_SURCHARGE_5" ||
    field.canonicalType === "EXECUTIVE_SURCHARGE_10" ||
    field.canonicalType === "EXECUTIVE_SURCHARGE_20"
  ) return "SURCHARGE";
  if (field.canonicalType === "DEFERRAL_INTEREST" || field.canonicalType === "LATE_INTEREST") return "INTEREST";
  if (field.canonicalType === "COSTS") return "COSTS";
  if (field.canonicalType === "PAYMENT_ON_ACCOUNT" || field.canonicalType === "TOTAL_PAID" || field.canonicalType === "PARTIAL_PAYMENT") return "PAYMENT";
  if (field.canonicalType === "COMPENSATED_AMOUNT" || field.canonicalType === "CREDIT_APPLIED") return "OFFSET";
  if (/TOTAL_BEFORE/u.test(id) || label.includes("TOTAL ANTES")) return "TOTAL_BEFORE_OFFSET";
  if (field.canonicalType === "TOTAL_PENDING" || label.includes("PENDIENTE DESPUES") || label.includes("PENDIENTE TRAS")) return "REMAINING";
  if (
    field.canonicalType === "TOTAL_CLAIMED" ||
    field.canonicalType === "PAYMENT_OPTION_AMOUNT" ||
    /REDUCED_FINE|REDUCED_PENALTY/u.test(id) ||
    label.includes("TOTAL A INGRESAR") ||
    label.includes("TOTAL DEL DOCUMENTO")
  ) return "TOTAL";
  return null;
}

function findMoneyField(
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
  fieldCodes: readonly string[],
  labels: readonly string[],
): FiscalNotificationVerticalSliceReviewFieldV1 | null {
  return (
    fields.find(
      (field) =>
        field.semantic === "MONEY" &&
        fieldCodes.some((code) => field.fieldId.includes(`:${code}:`)),
    ) ??
    fields.find(
      (field) =>
        field.semantic === "MONEY" &&
        labels.some((label) => normalizeText(label) === normalizeText(field.label)),
    ) ??
    null
  );
}

function freezeEquation(input: {
  readonly equationId: string;
  readonly formula: FiscalNotificationAmountEquationFormulaV1;
  readonly scope: FiscalNotificationAmountEquationV1["scope"];
  readonly status: FiscalNotificationAmountEquationStatusV1;
  readonly leftCents: number;
  readonly rightCents: number;
  readonly operands: readonly FiscalNotificationAmountOperandV1[];
  readonly result: FiscalNotificationAmountOperandV1;
}): FiscalNotificationAmountEquationV1 {
  const sourcePageNumbers = uniqueNumbers([
    ...input.operands.flatMap((item) => item.sourcePageNumbers),
    ...input.result.sourcePageNumbers,
  ]);
  return Object.freeze({
    ...input,
    toleranceCents: TOLERANCE_CENTS,
    differenceCents: input.leftCents - input.rightCents,
    sourcePageNumbers: Object.freeze(sourcePageNumbers),
  });
}

function operand(
  role: FiscalNotificationAmountRoleV1,
  sign: 1 | -1,
  amountCents: number,
  fieldIds: readonly string[],
  sourcePageNumbers: readonly number[],
): FiscalNotificationAmountOperandV1 {
  return Object.freeze({
    role,
    sign,
    amountCents,
    fieldIds: Object.freeze([...fieldIds]),
    sourcePageNumbers: Object.freeze([...sourcePageNumbers]),
  });
}

function equationStatus(
  differenceCents: number,
  ambiguous: boolean,
): FiscalNotificationAmountEquationStatusV1 {
  if (ambiguous) return "AMBIGUOUS_REVIEW_REQUIRED";
  if (differenceCents === 0) return "MATCHED";
  return Math.abs(differenceCents) <= TOLERANCE_CENTS
    ? "MATCHED_WITH_ROUNDING"
    : "MISMATCH_REVIEW_REQUIRED";
}

function moneyParts(integerPart: string, decimalPart: string): number {
  return Number(integerPart.replace(/\./gu, "")) * 100 + Number(decimalPart);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleUpperCase("es-ES")
    .trim();
}

function compactIdentity(value: string): string {
  return normalizeText(value).replace(/[^A-Z0-9]/gu, "");
}
