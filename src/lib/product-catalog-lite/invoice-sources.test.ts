import {describe,it,expect} from "vitest";
import {invoicePriceSources} from "./invoice-sources";
import type {Expense,Product} from "@/lib/types";
const product={id:"p",name:"Motor modelo exacto blanco",key:"p",family:"Motores",source:"manual",purchase:{supplierName:"Proveedor A",supplierReference:"REF-A"},createdAt:"2026-01-01",updatedAt:"2026-01-01"} as Product;
const expense=(supplier:string,description:string,reference?:string):Expense=>({id:supplier,date:"2026-10-01",supplierName:supplier,description:"Compra",amount:100,ivaPercent:21,category:"Material",paymentMethod:"Transferencia",createdAt:"2026-10-02T10:00:00Z",purchaseDocument:{invoiceNumber:"TEST-1",issueDate:"2026-10-01"},purchaseLines:[{id:"line-1",description,supplierReference:reference,quantity:1,unit:"ud",unitPrice:100,discountPercent:20,netUnitPrice:80}]});
describe("documented supplier price comparison",()=>{
 it("finds exact names across suppliers and keeps document, date and unit",()=>{const found=invoicePriceSources(product,[expense("Proveedor B",product.name)]);expect(found).toHaveLength(1);expect(found[0]).toMatchObject({kind:"supplier_invoice",supplierName:"Proveedor B",documentNumber:"TEST-1",documentDate:"2026-10-01",netUnitCost:80,unit:"ud",expenseId:"Proveedor B"})});
 it("does not equate similar names or another supplier's reference",()=>{expect(invoicePriceSources(product,[expense("Proveedor B","Motor modelo exacto negro","REF-A")])).toEqual([]);expect(invoicePriceSources(product,[expense("Proveedor B","Motor modelo exacto blanco de 50 Nm")])).toEqual([])});
 it("accepts a reference only within the same supplier",()=>{expect(invoicePriceSources(product,[expense("Proveedor A","Nombre alternativo","REF-A")])).toHaveLength(1)});
 it("ignores excluded lines and does not invent an invoice for a manual purchase",()=>{const e=expense("Proveedor B",product.name);e.purchaseDocument=undefined;expect(invoicePriceSources(product,[e])[0].kind).toBe("other");e.purchaseLines![0].catalogProduct=false;expect(invoicePriceSources(product,[e])).toEqual([])});
});
