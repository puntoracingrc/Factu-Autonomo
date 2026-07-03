import { describe, expect, it } from "vitest";
import {
  buildDefaultPaymentReminderMessage,
  paymentReminderSubject,
} from "./payment-reminder";
import {
  canSendPaymentReminder,
  canShowPaymentReminder,
} from "./payment-reminder-client";
import { isPendingInvoicePayment } from "./income";
import { DEFAULT_PROFILE, type Document } from "./types";

const pendingInvoice: Document = {
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
  status: "enviado",
  createdAt: "2026-03-01",
  updatedAt: "2026-03-01",
};

describe("payment reminder", () => {
  it("detecta facturas pendientes de cobro", () => {
    expect(isPendingInvoicePayment(pendingInvoice)).toBe(true);
    expect(
      isPendingInvoicePayment({ ...pendingInvoice, status: "pagado" }),
    ).toBe(false);
    expect(
      isPendingInvoicePayment({ ...pendingInvoice, status: "borrador" }),
    ).toBe(false);
  });

  it("genera un mensaje amable editable por defecto", () => {
    const message = buildDefaultPaymentReminderMessage(pendingInvoice, {
      ...DEFAULT_PROFILE,
      commercialName: "Marca Cobros",
      name: "Mi Estudio",
      iban: "ES1234567890123456789012",
    });

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

    const withPhone: Document = {
      ...pendingInvoice,
      client: { ...pendingInvoice.client, phone: "612345678" },
    };
    expect(canSendPaymentReminder(withPhone, "whatsapp")).toBe(true);
  });
});
