import type { ExtractedFact, TemporalScope } from "./contracts";

export const FISCAL_EVIDENCE_RECONCILIATION_VERSION =
  "fiscal-evidence-reconciliation.2026-07.v1" as const;

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
  return JSON.stringify(left.normalizedValue) === JSON.stringify(right.normalizedValue);
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
        SCOPE_PRIORITY[right.temporalScope] - SCOPE_PRIORITY[left.temporalScope] ||
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
