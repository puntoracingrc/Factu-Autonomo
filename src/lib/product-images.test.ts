import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { isProductImageDataUrl, productImageSnapshot } from "./product-image";
import { catalogAdmissionBatches, materializeCatalogProduct, parseProductImageCatalog, type ProductImageCatalogEntry } from "./product-image-catalog";
import { applyProductCatalogStructureOperation } from "./product-catalog-structure";
import { buildPurchaseProductSummaries } from "./purchase-products";
import { applyDocumentProductToLine, buildDocumentProductSuggestionIndex, searchDocumentProductSuggestions } from "./document-product-suggestions";
import { productSummaryToDocumentDraftLine } from "./product-document-draft";
import { issueDocument, projectCanonicalSnapshotOntoDocument, assertDocumentSnapshotsIntegrity, markDocumentPaid } from "./document-integrity";
import { buildCentralBusinessReceiptPayloadWithoutNumber, materializeCentralBusinessReceipt } from "./central-business-authority/central-receipt-materialization";
import { buildPdfViewModelForDocument } from "./document-integrity/pdf-source";
import { parseCentralBusinessDocumentPayload } from "./central-business-authority/payload-parsers";
import { buildDocumentPdf } from "./pdf";
import { DEFAULT_PROFILE, EMPTY_DATA, type BusinessProfile, type Document } from "./types";

const image = `data:image/png;base64,${readFileSync(new URL("../../public/icon-128.png", import.meta.url)).toString("base64")}`;
const now = "2026-10-14T12:00:00.000Z";
const profile = { ...DEFAULT_PROFILE, name:"Empresa sintética", nif:"B12345678", address:"Calle Prueba 1",postalCode:"28001",city:"Madrid" };
const entry: ProductImageCatalogEntry = { sourceId:"model-a",sku:"AL-OSC2",name:"Ventana oscilobatiente",description:"Ventana instalada",family:"Ventanas",subfamily:"Aluminio",aliases:["CAL-P2HO"],imageDataUrl:image };
function product(scope="company-a", source=entry) { return materializeCatalogProduct("sample",source,scope,now,21); }
function doc(patch: Partial<Document> = {}): Document { return {id:"image-document",type:"presupuesto",number:"P-2026-1019",date:"2026-10-14",status:"borrador",client:{name:"Cliente sintético",nif:"12345678Z",address:"Calle Cliente 1",postalCode:"28002",city:"Madrid"},items:[{id:"row-1",description:"Ventana con imagen",quantity:1,unitPrice:100,ivaPercent:21,imageDataUrl:image}],createdAt:now,updatedAt:now,...patch}; }
const bundle = {schema:"FACTU_PRODUCT_IMAGE_CATALOG_V1",catalogId:"sample",products:[entry]};

describe("optional product illustrations",()=>{
  it("admits bounded self-contained raster content and rejects URLs, SVG, corrupt, giant and empty images", async()=>{
    expect(isProductImageDataUrl(image)).toBe(true);
    const jpg=await sharp({create:{width:20,height:30,channels:3,background:"white"}}).jpeg().toBuffer();
    expect(isProductImageDataUrl(`data:image/jpeg;base64,${jpg.toString("base64")}`)).toBe(true);
    const giant=await sharp({create:{width:513,height:20,channels:3,background:"white"}}).png().toBuffer();
    for(const bad of [null,"","https://example.com/a.png","data:image/svg+xml;base64,PHN2Zz4=",`data:image/png;base64,${giant.toString("base64")}`,image.slice(0,-16),image+"A".repeat(70000)])expect(isProductImageDataUrl(bad)).toBe(false);
    expect(productImageSnapshot(undefined)).toEqual({});
    expect(productImageSnapshot("")).toEqual({});
    expect(()=>productImageSnapshot("https://example.com/a.png")).toThrow("imagen");
  });
  it("parses whitelisted catalogue fields and rejects duplicate identity, unsafe raster and incomplete fiches",()=>{
    const parsed=parseProductImageCatalog({...bundle,products:[{...entry,unitPrice:999,id:"foreign-company-id"}]});
    expect(parsed.products[0]).toEqual(entry);
    for(const invalid of [{...bundle,products:[entry,entry]},{...bundle,products:[{...entry,imageDataUrl:"https://example.com/image"}]},{...bundle,products:[{...entry,name:""}]},{...bundle,products:[]},{...bundle,schema:"OTHER"}])expect(()=>parseProductImageCatalog(invalid)).toThrow();
  });
  it("uses stable per-company identities without copying prices, customer IDs, issuer or document history",()=>{
    expect(product().id).toBe(product().id);
    expect(product("company-b").id).not.toBe(product().id);
    expect(product().sales?.unitPrice).toBeUndefined();
    expect(product().purchase).toBeUndefined();
    expect(product().imageDataUrl).toBe(image);
    expect(product().aliases).toContain("cal p2ho");
  });
  it("admits new products without replacing anything and retries idempotently",()=>{
    const original={...EMPTY_DATA,products:[],documents:[doc()]};
    const result=applyProductCatalogStructureOperation(original,{type:"import_products",products:[product()]},{now});
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.data.documents).toBe(original.documents);
    expect(result.data.profile).toBe(original.profile);
    const retry=applyProductCatalogStructureOperation(result.data,{type:"import_products",products:[product()]},{now});
    expect(retry.ok).toBe(true);if(!retry.ok)return;
    expect(retry.productCount).toBe(0);expect(retry.data.products).toEqual(result.data.products);
    const collision=applyProductCatalogStructureOperation(result.data,{type:"import_products",products:[product("company-a",{...entry,sourceId:"different"})]},{now});
    expect(collision.ok).toBe(false);expect(collision.data).toBe(result.data);
    const bad=applyProductCatalogStructureOperation(original,{type:"import_products",products:[product(),{...product("company-a",{...entry,sourceId:"bad",sku:"BAD"}),imageDataUrl:"invalid"}]},{now});
    expect(bad.ok).toBe(false);expect(bad.data).toBe(original);
  });
  it("splits admission into existing atomic batches with enough payload headroom",()=>{
    const products=Array.from({length:143},(_,i)=>product("company-a",{...entry,sourceId:`model-${i}`,sku:`AL-${i}`}));
    const batches=catalogAdmissionBatches(products);
    expect(batches.flat()).toEqual(products);
    for(const batch of batches){expect(batch.length).toBeLessThanOrEqual(50);expect(Buffer.byteLength(JSON.stringify(batch))).toBeLessThan(600000);}
  });
  it("preserves image through catalogue summaries, @reference selection and the product-picker return draft",()=>{
    const summaries=buildPurchaseProductSummaries([], [product()]);
    expect(searchDocumentProductSuggestions(buildDocumentProductSuggestionIndex(summaries),"AL-OSC2",5)).toHaveLength(1);
    const selected=applyDocumentProductToLine(summaries[0],doc().items[0],{defaultIva:21,vatExempt:false});
    expect(selected.line.imageDataUrl).toBe(image);
    expect(productSummaryToDocumentDraftLine(summaries[0]).line.imageDataUrl).toBe(image);
    expect(applyDocumentProductToLine({...summaries[0],imageDataUrl:undefined},doc().items[0],{defaultIva:21,vatExempt:false}).line.imageDataUrl).toBeUndefined();
  });
  it("preserves central quote payload and rejects invalid image instead of silently dropping it",()=>{
    expect(parseCentralBusinessDocumentPayload(doc(),doc().id,"quote")?.items[0].imageDataUrl).toBe(image);
    expect(parseCentralBusinessDocumentPayload(doc({items:[{...doc().items[0],imageDataUrl:"invalid"}]}),doc().id,"quote")).toBeNull();
  });
  it("freezes the image in the issued snapshot/PDF, independent of later catalogue or live line edits",()=>{
    const issued=issueDocument(doc({type:"factura",number:"F-2026-1001"}),profile,now);
    assertDocumentSnapshotsIntegrity(issued);
    expect(issued.documentSnapshot?.items[0].imageDataUrl).toBe(image);
    const changed={...issued,items:[{...issued.items[0],imageDataUrl:undefined,description:"Live changed"}]};
    expect(projectCanonicalSnapshotOntoDocument(changed).items[0].imageDataUrl).toBe(image);
    expect(buildPdfViewModelForDocument(changed,profile).items[0].imageDataUrl).toBe(image);
    const old=issueDocument(doc({type:"factura",number:"F-2026-1002",items:[{...doc().items[0],imageDataUrl:undefined}]}),profile,now);
    expect(Object.hasOwn(old.documentSnapshot!.items[0],"imageDataUrl")).toBe(false);
    expect(buildDocumentPdf(issued,profile).getNumberOfPages()).toBe(1);
  });
  it("renders on the left in the concept cell only; an unpictured line keeps ordinary padding and height",()=>{
    const plain={...doc().items[0],id:"plain",description:"Service without image",imageDataUrl:undefined};
    const pdf=buildDocumentPdf(doc({items:[doc().items[0],plain]}),profile);
    const table=(pdf as jsPDF & {lastAutoTable:{body:Array<{height:number;cells:Record<number,{x:number;width:number;styles:{cellPadding:unknown}}>} >}}).lastAutoTable;
    const pictured=table.body[0],unpictured=table.body[1];
    expect(pictured.height).toBeGreaterThan(unpictured.height);
    expect(pictured.cells[0].styles.cellPadding).toMatchObject({left:33.4});
    expect(unpictured.cells[0].styles.cellPadding).toBe(2.4);
    expect(pictured.cells[0].x).toBe(unpictured.cells[0].x);
    expect(pictured.cells[0].width).toBe(unpictured.cells[0].width);
    const plainPdf=buildDocumentPdf(doc({items:[plain]}),profile);
    const plainTable=(plainPdf as typeof pdf & {lastAutoTable:typeof table}).lastAutoTable;
    expect(unpictured.height).toBe(plainTable.body[0].height);
  });
  it("preserves the frozen illustration in a derived central receipt and its remote materialization",()=>{
    const invoice=markDocumentPaid(issueDocument(doc({type:"factura",number:"F-2026-1001"}),profile,now),now);
    const data={...EMPTY_DATA,profile,documents:[invoice]};
    const payload={...buildCentralBusinessReceiptPayloadWithoutNumber({data,invoiceId:invoice.id,receiptId:"receipt-image",issuedAt:now,createLineId:()=>"receipt-line"}),number:"R-2026-0001"} as Document;
    expect(payload.items[0].imageDataUrl).toBe(image);
    const received=materializeCentralBusinessReceipt({data,receiptPayload:payload}).receipt;
    expect(received.documentSnapshot?.items[0].imageDataUrl).toBe(image);
    assertDocumentSnapshotsIntegrity(received);
  });
  it("renders multiple pages, each document type and mixed pictured/unpictured rows without mutating input",()=>{
    for(const type of ["presupuesto","factura","recibo"] as const){
      const source=doc({type,items:Array.from({length:15},(_,i)=>({...doc().items[0],id:`row-${i}`,description:`Window ${i}`}))});
      const before=JSON.stringify(source);const pdf=buildDocumentPdf(source,profile);
      expect(pdf.getNumberOfPages()).toBeGreaterThan(1);expect(JSON.stringify(source)).toBe(before);
    }
  });

  it.skipIf(!process.env.PRODUCT_IMAGE_SAMPLE_OUTPUT)("renders a local example with the actual company's template, never creating a business document",async()=>{
    const actual=JSON.parse(readFileSync(process.env.PRODUCT_IMAGE_SAMPLE_PROFILE!,"utf8")) as BusinessProfile;
    const catalog=parseProductImageCatalog(JSON.parse(readFileSync(process.env.PRODUCT_IMAGE_SAMPLE_CATALOG!,"utf8")));
    const models=["PVC-OSC2","AL-COR2","AL-FIJO-OSC"];
    const prices=[680,495,540];
    const sample=doc({id:"local-preview-not-a-business-document",number:"MUESTRA-VENTANAS",client:{name:"Cliente de ejemplo",address:"Vivienda de ejemplo - Barcelona"},notes:"MUESTRA DE DISEÑO. Cliente e importes ficticios. No es un presupuesto real.",items:[...models.map((sku,i)=>{
      const p=catalog.products.find(p=>p.sku===sku)!;
      return {id:`window-${i}`,description:`${p.sku} - ${p.name}\nSuministro y colocación. Medidas a confirmar en obra.`,imageDataUrl:p.imageDataUrl,quantity:1,unit:"ud",unitPrice:prices[i],ivaPercent:21};
    }),{id:"plain-service",description:"Retirada de carpintería existente y gestión de residuos (sin imagen).",quantity:1,unitPrice:120,unit:"ud",ivaPercent:21}]});
    // Match prepareLogoForPdf's browser canvas bounds, without depending on a DOM.
    const logo=actual.logoUrl?await sharp(Buffer.from(actual.logoUrl.split(",")[1],"base64")).resize({width:240,height:120,fit:"inside",withoutEnlargement:true}).png().toBuffer():null;
    const meta=logo?await sharp(logo).metadata():null;
    const pdf=buildDocumentPdf(sample,actual,logo&&meta?{logo:{dataUrl:`data:image/png;base64,${logo.toString("base64")}`,width:meta.width!,height:meta.height!}}:{},{websiteFooter:true});
    const output=process.env.PRODUCT_IMAGE_SAMPLE_OUTPUT!;
    mkdirSync(output,{recursive:true});
    writeFileSync(join(output,"Muestra-presupuesto-ventanas-Almar-SL.pdf"),Buffer.from(pdf.output("arraybuffer")));
    expect(pdf.getNumberOfPages()).toBeLessThanOrEqual(2);
  });
});
