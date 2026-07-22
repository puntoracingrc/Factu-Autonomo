import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("DocumentForm internal margin information", () => {
  it("keeps the explanation behind an accessible information control", () => {
    const documentForm = source("./DocumentForm.tsx");

    expect(documentForm).toContain(
      'aria-label="Información sobre el control de rendimiento"',
    );
    expect(documentForm).toContain(
      "aria-expanded={showInternalMarginInfo}",
    );
    expect(documentForm).toContain(
      'aria-controls={`document-margin-internal-info-${type}`}',
    );
    expect(documentForm).toContain(
      "Control interno: no aparece en el PDF ni en el documento",
    );
    expect(documentForm).toContain(
      "compra asociados a las líneas para ayudarte a revisar el",
    );
  });

  it("uses the same form in invoices, budgets and receipts", () => {
    const routes = [
      source("../../app/facturas/nuevo/page.tsx"),
      source("../../app/presupuestos/nuevo/page.tsx"),
      source("../../app/recibos/nuevo/page.tsx"),
    ];

    for (const route of routes) {
      expect(route).toContain("<DocumentForm");
    }
  });
});
