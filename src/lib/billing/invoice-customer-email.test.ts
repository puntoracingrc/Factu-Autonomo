import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type Customer } from "@/lib/types";
import { buildInvoiceCustomerEmail } from "./invoice-customer-email";

const CUSTOMER: Customer = {
  id: "customer-one",
  customerType: "company",
  firstName: "Catal-pur SL",
  lastName: "",
  name: "Catal-pur SL",
  contactName: "Marta",
  email: "facturas@catal-pur.test",
  createdAt: "2021-01-01T00:00:00.000Z",
  updatedAt: "2026-07-17T00:00:00.000Z",
};

describe("invoice customer email", () => {
  it("prepara Gmail y correo del dispositivo para el cliente", () => {
    const result = buildInvoiceCustomerEmail(
      { ...DEFAULT_PROFILE, commercialName: "Persianas Almar" },
      CUSTOMER,
      CUSTOMER.email,
      "todo el historial disponible",
      "Facturas Catal-pur SL.zip",
      "Resumen Facturas Catal-pur SL.pdf",
      4,
    );

    expect(result).toMatchObject({
      recipient: "facturas@catal-pur.test",
      subject:
        "Facturas emitidas · todo el historial disponible · Persianas Almar",
    });
    expect(result?.body).toContain("Hola Marta");
    expect(result?.body).toContain("4 facturas");
    expect(result?.body).not.toContain("Adjunta");
    expect(new URL(result!.gmailComposeUrl).searchParams.get("to")).toBe(
      "facturas@catal-pur.test",
    );
    expect(new URL(result!.mailtoUrl).pathname).toBe("facturas@catal-pur.test");
  });

  it("no genera un envío si no hay un email válido", () => {
    expect(
      buildInvoiceCustomerEmail(
        DEFAULT_PROFILE,
        CUSTOMER,
        "correo-invalido",
        "todo el historial disponible",
        "Facturas.zip",
        "Resumen.pdf",
        1,
      ),
    ).toBeNull();
  });
});
