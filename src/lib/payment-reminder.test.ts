import { describe, expect, it } from "vitest";
import {
  buildDefaultPaymentReminderMessage,
  paymentReminderSubject,
} from "./payment-reminder";
import {
  canSendPaymentReminder,
  canShowPaymentReminder,
} from "./payment-reminder-client";
import {
  issueDocument,
  markDocumentPaid,
  markDocumentSent,
} from "./document-integrity";
import { isPendingInvoicePayment } from "./income";
import { DEFAULT_PROFILE, type Document } from "./types";

const reminderProfile = {
  ...DEFAULT_PROFILE,
  commercialName: "Marca Cobros",
  name: "Mi Estudio",
  iban: "ES1234567890123456789012",
};

const reminderDraft: Document = {
  id: "f1",
  type: "factura",
  number: "F-2026-0003",
  date: "2026-03-01",
  dueDate: "2026-03-15",
  client: { name: "Ana García", email: "ana@ejemplo.com" },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "borrador",
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-01T09:00:00.000Z",
};

function createPendingInvoice(client = reminderDraft.client): Document {
  return markDocumentSent(
    issueDocument(
      {
        ...reminderDraft,
        client,
      },
      reminderProfile,
      "2026-03-01T10:00:00.000Z",
    ),
    "2026-03-01T10:05:00.000Z",
  );
}

const pendingInvoice = createPendingInvoice();

describe("payment reminder", () => {
  it("detecta facturas pendientes de cobro", () => {
    expect(isPendingInvoicePayment(pendingInvoice)).toBe(true);
    expect(
      isPendingInvoicePayment(
        markDocumentPaid(pendingInvoice, "2026-03-02T10:00:00.000Z"),
      ),
    ).toBe(false);
    expect(isPendingInvoicePayment(reminderDraft)).toBe(false);
  });

  it("genera un mensaje amable editable por defecto", () => {
    const message = buildDefaultPaymentReminderMessage(
      pendingInvoice,
      reminderProfile,
    );

    expect(message).toContain("Hola Ana");
    expect(message).toContain("con toda tranquilidad");
    expect(message).toContain("F-2026-0003");
    expect(message).toContain("121,00");
    expect(message).toContain("ES1234567890123456789012");
    expect(message).toContain("Si ya lo has tramitado");
    expect(message).toContain("Marca Cobros");
    expect(message).not.toContain("\nMi Estudio");
    expect(paymentReminderSubject(pendingInvoice)).toBe(
      "Recordatorio amable — Factura F-2026-0003",
    );
  });

  it("permite recordatorio por email o WhatsApp según el contacto", () => {
    expect(canShowPaymentReminder(pendingInvoice)).toBe(true);
    expect(canSendPaymentReminder(pendingInvoice, "email")).toBe(true);
    expect(canSendPaymentReminder(pendingInvoice, "whatsapp")).toBe(false);

    const withPhone = createPendingInvoice({
      ...reminderDraft.client,
      phone: "612345678",
    });
    expect(canSendPaymentReminder(withPhone, "whatsapp")).toBe(true);
  });

  it("oculta los recordatorios de todos los documentos importados", () => {
    const imported = {
      ...pendingInvoice,
      legacyImportProvenance: {
        schemaVersion: 2 as const,
        kind: "external_import" as const,
        importer: "generic_documents" as const,
        importedAt: "2026-02-01T10:00:00.000Z",
        provenanceRecordedAt: "2026-02-01T10:00:00.000Z",
        issuerOrigin: "source_document" as const,
        documentStateAtImport: "issued" as const,
      },
    };

    expect(canShowPaymentReminder(imported)).toBe(false);
    expect(canSendPaymentReminder(imported, "email")).toBe(false);
    expect(canShowPaymentReminder(pendingInvoice)).toBe(true);
  });
});
