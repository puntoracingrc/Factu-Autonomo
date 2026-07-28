import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { describeCentralInvoiceAuthorityStatusResult } from "./central-authority-status-presentation";

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
});
