import { roundMoney, roundMoneySymmetric } from "./calculations";
import { isFixedExpense } from "./expense-classification";
import { sha256Hex } from "./document-integrity/snapshot-hash";
import {
  expenseFiscalAmounts,
  expensePurchaseLineBaseTotal,
  expenseTotalsFromBase,
  resolveExpenseEquivalenceSurcharge,
  resolveExpenseVat,
} from "./expenses";
import type {
  AppData,
  Expense,
  ExpenseWorkAllocation,
  ExpenseWorkAllocationCostRepair,
} from "./types";

export const EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION = 1 as const;
export const EXPENSE_WORK_ALLOCATION_REPAIR_KIND =
  "provider_summary_equivalence_surcharge_v1" as const;

const MONEY_TOLERANCE = 0.02;
const SHARE_TOLERANCE = 0.011;

export type ExpenseWorkAllocationRepairReviewReason =
  | "repair_state_changed"
  | "duplicate_expense_id"
  | "invalid_expense_id"
  | "fiscal_evidence_blocked"
  | "fixed_expense"
  | "invalid_allocation"
  | "allocation_provenance_present"
  | "invalid_purchase_lines"
  | "line_base_mismatch"
  | "incomplete_line_coverage"
  | "duplicate_line_coverage"
  | "unknown_line_coverage"
  | "missing_work_document"
  | "allocation_sign_mismatch"
  | "legacy_total_mismatch"
  | "allocation_share_mismatch"
  | "canonical_cost_mismatch";

export interface ExpenseWorkAllocationRepairCandidate {
  expenseId: string;
  supplierName: string;
  description: string;
  legacyOperatingCost: number;
  canonicalOperatingCost: number;
  workDocumentIds: string[];
  beforeFingerprint: string;
  afterFingerprint: string;
  beforeAllocations: ExpenseWorkAllocation[];
  afterAllocations: ExpenseWorkAllocation[];
}

export interface ExpenseWorkAllocationRepairReviewItem {
  expenseId: string;
  reasons: ExpenseWorkAllocationRepairReviewReason[];
}

export interface ExpenseWorkAllocationRepairPreview {
  schemaVersion: typeof EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION;
  candidates: ExpenseWorkAllocationRepairCandidate[];
  affectedCount: number;
  affectedExpenseIds: string[];
  manualReview: ExpenseWorkAllocationRepairReviewItem[];
  alreadyAppliedExpenseIds: string[];
}

export interface ExpenseWorkAllocationRollbackCandidate {
  expenseId: string;
  supplierName: string;
  description: string;
  legacyOperatingCost: number;
  canonicalOperatingCost: number;
  beforeFingerprint: string;
  afterFingerprint: string;
}

export interface ExpenseWorkAllocationRollbackPreview {
  schemaVersion: typeof EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION;
  candidates: ExpenseWorkAllocationRollbackCandidate[];
  affectedCount: number;
  affectedExpenseIds: string[];
  blockedExpenseIds: string[];
}

export interface ExpenseWorkAllocationRepairApplyResult {
  data: AppData;
  appliedExpenseIds: string[];
  skippedExpenseIds: string[];
}

export interface ExpenseWorkAllocationRepairRollbackResult {
  data: AppData;
  rolledBackExpenseIds: string[];
  skippedExpenseIds: string[];
}

interface ExpenseLineEvidence {
  id: string;
  magnitude: number;
}

interface CandidateResult {
  candidate?: ExpenseWorkAllocationRepairCandidate;
  reasons?: ExpenseWorkAllocationRepairReviewReason[];
}

function moneyEquals(
  left: number,
  right: number,
  tolerance = MONEY_TOLERANCE,
): boolean {
  return Math.abs(left - right) <= tolerance;
}

function cloneAllocation(
  allocation: ExpenseWorkAllocation,
): ExpenseWorkAllocation {
  return {
    ...allocation,
    ...(Array.isArray(allocation.includedLineIds)
      ? { includedLineIds: [...allocation.includedLineIds] }
      : {}),
  };
}

function cloneAllocations(
  allocations: readonly ExpenseWorkAllocation[],
): ExpenseWorkAllocation[] {
  return allocations.map(cloneAllocation);
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value
      .map((entry) => stableSerialize(entry === undefined ? null : entry))
      .join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? "null" : serialized;
}

function allocationsEqual(
  left: readonly ExpenseWorkAllocation[] | undefined,
  right: readonly ExpenseWorkAllocation[] | undefined,
): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

function isRepairRecord(
  value: Expense["workAllocationCostRepair"],
): value is ExpenseWorkAllocationCostRepair {
  return (
    value?.schemaVersion === EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION &&
    value.kind === EXPENSE_WORK_ALLOCATION_REPAIR_KIND &&
    typeof value.repairId === "string" &&
    value.repairId.length > 0 &&
    (value.status === "applied" || value.status === "rolled_back") &&
    Number.isFinite(value.legacyOperatingCost) &&
    Number.isFinite(value.canonicalOperatingCost) &&
    typeof value.beforeFingerprint === "string" &&
    typeof value.afterFingerprint === "string" &&
    Array.isArray(value.beforeAllocations) &&
    Array.isArray(value.afterAllocations) &&
    Array.isArray(value.events) &&
    value.events.length > 0 &&
    value.events.every(
      (event, index) =>
        (event.action === "applied" || event.action === "rolled_back") &&
        event.action === (index % 2 === 0 ? "applied" : "rolled_back") &&
        typeof event.at === "string" &&
        event.at.length > 0,
    ) &&
    value.events[value.events.length - 1]?.action ===
      (value.status === "applied" ? "applied" : "rolled_back")
  );
}

function isPotentialLegacySurchargeExpense(expense: Expense): boolean {
  const summary = expense.providerSummary;
  return Boolean(
    summary?.status === "pending_original" &&
      summary.summaryRecargoAmount === undefined &&
      summary.summaryRecargoPercent === undefined &&
      Number.isFinite(summary.summaryInvoiceTotal) &&
      Number.isFinite(summary.summaryIvaAmount) &&
      Array.isArray(expense.workAllocations) &&
      expense.workAllocations.length > 0,
  );
}

function repairFingerprint(
  expense: Expense,
  allocations: readonly ExpenseWorkAllocation[],
  legacyOperatingCost: number,
  canonicalOperatingCost: number,
): string {
  const fiscal = expenseFiscalAmounts(expense);
  const { workAllocationCostRepair, ...expenseWithoutRepair } = expense;
  void workAllocationCostRepair;
  const canonical = stableSerialize({
    schemaVersion: EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION,
    expense: {
      ...expenseWithoutRepair,
      workAllocations: allocations,
    },
    legacyOperatingCost,
    canonicalOperatingCost,
    fiscal,
  });
  return `sha256:${sha256Hex(canonical)}`;
}

function legacyOperatingCostBeforeP226(expense: Expense): {
  legacyOperatingCost: number;
  canonicalOperatingCost: number;
} | null {
  const surcharge = resolveExpenseEquivalenceSurcharge(expense);
  const vat = resolveExpenseVat(expense);
  const fiscal = expenseFiscalAmounts(expense);
  if (
    surcharge.source !== "legacy_summary_total" ||
    surcharge.blocked ||
    surcharge.amount === 0 ||
    vat.blocked ||
    fiscal.vatBlocked ||
    fiscal.registeredEquivalenceSurcharge === undefined ||
    fiscal.deductibleIva !== 0
  ) {
    return null;
  }

  const legacyHeader = expenseTotalsFromBase(
    expense.amount,
    expense.ivaPercent,
  );
  const legacyIva =
    vat.source === "lines"
      ? roundMoneySymmetric(
          vat.breakdown.reduce((total, row) => total + row.iva, 0),
        )
      : legacyHeader.iva;
  const legacyOperatingCost = fiscal.deductible
    ? vat.base
    : roundMoneySymmetric(vat.base + legacyIva);
  const canonicalOperatingCost = fiscal.operatingCost;
  const expectedCanonical = roundMoneySymmetric(
    vat.base + fiscal.registeredIva + surcharge.amount,
  );
  const expectedDelta = roundMoneySymmetric(
    (fiscal.deductible ? fiscal.registeredIva : fiscal.registeredIva - legacyIva) +
      surcharge.amount,
  );

  if (
    legacyOperatingCost === 0 ||
    canonicalOperatingCost === 0 ||
    Math.sign(legacyOperatingCost) !== Math.sign(canonicalOperatingCost) ||
    Math.abs(canonicalOperatingCost) <= Math.abs(legacyOperatingCost) ||
    !moneyEquals(canonicalOperatingCost, fiscal.registeredTotal) ||
    !moneyEquals(canonicalOperatingCost, expectedCanonical) ||
    !moneyEquals(
      roundMoneySymmetric(canonicalOperatingCost - legacyOperatingCost),
      expectedDelta,
    )
  ) {
    return null;
  }

  return { legacyOperatingCost, canonicalOperatingCost };
}

function rawAllocations(
  expense: Expense,
):
  | { ok: true; allocations: ExpenseWorkAllocation[] }
  | { ok: false; reason: ExpenseWorkAllocationRepairReviewReason } {
  if (!Array.isArray(expense.workAllocations) || expense.workAllocations.length === 0) {
    return { ok: false, reason: "invalid_allocation" };
  }

  const documentIds = new Set<string>();
  for (const allocation of expense.workAllocations) {
    if (
      !allocation ||
      typeof allocation.workDocumentId !== "string" ||
      !allocation.workDocumentId.trim() ||
      allocation.workDocumentId !== allocation.workDocumentId.trim() ||
      documentIds.has(allocation.workDocumentId) ||
      !Number.isFinite(allocation.amount) ||
      allocation.amount === 0 ||
      typeof allocation.allocatedAt !== "string" ||
      !allocation.allocatedAt ||
      (allocation.updatedAt !== undefined &&
        typeof allocation.updatedAt !== "string")
    ) {
      return { ok: false, reason: "invalid_allocation" };
    }
    if (allocation.fullAmountAtAllocation !== undefined) {
      return { ok: false, reason: "allocation_provenance_present" };
    }
    documentIds.add(allocation.workDocumentId);
  }

  if (
    !expense.workDocumentId ||
    expense.workDocumentId !== expense.workAllocations[0]?.workDocumentId
  ) {
    return { ok: false, reason: "invalid_allocation" };
  }

  return { ok: true, allocations: cloneAllocations(expense.workAllocations) };
}

function lineEvidence(
  expense: Expense,
  legacyOperatingCost: number,
):
  | { ok: true; lines: ExpenseLineEvidence[]; totalMagnitude: number }
  | { ok: false; reason: ExpenseWorkAllocationRepairReviewReason } {
  if (!Array.isArray(expense.purchaseLines) || expense.purchaseLines.length === 0) {
    return { ok: false, reason: "invalid_purchase_lines" };
  }

  const ids = new Set<string>();
  const lines: ExpenseLineEvidence[] = [];
  for (const line of expense.purchaseLines) {
    const rawId = typeof line?.id === "string" ? line.id : "";
    const id = rawId.trim();
    const hasInvalidExplicitTotal =
      line?.total !== undefined &&
      (!Number.isFinite(line.total) || line.total === 0);
    const hasInvalidCalculatedBase =
      line?.total === undefined &&
      (!Number.isFinite(line?.quantity) ||
        !Number.isFinite(line?.unitPrice) ||
        (line?.discountPercent !== undefined &&
          (!Number.isFinite(line.discountPercent) ||
            line.discountPercent < 0 ||
            line.discountPercent > 100)));
    const base = line ? expensePurchaseLineBaseTotal(line) : 0;
    if (
      !id ||
      rawId !== id ||
      ids.has(id) ||
      hasInvalidExplicitTotal ||
      hasInvalidCalculatedBase ||
      !Number.isFinite(base) ||
      base === 0 ||
      Math.sign(base) !== Math.sign(legacyOperatingCost)
    ) {
      return { ok: false, reason: "invalid_purchase_lines" };
    }
    ids.add(id);
    lines.push({ id, magnitude: Math.abs(base) });
  }

  const totalMagnitude = lines.reduce((total, line) => total + line.magnitude, 0);
  const registeredBase = Math.abs(expenseFiscalAmounts(expense).registeredBase);
  if (
    !Number.isFinite(totalMagnitude) ||
    totalMagnitude === 0 ||
    !moneyEquals(totalMagnitude, registeredBase)
  ) {
    return { ok: false, reason: "line_base_mismatch" };
  }
  return { ok: true, lines, totalMagnitude };
}

function allocationWeights(
  allocations: readonly ExpenseWorkAllocation[],
  lines: readonly ExpenseLineEvidence[],
):
  | { ok: true; weights: number[] }
  | { ok: false; reason: ExpenseWorkAllocationRepairReviewReason } {
  const lineMagnitude = new Map(lines.map((line) => [line.id, line.magnitude]));
  const covered = new Set<string>();
  const weights: number[] = [];

  for (const allocation of allocations) {
    if (
      !Array.isArray(allocation.includedLineIds) ||
      allocation.includedLineIds.length === 0
    ) {
      return { ok: false, reason: "incomplete_line_coverage" };
    }
    const localIds = new Set<string>();
    let weight = 0;
    for (const lineId of allocation.includedLineIds) {
      if (
        typeof lineId !== "string" ||
        !lineId.trim() ||
        lineId !== lineId.trim() ||
        !lineMagnitude.has(lineId)
      ) {
        return { ok: false, reason: "unknown_line_coverage" };
      }
      if (localIds.has(lineId) || covered.has(lineId)) {
        return { ok: false, reason: "duplicate_line_coverage" };
      }
      localIds.add(lineId);
      covered.add(lineId);
      weight += lineMagnitude.get(lineId) ?? 0;
    }
    weights.push(weight);
  }

  if (covered.size !== lines.length) {
    return { ok: false, reason: "incomplete_line_coverage" };
  }
  return { ok: true, weights };
}

function largestRemainderAmounts(total: number, weights: readonly number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return weights.map(() => 0);

  const totalCents = Math.round(Math.abs(total) * 100);
  const shares = weights.map((weight, index) => {
    const rawCents = (totalCents * weight) / totalWeight;
    const cents = Math.floor(rawCents);
    return { index, cents, remainder: rawCents - cents };
  });
  let remaining = totalCents - shares.reduce((sum, share) => sum + share.cents, 0);
  const ranked = [...shares].sort(
    (left, right) =>
      right.remainder - left.remainder || left.index - right.index,
  );
  for (let index = 0; index < ranked.length && remaining > 0; index += 1) {
    ranked[index]!.cents += 1;
    remaining -= 1;
    if (index === ranked.length - 1 && remaining > 0) index = -1;
  }

  const sign = total < 0 ? -1 : 1;
  return shares
    .sort((left, right) => left.index - right.index)
    .map((share) => roundMoneySymmetric(sign * (share.cents / 100)));
}

function historicalAllocationAmounts(
  total: number,
  weights: readonly number[],
  totalWeight: number,
): number[] {
  const fullMagnitude = Math.abs(total);
  const sign = total < 0 ? -1 : 1;
  let allocatedMagnitude = 0;
  return weights.map((weight) => {
    const requested = roundMoney(total * (weight / totalWeight));
    const available = Math.max(
      0,
      roundMoney(fullMagnitude - allocatedMagnitude),
    );
    const amount = roundMoney(
      sign * Math.min(Math.abs(requested), available),
    );
    allocatedMagnitude += Math.abs(amount);
    return amount;
  });
}

function detectCandidate(data: AppData, expense: Expense): CandidateResult {
  if (!isPotentialLegacySurchargeExpense(expense)) return {};

  const surcharge = resolveExpenseEquivalenceSurcharge(expense);
  if (surcharge.source === "none" || surcharge.source === "provider_summary") {
    return {};
  }
  if (surcharge.source === "blocked" || surcharge.blocked) {
    return { reasons: ["fiscal_evidence_blocked"] };
  }
  if (isFixedExpense(expense)) return { reasons: ["fixed_expense"] };

  const costs = legacyOperatingCostBeforeP226(expense);
  if (!costs) return { reasons: ["fiscal_evidence_blocked"] };

  const allocationsResult = rawAllocations(expense);
  if (!allocationsResult.ok) return { reasons: [allocationsResult.reason] };
  const allocations = allocationsResult.allocations;

  const documentCounts = new Map<string, number>();
  for (const document of data.documents) {
    documentCounts.set(document.id, (documentCounts.get(document.id) ?? 0) + 1);
  }
  if (
    allocations.some(
      (allocation) => documentCounts.get(allocation.workDocumentId) !== 1,
    )
  ) {
    return { reasons: ["missing_work_document"] };
  }
  if (
    allocations.some(
      (allocation) =>
        Math.sign(allocation.amount) !== Math.sign(costs.legacyOperatingCost),
    )
  ) {
    return { reasons: ["allocation_sign_mismatch"] };
  }

  const linesResult = lineEvidence(expense, costs.legacyOperatingCost);
  if (!linesResult.ok) return { reasons: [linesResult.reason] };
  const weightsResult = allocationWeights(allocations, linesResult.lines);
  if (!weightsResult.ok) return { reasons: [weightsResult.reason] };
  const weights = weightsResult.weights;

  const allocatedTotal = roundMoneySymmetric(
    allocations.reduce((total, allocation) => total + allocation.amount, 0),
  );
  if (!moneyEquals(allocatedTotal, costs.legacyOperatingCost)) {
    return { reasons: ["legacy_total_mismatch"] };
  }

  const historicalAmounts = historicalAllocationAmounts(
    costs.legacyOperatingCost,
    weights,
    linesResult.totalMagnitude,
  );
  const hasShareMismatch = allocations.some((allocation, index) =>
    !moneyEquals(
      allocation.amount,
      historicalAmounts[index] ?? 0,
      SHARE_TOLERANCE,
    ),
  );
  if (hasShareMismatch) {
    return { reasons: ["allocation_share_mismatch"] };
  }

  const repairedAmounts = largestRemainderAmounts(
    costs.canonicalOperatingCost,
    weights,
  );
  if (
    !moneyEquals(
      repairedAmounts.reduce((total, amount) => total + amount, 0),
      costs.canonicalOperatingCost,
      0.001,
    )
  ) {
    return { reasons: ["canonical_cost_mismatch"] };
  }

  const beforeAllocations = cloneAllocations(allocations);
  const afterAllocations = allocations.map((allocation, index) => ({
    ...cloneAllocation(allocation),
    amount: repairedAmounts[index] ?? 0,
    fullAmountAtAllocation: costs.canonicalOperatingCost,
  }));
  const beforeFingerprint = repairFingerprint(
    expense,
    beforeAllocations,
    costs.legacyOperatingCost,
    costs.canonicalOperatingCost,
  );
  const afterFingerprint = repairFingerprint(
    { ...expense, workAllocations: afterAllocations },
    afterAllocations,
    costs.legacyOperatingCost,
    costs.canonicalOperatingCost,
  );
  const candidate: ExpenseWorkAllocationRepairCandidate = {
    expenseId: expense.id,
    supplierName: expense.supplierName,
    description: expense.description,
    legacyOperatingCost: costs.legacyOperatingCost,
    canonicalOperatingCost: costs.canonicalOperatingCost,
    workDocumentIds: allocations.map((allocation) => allocation.workDocumentId),
    beforeFingerprint,
    afterFingerprint,
    beforeAllocations,
    afterAllocations,
  };

  const previousRepair = expense.workAllocationCostRepair;
  if (previousRepair?.status === "rolled_back") {
    if (
      !isRepairRecord(previousRepair) ||
      previousRepair.beforeFingerprint !== candidate.beforeFingerprint ||
      previousRepair.afterFingerprint !== candidate.afterFingerprint ||
      previousRepair.legacyOperatingCost !== candidate.legacyOperatingCost ||
      previousRepair.canonicalOperatingCost !== candidate.canonicalOperatingCost ||
      !allocationsEqual(previousRepair.beforeAllocations, candidate.beforeAllocations) ||
      !allocationsEqual(previousRepair.afterAllocations, candidate.afterAllocations)
    ) {
      return { reasons: ["repair_state_changed"] };
    }
  }

  return { candidate };
}

function repairRecordMatchesDomainPlan(
  data: AppData,
  expense: Expense,
  repair: ExpenseWorkAllocationCostRepair,
): boolean {
  const beforeExpense: Expense = {
    ...expense,
    workAllocations: cloneAllocations(repair.beforeAllocations),
    workAllocationCostRepair: undefined,
  };
  const candidate = detectCandidate(data, beforeExpense).candidate;
  return Boolean(
    candidate &&
      repair.repairId === `aud-p2-26-work-allocation:${expense.id}:v1` &&
      candidate.beforeFingerprint === repair.beforeFingerprint &&
      candidate.afterFingerprint === repair.afterFingerprint &&
      candidate.legacyOperatingCost === repair.legacyOperatingCost &&
      candidate.canonicalOperatingCost === repair.canonicalOperatingCost &&
      allocationsEqual(candidate.beforeAllocations, repair.beforeAllocations) &&
      allocationsEqual(candidate.afterAllocations, repair.afterAllocations),
  );
}

export function buildExpenseWorkAllocationRepairPreview(
  data: AppData,
): ExpenseWorkAllocationRepairPreview {
  const candidates: ExpenseWorkAllocationRepairCandidate[] = [];
  const manualReview: ExpenseWorkAllocationRepairReviewItem[] = [];
  const alreadyAppliedExpenseIds: string[] = [];
  const expenseIdCounts = new Map<string, number>();
  for (const expense of data.expenses) {
    expenseIdCounts.set(expense.id, (expenseIdCounts.get(expense.id) ?? 0) + 1);
  }

  for (const expense of data.expenses) {
    const repair = expense.workAllocationCostRepair;
    if (!expense.id.trim() || expense.id !== expense.id.trim()) {
      if (isPotentialLegacySurchargeExpense(expense) || repair) {
        manualReview.push({
          expenseId: expense.id,
          reasons: ["invalid_expense_id"],
        });
      }
      continue;
    }
    if ((expenseIdCounts.get(expense.id) ?? 0) !== 1) {
      if (isPotentialLegacySurchargeExpense(expense) || repair) {
        manualReview.push({
          expenseId: expense.id,
          reasons: ["duplicate_expense_id"],
        });
      }
      continue;
    }
    if (repair && !isRepairRecord(repair)) {
      manualReview.push({
        expenseId: expense.id,
        reasons: ["repair_state_changed"],
      });
      continue;
    }
    if (repair?.status === "applied") {
      if (
        repairRecordMatchesDomainPlan(data, expense, repair) &&
        allocationsEqual(expense.workAllocations, repair.afterAllocations) &&
        repairFingerprint(
          expense,
          repair.afterAllocations,
          repair.legacyOperatingCost,
          repair.canonicalOperatingCost,
        ) === repair.afterFingerprint
      ) {
        alreadyAppliedExpenseIds.push(expense.id);
      } else {
        manualReview.push({
          expenseId: expense.id,
          reasons: ["repair_state_changed"],
        });
      }
      continue;
    }
    if (repair?.status === "rolled_back") {
      if (
        !repairRecordMatchesDomainPlan(data, expense, repair) ||
        !allocationsEqual(expense.workAllocations, repair.beforeAllocations) ||
        repairFingerprint(
          expense,
          repair.beforeAllocations,
          repair.legacyOperatingCost,
          repair.canonicalOperatingCost,
        ) !== repair.beforeFingerprint
      ) {
        manualReview.push({
          expenseId: expense.id,
          reasons: ["repair_state_changed"],
        });
        continue;
      }
    }

    const detected = detectCandidate(data, expense);
    if (detected.candidate) candidates.push(detected.candidate);
    if (detected.reasons?.length) {
      manualReview.push({ expenseId: expense.id, reasons: detected.reasons });
    }
  }

  return {
    schemaVersion: EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION,
    candidates,
    affectedCount: candidates.length,
    affectedExpenseIds: candidates.map((candidate) => candidate.expenseId),
    manualReview,
    alreadyAppliedExpenseIds,
  };
}

export function buildExpenseWorkAllocationRollbackPreview(
  data: AppData,
): ExpenseWorkAllocationRollbackPreview {
  const candidates: ExpenseWorkAllocationRollbackCandidate[] = [];
  const blockedExpenseIds = new Set<string>();
  const expenseIdCounts = new Map<string, number>();
  for (const expense of data.expenses) {
    expenseIdCounts.set(expense.id, (expenseIdCounts.get(expense.id) ?? 0) + 1);
  }

  for (const expense of data.expenses) {
    const repair = expense.workAllocationCostRepair;
    if (!repair || repair.status !== "applied") continue;
    if (!expense.id.trim() || expense.id !== expense.id.trim()) {
      blockedExpenseIds.add(expense.id);
      continue;
    }
    if ((expenseIdCounts.get(expense.id) ?? 0) !== 1) {
      blockedExpenseIds.add(expense.id);
      continue;
    }
    if (
      !isRepairRecord(repair) ||
      !repairRecordMatchesDomainPlan(data, expense, repair) ||
      !allocationsEqual(expense.workAllocations, repair.afterAllocations) ||
      repairFingerprint(
        expense,
        repair.afterAllocations,
        repair.legacyOperatingCost,
        repair.canonicalOperatingCost,
      ) !== repair.afterFingerprint
    ) {
      blockedExpenseIds.add(expense.id);
      continue;
    }
    candidates.push({
      expenseId: expense.id,
      supplierName: expense.supplierName,
      description: expense.description,
      legacyOperatingCost: repair.legacyOperatingCost,
      canonicalOperatingCost: repair.canonicalOperatingCost,
      beforeFingerprint: repair.beforeFingerprint,
      afterFingerprint: repair.afterFingerprint,
    });
  }

  return {
    schemaVersion: EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION,
    candidates,
    affectedCount: candidates.length,
    affectedExpenseIds: candidates.map((candidate) => candidate.expenseId),
    blockedExpenseIds: [...blockedExpenseIds],
  };
}

export function applyExpenseWorkAllocationCostRepair(
  data: AppData,
  preview: ExpenseWorkAllocationRepairPreview,
  now: string,
): ExpenseWorkAllocationRepairApplyResult {
  const requested = new Map(
    preview.candidates.map((candidate) => [candidate.expenseId, candidate]),
  );
  const fresh = new Map(
    buildExpenseWorkAllocationRepairPreview(data).candidates.map((candidate) => [
      candidate.expenseId,
      candidate,
    ]),
  );
  const staleExpenseIds = [...requested].flatMap(([expenseId, expected]) => {
    const current = fresh.get(expenseId);
    return !current ||
      current.beforeFingerprint !== expected.beforeFingerprint ||
      current.afterFingerprint !== expected.afterFingerprint
      ? [expenseId]
      : [];
  });
  if (staleExpenseIds.length > 0) {
    return {
      data,
      appliedExpenseIds: [],
      skippedExpenseIds: [...requested.keys()],
    };
  }

  const appliedExpenseIds: string[] = [];

  const expenses = data.expenses.map((expense) => {
    const expected = requested.get(expense.id);
    if (!expected) return expense;
    const current = fresh.get(expense.id)!;

    const previousRepair = expense.workAllocationCostRepair;
    const repair: ExpenseWorkAllocationCostRepair =
      previousRepair?.status === "rolled_back" && isRepairRecord(previousRepair)
        ? {
            ...previousRepair,
            status: "applied",
            events: [...previousRepair.events, { action: "applied", at: now }],
          }
        : {
            schemaVersion: EXPENSE_WORK_ALLOCATION_REPAIR_SCHEMA_VERSION,
            kind: EXPENSE_WORK_ALLOCATION_REPAIR_KIND,
            repairId: `aud-p2-26-work-allocation:${expense.id}:v1`,
            status: "applied",
            legacyOperatingCost: current.legacyOperatingCost,
            canonicalOperatingCost: current.canonicalOperatingCost,
            beforeFingerprint: current.beforeFingerprint,
            afterFingerprint: current.afterFingerprint,
            beforeAllocations: cloneAllocations(current.beforeAllocations),
            afterAllocations: cloneAllocations(current.afterAllocations),
            events: [{ action: "applied", at: now }],
          };
    appliedExpenseIds.push(expense.id);
    return {
      ...expense,
      workAllocations: cloneAllocations(repair.afterAllocations),
      workAllocationCostRepair: repair,
    };
  });

  return {
    data: appliedExpenseIds.length > 0 ? { ...data, expenses } : data,
    appliedExpenseIds,
    skippedExpenseIds: [],
  };
}

export function rollbackExpenseWorkAllocationCostRepair(
  data: AppData,
  preview: ExpenseWorkAllocationRollbackPreview,
  now: string,
): ExpenseWorkAllocationRepairRollbackResult {
  const requested = new Map(
    preview.candidates.map((candidate) => [candidate.expenseId, candidate]),
  );
  const fresh = new Map(
    buildExpenseWorkAllocationRollbackPreview(data).candidates.map((candidate) => [
      candidate.expenseId,
      candidate,
    ]),
  );
  const staleExpenseIds = [...requested].flatMap(([expenseId, expected]) => {
    const current = fresh.get(expenseId);
    return !current ||
      current.afterFingerprint !== expected.afterFingerprint ||
      current.beforeFingerprint !== expected.beforeFingerprint
      ? [expenseId]
      : [];
  });
  if (staleExpenseIds.length > 0) {
    return {
      data,
      rolledBackExpenseIds: [],
      skippedExpenseIds: [...requested.keys()],
    };
  }

  const rolledBackExpenseIds: string[] = [];

  const expenses = data.expenses.map((expense) => {
    const expected = requested.get(expense.id);
    if (!expected) return expense;
    const current = fresh.get(expense.id)!;
    const repair = expense.workAllocationCostRepair;
    if (
      !repair ||
      !isRepairRecord(repair) ||
      current.afterFingerprint !== expected.afterFingerprint ||
      current.beforeFingerprint !== expected.beforeFingerprint
    ) {
      throw new Error("Invariante rota tras validar el rollback de repartos");
    }

    rolledBackExpenseIds.push(expense.id);
    const rolledBackRepair: ExpenseWorkAllocationCostRepair = {
      ...repair,
      status: "rolled_back",
      events: [...repair.events, { action: "rolled_back", at: now }],
    };
    return {
      ...expense,
      workAllocations: cloneAllocations(repair.beforeAllocations),
      workAllocationCostRepair: rolledBackRepair,
    };
  });

  return {
    data: rolledBackExpenseIds.length > 0 ? { ...data, expenses } : data,
    rolledBackExpenseIds,
    skippedExpenseIds: [],
  };
}
