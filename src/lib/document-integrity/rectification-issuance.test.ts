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
  requireUniqueRectificationOriginal,
  resolveCanonicalRectificationSource,
  verifiedRectificationOriginalSnapshot,
} from "./rectification-issuance";

const NOW = "2026-07-10T10:00:00.000Z";
const PROFILE = {
  ...EMPTY_DATA.profile,
  name: "Autónomo Test",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  postalCode: "28001",
  city: "Madrid",
};

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

function issuedOriginal(overrides: Partial<Document> = {}): Document {
  return {
    ...issueDocument(
      {
        ...rectification("borrador"),
        id: "invoice-1",
        number: "F-2026-0001",
        rectification: undefined,
      },
      PROFILE,
      NOW,
    ),
    ...overrides,
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
      PROFILE,
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
      PROFILE,
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

  it("rechaza otra rectificativa ante un hijo emitido unilateral live o congelado", () => {
    const original = issuedOriginal();
    const candidate = rectification("borrador");
    const issuedUnilateral = materializeRectificationDocument(
      {
        ...rectification("enviado"),
        id: "issued-unilateral",
      },
      PROFILE,
      NOW,
    );
    const frozenOnly: Document = {
      ...issuedUnilateral,
      rectification: undefined,
    };

    for (const existing of [issuedUnilateral, frozenOnly]) {
      expect(() =>
        assertRectificationEmissionAllowed(candidate, [
          original,
          existing,
          candidate,
        ]),
      ).toThrow("ya tiene otra rectificativa emitida");
    }
    expect(original.rectifiedById).toBeUndefined();
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

  it("rechaza un ID de factura original duplicado sin elegir ni mutar uno", () => {
    const candidate = rectification("borrador");
    const original = issuedOriginal();
    const duplicate = { ...original };
    const documents = [original, duplicate, candidate];

    expect(() =>
      requireUniqueRectificationOriginal(documents, original.id),
    ).toThrow("no es una factura emitida válida");
    expect(() =>
      assertRectificationEmissionAllowed(candidate, documents),
    ).toThrow("no es una factura emitida válida");
    expect(documents).toEqual([original, duplicate, candidate]);
  });

  it("rechaza una original bloqueada al recalcular el grafo relacional", () => {
    const candidate = rectification("borrador");
    const original = issuedOriginal();
    const collidingIdentity = issueDocument(
      {
        ...rectification("borrador"),
        id: "colliding-original",
        number: original.number,
        date: original.date,
        rectification: undefined,
      },
      PROFILE,
      NOW,
    );
    const documents = [original, collidingIdentity, candidate];

    expect(() =>
      assertRectificationEmissionAllowed(candidate, documents),
    ).toThrow("no es una factura emitida válida");
    expect(original.snapshotIntegrity).toBeUndefined();
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

  it("bloquea una relación ya señalada y una original ausente", () => {
    const candidate = rectification("borrador");
    const original = issuedOriginal({
      rectifiedById: candidate.id,
      status: "rectificada",
    });

    expect(() =>
      assertRectificationEmissionAllowed(candidate, [original, candidate]),
    ).toThrow("no es una factura emitida válida");
    expect(() =>
      assertRectificationEmissionAllowed(candidate, [candidate]),
    ).toThrow("No se encuentra la factura original");
  });

  it("rechaza una fecha anterior a la fecha fiscal original", () => {
    const candidate = { ...rectification("borrador"), date: "2026-07-09" };
    const original = issuedOriginal();

    expect(() =>
      assertRectificationEmissionAllowed(candidate, [original, candidate]),
    ).toThrow("no puede ser anterior a la factura original");
  });

  it("rechaza emitir la rectificativa si la original conserva evidencia de recibo", () => {
    const candidate = rectification("borrador");
    const original = issuedOriginal({ receiptDocumentId: "receipt-backlink" });

    expect(() =>
      assertRectificationEmissionAllowed(candidate, [original, candidate]),
    ).toThrow("tiene un recibo vinculado");
  });

  it("rechaza recibos que reclaman el origen por vínculo vivo o congelado", () => {
    const candidate = rectification("borrador");
    const original = issuedOriginal();
    const liveReceipt: Document = {
      ...candidate,
      id: "live-receipt",
      type: "recibo",
      number: "R-2026-0001",
      rectification: undefined,
      sourceDocumentId: original.id,
    };
    const sealedReceipt = issueDocument(
      {
        ...liveReceipt,
        id: "sealed-receipt",
        number: "R-2026-0002",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      },
      PROFILE,
      NOW,
    );
    const frozenOnlyReceipt: Document = {
      ...sealedReceipt,
      sourceDocumentId: undefined,
    };

    expect(() =>
      assertRectificationEmissionAllowed(candidate, [
        original,
        candidate,
        liveReceipt,
      ]),
    ).toThrow("tiene un recibo vinculado");
    expect(() =>
      assertRectificationEmissionAllowed(candidate, [
        original,
        candidate,
        frozenOnlyReceipt,
      ]),
    ).toThrow("tiene un recibo vinculado");
  });

  it("rechaza una rectificativa como origen hasta soportar la cadena", () => {
    const issuedRectification = materializeRectificationDocument(
      rectification("enviado"),
      PROFILE,
      NOW,
    );

    expect(() =>
      verifiedRectificationOriginalSnapshot(issuedRectification),
    ).toThrow("no es una factura emitida válida");
    expect(() =>
      resolveCanonicalRectificationSource(
        issuedRectification,
        PROFILE,
      ),
    ).toThrow("no es una factura emitida válida");
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
        items: current.items.map((item) => ({
          ...item,
          unitPrice: Math.abs(item.unitPrice),
        })),
      },
      PROFILE,
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
      ], PROFILE).rectification,
    ).toMatchObject({
      originalDocumentId: original.id,
      originalNumber: original.number,
      originalDate: original.date,
    });
  });

  it("reconstruye una anulación desde el snapshot al emitir su borrador", () => {
    const current = rectification("borrador");
    const original = issueDocument(
      {
        ...current,
        id: "invoice-1",
        number: "F-2026-0042",
        date: "2026-07-01",
        rectification: undefined,
        items: [
          {
            id: "original-line",
            description: "Servicio original",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
      PROFILE,
      NOW,
    );
    const manipulated: Document = {
      ...current,
      status: "enviado",
      rectification: {
        ...current.rectification!,
        type: "correccion",
      },
      items: [
        {
          id: "manipulated-line",
          description: "Importe alterado",
          quantity: 1,
          unitPrice: -1,
          ivaPercent: 0,
        },
      ],
    };

    const preserved = preserveRectificationOriginalReference(
      current,
      manipulated,
      [original, current],
      PROFILE,
    );

    expect(preserved.items).toEqual([
      expect.objectContaining({
        description: "Servicio original",
        quantity: 1,
        unitPrice: -100,
        ivaPercent: 21,
      }),
    ]);
    expect(preserved.items[0].id).not.toBe("manipulated-line");
    expect(preserved.rectification?.type).toBe("anulacion");
  });

  it("resuelve contenido y perfil histórico desde el snapshot canónico", () => {
    const historicalProfile = {
      ...EMPTY_DATA.profile,
      name: "Emisor histórico",
      nif: "12345678Z",
      address: "Calle Histórica 1",
      postalCode: "28001",
      city: "Madrid",
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
      address: "Calle Actual 2",
      postalCode: "28002",
      city: "Madrid",
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

  it("rechaza una original sellada que no cumple los requisitos fiscales", () => {
    const source = (
      id: string,
      overrides: Partial<Document>,
      profile = PROFILE,
    ) =>
      issueDocument(
        {
          ...rectification("borrador"),
          id,
          number: `F-2026-${id}`,
          rectification: undefined,
          status: "borrador",
          items: rectification("borrador").items.map((item) => ({
            ...item,
            id: `${id}-line`,
            unitPrice: Math.abs(item.unitPrice),
          })),
          ...overrides,
        },
        profile,
        NOW,
      );

    const invalidVat = source("invalid-vat", {
      items: [
        {
          ...rectification("borrador").items[0],
          id: "invalid-vat-line",
          unitPrice: 100,
          ivaPercent: 101,
        },
      ],
    });
    const incompleteClient = source("invalid-client", {
      client: { name: "Cliente incompleto" },
    });
    const blankConcept = source("blank-concept", {
      items: [
        {
          ...rectification("borrador").items[0],
          id: "blank-concept-line",
          description: " ",
          unitPrice: 100,
        },
      ],
    });
    const incompleteIssuerProfile = {
      ...PROFILE,
      address: "",
    };
    const incompleteIssuer = source(
      "invalid-issuer",
      {},
      incompleteIssuerProfile,
    );

    for (const [candidate, profile] of [
      [invalidVat, PROFILE],
      [incompleteClient, PROFILE],
      [blankConcept, PROFILE],
      [incompleteIssuer, incompleteIssuerProfile],
    ] as const) {
      expect(() =>
        resolveCanonicalRectificationSource(candidate, profile),
      ).toThrow("no cumple los requisitos fiscales");
    }
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
      PROFILE,
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
      resolveCanonicalRectificationSource(corrupt, PROFILE),
    ).toThrow("no supera la comprobación de integridad");
  });
});
