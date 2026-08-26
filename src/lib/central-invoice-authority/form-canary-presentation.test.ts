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
    expect(centralInvoiceAuthorityFormPolicyReasonLabel("server_canary_not_ready"))
      .toBe("canario servidor en espera");
    expect(centralInvoiceAuthorityFormPolicyReasonLabel("status_unavailable"))
      .toBe("estado central no disponible");
  });

  it("no muestra estados internos mientras comprueba la emisión", () => {
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
      visible: false,
      tone: "info",
      title: "",
      message: "",
    });
  });

  it("explica la emisión definitiva sin jerga técnica", () => {
    const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
      policy: centralPolicy(),
      documentLabel: "factura",
    });

    expect(notice).toMatchObject({
      visible: true,
      tone: "info",
      title: "Emisión definitiva",
    });
    expect(notice.message).toContain("número definitivo");
    expect(notice.message).toContain("datos fiscales ni borrarla");
    expect(notice.message).toContain("factura rectificativa");
    expect(notice.message).not.toContain("canario");
    expect(notice.message).not.toContain("preflight");
    expect(notice.message).not.toContain("servidor central");
  });

  it("mantiene el aviso tranquilo cuando debe fallar de forma cerrada", () => {
    const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
      policy: centralPolicy({ reason: "last_known_central_authority" }),
      documentLabel: "factura",
    });

    expect(notice).toMatchObject({
      visible: true,
      tone: "info",
      title: "Emisión definitiva",
    });
    expect(notice.message).not.toContain("autoridad central");
    expect(notice.message).not.toContain("numeración local");
  });

  it("oculta el estado interno si el despliegue central aun no está listo", () => {
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
      visible: false,
      tone: "info",
      title: "",
      message: "",
    });
  });

  it("oculta el estado interno del servidor si todavía no puede emitir", () => {
    const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
      policy: localPolicy({
        reason: "server_canary_not_ready",
        status: {
          ok: true,
          schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1",
          activation: {
            requestedMode: "canary",
            effectiveMode: "off",
            enabled: false,
            fiscalWritesEnabled: false,
            appliesToUser: true,
            production: false,
            reason: "schema_not_ready",
          },
          readiness: {
            schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
            checkedAt: "2026-07-28T08:30:00.000Z",
            ready: false,
            checks: [],
            blockers: ["schema_not_ready"],
          },
          summary: {
            fiscalWritesPossible: false,
            modeAllowsWrites: false,
            serverSchemaReady: false,
            deviceVerified: true,
          },
        },
      }),
      documentLabel: "factura",
    });

    expect(notice).toMatchObject({
      visible: false,
      tone: "info",
      title: "",
      message: "",
    });
  });

  it("adapta la explicación para una rectificativa", () => {
    const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
      policy: centralPolicy(),
      documentLabel: "factura rectificativa",
    });

    expect(notice.message).toContain("esta factura rectificativa");
    expect(notice.message).toContain("Revisa la vista previa");
    expect(notice.message).not.toContain("deberás emitir una factura rectificativa");
  });
});
