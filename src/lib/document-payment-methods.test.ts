import { describe, expect, it } from "vitest";
import {
  addDocumentPaymentMethod,
  defaultPaymentMethodForType,
  normalizeDocumentPaymentMethods,
  paymentMethodsForType,
  setDefaultDocumentPaymentMethod,
} from "./document-payment-methods";

describe("document-payment-methods", () => {
  it("mantiene borradores vacios en ajustes y los limpia al guardar", () => {
    let settings = normalizeDocumentPaymentMethods();
    settings = addDocumentPaymentMethod(settings, "factura");

    expect(
      normalizeDocumentPaymentMethods(settings, { keepEmpty: true }).methods,
    ).toHaveLength(1);
    expect(normalizeDocumentPaymentMethods(settings).methods).toHaveLength(0);
  });

  it("guarda y predetermina formas de pago por tipo", () => {
    let settings = normalizeDocumentPaymentMethods();
    settings = addDocumentPaymentMethod(
      settings,
      "factura",
      "Pago por transferencia bancaria",
    );
    settings = addDocumentPaymentMethod(settings, "factura", "Pago en efectivo");
    const transfer = paymentMethodsForType(settings, "factura")[0];
    settings = setDefaultDocumentPaymentMethod(settings, "factura", transfer.id);

    expect(defaultPaymentMethodForType(settings, "factura")?.text).toContain(
      "transferencia",
    );
    expect(paymentMethodsForType(settings, "presupuesto")).toHaveLength(0);
  });
});
