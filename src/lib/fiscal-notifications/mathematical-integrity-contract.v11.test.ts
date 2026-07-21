import { describe, expect, it } from "vitest";
import {
  AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11,
  AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
} from "./knowledge/mathematical-integrity-catalog.v11";
import {
  FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LEGACY_VERSION_V11,
  FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11,
  parseFiscalNotificationMathematicalIntegrityV11,
} from "./mathematical-integrity-contract.v11";

type Scenario = "POSITIVE" | "NEGATIVE" | "INCOMPLETE";

function fixture(archetypeId: string, scenario: Scenario) {
  const archetype = AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.archetypes.find(
    (candidate) => candidate.id === archetypeId,
  )!;
  const family = AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.find(
    (candidate) => candidate.archetypeId === archetypeId,
  )!;
  const arithmetic = family.validationMode === "ARITHMETIC_AND_LOGICAL";
  const evidenceId = `fixture:${archetype.id.toLowerCase()}:evidence`;
  const status =
    scenario === "NEGATIVE"
      ? "INCONSISTENT_PRINTED_VALUES"
      : scenario === "INCOMPLETE"
        ? arithmetic
          ? "VALIDATED_PARTIAL_COMPONENTS"
          : "REVIEW_REQUIRED"
        : arithmetic
          ? "VALIDATED_EXACT"
          : "NOT_APPLICABLE_NO_ARITHMETIC";
  const hasAmounts = arithmetic && scenario !== "INCOMPLETE";
  const resultEvidenceId = `${evidenceId}:result`;
  const primaryEvidence = {
    evidenceId,
    sourceFieldFingerprint: `sha256:${"b".repeat(64)}`,
    semantic: arithmetic ? "MONEY" : "DATE",
    canonicalType:
      (arithmetic ? family.moneyFields[0] : family.dateFields[0]) ??
      (arithmetic ? "DOCUMENT_TOTAL" : "ISSUE_DATE"),
    originalClassification: arithmetic ? "DOCUMENT_TOTAL" : "ISSUE_DATE",
    amountCents: arithmetic ? 10_000 : null,
    dateValue: arithmetic ? null : "2026-07-21",
    countValue: null,
    sign: arithmetic ? "POSITIVE" : "UNSPECIFIED",
    currency: arithmetic ? "EUR" : null,
    sourcePart: "MAIN_ADMINISTRATIVE_ACT",
    pageNumbers: [1],
    assertionType: "NORMALIZED",
    originalConfidence: 0.8,
  };
  const resultEvidence = {
    ...primaryEvidence,
    evidenceId: resultEvidenceId,
    sourceFieldFingerprint: `sha256:${"c".repeat(64)}`,
    canonicalType: "DOCUMENT_TOTAL",
    amountCents: scenario === "NEGATIVE" ? 10_100 : 10_000,
  };
  return {
    schemaVersion: 11,
    integrityVersion: FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11,
    catalogReleaseId: AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
    familyId: family.id,
    archetypeId: archetype.id,
    validationMode: family.validationMode,
    status,
    passCount: 1,
    automaticPassLimit: 2,
    normalizedEvidence:
      arithmetic && hasAmounts
        ? [primaryEvidence, resultEvidence]
        : [primaryEvidence],
    checks: [
      {
        ruleId: `v11:${archetype.id.toLowerCase()}:${scenario.toLowerCase()}`,
        checkKind: arithmetic ? "ARITHMETIC" : "STRUCTURAL",
        status,
        operands: hasAmounts
          ? [{ evidenceId }, { evidenceId: resultEvidenceId }]
          : [{ evidenceId }],
        expectedCents: hasAmounts ? 10_000 : null,
        observedCents:
          hasAmounts && scenario === "NEGATIVE"
            ? 10_100
            : hasAmounts
              ? 10_000
              : null,
        deltaCents:
          hasAmounts && scenario === "NEGATIVE" ? 100 : hasAmounts ? 0 : null,
        toleranceCents: arithmetic ? 1 : 0,
        calculation: hasAmounts
          ? {
              kind: "LINEAR_EQUALITY",
              resultEvidenceId,
              terms: [{ evidenceId, sign: 1 }],
            }
          : { kind: "NONE" },
        safeMessage:
          scenario === "NEGATIVE"
            ? "Las cifras impresas no son compatibles."
            : scenario === "INCOMPLETE"
              ? "Faltan componentes impresos por cuantificar."
              : arithmetic
                ? "Los importes cuadran con las cifras impresas."
                : "Este documento no requiere una comprobación aritmética.",
      },
    ],
    hardFailureCodes:
      scenario === "NEGATIVE"
        ? [
            arithmetic
              ? "IMPOSSIBLE_BASIC_PRINTED_SUM"
              : "INCOMPATIBLE_REFERENCE_OR_PART",
          ]
        : [],
    persistenceDecision:
      scenario === "NEGATIVE"
        ? "BLOCK_INCONSISTENT_PRINTED_CORE"
        : scenario === "INCOMPLETE"
          ? "ALLOW_CORE_WITH_WARNINGS"
          : "ALLOW_CORE",
    relationSupport: {
      existingRelationsOnly: true,
      requiresStrongIdentifier: true,
      permitsAmountOnlyRelations: false,
      validatedEvidenceIds: [],
    },
    originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE",
    retainedSourceContent: "NONE",
  };
}

describe("mathematical integrity contract V11", () => {
  it("parses positive, negative and incomplete synthetic fixtures for all 47 archetypes", () => {
    const scenarios = ["POSITIVE", "NEGATIVE", "INCOMPLETE"] as const;
    const parsed = AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.archetypes.flatMap(
      (archetype) =>
        scenarios.map((scenario) =>
          parseFiscalNotificationMathematicalIntegrityV11(
            fixture(archetype.id, scenario),
            1,
            1,
          ),
        ),
    );

    expect(parsed).toHaveLength(47 * 3);
    expect(new Set(parsed.map((item) => item.archetypeId))).toHaveLength(47);
    expect(
      parsed.every(
        (item) =>
          item.originalExtractionMutationPolicy === "NEVER_MUTATE_OR_REPLACE" &&
          item.retainedSourceContent === "NONE" &&
          item.relationSupport.permitsAmountOnlyRelations === false,
      ),
    ).toBe(true);
  });

  it("persists a semantic label conflict as a non-blocking warning", () => {
    const base = fixture("ASSESSMENT_RESULT", "POSITIVE");
    const parsed = parseFiscalNotificationMathematicalIntegrityV11(
      {
        ...base,
        status: "SEMANTIC_LABEL_INCONSISTENT",
        checks: base.checks.map((check) => ({
          ...check,
          checkKind: "STRUCTURAL",
          status: "SEMANTIC_LABEL_INCONSISTENT",
          operands: [{ evidenceId: base.normalizedEvidence[0]!.evidenceId }],
          expectedCents: null,
          observedCents: null,
          deltaCents: null,
          toleranceCents: 0,
          calculation: { kind: "NONE" },
          safeMessage:
            "Validación de etiquetas: hay importes incompatibles clasificados como intereses de demora.",
        })),
        persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
      },
      1,
      1,
    );

    expect(parsed).toMatchObject({
      status: "SEMANTIC_LABEL_INCONSISTENT",
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
    });
  });

  it("reads legacy 11.0 snapshots but reserves the new semantic status for 11.1", () => {
    const legacy = {
      ...fixture("ASSESSMENT_RESULT", "POSITIVE"),
      integrityVersion:
        FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LEGACY_VERSION_V11,
    };
    expect(
      parseFiscalNotificationMathematicalIntegrityV11(legacy, 1, 1)
        .integrityVersion,
    ).toBe(FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LEGACY_VERSION_V11);

    const semantic = fixture("ASSESSMENT_RESULT", "POSITIVE");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...semantic,
          integrityVersion:
            FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LEGACY_VERSION_V11,
          status: "SEMANTIC_LABEL_INCONSISTENT",
          checks: semantic.checks.map((check) => ({
            ...check,
            checkKind: "STRUCTURAL",
            status: "SEMANTIC_LABEL_INCONSISTENT",
            expectedCents: null,
            observedCents: null,
            deltaCents: null,
            calculation: { kind: "NONE" },
            safeMessage:
              "Validación de etiquetas: hay importes incompatibles clasificados como intereses de demora.",
          })),
          persistenceDecision: "ALLOW_CORE_WITH_WARNINGS",
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
  });

  it("rejects tampering, impossible dates, internal tokens and direct private data", () => {
    const valid = fixture("ENFORCEMENT_SCENARIOS", "POSITIVE");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        { ...valid, retainedSourceContent: "OCR" },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...valid,
          checks: [{ ...valid.checks[0], safeMessage: "EXACT_INTERNAL_RULE" }],
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...valid,
          checks: [{ ...valid.checks[0], safeMessage: "NIF 12345678Z" }],
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...valid,
          normalizedEvidence: [
            {
              ...valid.normalizedEvidence[0],
              canonicalType: "EXACT_TITLE_AND_AUTHORITY",
            },
          ],
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...valid,
          checks: [
            {
              ...valid.checks[0],
              expectedCents: 99_999,
              observedCents: 99_999,
              deltaCents: 0,
            },
          ],
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...valid,
          checks: [
            {
              ...valid.checks[0],
              safeMessage:
                "Nombre: Ana Perez. Telefono 612 345 678. Calle Mayor 12.",
            },
          ],
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...valid,
          checks: [
            {
              ...valid.checks[0],
              checkKind: "RELATION_SUPPORT",
              operands: [
                { evidenceId: valid.normalizedEvidence[0]!.evidenceId },
              ],
              expectedCents: null,
              observedCents: null,
              deltaCents: null,
              calculation: { kind: "NONE" },
            },
          ],
          relationSupport: {
            ...valid.relationSupport,
            validatedEvidenceIds: [valid.normalizedEvidence[0]!.evidenceId],
          },
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");

    const temporal = fixture("NOTIFICATION_TIMELINE", "POSITIVE");
    expect(() =>
      parseFiscalNotificationMathematicalIntegrityV11(
        {
          ...temporal,
          normalizedEvidence: [
            { ...temporal.normalizedEvidence[0], dateValue: "2026-02-31" },
          ],
        },
        1,
        1,
      ),
    ).toThrow("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
  });

  it("preserves a signed printed amount in the durable normalized evidence", () => {
    const valid = fixture("ENFORCEMENT_SCENARIOS", "POSITIVE");
    const parsed = parseFiscalNotificationMathematicalIntegrityV11(
      {
        ...valid,
        normalizedEvidence: valid.normalizedEvidence.map((evidence) => ({
          ...evidence,
          amountCents: -10_000,
          sign: "NEGATIVE",
        })),
        checks: valid.checks.map((check) => ({
          ...check,
          expectedCents: -10_000,
          observedCents: -10_000,
          deltaCents: 0,
        })),
      },
      1,
      1,
    );

    expect(parsed.normalizedEvidence[0]).toMatchObject({
      amountCents: -10_000,
      sign: "NEGATIVE",
    });
  });
});
