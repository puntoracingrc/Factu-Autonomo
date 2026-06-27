import { documentKind, documentsFrom, isProtectedDocument, stringValue } from "./helpers";
import type { LocalDataSafetyAppData, LocalDataSafetyDocumentLike } from "./types";

// PHASE2D59_NUMBERING_COUNTERS_RISK_ANALYZER_V1

export type NumberingCountersRiskId =
  | "incoming_counter_lower_than_current"
  | "incoming_counter_higher_unexpectedly"
  | "emitted_number_conflict"
  | "same_series_year_collision"
  | "missing_series"
  | "legacy_numbering_unknown"
  | "gaps_around_issued_documents";

export interface NumberingCountersRisk {
  id: NumberingCountersRiskId;
  severity: "info" | "warning" | "blocked";
  message: string;
  refs: string[];
}

export interface NumberingCountersRiskAssessment {
  marker: "PHASE2D59_NUMBERING_COUNTERS_RISK_ANALYZER_V1";
  generatedAt: string;
  risks: NumberingCountersRisk[];
  manualReviewRequired: boolean;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

export interface NumberingCountersRiskSummary {
  riskIds: NumberingCountersRiskId[];
  highestSeverity: "info" | "warning" | "blocked";
  manualReviewRequired: boolean;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

function counterValue(data: LocalDataSafetyAppData, key: string): number | undefined {
  const counters = data.counters as Record<string, unknown> | undefined;
  const value = counters?.[key];
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof (value as { next?: unknown }).next === "number") {
    return (value as { next: number }).next;
  }
  return undefined;
}

function seriesKey(document: LocalDataSafetyDocumentLike): string {
  return [
    documentKind(document),
    stringValue(document.year) ?? "unknown_year",
    stringValue(document.number) ?? "missing_number",
  ].join(":");
}

function addRisk(
  risks: NumberingCountersRisk[],
  id: NumberingCountersRiskId,
  severity: NumberingCountersRisk["severity"],
  message: string,
  refs: string[] = [],
): void {
  if (!risks.some((risk) => risk.id === id && risk.refs.join("|") === refs.join("|"))) {
    risks.push({ id, severity, message, refs });
  }
}

export function compareBackupCounters(
  currentData: LocalDataSafetyAppData,
  incomingData: LocalDataSafetyAppData,
): NumberingCountersRisk[] {
  const risks: NumberingCountersRisk[] = [];
  for (const key of new Set([...Object.keys(currentData.counters ?? {}), ...Object.keys(incomingData.counters ?? {})])) {
    const current = counterValue(currentData, key);
    const incoming = counterValue(incomingData, key);
    if (current === undefined || incoming === undefined) {
      addRisk(risks, "legacy_numbering_unknown", "warning", "Counter shape is incomplete.", [key]);
    } else if (incoming < current) {
      addRisk(risks, "incoming_counter_lower_than_current", "blocked", "Incoming counter is lower than current.", [key]);
    } else if (incoming > current + 25) {
      addRisk(risks, "incoming_counter_higher_unexpectedly", "warning", "Incoming counter jumps unexpectedly.", [key]);
    }
  }
  return risks;
}

export function analyzeNumberingCountersRisk(
  currentData: LocalDataSafetyAppData,
  incomingData: LocalDataSafetyAppData,
  options: { generatedAt?: string } = {},
): NumberingCountersRiskAssessment {
  const risks = compareBackupCounters(currentData, incomingData);
  const currentKeys = new Map(documentsFrom(currentData).map((document) => [seriesKey(document), document]));
  const seenIncoming = new Set<string>();
  const issuedNumbers = new Set<number>();

  for (const document of documentsFrom(incomingData)) {
    const key = seriesKey(document);
    const number = Number(stringValue(document.number));
    if (!stringValue(document.number) || !stringValue(document.year)) {
      addRisk(risks, "missing_series", "warning", "Document is missing series, number or year.", [key]);
    }
    if (currentKeys.has(key) && (isProtectedDocument(currentKeys.get(key)!) || isProtectedDocument(document))) {
      addRisk(risks, "emitted_number_conflict", "blocked", "Protected emitted number conflicts with incoming backup.", [key]);
    }
    if (seenIncoming.has(key)) {
      addRisk(risks, "same_series_year_collision", "blocked", "Incoming backup repeats the same series/year/number.", [key]);
    }
    seenIncoming.add(key);
    if (Number.isFinite(number) && isProtectedDocument(document)) issuedNumbers.add(number);
  }

  const sortedIssued = [...issuedNumbers].sort((a, b) => a - b);
  for (let index = 1; index < sortedIssued.length; index += 1) {
    if (sortedIssued[index] - sortedIssued[index - 1] > 1) {
      addRisk(risks, "gaps_around_issued_documents", "warning", "Issued numbers include a gap that must not be auto-filled.");
      break;
    }
  }

  return {
    marker: "PHASE2D59_NUMBERING_COUNTERS_RISK_ANALYZER_V1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    risks,
    manualReviewRequired: risks.length > 0,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}

function highestSeverity(risks: NumberingCountersRisk[]): "info" | "warning" | "blocked" {
  if (risks.some((risk) => risk.severity === "blocked")) return "blocked";
  if (risks.some((risk) => risk.severity === "warning")) return "warning";
  return "info";
}

export function summarizeNumberingCountersRisk(
  assessment: NumberingCountersRiskAssessment,
): NumberingCountersRiskSummary {
  return {
    riskIds: [...new Set(assessment.risks.map((risk) => risk.id))],
    highestSeverity: highestSeverity(assessment.risks),
    manualReviewRequired: assessment.manualReviewRequired,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
