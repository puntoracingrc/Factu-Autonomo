import { expensePurchaseLineCanFeedProductCatalog, sanitizeExpensePurchaseLines } from "@/lib/expenses";
import { isProductPriceSource } from "@/lib/product-price-sources";
import type { Expense, Product, ProductPriceSource } from "@/lib/types";

const key=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
/** Exact full names/explicit aliases, or a supplier's own reference within that same supplier. */
export function invoicePriceSources(product: Product, expenses: Expense[]): ProductPriceSource[] {
  const names=new Set([product.name,product.sales?.description,product.purchase?.description,...(product.aliases??[])].filter((s):s is string=>!!s).map(key));
  const supplier=key(product.purchase?.supplierName??product.supplierName??""),reference=key(product.purchase?.supplierReference??"");
  const result:ProductPriceSource[]=[];
  for(const expense of expenses){
    for(const line of sanitizeExpensePurchaseLines(expense.purchaseLines)){
      if(!expensePurchaseLineCanFeedProductCatalog(expense,line))continue;
      const ownReference=reference&&supplier&&key(expense.supplierName)===supplier&&key(line.supplierReference??"")===reference;
      if(!ownReference&&!names.has(key(line.description)))continue;
      const source:ProductPriceSource={id:`expense:${expense.id}:${line.id}`,kind:expense.purchaseDocument?.invoiceNumber||expense.businessKind==="purchase_invoice"?"supplier_invoice":"other",supplierName:expense.supplierName,supplierReference:line.supplierReference,
        documentName:expense.purchaseDocument?.invoiceNumber?"Factura de proveedor":"Compra registrada",documentNumber:expense.purchaseDocument?.invoiceNumber,documentDate:expense.purchaseDocument?.issueDate,recordedAt:expense.createdAt,unit:line.unit||"Sin unidad",
        listPrice:line.unitPrice,discountPercent:line.discountPercent,netUnitCost:line.netUnitPrice??Math.round(line.unitPrice*(1-(line.discountPercent??0)/100)*1e8)/1e8,ivaPercent:line.ivaPercent??expense.ivaPercent,expenseId:expense.id,lineId:line.id,note:"Coincidencia por referencia del mismo proveedor o nombre/alias exacto. Compra documentada; no acredita que el precio actual se eligiera de esta factura."};
      if(isProductPriceSource(source))result.push(source);
    }
  }
  return result;
}
