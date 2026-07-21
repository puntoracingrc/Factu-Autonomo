"use client";

import {
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_PRIVACY_SCOPE,
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_VERSION,
  EXPENSE_MATH_CHECKS,
  normalizeExpenseEngineObservationV1,
  type ExpenseEngineDurationBucketV1,
  type ExpenseEngineObservationV1,
} from "@/lib/expense-engine/contracts";
import {
  evaluateExpenseLocalCandidateV1,
  type ExpenseEngineEvaluationSnapshotV1,
} from "@/lib/expense-engine/evaluation.v1";
import {
  createExpenseLocalCandidateAbstainedOutcomeV1,
  type ExpenseLocalCandidateOutcomeV1,
} from "@/lib/expense-engine/local-candidate.v1";
import { extractExpenseCandidateFromReadingV1 } from "@/lib/expense-engine/local-extractor.v1";
import { expenseTotals, expenseTotalsFromBase } from "@/lib/expenses";
import type { Expense } from "@/lib/types";
import type { ExpenseScanPayload } from "./schema";
import { runExpenseLocalDocumentReaderShadowV1 } from "./local-document-reader-shadow.v1";

export const EXPENSE_LOCAL_SEMANTIC_SHADOW_SCHEMA_VERSION_V1 = 1 as const;
export const EXPENSE_LOCAL_SEMANTIC_SHADOW_VERSION_V1 = "1.0.0" as const;

export interface ExpenseLocalSemanticShadowRequestV1 {
  readonly ownerScope: string;
  readonly operationId: string;
  readonly documentId: string;
  readonly file: File;
}

export interface ExpenseLocalSemanticShadowCompletionV1 {
  readonly ai: ExpenseScanPayload;
  readonly human: Expense;
  readonly replayed: boolean;
}

export interface ExpenseLocalSemanticShadowHandleV1 {
  readonly schemaVersion: 1;
  readonly shadowVersion: "1.0.0";
  readonly mode: "SHADOW";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly existingResultPolicy: "UNCHANGED";
  complete(
    input: ExpenseLocalSemanticShadowCompletionV1,
  ): Promise<ExpenseEngineObservationV1 | null>;
  dispose(): void;
  toJSON(): undefined;
}

interface LocalSemanticRuntimeResultV1 {
  readonly local: ExpenseLocalCandidateOutcomeV1;
  readonly failed: boolean;
  readonly durationBucket: ExpenseEngineDurationBucketV1;
}

interface ExpenseLocalSemanticShadowDependenciesV1 {
  readonly runCandidate: (
    request: ExpenseLocalSemanticShadowRequestV1 & {
      readonly signal: AbortSignal;
    },
  ) => Promise<ExpenseLocalCandidateOutcomeV1>;
  readonly now: () => number;
}

const PRODUCTION_DEPENDENCIES: ExpenseLocalSemanticShadowDependenciesV1 =
  Object.freeze({
    runCandidate: async (
      request: ExpenseLocalSemanticShadowRequestV1 & {
        readonly signal: AbortSignal;
      },
    ) => {
      const reader = await runExpenseLocalDocumentReaderShadowV1(request);
      return extractExpenseCandidateFromReadingV1(reader.reading);
    },
    now: () => Date.now(),
  });

export function startExpenseLocalSemanticShadowV1(
  request: ExpenseLocalSemanticShadowRequestV1,
): ExpenseLocalSemanticShadowHandleV1 {
  return startWithDependencies(request, PRODUCTION_DEPENDENCIES);
}

export function completeExpenseLocalSemanticShadowV1(input: {
  readonly handle: ExpenseLocalSemanticShadowHandleV1;
  readonly ai: ExpenseScanPayload;
  readonly human: Expense;
  readonly replayed: boolean;
}): Promise<ExpenseEngineObservationV1 | null> {
  return input.handle.complete({
    ai: input.ai,
    human: input.human,
    replayed: input.replayed,
  });
}

function startWithDependencies(
  request: ExpenseLocalSemanticShadowRequestV1,
  dependencies: ExpenseLocalSemanticShadowDependenciesV1,
): ExpenseLocalSemanticShadowHandleV1 {
  const controller = new AbortController();
  const startedAt = safeNow(dependencies.now);
  let disposed = false;
  let completionStarted = false;

  const runtime = Promise.resolve()
    .then(() =>
      dependencies.runCandidate({
        ...request,
        signal: controller.signal,
      }),
    )
    .then<LocalSemanticRuntimeResultV1>((local) => ({
      local,
      failed: false,
      durationBucket: durationBucket(startedAt, safeNow(dependencies.now)),
    }))
    .catch<LocalSemanticRuntimeResultV1>(() => ({
      local: failedCandidate(),
      failed: true,
      durationBucket: durationBucket(startedAt, safeNow(dependencies.now)),
    }));

  const handle = Object.create(null) as ExpenseLocalSemanticShadowHandleV1;
  define(handle, "schemaVersion", EXPENSE_LOCAL_SEMANTIC_SHADOW_SCHEMA_VERSION_V1);
  define(handle, "shadowVersion", EXPENSE_LOCAL_SEMANTIC_SHADOW_VERSION_V1);
  define(handle, "mode", "SHADOW");
  define(handle, "persistencePolicy", "DO_NOT_PERSIST");
  define(handle, "existingResultPolicy", "UNCHANGED");
  define(handle, "dispose", () => {
    if (disposed) return;
    disposed = true;
    controller.abort();
  });
  define(
    handle,
    "complete",
    async (input: ExpenseLocalSemanticShadowCompletionV1) => {
      if (disposed || completionStarted) return null;
      completionStarted = true;
      if (input.replayed) {
        disposed = true;
        controller.abort();
        return null;
      }

      const resolved = await runtime;
      if (disposed) return null;
      disposed = true;
      controller.abort();
      try {
        return buildObservation(resolved, input.ai, input.human);
      } catch {
        return null;
      }
    },
  );
  define(handle, "toJSON", () => undefined);
  return Object.freeze(handle);
}

function buildObservation(
  runtime: LocalSemanticRuntimeResultV1,
  ai: ExpenseScanPayload,
  human: Expense,
): ExpenseEngineObservationV1 | null {
  const evaluation = evaluateExpenseLocalCandidateV1({
    local: runtime.local,
    ai: scanSnapshot(ai),
    human: expenseSnapshot(human),
  });
  const localAccepted = runtime.local.status === "CANDIDATE";
  const humanReviewStatus = evaluation.aiVsHuman.some((comparison) =>
    ["CORRECTED", "MISSING", "EXTRA"].includes(comparison.verdict),
  )
    ? "CORRECTED"
    : "CONFIRMED";

  return normalizeExpenseEngineObservationV1({
    schemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    policyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
    structuralArchetypeId: runtime.local.structuralArchetypeId,
    documentKind: runtime.local.documentKind,
    sourceQualityBucket: runtime.local.sourceQualityBucket,
    routeMode: "SHADOW_AI",
    localOutcome: runtime.failed
      ? "FAILED"
      : localAccepted
        ? "CANDIDATE"
        : "ABSTAINED",
    localConfidence: runtime.local.localConfidence,
    abstentionReason: localAccepted ? null : runtime.local.abstentionReason,
    aiFallbackUsed: !localAccepted,
    aiFallbackReason: localAccepted ? null : runtime.local.abstentionReason,
    aiUsageBucket: "ONE",
    localDurationBucket: runtime.durationBucket,
    humanReviewStatus,
    localVsHuman: evaluation.localVsHuman,
    aiVsHuman: evaluation.aiVsHuman,
    localVsAi: evaluation.localVsAi,
    math: runtime.local.math,
    criticalFlags: [],
    learningHints: null,
  });
}

function scanSnapshot(
  payload: ExpenseScanPayload,
): ExpenseEngineEvaluationSnapshotV1 {
  const totals = expenseTotalsFromBase(
    payload.expense.amount,
    payload.expense.ivaPercent,
  );
  return {
    documentKind: scanDocumentKind(payload),
    expenseDate: payload.expense.date,
    supplierIdentityPresent: Boolean(
      payload.supplier.name.trim() || payload.supplier.nif?.trim(),
    ),
    category: payload.expense.category,
    taxRate: totals.ivaPercent,
    taxBase: totals.base,
    taxAmount: totals.iva,
    totalAmount: totals.total,
    paymentMethod: payload.expense.paymentMethod,
    lines: payload.expense.purchaseLines?.map((line) => ({
      unit: line.unit,
      total: line.total,
    })),
  };
}

function expenseSnapshot(expense: Expense): ExpenseEngineEvaluationSnapshotV1 {
  const totals = expenseTotals(expense);
  return {
    documentKind:
      expense.businessKind === "quick_ticket" ? "TICKET" : "EXPENSE_INVOICE",
    expenseDate: expense.date,
    supplierIdentityPresent: Boolean(
      expense.supplierName.trim() ||
        expense.purchaseDocument?.supplierNif?.trim(),
    ),
    category: expense.category,
    taxRate: totals.ivaPercent,
    taxBase: totals.base,
    taxAmount: totals.iva,
    surchargeAmount: totals.recargoEquivalencia,
    totalAmount: totals.total,
    paymentMethod: expense.paymentMethod,
    lines: expense.purchaseLines?.map((line) => ({
      unit: line.unit,
      total: line.total,
    })),
  };
}

function scanDocumentKind(payload: ExpenseScanPayload) {
  switch (payload.document?.kind) {
    case "ticket":
      return "TICKET" as const;
    case "quote_or_order":
      return "QUOTE_OR_ORDER" as const;
    case "proforma":
      return "PROFORMA" as const;
    default:
      return "EXPENSE_INVOICE" as const;
  }
}

function failedCandidate(): ExpenseLocalCandidateOutcomeV1 {
  return createExpenseLocalCandidateAbstainedOutcomeV1({
    metadata: {
      structuralArchetypeId: "UNKNOWN",
      documentKind: "OTHER",
      sourceQualityBucket: "UNREADABLE",
      localConfidence: "LOW",
      math: EXPENSE_MATH_CHECKS.map((check) => ({
        check,
        verdict: "INSUFFICIENT" as const,
        residual: "UNKNOWN" as const,
      })),
    },
    reason: "UNKNOWN",
  });
}

function durationBucket(
  startedAt: number,
  completedAt: number,
): ExpenseEngineDurationBucketV1 {
  const elapsed = completedAt - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < 0) return "UNKNOWN";
  if (elapsed < 250) return "LT_250_MS";
  if (elapsed < 1_000) return "LT_1_S";
  if (elapsed < 5_000) return "LT_5_S";
  return "GTE_5_S";
}

function safeNow(now: () => number): number {
  try {
    return now();
  } catch {
    return Number.NaN;
  }
}

function define(target: object, key: PropertyKey, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: false,
    configurable: false,
  });
}

export const EXPENSE_LOCAL_SEMANTIC_SHADOW_TEST_SEAM =
  process.env.NODE_ENV === "test"
    ? Object.freeze({ startWithDependencies })
    : null;
