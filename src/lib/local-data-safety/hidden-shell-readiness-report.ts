import {
  evaluateHiddenImportRestoreUiEnablementGate,
  summarizeHiddenImportRestoreUiEnablementGate,
  type HiddenImportRestoreUiEnablementGate,
} from "./hidden-ui-enablement-gate";
import {
  evaluateHiddenUiEnablementEnvironment,
  summarizeHiddenUiEnablementEnvironment,
  type HiddenUiEnablementEnvironment,
} from "./hidden-ui-enablement-environment";
import {
  buildImportRestoreFinalReviewPack,
  summarizeImportRestoreFinalReviewPack,
  type ImportRestoreFinalReviewPack,
} from "./import-restore-final-review-pack";
import {
  evaluateImportRestoreNoGoConditions,
  summarizeImportRestoreNoGoConditions,
  type ImportRestoreNoGoConditionsRegistry,
} from "./import-restore-no-go-conditions";

// PHASE2D98_HIDDEN_IMPORT_RESTORE_SHELL_READINESS_REPORT_V1

export interface HiddenImportRestoreShellReadinessReportInput {
  generatedAt?: string;
  gate?: HiddenImportRestoreUiEnablementGate;
  environment?: HiddenUiEnablementEnvironment;
  noGoRegistry?: ImportRestoreNoGoConditionsRegistry;
  finalReviewPack?: ImportRestoreFinalReviewPack;
}

export interface HiddenImportRestoreShellReadinessReport {
  marker: "PHASE2D98_HIDDEN_IMPORT_RESTORE_SHELL_READINESS_REPORT_V1";
  generatedAt: string;
  gateSummary: ReturnType<typeof summarizeHiddenImportRestoreUiEnablementGate>;
  environmentSummary: ReturnType<typeof summarizeHiddenUiEnablementEnvironment>;
  approvalSummary: {
    approvalsComplete: boolean;
    ownerDecisionRequired: true;
  };
  noGoSummary: ReturnType<typeof summarizeImportRestoreNoGoConditions>;
  finalReviewSummary: ReturnType<typeof summarizeImportRestoreFinalReviewPack>;
  nextSteps: string[];
  rawPayloadIncluded: false;
  realDataIncluded: false;
  secretsIncluded: false;
  enablementAllowed: false;
  safe: true;
}

export interface HiddenImportRestoreShellReadinessReportSummary {
  gateStatus: HiddenImportRestoreShellReadinessReport["gateSummary"]["status"];
  environmentStatus: HiddenImportRestoreShellReadinessReport["environmentSummary"]["status"];
  noGo: boolean;
  enablementAllowed: false;
  safe: true;
}

export function buildHiddenImportRestoreShellReadinessReport(
  input: HiddenImportRestoreShellReadinessReportInput = {},
): HiddenImportRestoreShellReadinessReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const gate = input.gate ?? evaluateHiddenImportRestoreUiEnablementGate({ generatedAt });
  const environment = input.environment ?? evaluateHiddenUiEnablementEnvironment({ generatedAt, runtime: "test" });
  const noGoRegistry = input.noGoRegistry ?? evaluateImportRestoreNoGoConditions({ generatedAt });
  const finalReviewPack = input.finalReviewPack ?? buildImportRestoreFinalReviewPack({ generatedAt, noGoRegistry });

  return assertHiddenImportRestoreShellReadinessReportSafe({
    marker: "PHASE2D98_HIDDEN_IMPORT_RESTORE_SHELL_READINESS_REPORT_V1",
    generatedAt,
    gateSummary: summarizeHiddenImportRestoreUiEnablementGate(gate),
    environmentSummary: summarizeHiddenUiEnablementEnvironment(environment),
    approvalSummary: {
      approvalsComplete: gate.status === "ready_for_future_hidden_enablement",
      ownerDecisionRequired: true,
    },
    noGoSummary: summarizeImportRestoreNoGoConditions(noGoRegistry),
    finalReviewSummary: summarizeImportRestoreFinalReviewPack(finalReviewPack),
    nextSteps: [
      "Keep hidden/routeless shell blocked by default.",
      "Collect explicit UX, legal, data-loss and owner approvals.",
      "Open a separate owner decision phase before any enablement.",
    ],
    rawPayloadIncluded: false,
    realDataIncluded: false,
    secretsIncluded: false,
    enablementAllowed: false,
    safe: true,
  });
}

export function assertHiddenImportRestoreShellReadinessReportSafe(
  report: HiddenImportRestoreShellReadinessReport,
): HiddenImportRestoreShellReadinessReport {
  if (report.rawPayloadIncluded || report.realDataIncluded || report.secretsIncluded) {
    throw new Error("Readiness report must not include raw, real or secret material.");
  }
  if (report.enablementAllowed !== false || report.safe !== true) {
    throw new Error("Readiness report must not enable the hidden UI.");
  }
  return report;
}

export function redactHiddenImportRestoreShellReadinessReport(
  report: HiddenImportRestoreShellReadinessReport,
): HiddenImportRestoreShellReadinessReport {
  return assertHiddenImportRestoreShellReadinessReportSafe({
    ...report,
    rawPayloadIncluded: false,
    realDataIncluded: false,
    secretsIncluded: false,
    enablementAllowed: false,
    safe: true,
  });
}

export function summarizeHiddenImportRestoreShellReadinessReport(
  report: HiddenImportRestoreShellReadinessReport,
): HiddenImportRestoreShellReadinessReportSummary {
  const safeReport = assertHiddenImportRestoreShellReadinessReportSafe(report);
  return {
    gateStatus: safeReport.gateSummary.status,
    environmentStatus: safeReport.environmentSummary.status,
    noGo: safeReport.noGoSummary.noGo,
    enablementAllowed: false,
    safe: true,
  };
}
