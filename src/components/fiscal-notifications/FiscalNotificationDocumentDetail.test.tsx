import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./FiscalNotificationDocumentDetail.tsx", import.meta.url),
  "utf8",
);
const viewModelSource = readFileSync(
  new URL(
    "../../lib/fiscal-notifications/structured-review-document-detail.v1.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("FiscalNotificationDocumentDetail UI contract", () => {
  it("ordena las cinco secciones como un único informe continuo", () => {
    const headings = [
      "DocumentHeader",
      "Lo que dice el documento",
      "Importes y tablas",
      "Qué significa y qué debes revisar",
      "Relaciones, cronología y fuentes",
    ];
    let previous = -1;
    for (const heading of headings) {
      const position = source.indexOf(heading, previous + 1);
      expect(position, heading).toBeGreaterThan(previous);
      previous = position;
    }
    expect(source).toContain("rounded-lg border border-slate-200 bg-white");
    expect(source).toContain("divide-y divide-slate-200 border-y");
    expect(source).not.toContain("<Card className=\"mt-");
  });

  it("muestra solo acciones reales y deja la procedencia bajo demanda", () => {
    expect(source).toContain("Abrir original en Drive");
    expect(source).toContain("Eliminar esta ficha");
    expect(source).toContain("Ver procedencia de ${label}");
    expect(source).toContain("fiscal-notification-provenance");
    expect(source).not.toMatch(/Descargar PDF|Compartir|Imprimir/u);
    expect(source).not.toMatch(
      /confianza|extractor|regla aplicada|versión del motor/iu,
    );
    expect(viewModelSource).toContain("driveFileId: document.originalArchive");
    expect(viewModelSource).toContain("economy,");
    expect(viewModelSource).toContain("connections,");
  });

  it("incluye los contratos responsive y contiene las tablas complejas dentro de un scroll controlado", () => {
    expect(source).toContain("sm:hidden");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("max-h-[88dvh]");
    expect(source).toContain("sm:max-w-md");
    expect(source).toContain("min-w-0");
    expect(source).toContain("details open");
    expect(source).not.toContain("text-[clamp(");
  });

  it("mantiene identidad, importes, relaciones y procedencia fuera del JSX", () => {
    for (const expected of [
      "projectFiscalNotificationDocumentDetailV1",
      "classifyFact",
      "projectEconomy",
      "projectRelation",
      "maskSensitiveIdentifiers",
      "containsInternalFiscalNotificationToken",
    ]) {
      expect(viewModelSource).toContain(expected);
    }
    expect(source).not.toContain("containsInternalFiscalNotificationToken");
    expect(source).not.toContain("resolveAeatDocumentProfileV1");
  });
});
