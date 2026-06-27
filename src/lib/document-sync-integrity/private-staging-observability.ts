// PHASE2C62_PRIVATE_STAGING_OBSERVABILITY_REDACTION_READINESS_V1
assertServerOnlyModule();

export type PrivateStagingObservabilityStatus =
  | "ready_for_review"
  | "rejected";

export type PrivateStagingObservabilityReason =
  | "redaction_ready"
  | "unsafe_payload_capture"
  | "unsafe_document_capture"
  | "unsafe_network_or_header_capture"
  | "persistent_logging_rejected";

export interface PrivateStagingObservabilityInput {
  recordsRequestMetadataOnly: boolean;
  recordsPayloadBody: boolean;
  recordsDocumentSnapshot: boolean;
  recordsPdfBytes: boolean;
  recordsXmlBytes: boolean;
  recordsTokenLikeValues: boolean;
  recordsCookies: boolean;
  recordsFullIpAddress: boolean;
  recordsFullHeaders: boolean;
  persistsOutsideMemory: boolean;
  redactionRulesDocumented: boolean;
  operatorDashboardOnly: boolean;
}

export interface PrivateStagingObservabilityEvaluation {
  status: PrivateStagingObservabilityStatus;
  reason: PrivateStagingObservabilityReason;
  redactionRulesDocumented: boolean;
  operatorDashboardOnly: boolean;
  allowedSignals: string[];
  blockedSignals: string[];
}

export interface PrivateStagingObservabilitySafeSummary {
  status: PrivateStagingObservabilityStatus;
  reason: PrivateStagingObservabilityReason;
  redactionRulesDocumented: boolean;
  operatorDashboardOnly: boolean;
  allowedSignals: string[];
  blockedSignals: string[];
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("Document sync private staging observability is server-only.");
  }
}

function rejected(
  input: PrivateStagingObservabilityInput,
  reason: PrivateStagingObservabilityReason,
  blockedSignals: string[],
): PrivateStagingObservabilityEvaluation {
  return {
    status: "rejected",
    reason,
    redactionRulesDocumented: input.redactionRulesDocumented,
    operatorDashboardOnly: input.operatorDashboardOnly,
    allowedSignals: [],
    blockedSignals,
  };
}

export function evaluatePrivateStagingObservabilityReadiness(
  input: PrivateStagingObservabilityInput,
): PrivateStagingObservabilityEvaluation {
  const unsafePayload = [
    input.recordsPayloadBody ? "payload_body" : "",
    input.recordsDocumentSnapshot ? "document_snapshot" : "",
    input.recordsPdfBytes ? "pdf_bytes" : "",
    input.recordsXmlBytes ? "xml_bytes" : "",
  ].filter(Boolean);

  if (unsafePayload.length > 0) {
    return rejected(
      input,
      input.recordsPayloadBody ? "unsafe_payload_capture" : "unsafe_document_capture",
      unsafePayload,
    );
  }

  const unsafeHeaders = [
    input.recordsTokenLikeValues ? "token_like_values" : "",
    input.recordsCookies ? "cookies" : "",
    input.recordsFullIpAddress ? "full_ip_address" : "",
    input.recordsFullHeaders ? "full_headers" : "",
  ].filter(Boolean);

  if (unsafeHeaders.length > 0) {
    return rejected(input, "unsafe_network_or_header_capture", unsafeHeaders);
  }

  if (input.persistsOutsideMemory) {
    return rejected(input, "persistent_logging_rejected", ["persistent_logging"]);
  }

  return {
    status: "ready_for_review",
    reason: "redaction_ready",
    redactionRulesDocumented: input.redactionRulesDocumented,
    operatorDashboardOnly: input.operatorDashboardOnly,
    allowedSignals: input.recordsRequestMetadataOnly
      ? ["request_id", "status_code", "operation_kind", "safe_reason"]
      : [],
    blockedSignals: [],
  };
}

export function buildPrivateStagingRedactionChecklist(
  evaluation: PrivateStagingObservabilityEvaluation,
): string[] {
  const checklist = [
    "request metadata only",
    "no payload body",
    "no document snapshot",
    "no pdf bytes",
    "no xml bytes",
    "no token-like values",
    "no cookies",
    "no full headers",
    "in-memory evidence only",
  ];
  if (evaluation.redactionRulesDocumented) checklist.push("redaction rules documented");
  if (evaluation.operatorDashboardOnly) checklist.push("operator dashboard only");
  return checklist;
}

export function summarizePrivateStagingObservability(
  evaluation: PrivateStagingObservabilityEvaluation,
): PrivateStagingObservabilitySafeSummary {
  return {
    status: evaluation.status,
    reason: evaluation.reason,
    redactionRulesDocumented: evaluation.redactionRulesDocumented,
    operatorDashboardOnly: evaluation.operatorDashboardOnly,
    allowedSignals: [...evaluation.allowedSignals],
    blockedSignals: [...evaluation.blockedSignals],
  };
}
