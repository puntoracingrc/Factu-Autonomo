import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type Document } from "@/lib/types";
import {
  deriveDocumentLifecycle,
  deriveIntegrityLock,
  issueDocument,
  withDocumentSnapshotIntegritySignal,
} from "@/lib/document-integrity";
import {
  assertRectificationEmissionAllowed,
  canonicalRectificationItems,
  canonicalRectificationReference,
  hasPendingRectificationDraft,
  materializeRectificationDocument,
  profileForRectificationSource,
  preserveRectificationOriginalReference,
  resolveCanonicalRectificationSource,
} from "./rectification-issuance";

const NOW = "2026-07-10T10:00:00.000Z";

function rectification(status: Document["status"]): Document {
  return {
    id: "rect-1",
    type: "factura",
    number: status === "borrador" ? "BORRADOR" : "FR-2026-0001",
    date: "2026-07-10",
    client: {
      customerType: "company",
      firstName: "Cliente Demo SL",
      lastName: "",
      name: "Cliente Demo SL",
      nif: "B12345678",
      address: "C/ Mayor 1, 28001 Madrid",
      postalCode: "28001",
      city: "Madrid",
    },
    items: [
      {
        id: "line-1",
        description: "Corrección",
        quantity: 1,
        unitPrice: -100,
        ivaPercent: 21,
      },
    ],
    status,
    rectification: {
      originalDocumentId: "invoice-1",
      originalNumber: "F-2026-0001",
      originalDate: "2026-07-01",
      reason: "Error en datos",
      type: "anulacion",
    },
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("materializeRectificationDocument", () => {
  it("detecta un borrador previo para no duplicar la cadena", () => {
    const draft = rectification("borrador");

    expect(hasPendingRectificationDraft([draft], "invoice-1")).toBe(true);
    expect(hasPendingRectificationDraft([draft], "other-invoice")).toBe(false);
    expect(
      hasPendingRectificationDraft(
        [{ ...draft, status: "enviado", number: "FR-2026-0001" }],
        "invoice-1",
      ),
    ).toBe(false);
  });

  it("mantiene editable una rectificativa guardada como borrador", () => {
    const saved = materializeRectificationDocument(
      rectification("borrador"),
      EMPTY_DATA.profile,
      NOW,
    );

    expect(saved.documentSnapshot).toBeUndefined();
    expect(saved.pdfSnapshot).toBeUndefined();
    expect(deriveDocumentLifecycle(saved)).toBe("draft");
    expect(deriveIntegrityLock(saved)).toBe("unlocked");
  });

  it("sella una emisión directa antes de devolverla al store", () => {
    const saved = materializeRectificationDocument(
      rectification("enviado"),
      EMPTY_DATA.profile,
      NOW,
    );

    expect(saved).toMatchObject({
      status: "enviado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      issuedAt: NOW,
    });
    expect(saved.issuer).toBeDefined();
    expect(saved.documentSnapshot).toMatchObject({
      documentKind: "factura_rectificativa",
      customer: {
        nif: "B12345678",
        postalCode: "28001",
        city: "Madrid",
      },
      rectification: {
        originalDocumentId: "invoice-1",
        type: "anulacion",
      },
    });
    expect(saved.pdfSnapshot).toBeDefined();
  });

  it("rechaza un segundo borrador si la original ya tiene otra rectificativa", () => {
    const candidate = rectification("borrador");
    const original: Document = {
      ...candidate,
      id: "invoice-1",
      number: "F-2026-0001",
      rectification: undefined,
      rectifiedById: "rect-already-issued",
      status: "rectificada",
    };

    expect(() =>
      assertRectificationEmissionAllowed(candidate, [original, candidate]),
    ).toThrow("ya tiene otra rectificativa emitida");
  });

  it("rechaza una rectificativa que se referencia a sí misma", () => {
    const candidate = rectification("borrador");
    const selfReferenced = {
      ...candidate,
      rectification: {
        ...candidate.rectification!,
        originalDocumentId: candidate.id,
      },
    };

    expect(() =>
      assertRectificationEmissionAllowed(selfReferenced, [selfReferenced]),
    ).toThrow("no es una factura emitida válida");
  });

  it("rechaza una referencia original que no sea factura", () => {
    const candidate = rectification("borrador");
    const quote: Document = {
      ...candidate,
      id: "invoice-1",
      type: "presupuesto",
      number: "P-2026-0001",
      rectification: undefined,
      status: "enviado",
    };

    expect(() =>
      assertRectificationEmissionAllowed(candidate, [quote, candidate]),
    ).toThrow("no es una factura emitida válida");
  });

  it("rechaza originales no emitidas o ya cerradas sin el mismo vínculo", () => {
    const candidate = rectification("borrador");

    for (const status of [
      "borrador",
      "anulada",
      "rectificada",
    ] as const) {
      const invalidOriginal: Document = {
        ...candidate,
        id: "invoice-1",
        number: "F-2026-0001",
        rectification: undefined,
        rectifiedById: undefined,
        status,
      };

      expect(() =>
        assertRectificationEmissionAllowed(candidate, [
          invalidOriginal,
          candidate,
        ]),
      ).toThrow("no es una factura emitida válida");
    }
  });

  it("permite completar la misma relación y bloquea una original ausente", () => {
    const candidate = rectification("borrador");
    const original: Document = {
      ...candidate,
      id: "invoice-1",
      number: "F-2026-0001",
      rectification: undefined,
      rectifiedById: candidate.id,
      status: "rectificada",
    };

    expect(() =>
      assertRectificationEmissionAllowed(candidate, [original, candidate]),
    ).not.toThrow();
    expect(() =>
      assertRectificationEmissionAllowed(candidate, [candidate]),
    ).toThrow("No se encuentra la factura original");
  });

  it("impide que una edición cambie la factura original congelada", () => {
    const current = rectification("borrador");
    const original = issueDocument(
      {
        ...current,
        id: "invoice-1",
        number: "F-2026-0042",
        date: "2026-07-01",
        rectification: undefined,
        status: "borrador",
      },
      EMPTY_DATA.profile,
      NOW,
    );
    const manipulated: Document = {
      ...current,
      rectification: {
        ...current.rectification!,
        originalDocumentId: "other-invoice",
        originalNumber: "FALSA",
        originalDate: "2020-01-01",
      },
    };

    expect(
      preserveRectificationOriginalReference(current, manipulated, [
        original,
        current,
      ], EMPTY_DATA.profile).rectification,
    ).toMatchObject({
      originalDocumentId: original.id,
      originalNumber: original.number,
      originalDate: original.date,
    });
  });

  it("resuelve contenido y perfil histórico desde el snapshot canónico", () => {
    const historicalProfile = {
      ...EMPTY_DATA.profile,
      name: "Emisor histórico",
      nif: "12345678Z",
      vatExempt: true,
      iva: { rates: [0], defaultRate: 0 },
    };
    const issued = issueDocument(
      {
        ...rectification("borrador"),
        id: "invoice-1",
        number: "F-2026-0099",
        date: "2026-06-30",
        rectification: undefined,
        status: "borrador",
        items: [
          {
            id: "canonical-line",
            description: "Servicio histórico",
            quantity: 2,
            unitPrice: 75,
            ivaPercent: 0,
          },
        ],
      },
      historicalProfile,
      NOW,
    );
    const drifted: Document = {
      ...issued,
      number: "FALSA-VIVA",
      date: "2030-01-01",
      items: [
        {
          id: "fake-line",
          description: "Contenido manipulado",
          quantity: 1,
          unitPrice: 999,
          ivaPercent: 21,
        },
      ],
    };
    const currentProfile = {
      ...EMPTY_DATA.profile,
      name: "Nombre actual distinto",
      nif: "12345678Z",
      vatExempt: false,
      iva: { rates: [21], defaultRate: 21 },
    };

    const resolved = resolveCanonicalRectificationSource(
      drifted,
      currentProfile,
    );

    expect(resolved.original).toMatchObject({
      number: "F-2026-0099",
      date: "2026-06-30",
    });
    expect(resolved.original.items).toEqual([
      expect.objectContaining({
        id: "canonical-line",
        description: "Servicio histórico",
        quantity: 2,
        unitPrice: 75,
        ivaPercent: 0,
      }),
    ]);
    expect(resolved.profile).toMatchObject({
      name: "Emisor histórico",
      nif: "12345678Z",
      vatExempt: true,
      iva: { rates: [0], defaultRate: 0 },
    });
    expect(
      canonicalRectificationReference(
        resolved.original,
        rectification("borrador").rectification!,
      ),
    ).toMatchObject({
      originalDocumentId: "invoice-1",
      originalNumber: "F-2026-0099",
      originalDate: "2026-06-30",
    });
    expect(
      canonicalRectificationItems(
        resolved.original,
        drifted.items,
        "anulacion",
      ),
    ).toEqual([
      expect.objectContaining({
        description: "Servicio histórico",
        quantity: 2,
        unitPrice: -75,
        ivaPercent: 0,
      }),
    ]);
    expect(
      profileForRectificationSource(
        rectification("borrador"),
        [drifted],
        currentProfile,
      ),
    ).toMatchObject({ name: "Emisor histórico", vatExempt: true });
  });

  it("bloquea una fuente cuya integridad de snapshot está corrupta", () => {
    const issued = issueDocument(
      {
        ...rectification("borrador"),
        id: "invoice-1",
        rectification: undefined,
        status: "borrador",
        number: "F-2026-0001",
      },
      EMPTY_DATA.profile,
      NOW,
    );
    const corrupt = withDocumentSnapshotIntegritySignal({
      ...issued,
      documentSnapshot: {
        ...issued.documentSnapshot!,
        number: "F-ALTERADA",
      },
    });

    expect(corrupt.snapshotIntegrity?.status).toBe("blocked");
    expect(() =>
      resolveCanonicalRectificationSource(corrupt, EMPTY_DATA.profile),
    ).toThrow("no supera la comprobación de integridad");
  });
});
