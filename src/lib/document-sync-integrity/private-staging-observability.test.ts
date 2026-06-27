import { describe, expect, it } from "vitest";
import {
  buildPrivateStagingRedactionChecklist,
  evaluatePrivateStagingObservabilityReadiness,
  summarizePrivateStagingObservability,
  type PrivateStagingObservabilityInput,
} from "./private-staging-observability";

const safeInput: PrivateStagingObservabilityInput = {
  recordsRequestMetadataOnly: true,
  recordsPayloadBody: false,
  recordsDocumentSnapshot: false,
  recordsPdfBytes: false,
  recordsXmlBytes: false,
  recordsTokenLikeValues: false,
  recordsCookies: false,
  recordsFullIpAddress: false,
  recordsFullHeaders: false,
  persistsOutsideMemory: false,
  redactionRulesDocumented: true,
  operatorDashboardOnly: true,
};

describe("private staging observability readiness", () => {
  it("acepta solo metadata segura en memoria", () => {
    const result = evaluatePrivateStagingObservabilityReadiness(safeInput);
    expect(result.status).toBe("ready_for_review");
    expect(result.allowedSignals).toContain("request_id");
    expect(buildPrivateStagingRedactionChecklist(result)).toContain(
      "redaction rules documented",
    );
  });

  it("rechaza payload, documentos, cabeceras y persistencia", () => {
    expect(
      evaluatePrivateStagingObservabilityReadiness({
        ...safeInput,
        recordsPayloadBody: true,
      }).reason,
    ).toBe("unsafe_payload_capture");
    expect(
      evaluatePrivateStagingObservabilityReadiness({
        ...safeInput,
        recordsDocumentSnapshot: true,
      }).reason,
    ).toBe("unsafe_document_capture");
    expect(
      evaluatePrivateStagingObservabilityReadiness({
        ...safeInput,
        recordsFullHeaders: true,
      }).reason,
    ).toBe("unsafe_network_or_header_capture");
    expect(
      evaluatePrivateStagingObservabilityReadiness({
        ...safeInput,
        persistsOutsideMemory: true,
      }).reason,
    ).toBe("persistent_logging_rejected");
  });

  it("summary seguro no contiene material documental", () => {
    const summary = summarizePrivateStagingObservability(
      evaluatePrivateStagingObservabilityReadiness(safeInput),
    );
    const serialized = JSON.stringify(summary);
    expect(serialized).toContain("redaction_ready");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("%PDF");
  });
});
