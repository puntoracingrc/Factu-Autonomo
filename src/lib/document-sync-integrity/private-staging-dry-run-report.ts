import type {
  PrivateStagingReadinessEvaluation,
  PrivateStagingReadinessSafeSummary,
} from "./private-staging-readiness";
import {
  summarizeDocumentSyncPrivateStagingReadiness,
} from "./private-staging-readiness";

// PHASE2C64_PRIVATE_STAGING_DRY_RUN_REPORT_V1
assertServerOnlyModule();

export interface PrivateStagingDryRunReportInput {
  generatedAt: string;
  readiness: PrivateStagingReadinessEvaluation;
  routeShellDisabledByDefault: boolean;
  fakeAdapterDefault: boolean;
  supabaseLocalOptInOnly: boolean;
  syntheticOnlyData: boolean;
  notes?: string[];
}

export interface PrivateStagingDryRunReport {
  marker: "PHASE2C_PRIVATE_STAGING_READINESS: BLOCKED BY DEFAULT / READY FOR HUMAN REVIEW";
  generatedAt: string;
  readiness: PrivateStagingReadinessSafeSummary;
  routeShellDisabledByDefault: boolean;
  fakeAdapterDefault: boolean;
  supabaseLocalOptInOnly: boolean;
  syntheticOnlyData: boolean;
  notes: string[];
  nextDecision: "human_review_required" | "manual_authorization_required";
}

const unsafeReportPattern = new RegExp(
  `bearer|token|password|private[_-]?key|cookie|${[
    "service",
    "role",
  ].join("_")}|<\\?xml|%pdf|documentSnapshot|invoiceNumber`,
  "i",
);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("Document sync private staging dry-run report is server-only.");
  }
}

function safeNotes(notes: string[] | undefined): string[] {
  return (notes ?? [])
    .filter((note) => !unsafeReportPattern.test(note))
    .map((note) => note.slice(0, 140));
}

export function buildPrivateStagingDryRunReport(
  input: PrivateStagingDryRunReportInput,
): PrivateStagingDryRunReport {
  return {
    marker:
      "PHASE2C_PRIVATE_STAGING_READINESS: BLOCKED BY DEFAULT / READY FOR HUMAN REVIEW",
    generatedAt: input.generatedAt,
    readiness: summarizeDocumentSyncPrivateStagingReadiness(input.readiness),
    routeShellDisabledByDefault: input.routeShellDisabledByDefault,
    fakeAdapterDefault: input.fakeAdapterDefault,
    supabaseLocalOptInOnly: input.supabaseLocalOptInOnly,
    syntheticOnlyData: input.syntheticOnlyData,
    notes: safeNotes(input.notes),
    nextDecision: input.readiness.authorized
      ? "manual_authorization_required"
      : "human_review_required",
  };
}

export function redactPrivateStagingDryRunReport(
  report: PrivateStagingDryRunReport,
): PrivateStagingDryRunReport {
  return {
    ...report,
    notes: safeNotes(report.notes),
    readiness: {
      ...report.readiness,
      blockers: report.readiness.blockers.map((blocker) =>
        unsafeReportPattern.test(blocker) ? "[redacted]" : blocker,
      ),
      reviewItems: report.readiness.reviewItems.map((item) =>
        unsafeReportPattern.test(item) ? "[redacted]" : item,
      ),
    },
  };
}

export function assertPrivateStagingDryRunReportSafe(
  report: PrivateStagingDryRunReport,
): PrivateStagingDryRunReport {
  const serialized = JSON.stringify(report);
  if (unsafeReportPattern.test(serialized)) {
    throw new Error("Private staging dry-run report contains unsafe material.");
  }
  return report;
}
