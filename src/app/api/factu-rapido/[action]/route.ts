import { after, NextResponse } from "next/server";
import { readTextBody } from "@/lib/server/request-body";
import { parseQuickIntent } from "@/lib/quick-invoicing/model";
import { quickStripeConfig } from "@/lib/quick-invoicing/payments-config";
import { finishQuickCollectionInvoice } from "@/lib/quick-invoicing/collections-server";
import { authenticateQuick, cancelQuickOperation, issueQuickDocument, QuickError, readQuickDocument, runQuickCustomerJobs, searchQuickCatalog } from "@/lib/quick-invoicing/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", Vary: "Authorization, X-Factu-Device-Token, X-Factu-Company-Id", "X-Robots-Tag": "noindex, nofollow" };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers }); }
function failed(error: unknown) {
  if (error instanceof QuickError) return json({ ok: false, code: error.code, message: error.message }, error.status);
  return json({ ok: false, code: "CENTRAL_UNCONFIRMED", message: "No se pudo confirmar la operación. Conservamos tus datos; comprueba y reintenta sin crear otro documento." }, 503);
}
type RouteContext = { params: Promise<{ action: string }> };
export async function GET(request: Request, route: RouteContext) {
  try {
    const { action } = await route.params;
    if (action === "config") return json({ url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" });
    const context = await authenticateQuick(request, { allowBootstrap: action === "bootstrap" });
    const url = new URL(request.url);
    if (action === "bootstrap") {
      const { scope } = context;
      const cards = quickStripeConfig();
      return json({ ok: true, actorId: scope.actor_id, companyId: scope.company_id, companyName: scope.company_name,
        defaultVat: scope.profile.iva.defaultRate, vatRates: scope.profile.iva.rates, vatExempt: scope.profile.vatExempt === true, iban: scope.profile.iban ?? "",
        cardPaymentsEnabled: cards?.companyId === scope.company_id, cardPaymentsTestMode: cards ? !cards.livemode : false });
    }
    if (action === "search") return json({ ok: true, results: await searchQuickCatalog(context, url.searchParams.get("kind") ?? "", url.searchParams.get("q") ?? "") });
    if (action === "document") {
      const id = url.searchParams.get("operationId") ?? "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new QuickError(400, "INVALID_OPERATION", "Operación no válida.");
      const receipt = await readQuickDocument(context, id);
      return json({ ok: true, receipt });
    }
    return json({ ok: false },404);
  } catch (error) { return failed(error); }
}
export async function POST(request: Request, route: RouteContext) {
  try {
    const { action } = await route.params;
    if (action !== "issue" && action !== "cancel") return json({ ok: false },404);
    const context = await authenticateQuick(request);
    const body = await readTextBody(request, { maxBytes: 64 * 1024, invalidMessage: "Solicitud no válida.", tooLargeMessage: "El documento supera el tamaño permitido." });
    if (!body.ok) return body.response;
    let intent;
    try { intent = parseQuickIntent(JSON.parse(body.data)); }
    catch (error) { throw new QuickError(400, "INVALID_DOCUMENT", error instanceof Error ? error.message : "Revisa el documento."); }
    if (action === "cancel") return json({ ok:true, ...await cancelQuickOperation(context,intent) });
    const receipt = await issueQuickDocument(context, intent);
    after(async () => { await runQuickCustomerJobs(context).catch(() => undefined); });
    return json({ ok: true, receipt: await finishQuickCollectionInvoice(context, receipt) });
  } catch (error) { return failed(error); }
}
