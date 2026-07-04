import { describe, expect, it } from "vitest";
import {
  buildFriendlyExpenseInboxAliasToken,
  buildExpenseInboxAddress,
  buildPrivateExpenseInboxAliasToken,
  classifyExpenseInboxDelivery,
  extractExpenseInboxAliasToken,
  isSupportedExpenseInboxAttachment,
  nextFriendlyExpenseInboxAliasCounter,
  normalizeExpenseInboxAliasBase,
  normalizeExpenseInboxInboundPayload,
  normalizeResendReceivedEmailMetadata,
  resolveExpenseInboxAttachmentMimeType,
} from "./expense-inbox";

describe("expense inbox", () => {
  it("construye y lee direcciones de buzón de gastos", () => {
    const address = buildExpenseInboxAddress(
      "abc123def456",
      "facturacion-autonomos.app",
    );

    expect(address).toBe("gastos-abc123def456@facturacion-autonomos.app");
    expect(extractExpenseInboxAliasToken(address)).toBe("abc123def456");
    expect(
      extractExpenseInboxAliasToken(
        "Factu <gastos+abc123def456@facturacion-autonomos.app>",
      ),
    ).toBe("abc123def456");
  });

  it("crea alias legibles para el buzón de gastos", () => {
    expect(normalizeExpenseInboxAliasBase("Persianas Almar")).toBe(
      "persianas-almar",
    );
    expect(normalizeExpenseInboxAliasBase("Álvaro & Hijos S.L.")).toBe(
      "alvaro-hijos-s-l",
    );
    expect(buildFriendlyExpenseInboxAliasToken("Persianas Almar", 1)).toBe(
      "persianas-almar",
    );
    expect(buildFriendlyExpenseInboxAliasToken("Persianas Almar", 2)).toBe(
      "persianas-almar-2",
    );
    expect(
      nextFriendlyExpenseInboxAliasCounter("Persianas Almar", "persianas-almar"),
    ).toBe(2);
    expect(
      nextFriendlyExpenseInboxAliasCounter(
        "Persianas Almar",
        "persianas-almar-2",
      ),
    ).toBe(3);
  });

  it("crea alias legibles con sufijo privado no secuencial", () => {
    expect(
      buildPrivateExpenseInboxAliasToken(
        "Persianas Almar",
        "A1B2-C3D4-E5F6",
      ),
    ).toBe("persianas-almar-a1b2c3d4e5");
    expect(
      buildPrivateExpenseInboxAliasToken(
        "Mi Empresa con Nombre Muy Largo",
        "1234567890",
      ),
    ).toMatch(/^mi-empresa-con-nombre-muy-largo-[a-z0-9]{10}$/);
  });

  it("detecta cuando el dominio del buzón aún entrega en IONOS", () => {
    expect(
      classifyExpenseInboxDelivery("mail.facturacion-autonomos.app", [
        "mx00.ionos.es.",
        "mx01.ionos.es.",
      ]),
    ).toMatchObject({
      state: "needs_setup",
    });
    expect(
      classifyExpenseInboxDelivery("mail.facturacion-autonomos.app", [
        "inbound-smtp.eu-west-1.amazonaws.com.",
      ]),
    ).toMatchObject({
      state: "ready",
    });
  });

  it("solo acepta pdfs e imagenes", () => {
    expect(
      resolveExpenseInboxAttachmentMimeType({
        filename: "factura.pdf",
        contentType: "application/octet-stream",
      }),
    ).toBe("application/pdf");
    expect(
      isSupportedExpenseInboxAttachment({
        filename: "ticket.jpg",
        contentType: "image/jpeg",
      }),
    ).toBe(true);
    expect(
      isSupportedExpenseInboxAttachment({
        filename: "pedido.xlsx",
        contentType: "application/vnd.ms-excel",
      }),
    ).toBe(false);
  });

  it("normaliza payloads estilo webhook de email", () => {
    const payload = normalizeExpenseInboxInboundPayload({
      To: "gastos+abc123def456@facturacion-autonomos.app",
      From: "Proveedor <facturas@proveedor.test>",
      Subject: "Factura 123",
      Attachments: [
        {
          Name: "factura.pdf",
          ContentType: "application/pdf",
          Content: "ZmFrZQ==",
        },
      ],
    });

    expect(payload).toMatchObject({
      to: ["gastos+abc123def456@facturacion-autonomos.app"],
      fromEmail: "facturas@proveedor.test",
      subject: "Factura 123",
      attachments: [
        {
          filename: "factura.pdf",
          contentType: "application/pdf",
          content: "ZmFrZQ==",
        },
      ],
    });
  });

  it("normaliza eventos reales de Resend email.received", () => {
    const payload = normalizeResendReceivedEmailMetadata({
      type: "email.received",
      created_at: "2026-02-22T23:41:12.126Z",
      data: {
        email_id: "email_123",
        from: "Proveedor <facturas@proveedor.test>",
        to: ["gastos+abc123def456@mail.facturacion-autonomos.app"],
        received_for: ["reenviado@proveedor.test"],
        subject: "Factura 123",
        attachments: [
          {
            id: "att_123",
            filename: "factura.pdf",
            content_type: "application/pdf",
            content_disposition: null,
            size: 13264,
          },
        ],
      },
    });

    expect(payload).toMatchObject({
      emailId: "email_123",
      email: {
        to: [
          "gastos+abc123def456@mail.facturacion-autonomos.app",
          "reenviado@proveedor.test",
        ],
        fromEmail: "facturas@proveedor.test",
        subject: "Factura 123",
      },
      attachments: [
        {
          id: "att_123",
          filename: "factura.pdf",
          contentType: "application/pdf",
          size: 13264,
        },
      ],
    });
  });
});
