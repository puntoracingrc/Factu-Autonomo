import { describe, expect, it } from "vitest";
import type { Customer, Document } from "@/lib/types";
import { resolveInvoiceCustomerExportContext } from "./invoice-customer-export";

const CUSTOMER: Customer = {
  id: "customer-catal-pur",
  customerType: "company",
  firstName: "Catal-pur SL",
  lastName: "",
  name: "Catal-pur SL",
  contactName: "Marta",
  email: "CLIENTE@CATAL-PUR.TEST",
  createdAt: "2021-01-01T00:00:00.000Z",
  updatedAt: "2026-07-17T00:00:00.000Z",
};

function invoice(
  id: string,
  customerId: string | undefined,
  clientName = "Catal-pur SL",
  email?: string,
): Document {
  return {
    id,
    type: "factura",
    number: id,
    date: "2026-07-17",
    customerId,
    client: { name: clientName, email },
    items: [],
    status: "pagado",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z",
  };
}

describe("invoice customer export context", () => {
  it("resuelve un único cliente y todos los resultados, no solo los visibles", () => {
    const context = resolveInvoiceCustomerExportContext({
      query: "catal-pur",
      filteredDocuments: [
        invoice("F-2026-2956", CUSTOMER.id),
        invoice("Factura/2413/", undefined),
      ],
      customers: [CUSTOMER],
    });

    expect(context).toMatchObject({
      customerName: "Catal-pur SL",
      greetingName: "Marta",
      email: "cliente@catal-pur.test",
      documentIds: ["F-2026-2956", "Factura/2413/"],
    });
  });

  it("usa un email histórico único si la ficha maestra todavía no lo tiene", () => {
    const context = resolveInvoiceCustomerExportContext({
      query: "catal-pur",
      filteredDocuments: [
        invoice("one", CUSTOMER.id, "Catal-pur SL", "facturas@catal-pur.test"),
        invoice("two", CUSTOMER.id, "Catal-pur SL", "FACTURAS@CATAL-PUR.TEST"),
      ],
      customers: [{ ...CUSTOMER, email: undefined }],
    });

    expect(context?.email).toBe("facturas@catal-pur.test");
  });

  it("excluye borradores del paquete fiscal del cliente", () => {
    const emitted = invoice("issued", CUSTOMER.id);
    const draft: Document = {
      ...invoice("draft", CUSTOMER.id),
      status: "borrador",
    };
    const context = resolveInvoiceCustomerExportContext({
      query: "catal-pur",
      filteredDocuments: [draft, emitted],
      customers: [CUSTOMER],
    });

    expect(context?.documentIds).toEqual(["issued"]);
  });

  it("no ofrece envío si la búsqueda coincide con varios clientes o mezcla resultados", () => {
    const other = {
      ...CUSTOMER,
      id: "customer-other",
      firstName: "Catal-pur Servicios",
      name: "Catal-pur Servicios",
    };
    expect(
      resolveInvoiceCustomerExportContext({
        query: "catal-pur",
        filteredDocuments: [invoice("one", CUSTOMER.id)],
        customers: [CUSTOMER, other],
      }),
    ).toBeNull();

    expect(
      resolveInvoiceCustomerExportContext({
        query: "catal-pur sl",
        filteredDocuments: [
          invoice("one", CUSTOMER.id),
          invoice("two", other.id, "Catal-pur Servicios"),
        ],
        customers: [CUSTOMER, other],
      }),
    ).toBeNull();
  });
});
