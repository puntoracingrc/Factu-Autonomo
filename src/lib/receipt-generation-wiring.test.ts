import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("wiring durable y feedback de generación de recibos", () => {
  it("publica memoria solo mediante el commit durable", () => {
    const appStore = source("../context/AppStore.tsx");
    const start = appStore.indexOf("const generateReceiptForInvoice");
    const end = appStore.indexOf("const unmarkAsCollected", start);
    const block = appStore.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain("runReceiptGenerationCommand");
    expect(block).toContain("commitDurableAppData(baseline, build)");
    expect(block).not.toContain("setAppData(");
  });

  it("convierte recibos existentes y bloqueos en acciones visibles", () => {
    const button = source(
      "../components/documents/GenerateReceiptButton.tsx",
    );

    expect(button).toContain("inspectReceiptGenerationForDisplay");
    expect(button).toContain("IconActionLink");
    expect(button).toContain("documentDetailPath(inspection.receipt)");
    expect(button).toContain('label="Ver recibo"');
    expect(button).toContain("receiptGenerationBlockedMessage");
    expect(button).toContain("showFactuToast");
    expect(button).toContain("No se ha creado otro");
    expect(button).toContain("no se ha publicado en pantalla");
    expect(button).toContain("La generación se interrumpió");
  });
});
