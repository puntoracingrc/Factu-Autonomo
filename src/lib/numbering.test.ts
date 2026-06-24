import { describe, expect, it } from "vitest";
import { assignNextDocumentNumberByType } from "./documents";
import {
  bumpNumberingAfterAssign,
  configuredLastForKind,
  defaultNumberingSettings,
  formatDocumentNumberWithSettings,
  nextSequencePreview,
  normalizeNumbering,
  parseDocumentNumberForKind,
  setManualFormat,
} from "./numbering";
import type { Document, DocumentType } from "./types";

function doc(id: string, type: DocumentType, number: string): Document {
  return {
    id,
    type,
    number,
    date: "2026-06-09",
    client: { name: "Cliente", firstName: "Cliente", lastName: "" },
    items: [],
    status: "borrador",
    createdAt: "",
    updatedAt: "",
  };
}

describe("numeración configurable", () => {
  it("continúa desde el último número configurado sin documentos", () => {
    const numbering = normalizeNumbering({
      year: 2026,
      lastSequence: {
        factura: 47,
        factura_rectificativa: 0,
        presupuesto: 0,
        recibo: 0,
      },
    });

    const next = assignNextDocumentNumberByType(
      [],
      "factura",
      2026,
      configuredLastForKind(numbering, "factura", 2026),
    );

    expect(next.number).toBe("F-2026-0048");
  });

  it("usa el mayor entre documentos y configuración", () => {
    const documents = [doc("1", "factura", "F-2026-0050")];
    const numbering = defaultNumberingSettings(2026);
    numbering.lastSequence.factura = 47;

    const next = assignNextDocumentNumberByType(
      documents,
      "factura",
      2026,
      configuredLastForKind(numbering, "factura", 2026),
    );

    expect(next.number).toBe("F-2026-0051");
  });

  it("muestra la vista previa del siguiente número", () => {
    const preview = nextSequencePreview(
      normalizeNumbering({
        year: 2026,
        lastSequence: {
          factura: 10,
          factura_rectificativa: 0,
          presupuesto: 0,
          recibo: 0,
        },
      }),
      "factura",
      0,
    );

    expect(preview.nextNumber).toBe("F-2026-0011");
  });

  it("actualiza la configuración al emitir", () => {
    const updated = bumpNumberingAfterAssign(
      defaultNumberingSettings(2026),
      "presupuesto",
      2026,
      12,
    );

    expect(updated.lastSequence.presupuesto).toBe(12);
  });

  it("permite formatos personalizados", () => {
    const numbering = setManualFormat(
      defaultNumberingSettings(2026),
      "factura",
      "Factura - {num}",
    );

    expect(
      formatDocumentNumberWithSettings("factura", 2026, 48, numbering),
    ).toBe("Factura - 0048");

    const parsed = parseDocumentNumberForKind(
      "Factura - 0048",
      "factura",
      numbering,
    );
    expect(parsed?.sequence).toBe(48);
  });

  it("previsualiza el formato personalizado", () => {
    const numbering = setManualFormat(
      {
        year: 2026,
        lastSequence: {
          factura: 0,
          factura_rectificativa: 0,
          presupuesto: 3,
          recibo: 0,
        },
        formats: defaultNumberingSettings(2026).formats,
      },
      "presupuesto",
      "Presupuesto - {num}",
    );

    const preview = nextSequencePreview(numbering, "presupuesto", 0);
    expect(preview.nextNumber).toBe("Presupuesto - 0004");
  });
});
