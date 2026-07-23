import { describe, expect, it } from "vitest";
import {
  fiscalNotificationV11FieldEvidenceIdV1,
  selectCanonicalFiscalNotificationMoneyV1,
} from "./canonical-money-projection.v1";
import type { FiscalNotificationMathematicalIntegrityV11 } from "./mathematical-integrity-contract.v11";

const RELEASE_ID = "aeat-mathematical-integrity.2026-07-21.v11" as const;

function integrity(input: {
  readonly quotaEvidenceId: string;
  readonly falseInterestEvidenceId: string;
  readonly correctInterestEvidenceId: string;
  readonly totalEvidenceId: string;
}): FiscalNotificationMathematicalIntegrityV11 {
  const evidence = (
    evidenceId: string,
    canonicalType: string,
    amountCents: number,
  ) =>
    Object.freeze({
      evidenceId,
      sourceFieldFingerprint: `sha256:${"a".repeat(64)}` as const,
      semantic: "MONEY" as const,
      canonicalType,
      originalClassification:
        canonicalType === "LATE_PAYMENT_INTEREST"
          ? "LATE_INTEREST"
          : canonicalType,
      amountCents,
      dateValue: null,
      countValue: null,
      sign: "POSITIVE" as const,
      currency: "EUR" as const,
      sourcePart: "MAIN_ADMINISTRATIVE_ACT" as const,
      pageNumbers: Object.freeze([1]),
      assertionType: "NORMALIZED" as const,
      originalConfidence: 0.98,
    });
  return Object.freeze({
    schemaVersion: 11,
    integrityVersion: "11.1.0",
    catalogReleaseId: RELEASE_ID,
    familyId: "assessment.final_provisional_assessment",
    archetypeId: "ASSESSMENT_FINAL",
    validationMode: "ARITHMETIC_AND_LOGICAL",
    status: "SEMANTIC_LABEL_INCONSISTENT",
    passCount: 2,
    automaticPassLimit: 2,
    normalizedEvidence: Object.freeze([
      evidence(input.quotaEvidenceId, "FINAL_QUOTA", 22_800),
      evidence(input.falseInterestEvidenceId, "LATE_PAYMENT_INTEREST", 22_800),
      evidence(input.correctInterestEvidenceId, "LATE_PAYMENT_INTEREST", 307),
      evidence(input.totalEvidenceId, "DOCUMENT_TOTAL", 23_107),
    ]),
    checks: Object.freeze([
      Object.freeze({
        ruleId: "v11:assessment-final:semantic-labels:1",
        checkKind: "STRUCTURAL" as const,
        status: "SEMANTIC_LABEL_INCONSISTENT" as const,
        operands: Object.freeze([
          { evidenceId: input.quotaEvidenceId },
          { evidenceId: input.falseInterestEvidenceId },
          { evidenceId: input.correctInterestEvidenceId },
          { evidenceId: input.totalEvidenceId },
        ]),
        expectedCents: null,
        observedCents: null,
        deltaCents: null,
        toleranceCents: 0,
        calculation: Object.freeze({ kind: "NONE" as const }),
        safeMessage:
          "Validación de etiquetas: hay importes incompatibles clasificados como intereses de demora.",
      }),
    ]),
    hardFailureCodes: Object.freeze([]),
    persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    relationSupport: Object.freeze({
      existingRelationsOnly: true,
      requiresStrongIdentifier: true,
      permitsAmountOnlyRelations: false,
      validatedEvidenceIds: Object.freeze([]),
    }),
    originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE",
    retainedSourceContent: "NONE",
  });
}

describe("canonical fiscal notification money projection v1", () => {
  it("descarta solo el candidato de interés señalado por evidencia V11", () => {
    const falseInterestEvidenceId =
      fiscalNotificationV11FieldEvidenceIdV1("amount:false-interest");
    const result = selectCanonicalFiscalNotificationMoneyV1({
      familyId: "assessment.final_provisional_assessment",
      money: [
        {
          kind: "FINAL_QUOTA",
          amountCents: 22_800,
          evidenceIds: [fiscalNotificationV11FieldEvidenceIdV1("amount:quota")],
        },
        {
          kind: "LATE_PAYMENT_INTEREST",
          amountCents: 22_800,
          evidenceIds: [falseInterestEvidenceId],
        },
        {
          kind: "LATE_PAYMENT_INTEREST",
          amountCents: 307,
          evidenceIds: [
            fiscalNotificationV11FieldEvidenceIdV1("amount:interest"),
          ],
        },
        {
          kind: "DOCUMENT_TOTAL",
          amountCents: 23_107,
          evidenceIds: [fiscalNotificationV11FieldEvidenceIdV1("amount:total")],
        },
        {
          kind: "LATE_PAYMENT_INTEREST",
          amountCents: 22_800,
          evidenceIds: [
            fiscalNotificationV11FieldEvidenceIdV1("amount:legitimate-same"),
          ],
        },
      ],
      mathematicalIntegrity: integrity({
        quotaEvidenceId: fiscalNotificationV11FieldEvidenceIdV1("amount:quota"),
        falseInterestEvidenceId,
        correctInterestEvidenceId:
          fiscalNotificationV11FieldEvidenceIdV1("amount:interest"),
        totalEvidenceId: fiscalNotificationV11FieldEvidenceIdV1("amount:total"),
      }),
    });

    expect(result).toHaveLength(4);
    expect(result).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceIds: [falseInterestEvidenceId] }),
      ]),
    );
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amountCents: 22_800,
          evidenceIds: [
            fiscalNotificationV11FieldEvidenceIdV1("amount:legitimate-same"),
          ],
        }),
      ]),
    );
  });

  it("no borra por igualdad de importe cuando no puede distinguir evidencia", () => {
    const result = selectCanonicalFiscalNotificationMoneyV1({
      familyId: "assessment.final_provisional_assessment",
      money: [
        { kind: "FINAL_QUOTA", amountCents: 22_800 },
        { kind: "LATE_PAYMENT_INTEREST", amountCents: 22_800 },
        { kind: "LATE_PAYMENT_INTEREST", amountCents: 22_800 },
        { kind: "LATE_PAYMENT_INTEREST", amountCents: 307 },
        { kind: "DOCUMENT_TOTAL", amountCents: 23_107 },
      ],
      mathematicalIntegrity: integrity({
        quotaEvidenceId: "math-v11:quota",
        falseInterestEvidenceId: "math-v11:false-interest",
        correctInterestEvidenceId: "math-v11:interest",
        totalEvidenceId: "math-v11:total",
      }),
    });

    expect(result).toHaveLength(5);
  });

  it("conserva fichas históricas sin V11 aunque contengan importes repetidos", () => {
    const money = [
      { kind: "FINAL_QUOTA", amountCents: 22_800 },
      { kind: "LATE_PAYMENT_INTEREST", amountCents: 22_800 },
      { kind: "LATE_PAYMENT_INTEREST", amountCents: 307 },
      { kind: "DOCUMENT_TOTAL", amountCents: 23_107 },
    ] as const;

    expect(
      selectCanonicalFiscalNotificationMoneyV1({
        familyId: "assessment.final_provisional_assessment",
        money,
        mathematicalIntegrity: null,
      }),
    ).toBe(money);
  });
});
