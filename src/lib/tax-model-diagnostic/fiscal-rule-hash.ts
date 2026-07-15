import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";

import type {
  FiscalExclusionCandidate,
  FiscalSourceSnapshot,
  TaxModelNumber,
} from "./contracts";

export const FISCAL_RULE_HASH_VERSION = "fiscal-rule-v1" as const;

export interface FiscalRuleHashInput {
  ruleId: string;
  model: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  territory: "ES_COMMON";
  effectiveFrom: string;
  effectiveTo: string | null;
  conditions: readonly string[];
  factIds: readonly string[];
  result: string;
  exclusions: readonly string[];
  exclusionCandidates: readonly FiscalExclusionCandidate[];
  sourceSnapshots: readonly FiscalSourceSnapshot[];
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

/**
 * Serialización fiscal canónica. Excluye comentarios, revisores, fechas de
 * revisión, UI y métricas; incluye únicamente material que puede cambiar la
 * decisión o su fundamento normativo.
 */
export function canonicalizeFiscalRuleDecision(
  input: FiscalRuleHashInput,
): string {
  return JSON.stringify({
    schema: FISCAL_RULE_HASH_VERSION,
    ruleId: input.ruleId,
    model: input.model,
    fiscalYear: input.fiscalYear,
    territory: input.territory,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    conditions: sorted(input.conditions),
    factIds: sorted(input.factIds),
    result: input.result,
    exclusions: sorted(input.exclusions),
    exclusionCandidates: [...input.exclusionCandidates]
      .map((candidate) => ({
        exclusionId: candidate.exclusionId,
        description: candidate.description,
        effectType: candidate.effectType,
        model: candidate.model,
        conditions: sorted(candidate.conditions),
        exceptionIds: sorted(candidate.exceptionIds),
        sourceIds: sorted(candidate.sourceIds),
      }))
      .sort((left, right) =>
        left.exclusionId.localeCompare(right.exclusionId),
      ),
    sources: [...input.sourceSnapshots]
      .map((source) => ({
        sourceId: source.sourceId,
        authority: source.authority,
        officialLocator: source.officialLocator,
        effectiveFrom: source.effectiveFrom,
        effectiveTo: source.effectiveTo,
        snapshotHash: source.snapshotHash,
        materialScope: source.materialScope,
      }))
      .sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  });
}

export function computeFiscalRuleHash(input: FiscalRuleHashInput): string {
  return `${FISCAL_RULE_HASH_VERSION}:${sha256Hex(
    canonicalizeFiscalRuleDecision(input),
  )}`;
}

