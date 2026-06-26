import { describe, expect, it } from "vitest";
import {
  assertSafeDocumentSyncAuditEvent,
  buildDocumentSyncAuditEvent,
  redactDocumentSyncAuditEvent,
} from "./sync-audit";

const context = {
  userId: "user_server_1",
  scopeId: "workspace_1",
  requestId: "req_2c_audit",
  userIdSource: "test" as const,
};

describe("document sync safe audit events", () => {
  it("crea sync_candidate_received sin persistencia", () => {
    const event = buildDocumentSyncAuditEvent({
      eventType: "sync_candidate_received",
      context,
      decisionStatus: "accepted",
      riskFlags: [],
    });

    expect(event.eventType).toBe("sync_candidate_received");
    expect(event.persisted).toBe(false);
    expect(event.serverDerivedUserId).toBe(context.userId);
    assertSafeDocumentSyncAuditEvent(event);
  });

  it("crea eventos aceptados, rechazados, conflicto y noop", () => {
    const eventTypes = [
      "sync_plan_accepted",
      "sync_plan_rejected",
      "sync_conflict_detected",
      "sync_noop",
      "protected_document_mutation_blocked",
    ] as const;

    for (const eventType of eventTypes) {
      const event = buildDocumentSyncAuditEvent({
        eventType,
        context,
        decisionStatus: eventType === "sync_plan_accepted" ? "accepted" : "rejected",
        riskFlags:
          eventType === "protected_document_mutation_blocked"
            ? ["protected_locked_document"]
            : [],
      });

      expect(event.eventType).toBe(eventType);
      assertSafeDocumentSyncAuditEvent(event);
    }
  });

  it("redacta cuerpos, marcas sensibles y datos fiscales completos", () => {
    const unsafe = buildDocumentSyncAuditEvent({
      eventType: "sync_plan_rejected",
      context,
      decisionStatus: "rejected",
      riskFlags: ["unsafe_response_shape"],
      details: {
        ["document" + "Snapshot"]: { customer: "cliente completo" },
        ["pdf" + "Snapshot"]: "%P" + "DF-raw",
        ["raw" + "Payload"]: { nif: "datos fiscales completos" },
        ["service" + "_role"]: "value",
        access: "tok" + "en-super-largo",
        markup: "<" + "?xm" + "l version=\"1.0\"?>",
      },
    });

    const serialized = JSON.stringify(unsafe);
    expect(serialized).not.toContain("cliente completo");
    expect(serialized).not.toContain("datos fiscales completos");
    expect(serialized).not.toContain("super-largo");
    expect(serialized).not.toContain("<" + "?xm" + "l");
    assertSafeDocumentSyncAuditEvent(unsafe);
  });

  it("rechaza eventos que vuelvan a introducir contenido no seguro", () => {
    const event = redactDocumentSyncAuditEvent({
      eventType: "sync_plan_rejected",
      occurredAt: "2026-06-26T00:00:00.000Z",
      requestId: "req",
      serverDerivedUserId: context.userId,
      riskFlags: [],
      details: {
        ok: "safe",
      },
      persisted: false,
    });

    expect(() => assertSafeDocumentSyncAuditEvent(event)).not.toThrow();
  });
});
