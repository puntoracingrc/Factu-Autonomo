import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";

import type {
  FiscalMaterialSourceReference,
  FiscalRuleMaterialSnapshot,
} from "./contracts";

export const FISCAL_APPROVAL_HASH_VERSION = "fiscal-approval-rule-v1" as const;

export interface FiscalApprovalHashInput {
  ruleId: string;
  model: string;
  fiscalYear: number;
  territory: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  conditions: readonly string[];
  factIds: readonly string[];
  decision: string;
  exceptions: readonly string[];
  exclusionIds: readonly string[];
  materialSources: readonly FiscalMaterialSourceReference[];
  materialTestHash: string;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort(compareText);
}

/**
 * Serializa exclusivamente la decisión fiscal material. No incluye orden de
 * interfaz, comentarios, timestamps, métricas ni identidades de revisión.
 */
export function canonicalizeFiscalApprovalRule(
  input: FiscalApprovalHashInput,
): string {
  return JSON.stringify({
    schema: FISCAL_APPROVAL_HASH_VERSION,
    ruleId: input.ruleId,
    model: input.model,
    fiscalYear: input.fiscalYear,
    territory: input.territory,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    conditions: sorted(input.conditions),
    factIds: sorted(input.factIds),
    decision: input.decision,
    exceptions: sorted(input.exceptions),
    exclusionIds: sorted(input.exclusionIds),
    materialSources: [...input.materialSources]
      .map((source) => ({
        sourceId: source.sourceId,
        contentHash: source.contentHash,
        normalizedContentHash: source.normalizedContentHash,
        effectiveFrom: source.effectiveFrom,
        effectiveTo: source.effectiveTo,
        materialScope: source.materialScope,
      }))
      .sort((left, right) => compareText(left.sourceId, right.sourceId)),
    materialTestHash: input.materialTestHash,
  });
}

export function computeFiscalApprovalRuleHash(
  input: FiscalApprovalHashInput,
): string {
  return `${FISCAL_APPROVAL_HASH_VERSION}:${sha256Hex(
    canonicalizeFiscalApprovalRule(input),
  )}`;
}

export function buildFiscalRuleMaterialSnapshot(
  input: FiscalApprovalHashInput,
): FiscalRuleMaterialSnapshot {
  return Object.freeze({
    ...input,
    conditions: Object.freeze([...input.conditions]),
    factIds: Object.freeze([...input.factIds]),
    exceptions: Object.freeze([...input.exceptions]),
    exclusionIds: Object.freeze([...input.exclusionIds]),
    materialSources: Object.freeze(
      input.materialSources.map((source) => Object.freeze({ ...source })),
    ),
    fiscalHash: computeFiscalApprovalRuleHash(input),
  });
}
