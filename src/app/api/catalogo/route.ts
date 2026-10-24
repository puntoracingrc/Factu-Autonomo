import { NextResponse } from "next/server";
import { getCompanyRouteAuthFromBearer, normalizeCompanyId } from "@/lib/companies/server";
import { ensureCloudDeviceAccess, normalizeCloudDeviceToken } from "@/lib/cloud/devices";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { evaluateCentralBusinessAuthorityActivation } from "@/lib/central-business-authority/activation";
import { listCatalogProducts, readCatalogFamilies, readCatalogProduct, readCatalogIdentities, readCatalogInvoiceSources } from "@/lib/product-catalog-lite/reader";

export const dynamic = "force-dynamic";
const headers = {"Cache-Control":"private, no-store, max-age=0",Vary:"Authorization, X-Factu-Company-Id, X-Factu-Device-Token","X-Robots-Tag":"noindex, nofollow, noarchive"};
const json = (body:unknown,status=200) => NextResponse.json(body,{status,headers});
export async function GET(request: Request) {
  const company = normalizeCompanyId(request.headers.get("x-factu-company-id"));
  const auth = await getCompanyRouteAuthFromBearer(request.headers.get("authorization"),company);
  if (!auth) return json({ok:false,message:"Inicia sesión con una cuenta que tenga acceso a esta empresa."},401);
  if (!company || auth.companyId !== company) return json({ok:false,message:"Selecciona una empresa válida."},400);
  const rate = await checkRateLimit(request,{namespace:"catalog_lite_read",limit:120,windowMs:60_000},auth.actorUserId);
  if (!rate.allowed) return json({ok:false,message:"Espera unos segundos y vuelve a buscar."},429);
  const token = normalizeCloudDeviceToken(request.headers.get("x-factu-device-token"));
  if (!token) return json({ok:false,message:"No se pudo identificar este dispositivo."},400);
  const access = await ensureCloudDeviceAccess({userId:auth.userId,billingUserId:auth.billingUserId,sessionId:auth.sessionId,token,userAgent:request.headers.get("user-agent") ?? undefined,name:"Factu Catálogo"});
  if (!access.allowed) return json({ok:false,message:access.message,code:access.reason},403);
  const activation = evaluateCentralBusinessAuthorityActivation({userId:auth.userId,userEmail:auth.userEmail});
  if (!activation.enabled) return json({ok:false,message:"Esta cuenta aún no tiene el catálogo central disponible. Comprueba la sincronización en Factu."},409);
  const admin = getSupabaseAdmin(); if (!admin) return json({ok:false,message:"No se puede conectar con el catálogo ahora."},503);
  const params = new URL(request.url).searchParams, action = params.get("action") ?? "list";
  const offset = Number(params.get("offset") ?? "0");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) return json({ok:false,message:"Página no válida."},400);
  try {
    if (action === "detail" || action === "sources") {
      const id = params.get("id") ?? ""; if (!id || id.length>200) return json({ok:false,message:"Producto no válido."},400);
      const record = await readCatalogProduct(admin,auth.userId,id);
      if(action==="sources"&&record)return json({ok:true,...await readCatalogInvoiceSources(admin,auth.userId,record.product,offset)});
      return record ? json({ok:true,...record,canEdit:activation.writesEnabled}) : json({ok:false,message:"Este producto ya no está disponible."},404);
    }
    if (action === "identities") return json({ok:true,...await readCatalogIdentities(admin,auth.userId,offset)});
    if (action === "families") return json({ok:true,...await readCatalogFamilies(admin,auth.userId,offset)});
    if (action !== "list") return json({ok:false,message:"Consulta no válida."},400);
    const family=(params.get("family") ?? "").slice(0,200),subfamily=(params.get("subfamily") ?? "").slice(0,200);
    if(subfamily&&!family)return json({ok:false,message:"Selecciona una familia para filtrar por subfamilia."},400);
    return json({ok:true,...await listCatalogProducts(admin,auth.userId,{q:(params.get("q") ?? "").slice(0,100),family,subfamily,offset}),canEdit:activation.writesEnabled});
  } catch { return json({ok:false,message:"No se pudo leer el catálogo. Reintenta en unos segundos."},503); }
}
