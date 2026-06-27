import { describe, expect, it } from "vitest";
import {
  PAYMENT_REMINDER_COPY,
  RECTIFICATION_ACTION_COPY,
  collectionActionCopy,
  documentStatusHint,
  documentStatusLabel,
} from "./invoice-status-actions";
import { issueDocument, markDocumentPaid, markDocumentSent } from "./document-integrity";
import { canMarkAsCollected } from "./income";
import { canShowPaymentReminder } from "./payment-reminder-client";
import { buildShareMessage } from "./share";
import { DEFAULT_PROFILE, type Document } from "./types";

const ISSUED_AT = "2026-06-24T10:00:00.000Z";

function baseDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-24",
    dueDate: "2026-07-24",
    client: {
      name: "Ana Garcia",
      firstName: "Ana",
      lastName: "Garcia",
      email: "ana@example.com",
      phone: "612345678",
    },
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
    createdAt: "2026-06-24T09:00:00.000Z",
    updatedAt: "2026-06-24T09:00:00.000Z",
    ...overrides,
  };
}

function issuedInvoice(overrides: Partial<Document> = {}): Document {
  return {
    ...issueDocument(baseDocument(), DEFAULT_PROFILE, ISSUED_AT),
    ...overrides,
  };
}

const forbiddenCopy = [
  "Enviado automaticamente",
  "Enviado automáticamente",
  "Cobro garantizado",
  "Pasarela activada",
  "Banco conectado",
];

describe("invoice status action copy", () => {
  it("diferencia borrador, emitida, enviada, cobrada y vencida", () => {
    const emitted = issuedInvoice();
    const sent = markDocumentSent(emitted, "2026-06-24T10:05:00.000Z");
    const paid = markDocumentPaid(emitted, "2026-06-25T10:00:00.000Z");

    expect(documentStatusLabel(baseDocument())).toBe("Borrador");
    expect(documentStatusLabel(emitted)).toBe("Emitida");
    expect(documentStatusLabel(sent)).toBe("Enviada");
    expect(documentStatusLabel(paid)).toBe("Cobrada");
    expect(documentStatusLabel(issuedInvoice({ status: "vencido" }))).toBe(
      "Vencida",
    );
  });

  it("muestra pistas prudentes para facturas post-emision", () => {
    expect(documentStatusHint(issuedInvoice())).toContain("protegida");
    expect(
      documentStatusHint(
        markDocumentPaid(issuedInvoice(), "2026-06-25T10:00:00.000Z"),
      ),
    ).toContain("No es pasarela ni banco");
    expect(documentStatusHint(issuedInvoice({ status: "vencido" }))).toContain(
      "preparar un recordatorio",
    );
  });

  it("limita el cobro a documentos emitidos y deja claro que es local", () => {
    const draft = baseDocument();
    const emitted = issuedInvoice();
    const quote = {
      ...baseDocument({ type: "presupuesto", number: "P-2026-0001" }),
    };

    expect(canMarkAsCollected(draft)).toBe(false);
    expect(canMarkAsCollected(quote)).toBe(false);
    expect(canMarkAsCollected(emitted)).toBe(true);
    expect(collectionActionCopy(emitted, false).tooltip).toContain(
      "No cobra por banco ni pasarela",
    );
    expect(collectionActionCopy(markDocumentPaid(emitted), true).label).toBe(
      "Cobrada",
    );
  });

  it("recordatorio y rectificativa no prometen envios automaticos ni cobro externo", () => {
    const copy = [
      ...Object.values(PAYMENT_REMINDER_COPY),
      ...Object.values(RECTIFICATION_ACTION_COPY),
      collectionActionCopy(issuedInvoice(), false).tooltip,
    ].join("\n");

    for (const claim of forbiddenCopy) {
      expect(copy).not.toContain(claim);
    }
    expect(PAYMENT_REMINDER_COPY.dialogTitle).toBe(
      "Preparar recordatorio de pago",
    );
    expect(RECTIFICATION_ACTION_COPY.tooltip).toContain("No envía nada a AEAT");
  });

  it("solo muestra recordatorio en facturas pendientes con contacto", () => {
    expect(canShowPaymentReminder(issuedInvoice())).toBe(true);
    expect(
      canShowPaymentReminder(issuedInvoice({ status: "pagado" })),
    ).toBe(false);
    expect(
      canShowPaymentReminder(
        issuedInvoice({ client: { name: "Sin contacto" } }),
      ),
    ).toBe(false);
  });

  it("email y WhatsApp mantienen mensaje de envio sin IBAN al cobrar", () => {
    const paid = markDocumentPaid(issuedInvoice(), "2026-06-25T10:00:00.000Z");
    const message = buildShareMessage(
      paid,
      { ...DEFAULT_PROFILE, iban: "ES00 0000 0000 0000 0000 0000" },
    );

    expect(message).toContain("la factura F-2026-0001");
    expect(message).not.toContain("IBAN:");
  });
});
