import { describe, expect, it } from "vitest";

import {
  issueDocument,
  markDocumentPaid,
  markDocumentSent,
} from "@/lib/document-integrity";
import { inspectDocumentSnapshotsIntegrity } from "@/lib/document-integrity/snapshots";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type AppData,
  type Document,
} from "@/lib/types";

import {
  buildCentralBusinessReceiptPayloadWithoutNumber,
  centralBusinessReceiptServerPayload,
  CentralBusinessReceiptMaterializationError,
  materializeCentralBusinessReceipt,
  applyCentralReceiptDelivery,
  buildCentralManualReceiptPayloadWithoutNumber,
} from "./central-receipt-materialization";

const issuedAt = "2026-08-03T12:00:00.000Z";
const PROFILE = {
  ...DEFAULT_PROFILE,
  name: "Emisor sintetico",
  nif: "B12345678",
  address: "Calle Central 1",
  postalCode: "28001",
  city: "Madrid",
};

function invoice(): Document {
  const issued = issueDocument(
    {
      id: "invoice-central-1",
      type: "factura",
      number: "F-2026-0042",
      date: "2026-08-01",
      client: {
        name: "Cliente sintetico",
        nif: "X1234567L",
        address: "Calle Cliente 2",
        postalCode: "28002",
        city: "Madrid",
      },
      items: [
        {
          id: "invoice-line-1",
          description: "Trabajo sintetico",
          quantity: 1,
          unit: "ud",
          unitPrice: 66.12,
          grossUnitPrice: 80,
          ivaPercent: 21,
        },
      ],
      paymentTerms: "Transferencia",
      status: "borrador",
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-01T09:00:00.000Z",
    },
    PROFILE,
    "2026-08-01T09:00:00.000Z",
  );
  return {
    ...markDocumentPaid(issued, "2026-08-01T10:00:00.000Z"),
    centralInvoiceAuthority: {
      schemaVersion: 1,
      source: "central_invoice_authority",
      serverDocumentId: "server-invoice-1",
      identityId: "identity-invoice-1",
      outboxEventId: "event-invoice-1",
      eventType: "invoice_issued",
      fullNumber: "F-2026-0042",
      sequence: 42,
      documentVersion: 2,
      emittedHash: "sha256:invoice",
      receivedAt: "2026-08-01T10:01:00.000Z",
    },
  };
}

function data(documents: Document[] = [invoice()]): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...PROFILE,
      numbering: {
        ...PROFILE.numbering,
        lastSequence: {
          ...PROFILE.numbering.lastSequence,
          factura: 42,
          recibo: 7,
        },
      },
    },
    documents,
  };
}

function serverReceiptPayload(current: AppData): Document {
  return {
    ...buildCentralBusinessReceiptPayloadWithoutNumber({
      data: current,
      invoiceId: "invoice-central-1",
      receiptId: "receipt-central-1",
      issuedAt,
      createLineId: () => "receipt-line-1",
    }),
    number: "R-2026-0008",
  } as Document;
}

function expectMaterializationError(
  callback: () => unknown,
  code: CentralBusinessReceiptMaterializationError["code"],
) {
  try {
    callback();
    throw new Error("Se esperaba un rechazo de materializacion");
  } catch (error) {
    expect(error).toBeInstanceOf(CentralBusinessReceiptMaterializationError);
    expect((error as CentralBusinessReceiptMaterializationError).code).toBe(
      code,
    );
  }
}

describe("central receipt materialization", () => {
  it("shares delivery without changing sealed content, including on a fresh device", () => {
    const before = data();
    const first = materializeCentralBusinessReceipt({
      data: before,
      receiptPayload: serverReceiptPayload(before),
    }).receipt;
    const sent = markDocumentSent(first, "2026-10-10T10:00:00.000Z");
    const payload = centralBusinessReceiptServerPayload(sent);
    const remote = applyCentralReceiptDelivery(first, payload);
    expect(remote.deliveryStatus).toBe("sent");
    for (const key of [
      "documentSnapshot",
      "pdfSnapshot",
      "snapshotSeal",
    ] as const)
      expect(remote[key]).toEqual(first[key]);
    const fresh = materializeCentralBusinessReceipt({
      data: before,
      receiptPayload: payload,
    }).receipt;
    expect(fresh.deliveryStatus).toBe("sent");
    expect(fresh.documentSnapshot).toEqual(first.documentSnapshot);
    expect(() =>
      applyCentralReceiptDelivery(remote, serverReceiptPayload(before)),
    ).toThrow();
    expect(() =>
      applyCentralReceiptDelivery(first, { ...payload, notes: "changed" }),
    ).toThrow();
  });

  it("materializes a manual receipt with frozen issuer/IVA/template, never IRPF or private account configuration", () => {
    const invoiceDraft = invoice();
    const draft = {
      type: "recibo" as const,
      status: "pagado" as const,
      date: "2026-10-10",
      client: invoiceDraft.client,
      items: invoiceDraft.items,
    };
    const raw = {
      ...buildCentralManualReceiptPayloadWithoutNumber(
        draft,
        PROFILE,
        "manual-receipt",
        issuedAt,
      ),
      number: "R-2026-0001",
    } as unknown as Document;
    const changed = {
      ...data([]),
      profile: {
        ...PROFILE,
        name: "Nombre cambiado",
        nif: "B87654321",
        vatExempt: true,
      },
    };
    const result = materializeCentralBusinessReceipt({
      data: changed,
      receiptPayload: raw,
    });
    expect(result.receipt.documentSnapshot?.issuer.name).toBe(PROFILE.name);
    expect(result.receipt.documentSnapshot?.issuer.nif).toBe(PROFILE.nif);
    expect(result.receipt.documentSnapshot?.fiscalContext.vatExempt).toBe(
      PROFILE.vatExempt,
    );
    expect(result.receipt.sourceDocumentId).toBeUndefined();
    expect(
      Object.keys(raw.centralBusinessReceiptAuthority!.manualContext!).sort(),
    ).toEqual(["iva", "template", "vatExempt"]);
    expect(centralBusinessReceiptServerPayload(result.receipt)).toEqual(raw);
    expect(
      inspectDocumentSnapshotsIntegrity(result.receipt, {
        requireDocumentSnapshot: true,
        requirePdfSnapshot: true,
        requireSnapshotSeal: true,
      }).ok,
    ).toBe(true);
  });

  it("sella el payload confirmado, enlaza la factura y conserva una proyeccion central exacta", () => {
    const before = data();
    const payload = serverReceiptPayload(before);
    const result = materializeCentralBusinessReceipt({
      data: before,
      receiptPayload: payload,
    });

    expect(result.receipt).toMatchObject({
      id: "receipt-central-1",
      number: "R-2026-0008",
      type: "recibo",
      status: "pagado",
      sourceDocumentId: "invoice-central-1",
      documentLifecycle: "issued",
      centralBusinessReceiptAuthority: {
        source: "central_business_authority",
        issuedAt,
      },
    });
    expect(
      result.data.documents.find((entry) => entry.id === "invoice-central-1")
        ?.receiptDocumentId,
    ).toBe("receipt-central-1");
    expect(
      inspectDocumentSnapshotsIntegrity(result.receipt, {
        requireDocumentSnapshot: true,
        requirePdfSnapshot: true,
        requireSnapshotSeal: true,
      }).ok,
    ).toBe(true);
    expect(centralBusinessReceiptServerPayload(result.receipt)).toEqual(
      payload,
    );
    expect(result.receipt.items[0]).toMatchObject({
      unitPrice: 66.12,
      grossUnitPrice: 80,
    });
    expect(result.receipt.documentSnapshot?.items[0]).toMatchObject({
      subtotal: 66.12,
      ivaAmount: 13.88,
      total: 80,
    });
  });

  it("rechaza contenido alterado y nunca crea un segundo recibo", () => {
    const before = data();
    const payload = serverReceiptPayload(before);
    expectMaterializationError(
      () =>
        materializeCentralBusinessReceipt({
          data: before,
          receiptPayload: {
            ...payload,
            items: [{ ...payload.items[0]!, unitPrice: 999 }],
          },
        }),
      "RECEIPT_PAYLOAD_MISMATCH",
    );

    const first = materializeCentralBusinessReceipt({
      data: before,
      receiptPayload: payload,
    });
    expectMaterializationError(
      () =>
        materializeCentralBusinessReceipt({
          data: first.data,
          receiptPayload: {
            ...payload,
            id: "receipt-central-2",
            number: "R-2026-0009",
          },
        }),
      "RECEIPT_RELATIONSHIP_INVALID",
    );
  });

  it("considera reintentable que el evento llegue antes que su factura", () => {
    const before = data([]);
    const payload = serverReceiptPayload(data());
    expectMaterializationError(
      () =>
        materializeCentralBusinessReceipt({
          data: before,
          receiptPayload: payload,
        }),
      "RECEIPT_SOURCE_MISSING",
    );
  });
});
