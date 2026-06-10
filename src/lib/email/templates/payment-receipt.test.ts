import { describe, expect, it } from "vitest";
import { buildPaymentReceiptEmail } from "./payment-receipt";

describe("payment receipt email", () => {
  it("incluye concepto, importe y emisor", () => {
    const content = buildPaymentReceiptEmail({
      customerEmail: "cliente@ejemplo.com",
      customerProfile: {
        name: "Cliente SL",
        email: "cliente@ejemplo.com",
        taxId: "B12345678",
        addressLine1: "Calle 1",
        addressLine2: null,
        city: "Madrid",
        postalCode: "28001",
        country: "ES",
      },
      description: "Factura Autónomo Pro",
      amountLabel: "5,99 EUR",
      paidAtLabel: "10 de junio de 2026, 21:00",
    });

    expect(content.subject).toContain("Factura Autónomo Pro");
    expect(content.text).toContain("5,99 EUR");
    expect(content.text).toContain("B12345678");
    expect(content.html).toContain("Pago confirmado");
  });
});
