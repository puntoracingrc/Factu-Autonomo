import type {
  ExtractedFact,
  FiscalDocumentExtractionResult,
  FiscalDocumentType,
  TaxDocumentModelCode,
  TemporalScope,
} from "./contracts";

export const FISCAL_EVIDENCE_RECONCILIATION_VERSION =
  "fiscal-evidence-reconciliation.2026-07.v2" as const;

export type CrossDocumentReconciliationState =
  | "CONSISTENT_POSITIVE"
  | "COMPLEMENTARY_EVIDENCE"
  | "PARTIAL_EVIDENCE"
  | "NO_COMPARABLE_FACTS";

export interface CrossDocumentReconciliation {
  reconciliationId: string;
  leftDocumentIds: readonly string[];
  rightDocumentIds: readonly string[];
  comparedFactTypes: readonly string[];
  state: CrossDocumentReconciliationState;
  severity: "INFORMATION" | "SOFT_RECONCILIATION";
  explanation: string;
}

interface PairDefinition {
  id: string;
  leftModels?: readonly TaxDocumentModelCode[];
  rightModels?: readonly TaxDocumentModelCode[];
  leftTypes?: readonly FiscalDocumentType[];
  rightTypes?: readonly FiscalDocumentType[];
  leftFactTypes: readonly string[];
  rightFactTypes: readonly string[];
}

const CROSS_DOCUMENT_PAIRS: readonly PairDefinition[] = [
  {
    id: "111-vs-190",
    leftModels: ["111"],
    rightModels: ["190"],
    leftFactTypes: [
      "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
      "WITHHOLDING.OTHER_IRPF_RECIPIENTS",
    ],
    rightFactTypes: [
      "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
      "WITHHOLDING.OTHER_IRPF_RECIPIENTS",
      "WITHHOLDING.EMPLOYEES",
    ],
  },
  {
    id: "115-vs-180",
    leftModels: ["115"],
    rightModels: ["180"],
    leftFactTypes: ["WITHHOLDING.RENT"],
    rightFactTypes: ["WITHHOLDING.RENT"],
  },
  {
    id: "123-vs-193",
    leftModels: ["123"],
    rightModels: ["193"],
    leftFactTypes: ["WITHHOLDING.CAPITAL"],
    rightFactTypes: ["WITHHOLDING.CAPITAL"],
  },
  {
    id: "216-vs-296",
    leftModels: ["216"],
    rightModels: ["296"],
    leftFactTypes: ["WITHHOLDING.NON_RESIDENTS"],
    rightFactTypes: ["WITHHOLDING.NON_RESIDENTS"],
  },
  {
    id: "303-vs-390",
    leftModels: ["303"],
    rightModels: ["390"],
    leftFactTypes: ["VAT.REGIMES", "VAT.REVERSE_CHARGE"],
    rightFactTypes: ["VAT.REGIMES"],
  },
  {
    id: "303-vs-349",
    leftModels: ["303"],
    rightModels: ["349"],
    leftFactTypes: ["EU.OPERATIONS"],
    rightFactTypes: ["EU.OPERATIONS"],
  },
  {
    id: "035-vs-369",
    leftModels: ["035"],
    rightModels: ["369"],
    leftFactTypes: ["ECOMMERCE.OSS_IOSS_REGISTRATION"],
    rightFactTypes: ["ECOMMERCE.OSS_IOSS_OPERATIONS"],
  },
  {
    id: "036-vs-current-census",
    leftModels: ["036"],
    rightTypes: ["CURRENT_CENSUS_CERTIFICATE"],
    leftFactTypes: [
      "ACTIVITY.LIST",
      "IRPF.METHOD",
      "VAT.REGIMES",
      "SUBJECT.TAX_TERRITORY",
    ],
    rightFactTypes: [
      "ACTIVITY.LIST",
      "IRPF.METHOD",
      "VAT.REGIMES",
      "SUBJECT.TAX_TERRITORY",
    ],
  },
  {
    id: "036-vs-obligations",
    leftModels: ["036"],
    rightTypes: ["AEAT_OBLIGATIONS_VIEW"],
    leftFactTypes: ["CENSUS.EVENT"],
    rightFactTypes: ["CENSUS.PERIODIC_OBLIGATIONS"],
  },
  {
    id: "aeat-vs-tgss",
    leftTypes: ["CURRENT_CENSUS_CERTIFICATE", "AEAT_ECONOMIC_ACTIVITIES_VIEW"],
    rightTypes: [
      "TGSS_CURRENT_STATUS_REPORT",
      "TGSS_EMPLOYMENT_HISTORY",
      "TGSS_SELF_EMPLOYED_ACTIVITIES",
    ],
    leftFactTypes: ["ACTIVITY.LIST", "CENSUS.CURRENT_STATUS"],
    rightFactTypes: ["IRPF.RETA_PERIODS", "ACTIVITY.LIST"],
  },
] as const;

const SCOPE_PRIORITY: Readonly<Record<TemporalScope, number>> = {
  CURRENT_AS_OF_DATE: 100,
  TARGET_FISCAL_YEAR: 80,
  SPECIFIC_PERIOD: 70,
  HISTORICAL: 40,
  FUTURE_INTENTION: 20,
};

function dateScore(fact: ExtractedFact): number {
  const value = fact.effectiveFrom ? Date.parse(fact.effectiveFrom) : 0;
  return Number.isFinite(value) ? value : 0;
}

function sameValue(left: ExtractedFact, right: ExtractedFact): boolean {
  return (
    JSON.stringify(left.normalizedValue) ===
    JSON.stringify(right.normalizedValue)
  );
}

/** Reconciliación no destructiva: conserva toda fuente y solo añade relaciones. */
export function reconcileExtractedFacts(
  input: readonly ExtractedFact[],
): readonly ExtractedFact[] {
  const facts = input.map((fact) => ({ ...fact }));
  const groups = new Map<string, number[]>();
  facts.forEach((fact, index) => {
    groups.set(fact.factType, [...(groups.get(fact.factType) ?? []), index]);
  });

  for (const indexes of groups.values()) {
    const ordered = [...indexes].sort((leftIndex, rightIndex) => {
      const left = facts[leftIndex];
      const right = facts[rightIndex];
      return (
        SCOPE_PRIORITY[right.temporalScope] -
          SCOPE_PRIORITY[left.temporalScope] ||
        dateScore(right) - dateScore(left)
      );
    });
    const newest = facts[ordered[0]];
    for (const index of ordered.slice(1)) {
      const fact = facts[index];
      if (sameValue(fact, newest)) continue;
      const samePriority =
        SCOPE_PRIORITY[fact.temporalScope] ===
        SCOPE_PRIORITY[newest.temporalScope];
      const sameDate = dateScore(fact) === dateScore(newest);
      if (samePriority && sameDate) {
        facts[index] = {
          ...fact,
          status: "CONFLICT",
          conflictsWith: [...new Set([...fact.conflictsWith, newest.factId])],
        };
        const newestIndex = ordered[0];
        facts[newestIndex] = {
          ...facts[newestIndex],
          status: "CONFLICT",
          conflictsWith: [
            ...new Set([...facts[newestIndex].conflictsWith, fact.factId]),
          ],
        };
      } else {
        facts[index] = { ...fact, supersededBy: newest.factId };
      }
    }
  }
  return facts;
}

function matchesSide(
  result: FiscalDocumentExtractionResult,
  models: readonly TaxDocumentModelCode[] | undefined,
  types: readonly FiscalDocumentType[] | undefined,
): boolean {
  return Boolean(
    (result.envelope.detectedModel &&
      models?.includes(result.envelope.detectedModel)) ||
    (result.envelope.detectedDocumentType &&
      types?.includes(result.envelope.detectedDocumentType)),
  );
}

function positiveFacts(
  results: readonly FiscalDocumentExtractionResult[],
  factTypes: readonly string[],
): ExtractedFact[] {
  return results.flatMap((result) =>
    result.facts.filter(
      (fact) =>
        factTypes.includes(fact.factType) &&
        fact.status !== "UNREADABLE" &&
        fact.status !== "UNSUPPORTED",
    ),
  );
}

/**
 * Compara familias de documentos sin convertir la falta de un hecho en un
 * valor negativo. El resultado informa o pide revisión; nunca borra fuentes ni
 * bloquea por sí solo una propuesta.
 */
export function reconcileFiscalDocumentResults(
  results: readonly FiscalDocumentExtractionResult[],
): readonly CrossDocumentReconciliation[] {
  const output: CrossDocumentReconciliation[] = [];
  for (const pair of CROSS_DOCUMENT_PAIRS) {
    const left = results.filter((result) =>
      matchesSide(result, pair.leftModels, pair.leftTypes),
    );
    const right = results.filter((result) =>
      matchesSide(result, pair.rightModels, pair.rightTypes),
    );
    if (left.length === 0 || right.length === 0) continue;
    const leftFacts = positiveFacts(left, pair.leftFactTypes);
    const rightFacts = positiveFacts(right, pair.rightFactTypes);
    const sameSemanticType = leftFacts.some((leftFact) =>
      rightFacts.some((rightFact) => rightFact.factType === leftFact.factType),
    );
    const bothHaveEvidence = leftFacts.length > 0 && rightFacts.length > 0;
    const state: CrossDocumentReconciliationState = sameSemanticType
      ? "CONSISTENT_POSITIVE"
      : bothHaveEvidence
        ? "COMPLEMENTARY_EVIDENCE"
        : leftFacts.length > 0 || rightFacts.length > 0
          ? "PARTIAL_EVIDENCE"
          : "NO_COMPARABLE_FACTS";
    const severity =
      state === "PARTIAL_EVIDENCE" || state === "NO_COMPARABLE_FACTS"
        ? "SOFT_RECONCILIATION"
        : "INFORMATION";
    output.push({
      reconciliationId: pair.id,
      leftDocumentIds: left.map((result) => result.envelope.documentId),
      rightDocumentIds: right.map((result) => result.envelope.documentId),
      comparedFactTypes: [
        ...new Set([...pair.leftFactTypes, ...pair.rightFactTypes]),
      ],
      state,
      severity,
      explanation:
        state === "CONSISTENT_POSITIVE"
          ? "Ambas fuentes contienen evidencia positiva de la misma categoría."
          : state === "COMPLEMENTARY_EVIDENCE"
            ? "Las fuentes contienen hechos complementarios y no deben fusionarse como si fueran el mismo dato."
            : state === "PARTIAL_EVIDENCE"
              ? "Solo una de las fuentes contiene el hecho positivo comparable; la ausencia en la otra no equivale a No."
              : "Los documentos están presentes, pero no contienen hechos positivos comparables con seguridad.",
    });
  }
  return output;
}
