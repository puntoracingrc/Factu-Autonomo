import { describe, expect, it } from "vitest";
import {
  buildExpenseInboxAddress,
  extractExpenseInboxAliasToken,
  isSupportedExpenseInboxAttachment,
  normalizeExpenseInboxInboundPayload,
  resolveExpenseInboxAttachmentMimeType,
} from "./expense-inbox";

describe("expense inbox", () => {
  it("construye y lee direcciones de buzón de gastos", () => {
    const address = buildExpenseInboxAddress(
      "abc123def456",
      "facturacion-autonomos.app",
    );

    expect(address).toBe("gastos+abc123def456@facturacion-autonomos.app");
    expect(extractExpenseInboxAliasToken(address)).toBe("abc123def456");
    expect(
      extractExpenseInboxAliasToken(
        "Factu <gastos+abc123def456@facturacion-autonomos.app>",
      ),
    ).toBe("abc123def456");
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
});
