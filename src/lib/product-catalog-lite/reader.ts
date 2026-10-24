import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/types";
import { CATALOG_PAGE_SIZE, catalogSearchFilter, type CatalogSummary } from "./model";

const summaryColumns = "entity_id,current_version,name:current_payload->>name,sku:current_payload->>sku,family:current_payload->>family,subfamily:current_payload->>subfamily,unit:current_payload->>unit,cost:current_payload->cost,sales:current_payload->sales,purchase:current_payload->purchase,vat:current_payload->ivaPercent";
type Row = { entity_id:string; current_version:number; name:string; sku?:string; family:string; subfamily?:string; unit?:string; cost?:number; sales?:Product["sales"]; purchase?:Product["purchase"]; vat?:number };
function products(admin: SupabaseClient, owner: string, columns: string, count = false) {
  return admin.from("central_business_entities").select(columns, count ? {count:"exact"} : {}).eq("user_id",owner).eq("entity_type","product").eq("deleted",false)
    .or("current_payload->>hidden.is.null,current_payload->>hidden.eq.false");
}
function amount(n: unknown): number | null { return typeof n === "number" && Number.isFinite(n) ? n : null; }
export async function listCatalogProducts(admin: SupabaseClient, owner: string, input: {q:string; family:string; offset:number}) {
  let query = products(admin,owner,summaryColumns,true);
  const filter = catalogSearchFilter(input.q); if (filter) query = query.or(filter);
  if (input.family) query = query.eq("current_payload->>family",input.family);
  const result = await query.order("current_payload->>name",{ascending:true}).order("entity_id",{ascending:true}).range(input.offset,input.offset+CATALOG_PAGE_SIZE-1);
  if (result.error) throw new Error("CATALOG_READ_FAILED");
  const results: CatalogSummary[] = ((result.data ?? []) as unknown as Row[]).map(row => ({id:row.entity_id,version:row.current_version,name:row.name,sku:row.sku ?? "",family:row.family ?? "Sin familia",subfamily:row.subfamily ?? "",salePrice:amount(row.sales?.unitPrice),cost:amount(row.purchase?.netUnitCost ?? row.cost),unit:row.sales?.unit ?? row.unit ?? "ud",purchaseUnit:row.purchase?.unit ?? row.unit ?? "ud",vat:amount(row.sales?.ivaPercent ?? row.vat)}));
  return {results,total:result.count ?? 0,hasMore:input.offset+results.length<(result.count ?? 0)};
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
