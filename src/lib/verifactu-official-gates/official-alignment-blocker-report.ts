import { evaluateOfficialAlignedXmlPreflight } from "./official-xml-preflight-gate";
import type {
  OfficialAlignedXmlPreflightResult,
  OfficialAlignmentBlockerReport,
} from "./types";

export const PHASE2B7O_BLOCKER_REPORT_MARKER =
  "PHASE2B7O_OFFICIAL_ALIGNMENT_BLOCKER_REPORT_V1";

export interface BuildOfficialAlignmentBlockerReportInput {
  readonly generatedAt?: string;
  readonly preflight?: OfficialAlignedXmlPreflightResult;
}

export function buildOfficialAlignmentBlockerReport(
  input: BuildOfficialAlignmentBlockerReportInput = {},
): OfficialAlignmentBlockerReport {
  const preflight = input.preflight ?? evaluateOfficialAlignedXmlPreflight();

  return {
    marker: PHASE2B7O_BLOCKER_REPORT_MARKER,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: "blocked",
    blockers: preflight.blockers,
    safeArtifactSummary: preflight.artifactGate.safeArtifactSummary,
    nextRequiredDecisions: [
      "Obtain official XSD fixtures from a static official source for offline tests.",
      "Select a reproducible offline XSD validator for CI.",
      "Approve a complete safe synthetic data strategy for alta and anulacion.",
      "Keep QR, signature, transport and production disabled until the official alignment gate closes.",
    ],
    canProceed: {
      officialAlignedXml: false,
      offlineXsdValidation: false,
      qr: false,
      signature: false,
      transport: false,
      production: false,
    },
    finality: "internal_blocker_report",
    containsXml: false,
    containsSecrets: false,
    containsRealData: false,
  };
}
