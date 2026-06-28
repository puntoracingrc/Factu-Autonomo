import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOCUMENT_EMPTY_ACTION_LABELS } from "./document-list-copy";
import { normalizeFactuEmptyActionCopy } from "./factu/action-copy";
import { FACTU_EMPTY_MESSAGES } from "./factu/copy";
import { FACTU_EMPTY_TITLES } from "./factu/empty-state-copy";
import { HOME_CREATE_ACTIONS, HOME_REVIEW_ACTIONS } from "./product-home-actions";
import { canConvertQuoteToInvoice, findInvoiceCreatedFromQuote } from "./quote-to-invoice";
import type { Document } from "./types";

const quote: Document = {
  id: "quote",
  type: "presupuesto",
  number: "P-2026-0001",
  date: "2026-06-27",
  client: { name: "Ana Garcia" },
  items: [],
  status: "borrador",
  createdAt: "2026-06-27T10:00:00.000Z",
  updatedAt: "2026-06-27T10:00:00.000Z",
};

const invoice: Document = {
  ...quote,
  id: "invoice",
  type: "factura",
  number: "F-2026-0001",
};

describe("MVP usability polish", () => {
  it("expone acciones principales de entrada para crear y revisar", () => {
    expect(HOME_CREATE_ACTIONS.map((action) => action.label)).toEqual([
      "Nuevo cliente",
    ]);
    expect(HOME_CREATE_ACTIONS.map((action) => action.href)).toEqual([
      "/clientes",
    ]);
    expect(HOME_REVIEW_ACTIONS.map((action) => action.label)).toEqual(
      expect.arrayContaining([
        "Ver clientes",
        "Ver presupuestos",
        "Ver facturas",
      ]),
    );
  });

  it("mantiene estados vacios con CTA claro", () => {
    expect(FACTU_EMPTY_TITLES).toMatchObject({
      cliente: "Aún no tienes clientes",
      presupuesto: "Aún no tienes presupuestos",
      factura: "Aún no tienes facturas",
    });
    expect(FACTU_EMPTY_MESSAGES.cliente).toContain("Aún no tienes clientes");
    expect(FACTU_EMPTY_MESSAGES.presupuesto).toContain(
      "Aún no tienes presupuestos",
    );
    expect(FACTU_EMPTY_MESSAGES.factura).toContain("Aún no tienes facturas");
    expect(DOCUMENT_EMPTY_ACTION_LABELS).toMatchObject({
      factura: "Crear factura",
      presupuesto: "Crear presupuesto",
    });
  });

  it("normaliza el CTA del estado vacio de clientes", () => {
    const action = normalizeFactuEmptyActionCopy(
      "cliente",
      createElement("button", null, "Nuevo cliente"),
    );
    const html = renderToStaticMarkup(
      createElement("div", null, action),
    );

    expect(html).toContain("Crear cliente");
    expect(html).not.toContain(">Nuevo cliente<");
  });

  it("mantiene convertir a factura solo para presupuestos activos", () => {
    expect(canConvertQuoteToInvoice(quote)).toBe(true);
    expect(canConvertQuoteToInvoice(invoice)).toBe(false);
    expect(canConvertQuoteToInvoice({ ...quote, status: "anulada" })).toBe(
      false,
    );
    expect(canConvertQuoteToInvoice({ ...quote, status: "rechazado" })).toBe(
      false,
    );
  });

  it("reconoce presupuestos ya convertidos a factura", () => {
    const converted = {
      ...invoice,
      sourceQuoteDocumentId: quote.id,
      sourceQuoteNumber: quote.number,
    };

    expect(findInvoiceCreatedFromQuote([quote, converted], quote.id)).toBe(
      converted,
    );
  });

  it("evita claims prohibidos en copy de uso diario", () => {
    const serialized = JSON.stringify({
      empty: FACTU_EMPTY_MESSAGES,
      create: HOME_CREATE_ACTIONS.map((action) => action.label),
      review: HOME_REVIEW_ACTIONS.map((action) => action.label),
      documentActions: DOCUMENT_EMPTY_ACTION_LABELS,
    });

    expect(serialized).not.toContain("AEAT validado");
    expect(serialized).not.toContain("QR oficial");
    expect(serialized).not.toContain("cumplimiento garantizado");
    expect(serialized).not.toContain("VeriFactu productivo");
  });

  it("mantiene foco visible y etiquetas en acciones compactas", () => {
    const buttonSource = readFileSync(
      new URL("../components/ui/Button.tsx", import.meta.url),
      "utf8",
    );
    const iconActionSource = readFileSync(
      new URL("../components/ui/IconAction.tsx", import.meta.url),
      "utf8",
    );

    expect(buttonSource).toContain("focus-visible:outline");
    expect(iconActionSource).toContain("focus-visible:outline");
    expect(iconActionSource).toContain("MobileLabel");
  });

  it("mantiene una pista visual de desplazamiento en el menu movil", () => {
    const appShellSource = readFileSync(
      new URL("../components/layout/AppShell.tsx", import.meta.url),
      "utf8",
    );

    expect(appShellSource).toContain("nav-scroll");
    expect(appShellSource).toContain("ChevronRight");
    expect(appShellSource).toContain("bg-gradient-to-l");
    expect(appShellSource).toContain("sm:hidden");
  });

  it("distingue exportacion gratis de importador Pro en cuenta", () => {
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );

    expect(cloudAccountSource).toContain("importador de datos");
    expect(cloudAccountSource).toContain("exportar una copia manual");
    expect(cloudAccountSource).not.toContain("exportar/importar copia");
  });

  it("lleva el inicio de sesion directamente a la seccion de cuenta", () => {
    const appShellSource = readFileSync(
      new URL("../components/layout/AppShell.tsx", import.meta.url),
      "utf8",
    );
    const authCallbackSource = readFileSync(
      new URL("../app/auth/callback/page.tsx", import.meta.url),
      "utf8",
    );
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );

    expect(appShellSource).toContain('href="/cuenta#inicio-sesion"');
    expect(authCallbackSource).toContain("/cuenta?auth=");
    expect(authCallbackSource).toContain("#inicio-sesion");
    expect(cloudAccountSource).toContain('id="inicio-sesion"');
  });

  it("muestra terminos solo en el modo de crear cuenta", () => {
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );

    expect(cloudAccountSource).toContain('authMode === "signup"');
    expect(cloudAccountSource).toContain("Al crear cuenta acepto");
    expect(cloudAccountSource).not.toContain("Al iniciar sesión acepto");
  });

  it("mantiene accesos de configuracion como pastillas compactas", () => {
    const settingsSource = readFileSync(
      new URL("../app/configuracion/page.tsx", import.meta.url),
      "utf8",
    );

    expect(settingsSource).toContain("rounded-full");
    expect(settingsSource).toContain("flex flex-wrap gap-2");
    expect(settingsSource).not.toContain("Datos, logo y contacto");
    expect(settingsSource).not.toContain("Plan, datos y ayuda");
  });

  it("encapsula acciones y filtros de clientes en bloques separados", () => {
    const customersPageSource = readFileSync(
      new URL("../app/clientes/page.tsx", import.meta.url),
      "utf8",
    );
    const customerSearchSource = readFileSync(
      new URL("../components/clients/CustomerListSearch.tsx", import.meta.url),
      "utf8",
    );

    expect(customersPageSource).toContain("Acciones");
    expect(customersPageSource).toContain("Buscar y ordenar");
    expect(customersPageSource).toContain('<Card className="mb-6 space-y-3">');
    expect(customersPageSource).toContain('<Card className="space-y-4">');
    expect(customerSearchSource).not.toContain("relative mb-4");
  });
});
