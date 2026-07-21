import { describe, expect, it } from "vitest";
import { parseFiscalNotificationAmountReconciliationV1 } from "./amount-reconciliation-contract.v1";

function operand(role: "PRINCIPAL" | "TOTAL", amountCents: number) {
  return {
    role,
    sign: 1,
    amountCents,
    fieldIds: [`field:${role.toLocaleLowerCase("en-US")}`],
    sourcePageNumbers: [1],
  };
}

function validReconciliation() {
  return {
    schemaVersion: 1,
    reconciliationVersion: "1.0.0",
    status: "MATCHED",
    passCount: 1,
    automaticPassLimit: 2,
    toleranceCents: 1,
    equations: [
      {
        equationId: "installment:1",
        formula: "INSTALLMENT_COMPONENTS_EQUAL_INSTALLMENT_TOTAL",
        scope: "INSTALLMENT",
        status: "MATCHED",
        toleranceCents: 1,
        leftCents: 100,
        rightCents: 100,
        differenceCents: 0,
        operands: [operand("PRINCIPAL", 100)],
        result: operand("TOTAL", 100),
        sourcePageNumbers: [1],
      },
    ],
    discardedCandidates: [],
    installments: [
      {
        sequence: 1,
        dueDate: "2026-06-22",
        principalCents: 100,
        interestCents: 0,
        surchargeCents: 0,
        totalCents: 100,
        sourceFieldId: "field:installment:1",
        sourcePageNumbers: [1],
        equationStatus: "MATCHED",
        carriedForwardRoles: [],
      },
    ],
    totals: {
      installmentCount: 1,
      principalCents: 100,
      interestCents: 0,
      surchargeCents: 0,
      totalCents: 100,
      printedPrincipalCents: null,
      printedInterestCents: null,
      printedSurchargeCents: null,
      printedTotalCents: null,
      sourceFieldIds: ["field:installment:1"],
      sourcePageNumbers: [1],
    },
    confidenceEffect: "RAISED_FOR_MATCHED_FIELDS",
    requiresManualReview: false,
    numericMutationPolicy: "NEVER_CHANGE_EXTRACTED_VALUES",
  };
}

describe("fiscal notification amount reconciliation contract v1", () => {
  it("rejects a persisted equation whose status contradicts its difference", () => {
    const value = validReconciliation();
    value.equations[0]!.rightCents = 101;
    value.equations[0]!.differenceCents = -1;

    expect(() =>
      parseFiscalNotificationAmountReconciliationV1(value, 1, 1),
    ).toThrow("INVALID_FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_V1");
  });

  it("rejects persisted plan totals that are not the sum of their rows", () => {
    const value = validReconciliation();
    value.totals!.principalCents = 101;

    expect(() =>
      parseFiscalNotificationAmountReconciliationV1(value, 1, 1),
    ).toThrow("INVALID_FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_V1");
  });
});
