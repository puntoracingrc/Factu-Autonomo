import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("./CentralInvoiceAuthorityEventsSyncCard.tsx", import.meta.url),
  "utf8",
);
const accountPage = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);

describe("central authority events manual account card", () => {
  it("queda integrada en Cuenta > Sincronización", () => {
    expect(accountPage).toContain("CentralInvoiceAuthorityEventsSyncCard");
    expect(
      accountPage.indexOf("<CentralInvoiceAuthorityEventsSyncCard />"),
    ).toBeLessThan(
      accountPage.indexOf("<CloudDevicesCard />"),
    );
  });

  it("usa solo el puente manual de AppStore y no la reparación de nube antigua", () => {
    expect(component).toContain("syncCentralInvoiceAuthorityEvents(data");
    expect(component).toContain("CENTRAL_AUTHORITY_EVENTS_MANUAL_LIMIT");
    expect(component).not.toContain("historical-import-client");
    expect(component).not.toContain("Importación temporal de facturas pendientes");
    expect(component).not.toContain("Subir pendientes");
    expect(component).not.toContain("syncNow(");
    expect(component).not.toContain("forceDownloadFromCloud");
    expect(component).not.toContain("prepareCloudRepairPreview");
    expect(component).not.toContain("setInterval");
  });

  it("explica conflictos sin avanzar cursor ni pisar la lista local", () => {
    expect(component).toContain("No se ha cambiado la lista local ni avanzado el cursor");
    expect(component).toContain("No se avanzó el cursor");
    expect(component).toContain("stale_precondition");
  });
});
