import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { CentralInvoiceAuthorityStatusResult } from "@/lib/central-invoice-authority/status-client";
import {
  centralAuthorityActivationReasonLabel,
  centralAuthorityStatusCheckAction,
  centralAuthorityStatusCheckLabel,
  describeCentralInvoiceAuthorityNextStep,
  describeCentralInvoiceAuthorityStatusResult,
} from "./central-authority-status-presentation";

const component = readFileSync(
  new URL("./CentralInvoiceAuthorityStatusCard.tsx", import.meta.url),
  "utf8",
);
const accountPage = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);

describe("central authority status account card", () => {
  it("queda integrada en Cuenta > Sincronización antes de eventos y dispositivos", () => {
    expect(accountPage).toContain("CentralInvoiceAuthorityStatusCard");
    expect(accountPage.indexOf("<CentralInvoiceAuthorityStatusCard />")).toBeLessThan(
      accountPage.indexOf("<CentralInvoiceAuthorityEventsSyncCard />"),
    );
    expect(
      accountPage.indexOf("<CentralInvoiceAuthorityStatusCard />"),
    ).toBeLessThan(accountPage.indexOf("<CloudDevicesCard />"));
  });

  it("usa solo el cliente de status y no toca sync, reparacion ni emision", () => {
    expect(component).toContain("fetchCentralInvoiceAuthorityStatusFromBrowser");
    expect(component).toContain("Comprobar servidor central");
    expect(component).toContain("Checklist para activar canario");
    expect(component).toContain("Canario formulario:");
    expect(component).toContain("isCentralInvoiceAuthorityFormCanaryEnabled");
    expect(component).toContain("describeCentralInvoiceAuthorityNextStep");
    expect(component).not.toContain("syncNow(");
    expect(component).not.toContain("forceDownloadFromCloud");
    expect(component).not.toContain("prepareCloudRepairPreview");
    expect(component).not.toContain("issueCentralInvoiceAuthorityFromBrowser");
    expect(component).not.toContain("setInterval");
  });

  it("explica modo off aunque el servidor este preparado", () => {
    const notice = describeCentralInvoiceAuthorityStatusResult({
      ok: true,
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1",
      activation: {
        requestedMode: "off",
        effectiveMode: "off",
        enabled: false,
        fiscalWritesEnabled: false,
        appliesToUser: false,
        production: false,
        reason: "disabled",
      },
      readiness: {
        schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
        checkedAt: "2026-07-28T08:00:00.000Z",
        ready: true,
        checks: [],
        blockers: [],
      },
      summary: {
        fiscalWritesPossible: false,
        modeAllowsWrites: false,
        serverSchemaReady: true,
        deviceVerified: true,
      },
    });

    expect(notice).toMatchObject({
      tone: "warning",
      title: "Servidor comprobado, escritura apagada",
    });
    expect(notice.message).toContain("modo apagado");
  });

  it("mantiene bloqueada la escritura cuando falta schema central", () => {
    const notice = describeCentralInvoiceAuthorityStatusResult({
      ok: true,
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1",
      activation: {
        requestedMode: "required",
        effectiveMode: "required",
        enabled: true,
        fiscalWritesEnabled: true,
        appliesToUser: true,
        production: false,
        reason: "required_enabled",
      },
      readiness: {
        schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
        checkedAt: "2026-07-28T08:00:00.000Z",
        ready: false,
        checks: [],
        blockers: ["central_invoice_table_unavailable"],
      },
      summary: {
        fiscalWritesPossible: false,
        modeAllowsWrites: true,
        serverSchemaReady: false,
        deviceVerified: true,
      },
    });

    expect(notice.message).toContain("tablas centrales no disponibles");
    expect(notice.tone).toBe("warning");
  });

  it("traduce gates y razones operativas sin exponer detalles crudos", () => {
    expect(centralAuthorityActivationReasonLabel("baseline_not_reconciled")).toBe(
      "baseline de produccion pendiente",
    );
    expect(
      centralAuthorityStatusCheckLabel({
        id: "rpc:issue_central_invoice_v1:dry_invalid",
      }),
    ).toBe("RPC de emision");
    expect(
      centralAuthorityStatusCheckAction({
        id: "rpc:issue_central_invoice_v1:dry_invalid",
        kind: "rpc",
        status: "blocked",
        blocker: "central_invoice_issue_rpc_unavailable",
        causeCode: "42883",
        message: "La RPC de emision central no existe.",
        noBusinessRows: true,
        destructive: false,
      }),
    ).toContain("RPC transaccional");
  });

  it("explica que el canario publico queda retenido hasta que status permita escritura", () => {
    const result: CentralInvoiceAuthorityStatusResult = {
      ok: true,
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1",
      activation: {
        requestedMode: "canary",
        effectiveMode: "off",
        enabled: false,
        fiscalWritesEnabled: false,
        appliesToUser: true,
        production: true,
        reason: "baseline_not_reconciled",
      },
      readiness: {
        schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
        checkedAt: "2026-07-28T08:00:00.000Z",
        ready: false,
        checks: [],
        blockers: ["central_invoice_table_unavailable"],
      },
      summary: {
        fiscalWritesPossible: false,
        modeAllowsWrites: false,
        serverSchemaReady: false,
        deviceVerified: true,
      },
    };

    expect(
      describeCentralInvoiceAuthorityNextStep(result, {
        publicFormCanaryRequested: true,
      }),
    ).toMatchObject({
      tone: "warning",
      title: "Canario pedido, retenido en local",
    });
  });

  it("avisa fail-closed si el formulario obligatorio se activa sin gates listos", () => {
    const result: CentralInvoiceAuthorityStatusResult = {
      ok: true,
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1",
      activation: {
        requestedMode: "required",
        effectiveMode: "off",
        enabled: false,
        fiscalWritesEnabled: false,
        appliesToUser: true,
        production: true,
        reason: "production_approval_missing",
      },
      readiness: {
        schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
        checkedAt: "2026-07-28T08:00:00.000Z",
        ready: true,
        checks: [],
        blockers: [],
      },
      summary: {
        fiscalWritesPossible: false,
        modeAllowsWrites: false,
        serverSchemaReady: true,
        deviceVerified: true,
      },
    };

    expect(
      describeCentralInvoiceAuthorityNextStep(result, {
        publicFormRequiredRequested: true,
      }),
    ).toMatchObject({
      tone: "error",
      title: "Formulario obligatorio protegido",
    });
  });

  it("explica la observacion por cuenta sin sugerir que ya puede emitir", () => {
    const result: CentralInvoiceAuthorityStatusResult = {
      ok: true,
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1",
      activation: {
        requestedMode: "canary",
        effectiveMode: "shadow",
        enabled: true,
        fiscalWritesEnabled: false,
        appliesToUser: true,
        production: true,
        reason: "shadow_only",
      },
      readiness: {
        schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
        checkedAt: "2026-07-29T08:00:00.000Z",
        ready: true,
        checks: [],
        blockers: [],
      },
      summary: {
        fiscalWritesPossible: false,
        modeAllowsWrites: false,
        serverSchemaReady: true,
        deviceVerified: true,
      },
    };

    expect(describeCentralInvoiceAuthorityNextStep(result)).toEqual({
      tone: "warning",
      title: "Observacion activa",
      message:
        "Esta cuenta puede comprobar el servidor y revisar sus series, pero la emision central sigue bloqueada hasta una promocion explicita al canario.",
    });
  });
});
