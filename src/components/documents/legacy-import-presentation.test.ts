import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const listSource = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);
const actionsSource = readFileSync(
  new URL("./DocumentReadOnlyActions.tsx", import.meta.url),
  "utf8",
);
const pdfActionsSource = readFileSync(
  new URL("./DocumentPdfShareActions.tsx", import.meta.url),
  "utf8",
);
const deleteSource = readFileSync(
  new URL("./DeleteDocumentButton.tsx", import.meta.url),
  "utf8",
);
const manualSource = readFileSync(
  new URL("../../lib/manual/sections/cuenta.ts", import.meta.url),
  "utf8",
);

describe("historical imported document presentation", () => {
  it("etiqueta únicamente atestaciones válidas mediante la policy central", () => {
    expect(listSource).toContain("isUsableLegacyImportedDocument(doc)");
    expect(actionsSource).toContain("isUsableLegacyImportedDocument(doc)");
    expect(listSource).toContain("Histórico importado");
    expect(listSource).not.toContain("Histórico importado · aceptado por ti");
    expect(actionsSource).toContain("Histórico importado");
    expect(actionsSource).not.toContain("Histórico importado · aceptado por ti");
  });

  it("muestra el total central solo si la colección recuperada conserva su integridad", () => {
    expect(listSource).toContain("const recoveryCollectionValid =");
    expect(listSource).toContain("? documentAmounts(doc, vatExempt)");
    expect(listSource).toContain(": { subtotal: 0, iva: 0, total: 0 };");
    expect(listSource).toContain("const total = amounts.total");
    expect(listSource).toContain("{formatMoney(total)}");
  });

  it("solo ofrece la corrección operativa de cobro sobre el histórico congelado", () => {
    expect(listSource).toContain('!legacyImportAttested && type === "factura"');
    expect(actionsSource).toContain(
      '!legacyImportAttested && doc.type === "presupuesto"',
    );
    expect(actionsSource).toContain("!legacyImportAttested &&");
    expect(listSource).toContain('<MarkAsPaidButton doc={doc} />');
    expect(actionsSource).toContain('<MarkAsPaidButton doc={doc} />');
    expect(listSource).not.toContain(
      '!legacyImportAttested &&\n                        (type === "factura" || type === "recibo")',
    );
    expect(actionsSource).not.toContain(
      '!legacyImportAttested &&\n            (doc.type === "factura" || doc.type === "recibo")',
    );
    expect(listSource).toContain(
      "isDocumentUsableForFinancialCalculations(doc)",
    );
    expect(actionsSource).toContain(
      "isDocumentUsableForFinancialCalculations(doc)",
    );
  });

  it("distingue cualquier PDF reconstruido del archivo original", () => {
    expect(actionsSource).toContain("Cualquier PDF");
    expect(actionsSource).toContain("es una reconstrucción");
    expect(pdfActionsSource).toContain("no sustituye al original");
  });

  it("no muestra una papelera falsa en documentos protegidos y guía los históricos al mantenimiento real", () => {
    expect(deleteSource).toContain("if (!policy.allowed)");
    expect(deleteSource).toContain("if (!hasLegacyImportProtectionClaim(doc)) return null;");
    expect(deleteSource).toContain("Archivar histórico importado");
    expect(deleteSource).toContain('href="/cuenta#copias-cuenta"');
    expect(deleteSource).not.toContain("cursor-not-allowed bg-slate-50 text-slate-300");
    expect(listSource.split("<DeleteDocumentButton doc={doc} />")).toHaveLength(
      3,
    );
  });

  it("documenta la vista previa, copia y alcance fiscal sin afirmar sello moderno", () => {
    for (const copy of [
      "Histórico importado",
      "impuestos y rentabilidad",
      "vista previa",
      "copia JSON",
      "confirmación explícita",
      "Conserva el archivo original",
      "no crea un sello moderno ni un registro Veri*Factu",
    ]) {
      expect(manualSource).toContain(copy);
    }
  });
});
