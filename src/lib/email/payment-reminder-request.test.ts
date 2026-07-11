import { describe, expect, it } from "vitest";
import {
  MAX_PAYMENT_REMINDER_MESSAGE_LENGTH,
  parsePaymentReminderRequest,
} from "./payment-reminder-request";

describe("payment reminder request", () => {
  it("acepta únicamente documentId y el mensaje acotado", () => {
    expect(
      parsePaymentReminderRequest({
        documentId: " invoice-1 ",
        message: " Hola ",
      }),
    ).toEqual({
      ok: true,
      value: { documentId: "invoice-1", message: "Hola" },
    });
  });

  it("rechaza intentos de inyectar factura, perfil o destinatario", () => {
    for (const extra of [
      { doc: { client: { email: "attacker@example.com" } } },
      { profile: { name: "Emisor manipulado" } },
      { recipient: "attacker@example.com" },
      { replyTo: "attacker@example.com" },
    ]) {
      expect(
        parsePaymentReminderRequest({
          documentId: "invoice-1",
          message: "Recordatorio",
          ...extra,
        }),
      ).toMatchObject({ ok: false });
    }
  });

  it("rechaza identificadores y mensajes fuera de límites", () => {
    expect(
      parsePaymentReminderRequest({ documentId: "", message: "Hola" }),
    ).toMatchObject({ ok: false });
    expect(
      parsePaymentReminderRequest({
        documentId: "invoice-1",
        message: "x".repeat(MAX_PAYMENT_REMINDER_MESSAGE_LENGTH + 1),
      }),
    ).toMatchObject({ ok: false });
  });
});
