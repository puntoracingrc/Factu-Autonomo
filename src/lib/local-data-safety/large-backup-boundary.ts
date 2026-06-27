import { customersFrom, documentsFrom } from "./helpers";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D64_LARGE_BACKUP_BOUNDARY_MODEL_V1

export type LargeBackupBoundaryStatus =
  | "within_limits"
  | "near_limit"
  | "over_limit"
  | "manual_review_required";

export interface LargeBackupBoundaryOptions {
  maxDocuments?: number;
  maxCustomers?: number;
  maxEstimatedBytes?: number;
  nearLimitRatio?: number;
  generatedAt?: string;
}

export interface LargeBackupBoundaryAssessment {
  marker: "PHASE2D64_LARGE_BACKUP_BOUNDARY_MODEL_V1";
  generatedAt: string;
  status: LargeBackupBoundaryStatus;
  counts: {
    documents: number;
    customers: number;
    estimatedBytes: number;
  };
  limits: Required<Omit<LargeBackupBoundaryOptions, "generatedAt">>;
  reasons: string[];
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

export interface LargeBackupBoundarySummary {
  status: LargeBackupBoundaryStatus;
  counts: LargeBackupBoundaryAssessment["counts"];
  reasons: string[];
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

function estimateBytes(appData: LocalDataSafetyAppData): number {
  return JSON.stringify(appData).length;
}

export function evaluateLargeBackupBoundary(
  appData: LocalDataSafetyAppData,
  options: LargeBackupBoundaryOptions = {},
): LargeBackupBoundaryAssessment {
  const limits: Required<Omit<LargeBackupBoundaryOptions, "generatedAt">> = {
    maxDocuments: options.maxDocuments ?? 1000,
    maxCustomers: options.maxCustomers ?? 1000,
    maxEstimatedBytes: options.maxEstimatedBytes ?? 1_000_000,
    nearLimitRatio: options.nearLimitRatio ?? 0.8,
  };
  const counts = {
    documents: documentsFrom(appData).length,
    customers: customersFrom(appData).length,
    estimatedBytes: estimateBytes(appData),
  };
  const reasons: string[] = [];
  if (counts.documents > limits.maxDocuments) reasons.push("documents_over_limit");
  if (counts.customers > limits.maxCustomers) reasons.push("customers_over_limit");
  if (counts.estimatedBytes > limits.maxEstimatedBytes) reasons.push("estimated_size_over_limit");
  if (counts.documents === 0 && counts.customers === 0) reasons.push("empty_or_partial_backup_requires_review");

  let status: LargeBackupBoundaryStatus = "within_limits";
  if (reasons.some((reason) => reason.includes("over_limit"))) status = "over_limit";
  else if (reasons.length > 0) status = "manual_review_required";
  else if (
    counts.documents >= limits.maxDocuments * limits.nearLimitRatio ||
    counts.customers >= limits.maxCustomers * limits.nearLimitRatio ||
    counts.estimatedBytes >= limits.maxEstimatedBytes * limits.nearLimitRatio
  ) {
    status = "near_limit";
    reasons.push("near_configured_limit");
  }

  return {
    marker: "PHASE2D64_LARGE_BACKUP_BOUNDARY_MODEL_V1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    status,
    counts,
    limits,
    reasons,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}

export function summarizeLargeBackupBoundary(
  assessment: LargeBackupBoundaryAssessment,
): LargeBackupBoundarySummary {
  return {
    status: assessment.status,
    counts: { ...assessment.counts },
    reasons: [...assessment.reasons],
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
