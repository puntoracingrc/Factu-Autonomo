import { describe, expect, it } from "vitest";
import {
  CUSTOMER_QUERY_PARAM,
  newDocumentUrl,
} from "./customer-document-links";

describe("newDocumentUrl", () => {
  it("genera URL de factura con cliente", () => {
    expect(newDocumentUrl("factura", "abc-123")).toBe(
      `/facturas/nuevo?${CUSTOMER_QUERY_PARAM}=abc-123`,
    );
  });

  it("genera URL de presupuesto con cliente", () => {
    expect(newDocumentUrl("presupuesto", "xyz")).toBe(
      `/presupuestos/nuevo?${CUSTOMER_QUERY_PARAM}=xyz`,
    );
  });

  it("genera URL de recibo con cliente", () => {
    expect(newDocumentUrl("recibo", "r-123")).toBe(
      `/recibos/nuevo?${CUSTOMER_QUERY_PARAM}=r-123`,
    );
  });

  it("codifica el cliente para que la preselección viaje segura", () => {
    expect(newDocumentUrl("factura", "cliente con espacios")).toBe(
      `/facturas/nuevo?${CUSTOMER_QUERY_PARAM}=cliente%20con%20espacios`,
    );
  });
});
