import { describe, expect, it } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { EMPTY_DATA, type Document } from "@/lib/types";
import { editableQuoteWithLocalStatus } from "./quote-status";

const NOW = "2026-07-11T10:00:00.000Z";
const LATER = "2026-07-11T11:00:00.000Z";

function quote(): Document {
  return {
    id: "quote-1",
    type: "presupuesto",
    number: "P-2026-0001",
    date: "2026-07-11",
    client: { name: "Cliente prueba" },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("editableQuoteWithLocalStatus", () => {
  it("conserva el sello y el contenido canónico de un presupuesto emitido", () => {
    const sealed = issueDocument(quote(), EMPTY_DATA.profile, NOW);
    const accepted = editableQuoteWithLocalStatus(
      {
        ...sealed,
        status: "aceptado",
        number: "P-VIVA-ALTERADA",
        items: [{ ...sealed.items[0], unitPrice: 999 }],
      },
      LATER,
    );

    expect(accepted).toMatchObject({
      status: "aceptado",
      number: "P-2026-0001",
      documentLifecycle: "issued",
      integrityLock: "locked",
      acceptanceStatus: "accepted",
      acceptedAt: LATER,
    });
    expect(accepted.items[0].unitPrice).toBe(100);
    expect(accepted.issuer).toEqual(sealed.issuer);
    expect(accepted.documentSnapshot).toBe(sealed.documentSnapshot);
    expect(accepted.pdfSnapshot).toBe(sealed.pdfSnapshot);
    expect(accepted.snapshotSeal).toBe(sealed.snapshotSeal);
    expect(accepted.snapshotIntegrityRequired).toBe(true);
  });

  it("rechaza evidencia corrupta en vez de borrarla", () => {
    const sealed = issueDocument(quote(), EMPTY_DATA.profile, NOW);
    const corrupt: Document = {
      ...sealed,
      status: "rechazado",
      documentSnapshot: {
        ...sealed.documentSnapshot!,
        number: "P-CORRUPTO",
      },
    };

    expect(() => editableQuoteWithLocalStatus(corrupt, LATER)).toThrow(
      "no supera la comprobación de integridad",
    );
  });
});
