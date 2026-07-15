import { describe, expect, it } from "vitest";
import {
  buildExpenseInboxCopyEmail,
  normalizeExpenseInboxCopyRecipient,
} from "./expense-inbox-copy";

describe("expense inbox company copy", () => {
  it("crea una copia idempotente con los adjuntos recibidos", () => {
    const copy = buildExpenseInboxCopyEmail({
      userId: "user-1",
      sourceEmailId: "email-1",
      recipientEmail: "Empresa@Example.com",
      inboxDomain: "mail.facturacion-autonomos.app",
      originalFromEmail: "Proveedor <facturas@proveedor.test>",
      originalSubject: "Factura 2026/14",
      attachments: [
        {
          filename: "factura.pdf",
          contentType: "application/pdf",
          contentBase64: "ZmFjdHVyYQ==",
        },
      ],
    });

    expect(copy).toMatchObject({
      from: "Factu - Facturación Autónomos <hola@mail.facturacion-autonomos.app>",
      to: "empresa@example.com",
      subject: "Copia: Factura 2026/14",
      attachments: [{ filename: "factura.pdf", content: "ZmFjdHVyYQ==" }],
      timeoutMs: 30_000,
    });
    expect(copy?.idempotencyKey).toMatch(
      /^expense-inbox-copy-v1\/[a-f0-9]{64}$/,
    );
    expect(copy?.text).toContain("facturas@proveedor.test");
  });

  it("mantiene la clave para el mismo email y la cambia para otro", () => {
    const build = (sourceEmailId: string) =>
      buildExpenseInboxCopyEmail({
        userId: "user-1",
        sourceEmailId,
        recipientEmail: "owner@example.com",
        inboxDomain: "mail.facturacion-autonomos.app",
        originalFromEmail: "supplier@example.com",
        attachments: [{ filename: "invoice.pdf", content: "WA==" }],
      })?.idempotencyKey;

    expect(build("email-1")).toBe(build("email-1"));
    expect(build("email-1")).not.toBe(build("email-2"));
  });

  it("bloquea direcciones inválidas y bucles hacia el propio buzón", () => {
    expect(
      normalizeExpenseInboxCopyRecipient(
        "gastos-pa-123@mail.facturacion-autonomos.app",
        "mail.facturacion-autonomos.app",
      ),
    ).toBeNull();
    expect(
      normalizeExpenseInboxCopyRecipient(
        "sin-arroba",
        "mail.facturacion-autonomos.app",
      ),
    ).toBeNull();
  });

  it("no intenta copiar si no existe un adjunto descargado", () => {
    expect(
      buildExpenseInboxCopyEmail({
        userId: "user-1",
        sourceEmailId: "email-1",
        recipientEmail: "owner@example.com",
        inboxDomain: "mail.facturacion-autonomos.app",
        originalFromEmail: "supplier@example.com",
        attachments: [{ filename: "invoice.pdf" }],
      }),
    ).toBeNull();
  });
});
