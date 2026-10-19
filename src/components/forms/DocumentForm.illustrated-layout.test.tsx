import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type Document } from "@/lib/types";
import { DocumentForm } from "./DocumentForm";

// Render the real editor without an account, persistence, network or effects.
const fixtureSettings = vi.hoisted(() => ({ vatExempt: false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/context/AppStore", async () => {
  const { EMPTY_DATA } = await import("@/lib/types");
  return { useAppStore: () => ({ data: { ...EMPTY_DATA, profile: { ...EMPTY_DATA.profile, vatExempt: fixtureSettings.vatExempt } }, ready: true }) };
});
vi.mock("@/context/BillingContext", () => ({
  useBilling: () => ({ billingEnabled: false, isPro: true }),
}));
vi.mock("@/context/CloudSyncContext", () => ({
  useCloudSync: () => ({ cloudEnabled: false, user: null }),
}));
vi.mock("@/hooks/useCentralProfileMutation", () => ({ useCentralProfileMutation: () => ({}) }));
vi.mock("@/hooks/useCentralQuoteCreate", () => ({ useCentralQuoteCreate: () => ({}) }));
vi.mock("@/hooks/useCentralSharedBusinessMutations", () => ({ useCentralSharedBusinessMutations: () => ({}) }));
vi.mock("@/hooks/useCentralDocumentCustomerUpsert", () => ({ useCentralDocumentCustomerUpsert: () => ({}) }));
vi.mock("@/hooks/useCentralAuthorityPlanGate", () => ({ useCentralAuthorityPlanGate: () => ({}) }));

const imageDataUrl = `data:image/png;base64,${readFileSync(new URL("../../../public/icon-128.png", import.meta.url)).toString("base64")}`;
const description = "SUMINISTRO Y COLOCACIÓN DE CARPINTERÍA PRACTICABLE DE UNA HOJA CON TAPA DE REGISTRO, EN ALUMINIO LACADO BLANCO Y VIDRIO DE CÁMARA 4/12/4.\nMedidas y acabado a confirmar.";

function fixture(type: Document["type"], pictured = true): Document {
  return {
    id: "synthetic-layout-only", type, number: "BORRADOR", status: "borrador",
    date: "2026-10-19", createdAt: "2026-10-19T12:00:00.000Z", updatedAt: "2026-10-19T12:00:00.000Z",
    client: { name: "Cliente de prueba" },
    items: [{ id: "pictured", description, quantity: 1, unit: "ud", unitPrice: 680, ivaPercent: 21, ...(pictured ? { imageDataUrl } : {}) }],
  };
}

describe("illustrated document editor layout", () => {
  afterEach(() => { fixtureSettings.vatExempt = false; });
  it.each(["presupuesto", "factura", "recibo"] as const)(
    "%s gives the pictured concept its own wide row and responsive controls below",
    (type) => {
      const document = fixture(type);
      const before = JSON.stringify(document);
      const html = renderToStaticMarkup(createElement(DocumentForm, { type, existing: document }));
      expect(html).toContain("lg:grid-cols-[2rem_minmax(0,1fr)]");
      expect(html).toContain("grid-cols-[5rem_minmax(0,1fr)]");
      expect(html).toContain("grid-cols-1 items-start gap-3 min-[480px]:");
      expect(html).toContain("sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]");
      expect(html).toContain("lg:col-start-2");
      expect(html).toContain('alt="Esquema de la línea 1"');
      expect(html).toContain('aria-label="Concepto de la línea 1"');
      expect(html).toContain(description);
      expect(html).toContain("[field-sizing:content]");
      expect(html).toContain("resize-y");
      expect(html).toContain("Quitar imagen");
      expect(JSON.stringify(document)).toBe(before);
      expect(EMPTY_DATA.documents).toEqual([]);
    },
  );

  it("keeps the ordinary grid and no image slot for unpictured documents", () => {
    const document = fixture("presupuesto", false);
    const html = renderToStaticMarkup(createElement(DocumentForm, { type: document.type, existing: document }));
    expect(html).toContain("lg:grid-cols-[2rem_minmax(12rem,1fr)");
    expect(html).toContain('class="contents"');
    expect(html).toContain("lg:grid lg:items-center");
    expect(html).not.toContain("lg:grid-cols-[2rem_minmax(0,1fr)]");
    expect(html).not.toContain("Esquema de la línea");
    expect(html).not.toContain("Quitar imagen");
  });

  it("supports mixed rows without an inaccurate shared column header", () => {
    const document = fixture("presupuesto");
    document.items.push({ ...document.items[0], id: "plain", description: "Retirada sin imagen", imageDataUrl: undefined });
    const html = renderToStaticMarkup(createElement(DocumentForm, { type: document.type, existing: document }));
    expect(html.match(/alt="Esquema de la línea/g)).toHaveLength(1);
    expect(html.match(/aria-label="Concepto de la línea/g)).toHaveLength(2);
    expect(html).not.toContain("lg:grid lg:items-center");
    expect(html).toContain("Retirada sin imagen");
  });

  it("keeps the wide illustrated layout when the company is VAT exempt", () => {
    fixtureSettings.vatExempt = true;
    const document = fixture("factura");
    const html = renderToStaticMarkup(createElement(DocumentForm, { type: document.type, existing: document }));
    expect(html).toContain("lg:grid-cols-[2rem_minmax(0,1fr)]");
    expect(html).toContain("lg:col-start-2");
    expect(html).not.toContain('aria-label="IVA de la línea 1"');
    expect(html).toContain("Precio");
  });

  it.skipIf(!process.env.DOCUMENT_LAYOUT_OUTPUT)("exports only synthetic real-editor markup for responsive browser verification", () => {
    const output = process.env.DOCUMENT_LAYOUT_OUTPUT!;
    mkdirSync(output, { recursive: true });
    for (const type of ["presupuesto", "factura", "recibo"] as const) {
      for (const pictured of [true, false]) {
        const document = fixture(type, pictured);
        if (pictured && process.env.DOCUMENT_LAYOUT_IMAGE) {
          document.items[0].imageDataUrl = readFileSync(process.env.DOCUMENT_LAYOUT_IMAGE, "utf8").trim();
        }
        const html = renderToStaticMarkup(createElement(DocumentForm, { type, existing: document }));
        writeFileSync(join(output, `${type}-${pictured ? "imagen" : "normal"}.html`), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prueba visual aislada · ${type}</title><link rel="stylesheet" href="layout.css"><body><main class="mx-auto max-w-screen-2xl p-4"><h1>Prueba local sin guardado · ${type}</h1>${html}</main></body></html>`);
      }
    }
  });
});
