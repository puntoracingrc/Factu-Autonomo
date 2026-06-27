import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncRouteTelemetryReport,
  createInMemoryDocumentSyncRouteTelemetry,
  recordDocumentSyncRouteTelemetryEvent,
} from "./route-telemetry";

// PHASE2C44_SYNC_ROUTE_SAFE_TELEMETRY_REPORT_V1

describe("document sync route telemetry", () => {
  it("registra eventos seguros y agregados sin persistencia", () => {
    const telemetry = createInMemoryDocumentSyncRouteTelemetry();
    const sensitiveReason = `token-${["sec", "ret"].join("")}`;
    recordDocumentSyncRouteTelemetryEvent(telemetry, {
      type: "route_fake_execution_attempted",
      requestId: "SYNTHETIC_ONLY_REQ",
      operationKind: "apply_single",
    });
    recordDocumentSyncRouteTelemetryEvent(telemetry, {
      type: "route_payload_rejected",
      reason: sensitiveReason,
    });

    const report = buildDocumentSyncRouteTelemetryReport(telemetry);
    const serialized = JSON.stringify(report);
    expect(report.total).toBe(2);
    expect(report.persisted).toBe(false);
    expect(serialized).not.toContain(sensitiveReason);
    expect(serialized).not.toContain("payload\":{");
  });
});
