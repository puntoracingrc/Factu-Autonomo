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
    expect(source).toContain("Exportar y enviar al cliente");
    expect(source).toContain("buildInvoicePeriodAdvisorEmail");
    expect(source).toContain("buildInvoiceCustomerEmail");
    expect(source).toContain("resolveInvoiceCustomerExportContext");
    expect(source).toContain("downloadInvoicePdfSelectionArchive");
    expect(source).toContain("SendMethodChooserModal");
    expect(source).toContain("DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS");
    expect(source).toContain('appPreferences.documentEmailMethod === "ask"');
    expect(source).toContain("saveInvoiceEmailMethod");
    expect(source).toContain("reserveExternalShareWindow");
    expect(source).toContain("email.gmailComposeUrl");
    expect(source).toContain("email.mailtoUrl");
    expect(source).toContain("shareFileNatively");
    expect(source).toContain("canShareFileNatively");
    expect(source).toContain("/configuracion#ajustes-gestor");
    expect(source).toContain("Adjunta el ZIP antes de enviarlo");
    expect(source).toContain("Compartir con el ZIP incluido");
    expect(source).toContain("facturas emitidas filtradas");
    expect(source).toContain("aunque el listado solo muestre");
    expect(source).toContain("limits.quarterlyExport");
    expect(source).toContain("InvoicePdfPeriodExportError");
  });

  it("mantiene la instrucción de adjuntar fuera del texto enviado al gestor", () => {
    expect(source).toContain("Adjunta el ZIP antes de enviarlo");
    const emailBuilder = readFileSync(
      new URL(
        "../../lib/billing/invoice-period-advisor-email.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(emailBuilder).not.toContain("Factu ha descargado el ZIP");
    expect(emailBuilder).not.toContain("Adjunta ese archivo");
  });
});
