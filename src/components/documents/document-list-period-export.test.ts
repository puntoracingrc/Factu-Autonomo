import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);

describe("invoice list period PDF export", () => {
  it("reutiliza el exportador canónico con trimestre o hasta tres meses", () => {
    expect(source).toContain("downloadInvoicePdfPeriodArchive");
    expect(source).toContain("invoicePdfExportPeriodFromQuarter");
    expect(source).toContain('<option value="months">Meses</option>');
    expect(source).toContain('aria-label="Mes inicial del listado"');
    expect(source).toContain('aria-label="Mes final del listado"');
    expect(source).toContain("Math.min(12, period.month + 2)");
  });

  it("sitúa la acción junto a los filtros y explica su alcance", () => {
    expect(source).toContain("Exportar facturas PDF");
    expect(source).toContain("Exportar y enviar al gestor");
    expect(source).toContain("buildInvoicePeriodAdvisorEmail");
    expect(source).toContain("/configuracion#ajustes-gestor");
    expect(source).toContain("Adjunta el ZIP antes de enviarlo");
    expect(source).toContain("La búsqueda y el estado no cambian");
    expect(source).toContain("limits.quarterlyExport");
    expect(source).toContain("InvoicePdfPeriodExportError");
  });
});
