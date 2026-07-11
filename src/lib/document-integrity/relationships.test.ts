import { describe, expect, it } from "vitest";
import { issueDocument, markDocumentPaid } from ".";
import { buildReceiptFromInvoice } from "../receipts";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
} from "../types";
import { withDocumentRelationshipIntegritySignals } from "./relationships";

const NOW = "2026-07-11T10:00:00.000Z";
const PROFILE: BusinessProfile = { ...DEFAULT_PROFILE, nif: "12345678Z" };

function issuedInvoice(profile = PROFILE): Document {
  return issueDocument(
    {
      id: "original",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-07-10",
      client: { name: "Cliente" },
      items: [
        {
          id: "line-original",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: NOW,
      updatedAt: NOW,
    },
    profile,
    NOW,
  );
}

function issuedRectification(
  original: Document,
  type: "anulacion" | "correccion" = "anulacion",
  date = "2026-07-11",
  profile = PROFILE,
  customerName = original.documentSnapshot!.customer.name,
  options: {
    id?: string;
    number?: string;
    customer?: Partial<Document["client"]>;
  } = {},
): Document {
  return issueDocument(
    {
      id: options.id ?? "rectification",
      type: "factura",
      number: options.number ?? "FR-2026-0001",
      date,
      client: {
        ...original.documentSnapshot!.customer,
        name: customerName,
        nif: customerName === original.documentSnapshot!.customer.name
          ? original.documentSnapshot!.customer.nif
          : undefined,
        ...options.customer,
      },
      items: original.documentSnapshot!.items.map((item) => ({
        id: `rect-${item.id}`,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: type === "anulacion" ? -item.unitPrice : item.unitPrice,
        ivaPercent: item.ivaPercent,
      })),
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.documentSnapshot!.number,
        originalDate: original.documentSnapshot!.date,
        reason: "Corrección",
        type,
      },
      createdAt: NOW,
      updatedAt: NOW,
    },
    profile,
    NOW,
  );
}

describe("document relationship integrity", () => {
  it("acepta una relación bidireccional sellada", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(original);
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => !document.snapshotIntegrity)).toBe(true);
  });

  it("bloquea un estado anulado vivo sin rectificativa", () => {
    const manipulated: Document = {
      ...issuedInvoice(),
      status: "anulada",
      documentLifecycle: "canceled",
    };

    const [result] = withDocumentRelationshipIntegritySignals([manipulated]);

    expect(result.snapshotIntegrity).toEqual({
      status: "blocked",
      issues: ["document_relationship_invalid"],
    });
  });

  it("bloquea ambos lados si la rectificativa es anterior a la original", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(
      original,
      "anulacion",
      "2026-07-09",
    );
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(
      result.every(
        (document) =>
          document.snapshotIntegrity?.issues.includes(
            "document_relationship_invalid",
          ) === true,
      ),
    ).toBe(true);
  });

  it("bloquea una rectificativa emitida cuyo original no existe", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(original);

    const [result] = withDocumentRelationshipIntegritySignals([
      rectification,
    ]);

    expect(result.snapshotIntegrity?.status).toBe("blocked");
  });

  it("una rectificativa unilateral no bloquea la factura original", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(original);

    const [resultOriginal, resultRectification] =
      withDocumentRelationshipIntegritySignals([original, rectification]);

    expect(resultOriginal.snapshotIntegrity).toBeUndefined();
    expect(resultRectification.snapshotIntegrity?.status).toBe("blocked");
  });

  it("varias rectificativas unilaterales no bloquean la factura original", () => {
    const original = issuedInvoice();
    const first = issuedRectification(original);
    const second = issuedRectification(
      original,
      "anulacion",
      "2026-07-11",
      PROFILE,
      original.documentSnapshot!.customer.name,
      { id: "rectification-2", number: "FR-2026-0002" },
    );

    const [resultOriginal, ...resultRectifications] =
      withDocumentRelationshipIntegritySignals([original, first, second]);

    expect(resultOriginal.snapshotIntegrity).toBeUndefined();
    expect(
      resultRectifications.every(
        (document) => document.snapshotIntegrity?.status === "blocked",
      ),
    ).toBe(true);
  });

  it("bloquea ambos lados si la rectificativa tiene un estado operativo inválido", () => {
    const original = issuedInvoice();
    const rectification = {
      ...issuedRectification(original),
      status: "rechazado" as const,
    };
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => document.snapshotIntegrity)).toBe(true);
  });

  it("bloquea una rectificativa de otro destinatario", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(
      original,
      "correccion",
      "2026-07-11",
      PROFILE,
      "Otro cliente",
    );
    const linkedOriginal: Document = {
      ...original,
      status: "rectificada",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => document.snapshotIntegrity)).toBe(true);
  });

  it("no confunde destinatarios sin NIF de puertas distintas", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(
      original,
      "correccion",
      "2026-07-11",
      PROFILE,
      original.documentSnapshot!.customer.name,
      { customer: { addressExtra: "2º B" } },
    );
    const linkedOriginal: Document = {
      ...original,
      status: "rectificada",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => document.snapshotIntegrity)).toBe(true);
  });

  it.each(["", "N/A", "SIN NIF", "12345678", "1234567890"])(
    "no acepta el emisor inválido %j como identidad fiscal compartida",
    (nif) => {
    const invalidProfile = { ...DEFAULT_PROFILE, nif };
    const original = issuedInvoice(invalidProfile);
    const rectification = issuedRectification(
      original,
      "anulacion",
      "2026-07-11",
      invalidProfile,
    );
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => document.snapshotIntegrity)).toBe(true);
    },
  );

  it("acepta un NIF con puntuación normalizable", () => {
    const punctuatedProfile = { ...DEFAULT_PROFILE, nif: "12.345.678-Z" };
    const original = issuedInvoice(punctuatedProfile);
    const rectification = issuedRectification(
      original,
      "anulacion",
      "2026-07-11",
      punctuatedProfile,
    );
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => !document.snapshotIntegrity)).toBe(true);
  });

  it("acepta un recibo nuevo con origen congelado y contenido equivalente", () => {
    const invoice = markDocumentPaid(issuedInvoice(), NOW);
    const receiptDraft = {
      ...buildReceiptFromInvoice(invoice),
      id: "receipt",
      number: "R-2026-0001",
      status: "borrador" as const,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const receipt = markDocumentPaid(
      issueDocument(receiptDraft, PROFILE, NOW),
      NOW,
    );
    const linkedInvoice = { ...invoice, receiptDocumentId: receipt.id };

    const result = withDocumentRelationshipIntegritySignals([
      linkedInvoice,
      receipt,
    ]);

    expect(result.every((document) => !document.snapshotIntegrity)).toBe(true);
    expect(receipt.documentSnapshot?.sourceDocumentId).toBe(invoice.id);
  });

  it("acepta un recibo nuevo de una factura histórica pagada sin paidAt", () => {
    const invoice: Document = {
      ...issuedInvoice(),
      status: "pagado",
      paymentStatus: undefined,
      paidAt: undefined,
    };
    const receipt = markDocumentPaid(
      issueDocument(
        {
          ...buildReceiptFromInvoice(invoice),
          id: "receipt-legacy-paid",
          number: "R-2026-0002",
          status: "borrador",
          createdAt: NOW,
          updatedAt: NOW,
        },
        PROFILE,
        NOW,
      ),
      NOW,
    );
    const linkedInvoice = { ...invoice, receiptDocumentId: receipt.id };

    const result = withDocumentRelationshipIntegritySignals([
      linkedInvoice,
      receipt,
    ]);

    expect(result.every((document) => !document.snapshotIntegrity)).toBe(true);
  });

  it("bloquea un recibo recíproco cuyo contenido no coincide con la factura", () => {
    const invoice = markDocumentPaid(issuedInvoice(), NOW);
    const receiptDraft = {
      ...buildReceiptFromInvoice(invoice),
      id: "receipt",
      number: "R-2026-0001",
      status: "borrador" as const,
      items: [{ ...invoice.items[0], id: "receipt-line", unitPrice: 999 }],
      createdAt: NOW,
      updatedAt: NOW,
    };
    const receipt = markDocumentPaid(
      issueDocument(receiptDraft, PROFILE, NOW),
      NOW,
    );
    const linkedInvoice = { ...invoice, receiptDocumentId: receipt.id };

    const result = withDocumentRelationshipIntegritySignals([
      linkedInvoice,
      receipt,
    ]);

    expect(result[0].snapshotIntegrity).toBeUndefined();
    expect(result[1].snapshotIntegrity?.status).toBe("blocked");
  });

  it("no acredita un vínculo vivo añadido a un recibo independiente", () => {
    const invoice = markDocumentPaid(issuedInvoice(), NOW);
    const standaloneReceipt = markDocumentPaid(
      issueDocument(
        {
          ...invoice,
          id: "standalone-receipt",
          type: "recibo",
          number: "R-2026-0002",
          status: "borrador",
          sourceDocumentId: undefined,
          receiptDocumentId: undefined,
          documentSnapshot: undefined,
          pdfSnapshot: undefined,
          snapshotSeal: undefined,
          snapshotIntegrityRequired: undefined,
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          paymentStatus: "pending",
          issuedAt: undefined,
          paidAt: undefined,
        },
        PROFILE,
        NOW,
      ),
      NOW,
    );
    const forgedReceipt = {
      ...standaloneReceipt,
      sourceDocumentId: invoice.id,
    };
    const forgedInvoice = {
      ...invoice,
      receiptDocumentId: forgedReceipt.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      forgedInvoice,
      forgedReceipt,
    ]);

    expect(result[0].snapshotIntegrity).toBeUndefined();
    expect(result[1].snapshotIntegrity?.status).toBe("blocked");
    expect(standaloneReceipt.documentSnapshot).not.toHaveProperty(
      "sourceDocumentId",
    );
  });

  it("bloquea todos los documentos con un ID duplicado", () => {
    const first = issuedInvoice();
    const second = { ...issuedInvoice(), number: "F-2026-0002" };

    const result = withDocumentRelationshipIntegritySignals([first, second]);

    expect(result.every((document) => document.snapshotIntegrity)).toBe(true);
  });

  it("no trata dos presupuestos iguales como una identidad fiscal duplicada", () => {
    const quote = (id: string) =>
      issueDocument(
        {
          ...issuedInvoice(),
          id,
          type: "presupuesto" as const,
          number: "P-2026-0001",
          status: "borrador" as const,
          documentSnapshot: undefined,
          pdfSnapshot: undefined,
          snapshotSeal: undefined,
          snapshotIntegrityRequired: undefined,
          documentLifecycle: "draft" as const,
          integrityLock: "unlocked" as const,
          issuedAt: undefined,
        },
        PROFILE,
        NOW,
      );

    const result = withDocumentRelationshipIntegritySignals([
      quote("quote-1"),
      quote("quote-2"),
    ]);

    expect(result.every((document) => !document.snapshotIntegrity)).toBe(true);
  });

  it("un presupuesto anulado no reclama una rectificación fiscal", () => {
    const quote = issueDocument(
      {
        ...issuedInvoice(),
        id: "quote-canceled",
        type: "presupuesto",
        number: "P-2026-0002",
        status: "borrador",
        documentSnapshot: undefined,
        pdfSnapshot: undefined,
        snapshotSeal: undefined,
        snapshotIntegrityRequired: undefined,
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        issuedAt: undefined,
      },
      PROFILE,
      NOW,
    );

    const [result] = withDocumentRelationshipIntegritySignals([
      { ...quote, status: "anulada", documentLifecycle: "canceled" },
    ]);

    expect(result.snapshotIntegrity).toBeUndefined();
  });

  it("limpia una señal de relación antigua cuando el grafo vuelve a ser válido", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(original);
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => !document.snapshotIntegrity)).toBe(true);
  });
});
