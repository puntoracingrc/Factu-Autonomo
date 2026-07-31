import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type AppData,
  type Document,
} from "@/lib/types";

import type {
  CentralBusinessNumberedDocumentCreateBrowserResult,
} from "./numbered-document-client";
import {
  buildCentralBusinessNumberedDocumentLocalCommit,
  CentralBusinessNumberedDocumentLocalCommitError,
} from "./numbered-document-local-commit";

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...DEFAULT_PROFILE,
      numbering: {
        ...DEFAULT_PROFILE.numbering,
        year: 2026,
        lastSequence: {
          factura: 42,
          factura_rectificativa: 3,
          presupuesto: 7,
          recibo: 5,
        },
      },
    },
    documents: [],
    counters: {
      factura: 42,
      factura_rectificativa: 3,
      presupuesto: 7,
      recibo: 5,
    },
    ...overrides,
  };
}

function document(
  entityType: "quote" | "receipt" = "quote",
  overrides: Partial<Document> = {},
): Document {
  return {
    id: entityType === "quote" ? "quote-central-1" : "receipt-central-1",
    type: entityType === "quote" ? "presupuesto" : "recibo",
    number: entityType === "quote" ? "P-2026-0008" : "R-2026-0006",
    date: "2026-07-29",
    client: { name: "Cliente sintetico" },
    items: [
      {
        id: "line-1",
        description: "Trabajo sintetico",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: "2026-07-29T10:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z",
    ...overrides,
  };
}

function confirmation(
  entityType: "quote" | "receipt" = "quote",
  overrides: Partial<CentralBusinessNumberedDocumentCreateBrowserResult> = {},
): CentralBusinessNumberedDocumentCreateBrowserResult {
  const payload = document(entityType);
  const sequence = entityType === "quote" ? 8 : 6;
  return {
    schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
    action: "create",
    status: "committed",
    eventId: "event-central-1",
    eventSequence: 1,
    entityVersion: 1,
    fullNumber: payload.number,
    sequence,
    scopeYear: 2026,
    contentHash: "a".repeat(64),
    documentPayload: JSON.parse(JSON.stringify(payload)),
    ...overrides,
  };
}

function expectCommitError(
  callback: () => unknown,
  code: CentralBusinessNumberedDocumentLocalCommitError["code"],
) {
  try {
    callback();
    throw new Error("Se esperaba un conflicto local");
  } catch (error) {
    expect(error).toBeInstanceOf(
      CentralBusinessNumberedDocumentLocalCommitError,
    );
    expect(
      (error as CentralBusinessNumberedDocumentLocalCommitError).code,
    ).toBe(code);
  }
}

describe("central numbered document local commit", () => {
  it("materializa exactamente el presupuesto confirmado y solo eleva su suelo", () => {
    const before = appData();
    const server = confirmation("quote");
    const result = buildCentralBusinessNumberedDocumentLocalCommit(
      before,
      "quote",
      server,
    );

    expect(result.replayed).toBe(false);
    expect(result.value).toEqual(server.documentPayload);
    expect(result.data.documents).toEqual([server.documentPayload]);
    expect(result.data.counters).toEqual({
      factura: 42,
      factura_rectificativa: 3,
      presupuesto: 8,
      recibo: 5,
    });
    expect(result.data.profile.numbering.lastSequence).toEqual({
      factura: 42,
      factura_rectificativa: 3,
      presupuesto: 8,
      recibo: 5,
    });
  });

  it("aplica el mismo contrato a recibos", () => {
    const result = buildCentralBusinessNumberedDocumentLocalCommit(
      appData(),
      "receipt",
      confirmation("receipt"),
    );

    expect(result.value.type).toBe("recibo");
    expect(result.value.number).toBe("R-2026-0006");
    expect(result.data.counters.presupuesto).toBe(7);
    expect(result.data.counters.recibo).toBe(6);
  });

  it("respeta una serie global sin ejercicio", () => {
    const before = appData({
      profile: {
        ...appData().profile,
        numbering: {
          ...appData().profile.numbering,
          formats: {
            ...appData().profile.numbering.formats,
            presupuesto: {
              template: "Presupuesto - {num}",
              padding: 4,
            },
          },
        },
      },
    });
    const payload = document("quote", {
      number: "Presupuesto - 0008",
    });
    const server = confirmation("quote", {
      fullNumber: payload.number,
      scopeYear: 0,
      documentPayload: JSON.parse(JSON.stringify(payload)),
    });

    const result = buildCentralBusinessNumberedDocumentLocalCommit(
      before,
      "quote",
      server,
    );

    expect(result.value.number).toBe("Presupuesto - 0008");
  });

  it("reconoce una repeticion byte-semantica sin duplicar ni mutar", () => {
    const server = confirmation("quote");
    const existing = server.documentPayload as unknown as Document;
    const before = appData({ documents: [existing] });
    const result = buildCentralBusinessNumberedDocumentLocalCommit(
      before,
      "quote",
      server,
    );

    expect(result.replayed).toBe(true);
    expect(result.data).toBe(before);
    expect(result.value).toBe(existing);
    expect(result.data.documents).toHaveLength(1);
  });

  it("bloquea una identidad repetida con contenido divergente", () => {
    const server = confirmation("quote");
    const before = appData({
      documents: [
        document("quote", {
          notes: "Contenido local distinto",
        }),
      ],
    });

    expectCommitError(
      () =>
        buildCentralBusinessNumberedDocumentLocalCommit(
          before,
          "quote",
          server,
        ),
      "DOCUMENT_ID_COLLISION",
    );
  });

  it("bloquea un numero ya ocupado por otra identidad", () => {
    const server = confirmation("quote");
    const before = appData({
      documents: [
        document("quote", {
          id: "quote-local-distinto",
        }),
      ],
    });

    expectCommitError(
      () =>
        buildCentralBusinessNumberedDocumentLocalCommit(
          before,
          "quote",
          server,
        ),
      "DOCUMENT_NUMBER_COLLISION",
    );
  });

  it("bloquea payloads malformados y confirmaciones incoherentes", () => {
    const malformed = confirmation("quote", {
      documentPayload: {
        id: "quote-central-1",
        type: "presupuesto",
        number: "P-2026-0008",
      },
    });
    expectCommitError(
      () =>
        buildCentralBusinessNumberedDocumentLocalCommit(
          appData(),
          "quote",
          malformed,
        ),
      "MALFORMED_DOCUMENT",
    );

    const mismatched = confirmation("quote", { sequence: 9 });
    expectCommitError(
      () =>
        buildCentralBusinessNumberedDocumentLocalCommit(
          appData(),
          "quote",
          mismatched,
        ),
      "INVALID_CONFIRMATION",
    );

    const invalidDatePayload = document("quote", { date: "2026-02-30" });
    const invalidDate = confirmation("quote", {
      documentPayload: JSON.parse(JSON.stringify(invalidDatePayload)),
    });
    expectCommitError(
      () =>
        buildCentralBusinessNumberedDocumentLocalCommit(
          appData(),
          "quote",
          invalidDate,
        ),
      "INVALID_CONFIRMATION",
    );
  });

  it("nunca reduce un contador local adelantado", () => {
    const before = appData({
      counters: {
        factura: 42,
        factura_rectificativa: 3,
        presupuesto: 20,
        recibo: 5,
      },
      profile: {
        ...appData().profile,
        numbering: {
          ...appData().profile.numbering,
          lastSequence: {
            ...appData().profile.numbering.lastSequence,
            presupuesto: 20,
          },
        },
      },
    });
    const result = buildCentralBusinessNumberedDocumentLocalCommit(
      before,
      "quote",
      confirmation("quote"),
    );

    expect(result.data.counters.presupuesto).toBe(20);
    expect(result.data.profile.numbering.lastSequence.presupuesto).toBe(20);
  });
});
