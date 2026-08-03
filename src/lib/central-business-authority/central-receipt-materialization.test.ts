import { describe, expect, it } from "vitest";

import { issueDocument, markDocumentPaid } from "@/lib/document-integrity";
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
          quantity: 2,
          unit: "ud",
          unitPrice: 50,
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
    expect(centralBusinessReceiptServerPayload(result.receipt)).toEqual(payload);
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
