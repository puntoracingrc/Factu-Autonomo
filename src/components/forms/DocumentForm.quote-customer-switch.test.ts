import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync("src/components/forms/DocumentForm.tsx", "utf8");

describe("DocumentForm quote customer switch", () => {
  it("limita la acción a facturas borrador creadas desde presupuesto", () => {
    expect(form).toContain('type === "factura"');
    expect(form).toContain('existing?.status === "borrador"');
    expect(form).toContain("Boolean(existing.sourceQuoteDocumentId)");
    expect(form).toContain("Facturar a otro cliente");
  });

  it("desvincula la ficha anterior antes de preparar otro cliente", () => {
    const handlerStart = form.indexOf(
      "function handleInvoiceCustomerReassignment()",
    );
    const handlerEnd = form.indexOf(
      "function handleRestoreSourceQuoteCustomer()",
      handlerStart,
    );
    const handler = form.slice(handlerStart, handlerEnd);

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(handler).toContain("setInvoiceCustomerReassignment(true)");
    expect(handler).toContain("setSelectedCustomerId(null)");
    expect(handler).toContain("setClientForm({ ...EMPTY_CLIENT })");
    expect(form).toContain("clientForm.firstName.trim() && !invoiceCustomerReassignment");
  });

  it("permite recuperar el cliente conservado en el presupuesto", () => {
    expect(form).toContain("Volver al cliente del presupuesto");
    expect(form).toContain("sourceQuote?.customerId");
    expect(form).toContain("sourceQuote?.client ?? existing?.client");
  });
});
