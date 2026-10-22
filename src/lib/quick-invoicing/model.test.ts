import { describe, expect, it } from "vitest";
import { parseQuickIntent, QUICK_METHODS, quickPaymentTerms, quickTotals } from "./model";
import { quickIssuedDocument, quickRenderProfile } from "./render";
import { quickPdfContext } from "./context";
import type { Document } from "@/lib/types";
import { inspectDocumentSnapshotsIntegrity } from "@/lib/document-integrity";
import { buildPdfViewModelForDocument } from "@/lib/document-integrity/pdf-source";

import { syntheticIntent, syntheticProfile } from "./test-fixtures";
import { quickClientSnapshot } from "./client-snapshot";

describe("Factu Rápido: bounded intent and four explicit payment choices",() => {
  it.each(QUICK_METHODS.filter(method => method !== "stripe" && method !== "pendiente"))("preserves paid and pending %s terms", method => {
    expect(parseQuickIntent({...syntheticIntent(),paymentMethod:method,paid:true}).paid).toBe(true);
    const suffix = {efectivo:"en efectivo",tarjeta:"por tarjeta",transferencia:"por transferencia",bizum:"por Bizum"}[method];
    expect(quickPaymentTerms(method,true,syntheticProfile.iban)).toBe(`Pagado ${suffix}${method === "transferencia" ? ` · IBAN: ${syntheticProfile.iban}` : ""}`);
    expect(quickPaymentTerms(method,false,"")).toBe(`Pago ${suffix}`);
  });
  it("issues an explicitly deferred invoice without declaring a payment", () => {
    expect(parseQuickIntent({ ...syntheticIntent(), paymentMethod: "pendiente", paid: false }).paid).toBe(false);
    expect(() => parseQuickIntent({ ...syntheticIntent(), paymentMethod: "pendiente", paid: true })).toThrow("pendiente");
    expect(quickPaymentTerms("pendiente", false, "")).toBe("Pendiente de pago");
  });
  it("keeps link/QR invoices pending until server-confirmed collection", () => {
    expect(parseQuickIntent({...syntheticIntent(),paymentMethod:"stripe",paid:false}).paid).toBe(false);
    expect(() => parseQuickIntent({...syntheticIntent(),paymentMethod:"stripe",paid:true})).toThrow("Stripe");
    expect(() => parseQuickIntent({...syntheticIntent(),kind:"presupuesto",paymentMethod:"stripe"})).toThrow("factura");
    expect(quickPaymentTerms("stripe",false,"")).toBe("Pago por tarjeta mediante enlace o QR");
  });
  it("strips authority, accounting, images and costs supplied by a browser",() => {
    const parsed = parseQuickIntent({...syntheticIntent(),companyId:"another-company",number:"F-9999",issuer:{name:"forged"},irpfPercent:99,
      items:[{...syntheticIntent().items[0],imageDataUrl:"forged",unitCost:1000,grossUnitPrice:1}]});
    expect(Object.keys(parsed)).not.toContain("companyId");
    expect(parsed.items[0]).not.toHaveProperty("imageDataUrl");
    expect(parsed.items[0]).not.toHaveProperty("unitCost");
    expect(quickTotals(parsed.items)).toMatchObject({subtotal:80,iva:16.8,total:96.8});
  });
  it.each(["2026-02-30","2026-13-99","", "2026-2-1"])("rejects invalid dates without a RangeError: %s",date => {
    expect(() => parseQuickIntent({...syntheticIntent(),date})).toThrow("Fecha no válida");
  });
  it("does not turn a quote into a payment or receipt",() => {
    expect(() => parseQuickIntent({...syntheticIntent(),kind:"presupuesto",paid:true})).toThrow("no acredita un cobro");
    expect(parseQuickIntent({...syntheticIntent(),kind:"presupuesto"}).kind).toBe("presupuesto");
  });
  it.each([NaN,Infinity,-1])("rejects an unsafe price %s",unitPrice => {
    expect(() => parseQuickIntent({...syntheticIntent(),items:[{...syntheticIntent().items[0],unitPrice}]})).toThrow("precios");
  });
  it("caps complex jobs and rejects duplicate lines",() => {
    expect(() => parseQuickIntent({...syntheticIntent(),items:Array(21).fill(syntheticIntent().items[0])})).toThrow("20 conceptos");
    expect(() => parseQuickIntent({...syntheticIntent(),items:Array(2).fill(syntheticIntent().items[0])})).toThrow("repetidas");
  });
  it("never projects tax questionnaires or margins into the render context",() => {
    const profile = quickRenderProfile({...syntheticProfile,taxModelDiagnostic:{private:"never"},productFamilyMarkups:{rules:[]}} as never);
    expect(profile).not.toHaveProperty("taxModelDiagnostic");
    expect(profile).not.toHaveProperty("productFamilyMarkups");
    expect(profile).not.toHaveProperty("irpfPercent");
    expect(profile.iban).toBe(syntheticProfile.iban);
  });
  it("captures the complete customer address for the PDF without changing master fields",()=>{
    const client = {...syntheticIntent().client,addressExtra:"1º 2ª"};
    expect(quickClientSnapshot(client).address).toBe("Calle Prueba 1, 1º 2ª, 08001 Barcelona");
    expect(client.address).toBe("Calle Prueba 1");
  });
  it("materializes a numbered invoice with verifiable snapshots and a paid status",() => {
    const doc: Document = {id:"quick-synthetic",type:"factura",number:"F-2026-0001",date:"2026-10-21",client:syntheticIntent().client,
      items:syntheticIntent().items,status:"pagado",salesTerms:quickPaymentTerms("transferencia",true,syntheticProfile.iban),
      quickPdfContext:quickPdfContext(syntheticProfile),createdAt:"2026-10-21T10:00:00Z",updatedAt:"2026-10-21T10:00:00Z",issuedAt:"2026-10-21T10:00:00Z"};
    const issued = quickIssuedDocument(doc,syntheticProfile);
    expect(issued.paymentStatus).toBe("paid");
    expect(issued.documentSnapshot?.salesTerms).toContain("Pagado por transferencia");
    expect(inspectDocumentSnapshotsIntegrity(issued).ok).toBe(true);
    expect(issued.documentSnapshot).not.toHaveProperty("irpfPercent");
  });
  it("uses the captured quote template and VAT context after profile changes",() => {
    const doc: Document = {id:"quick-quote",type:"presupuesto",number:"P-2026-0001",date:"2026-10-21",client:{name:"Prueba"},items:syntheticIntent().items,
      status:"enviado",quickPdfContext:quickPdfContext(syntheticProfile),createdAt:"2026-10-21T10:00:00Z",updatedAt:"2026-10-21T10:00:00Z"};
    const original = buildPdfViewModelForDocument(doc,syntheticProfile);
    const later = buildPdfViewModelForDocument(doc,{...syntheticProfile,vatExempt:true});
    expect(later.vatExempt).toBe(original.vatExempt);
    expect(later.template).toEqual(original.template);
    expect(quickIssuedDocument(doc,syntheticProfile)).toBe(doc);
  });
});
