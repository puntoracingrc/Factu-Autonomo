import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/types";
import { CATALOG_PAGE_SIZE, catalogSearchFilter, type CatalogSummary } from "./model";
import { summaryPriceSourceLabel } from "@/lib/product-price-sources";
import { invoicePriceSources } from "./invoice-sources";
import type { Expense } from "@/lib/types";

const summaryColumns = "entity_id,current_version,name:current_payload->>name,sku:current_payload->>sku,family:current_payload->>family,subfamily:current_payload->>subfamily,unit:current_payload->>unit,cost:current_payload->cost,pvp:current_payload->pvp,sales:current_payload->sales,purchase:current_payload->purchase,vat:current_payload->ivaPercent,priceSourceSummary:current_payload->priceSourceSummary,supplierName:current_payload->>supplierName";
type Row = { entity_id:string; current_version:number; name:string; sku?:string; family:string; subfamily?:string; unit?:string; cost?:number; pvp?:number; sales?:Product["sales"]; purchase?:Product["purchase"]; vat?:number;priceSourceSummary?:Product["priceSourceSummary"];supplierName?:string };
function products(admin: SupabaseClient, owner: string, columns: string, count = false) {
  return admin.from("central_business_entities").select(columns, count ? {count:"exact"} : {}).eq("user_id",owner).eq("entity_type","product").eq("deleted",false)
    .or("current_payload->>hidden.is.null,current_payload->>hidden.eq.false");
}
function amount(n: unknown): number | null { return typeof n === "number" && Number.isFinite(n) ? n : null; }
export async function listCatalogProducts(admin: SupabaseClient, owner: string, input: {q:string; family:string; subfamily?:string; offset:number}) {
  if(input.subfamily&&!input.family)throw new Error("CATALOG_INVALID_SUBFAMILY_FILTER");
  let query = products(admin,owner,summaryColumns,true);
  const filter = catalogSearchFilter(input.q); if (filter) query = query.or(filter);
  if (input.family) query = query.eq("current_payload->>family",input.family);
  if (input.subfamily) query = query.eq("current_payload->>subfamily",input.subfamily);
  const result = await query.order("current_payload->>name",{ascending:true}).order("entity_id",{ascending:true}).range(input.offset,input.offset+CATALOG_PAGE_SIZE-1);
  if (result.error) throw new Error("CATALOG_READ_FAILED");
  const results: CatalogSummary[] = ((result.data ?? []) as unknown as Row[]).map(row => ({id:row.entity_id,version:row.current_version,name:row.name,sku:row.sku ?? "",family:row.family ?? "Sin familia",subfamily:row.subfamily ?? "",salePrice:amount(row.sales?.unitPrice),cost:amount(row.purchase?.netUnitCost ?? row.cost),unit:row.sales?.unit ?? row.unit ?? "ud",purchaseUnit:row.purchase?.unit ?? row.unit ?? "ud",vat:amount(row.sales?.ivaPercent ?? row.vat),supplierName:row.purchase?.supplierName??row.supplierName??"",priceOrigin:summaryPriceSourceLabel({...row,ivaPercent:row.vat} as unknown as Product)}));
  return {results,total:result.count ?? 0,hasMore:input.offset+results.length<(result.count ?? 0)};
}
export async function readCatalogIdentities(admin: SupabaseClient, owner: string, offset: number) {
  const {data,error}=await admin.from("central_business_entities").select("entity_id,deleted,sku:current_payload->>sku,externalId:current_payload->>externalId,reference:current_payload->purchase->>supplierReference").eq("user_id",owner).eq("entity_type","product").order("entity_id").range(offset,offset+999);
  if(error)throw new Error("CATALOG_READ_FAILED");
  const rows=(data??[]) as unknown as Array<{entity_id:string;deleted:boolean;sku:string|null;externalId:string|null;reference:string|null}>;
  return {identities:rows.map(r=>({id:r.entity_id,deleted:r.deleted,sku:r.sku??"",externalId:r.externalId??"",reference:r.reference??""})),next:rows.length===1000?offset+1000:null};
}
export async function readCatalogInvoiceSources(admin: SupabaseClient, owner: string, product: Product, offset: number) {
  const {data,error}=await admin.from("central_business_entities").select("entity_id,date:current_payload->>date,createdAt:current_payload->>createdAt,amount:current_payload->amount,supplierName:current_payload->>supplierName,businessKind:current_payload->>businessKind,purchaseDocument:current_payload->purchaseDocument,purchaseLines:current_payload->purchaseLines,ivaPercent:current_payload->ivaPercent").eq("user_id",owner).eq("entity_type","expense").eq("deleted",false).order("current_payload->>date",{ascending:false}).order("entity_id").range(offset,offset+49);
  if(error)throw new Error("CATALOG_READ_FAILED");
  const rows=(data??[]) as unknown as Array<Expense&{entity_id:string}>;
  return {sources:invoicePriceSources(product,rows.map(r=>({...r,id:r.entity_id}))),reviewed:offset+rows.length,next:rows.length===50?offset+50:null};
}
export async function readCatalogProduct(admin: SupabaseClient, owner: string, id: string) {
  const {data,error} = await admin.from("central_business_entities").select("entity_id,current_version,current_payload").eq("user_id",owner).eq("entity_type","product").eq("entity_id",id).eq("deleted",false).maybeSingle();
  if (error) throw new Error("CATALOG_READ_FAILED");
  if (!data) return null;
  const product = data.current_payload as Product;
  if (product.id !== id || !product.name || !Number.isSafeInteger(data.current_version) || data.current_version < 1) throw new Error("CATALOG_INVALID_RECORD");
  return {product,version:data.current_version};
}
export async function readCatalogFamilies(admin: SupabaseClient, owner: string, offset: number) {
  const {data,error} = await products(admin,owner,"family:current_payload->>family,subfamily:current_payload->>subfamily").order("entity_id").range(offset,offset+999);
  if (error) throw new Error("CATALOG_READ_FAILED");
  const rows = (data ?? []) as unknown as Array<{family:string|null;subfamily:string|null}>;
  return {families:rows.map(r=>({family:r.family || "Sin familia",subfamily:r.subfamily || ""})),next:rows.length===1000?offset+1000:null};
}
