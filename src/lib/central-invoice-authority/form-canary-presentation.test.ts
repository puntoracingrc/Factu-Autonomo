import { describe, expect, it } from "vitest";

import type {
  CentralInvoiceAuthorityFormIssuePolicyDecision,
} from "./form-canary-client";
import {
  CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
  centralInvoiceAuthorityFormPolicyReasonLabel,
  describeCentralInvoiceAuthorityFormPolicyNotice,
} from "./form-canary-presentation";

function localPolicy(
  overrides: Partial<
    Extract<
      CentralInvoiceAuthorityFormIssuePolicyDecision,
      { shouldUseCentralAuthority: false }
    >
  > = {},
): Extract<
  CentralInvoiceAuthorityFormIssuePolicyDecision,
  { shouldUseCentralAuthority: false }
> {
  return {
    schema: "CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1",
    shouldUseCentralAuthority: false,
    failClosed: false,
    reason: "central_not_requested",
    ...overrides,
  };
}

function centralPolicy(
  overrides: Partial<
    Extract<
      CentralInvoiceAuthorityFormIssuePolicyDecision,
      { shouldUseCentralAuthority: true }
    >
  > = {},
): Extract<
  CentralInvoiceAuthorityFormIssuePolicyDecision,
  { shouldUseCentralAuthority: true }
> {
  return {
    schema: "CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1",
    shouldUseCentralAuthority: true,
    failClosed: true,
    reason: "public_form_canary",
    ...overrides,
  };
}

describe("central invoice authority form canary presentation", () => {
  it("expone etiquetas de razon sin depender de texto de servidor", () => {
    expect(centralInvoiceAuthorityFormPolicyReasonLabel("public_form_canary"))
      .toBe("canario publico preparado");
    expect(centralInvoiceAuthorityFormPolicyReasonLabel("status_unavailable"))
      .toBe("estado central no disponible");
  });

  it("muestra comprobacion solo cuando el canario publico esta solicitado", () => {
    expect(
      describeCentralInvoiceAuthorityFormPolicyNotice({
        policy: null,
        checking: true,
        publicFormCanaryEnabled: false,
      }).visible,
    ).toBe(false);

    expect(
      describeCentralInvoiceAuthorityFormPolicyNotice({
        policy: null,
        checking: true,
        publicFormCanaryEnabled: true,
        documentLabel: "factura",
      }),
    ).toMatchObject({
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
      visible: true,
      tone: "info",
      title: "Comprobando autoridad central",
    });
  });

  it("avisa cuando el formulario usara el servidor central y no promete fallback local", () => {
    const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
      policy: centralPolicy(),
      documentLabel: "factura",
    });

    expect(notice).toMatchObject({
      visible: true,
      tone: "success",
      title: "Canario central activo",
    });
    expect(notice.message).toContain("servidor central");
    expect(notice.message).toContain("no se creara una emision local alternativa");
  });

  it("marca fail-closed cuando el navegador ya recuerda autoridad central", () => {
    const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
      policy: centralPolicy({ reason: "last_known_central_authority" }),
      documentLabel: "factura",
    });

    expect(notice.tone).toBe("error");
    expect(notice.message).toContain("ya vio autoridad central");
    expect(notice.message).toContain("no se permite volver a numeracion local");
  });

  it("mantiene el flujo local visible si el canario publico aun no esta listo", () => {
    const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
      policy: localPolicy({
        reason: "public_canary_not_ready",
        status: {
          ok: true,
          schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1",
          activation: {
            requestedMode: "canary",
            effectiveMode: "shadow",
            enabled: true,
            fiscalWritesEnabled: false,
            appliesToUser: true,
            production: false,
            reason: "readiness_blocked",
          },
          readiness: {
            schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
            checkedAt: "2026-07-28T08:30:00.000Z",
            ready: false,
            checks: [],
            blockers: ["central_invoice_issue_rpc_unavailable"],
          },
          summary: {
            fiscalWritesPossible: false,
            modeAllowsWrites: false,
            serverSchemaReady: false,
            deviceVerified: true,
          },
        },
      }),
      publicFormCanaryEnabled: true,
      documentLabel: "factura",
    });

    expect(notice).toMatchObject({
      visible: true,
      tone: "warning",
      title: "Canario central en espera",
    });
    expect(notice.message).toContain("flujo local actual");
    expect(notice.message).toContain("central_invoice_issue_rpc_unavailable");
  });
});
