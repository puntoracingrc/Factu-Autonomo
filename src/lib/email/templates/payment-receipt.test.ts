import { describe, expect, it } from "vitest";
import { APP_BRAND_NAME } from "../../brand";
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
      description: `${APP_BRAND_NAME} Pro`,
      amountLabel: "5,99 EUR",
      paidAtLabel: "10 de junio de 2026, 21:00",
    });

    expect(content.subject).toContain(`${APP_BRAND_NAME} Pro`);
    expect(content.text).toContain(`pago en ${APP_BRAND_NAME}`);
    expect(content.text).toContain("5,99 EUR");
    expect(content.text).toContain("B12345678");
    expect(content.html).toContain("Pago confirmado");
  });
});
