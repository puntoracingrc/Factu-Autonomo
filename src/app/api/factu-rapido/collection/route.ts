import { NextResponse } from "next/server";
import { authenticateQuick, QuickError } from "@/lib/quick-invoicing/server";
import { createQuickCollection, listQuickCollections, prepareQuickCollectionInvoice, prepareQuickCollectionPayment, readQuickCollection, searchQuickCollectionInvoices, linkQuickCollectionToInvoice } from "@/lib/quick-invoicing/collections-server";
import { parseQuickCollection, quickCollectionId } from "@/lib/quick-invoicing/collections-model";
import { readTextBody } from "@/lib/server/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", Vary: "Authorization, X-Factu-Device-Token, X-Factu-Company-Id", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
function failed(error: unknown) {
  return error instanceof QuickError ? json({ ok: false, code: error.code, message: error.message }, error.status)
    : json({ ok: false, code: "COLLECTION_UNCONFIRMED", message: "No se pudo confirmar el cobro. Reintenta la misma operación." }, 503);
}
function valid<T>(parse: () => T): T {
  try { return parse(); } catch (error) { throw new QuickError(400, "INVALID_COLLECTION", error instanceof Error ? error.message : "Cobro no válido."); }
}
export async function GET(request: Request) {
  try {
    const context = await authenticateQuick(request, { purpose: "payment" });
    const url = new URL(request.url), id = url.searchParams.get("id"), before = url.searchParams.get("before");
    if (url.searchParams.get("action") === "invoices") return json({ ok: true, invoices: await searchQuickCollectionInvoices(context, url.searchParams.get("q") ?? "") });
    return id ? json({ ok: true, collection: await readQuickCollection(context, valid(() => quickCollectionId(id))) })
      : json({ ok: true, ...await listQuickCollections(context, before ? valid(() => quickCollectionId(before)) : undefined) });
  } catch (error) { return failed(error); }
}
export async function POST(request: Request) {
  try {
    const context = await authenticateQuick(request, { purpose: "payment" });
    const body = await readTextBody(request, { maxBytes: 4096, invalidMessage: "Solicitud no válida.", tooLargeMessage: "Solicitud demasiado grande." });
    if (!body.ok) return body.response;
    const data = valid(() => JSON.parse(body.data)) as Record<string, unknown> | null;
    if (!data || typeof data !== "object") throw new QuickError(400, "INVALID_COLLECTION", "Cobro no válido.");
    if (data.action === "create") return json({ ok: true, collection: await createQuickCollection(context, valid(() => parseQuickCollection(data))) });
    const id = valid(() => quickCollectionId(data.id));
    if (data.action === "prepare") return json({ ok: true, collection: await prepareQuickCollectionPayment(context, id) });
    if (data.action === "invoice") return json({ ok: true, ...await prepareQuickCollectionInvoice(context, id) });
    if (data.action === "link") {
      const invoiceId = valid(() => quickCollectionId(data.invoiceId));
      if (!Number.isSafeInteger(data.version) || (data.version as number) < 1) throw new QuickError(400, "INVALID_COLLECTION", "Versión de factura no válida.");
      return json({ ok: true, collection: await linkQuickCollectionToInvoice(context, id, invoiceId, data.version as number) });
    }
    throw new QuickError(400, "INVALID_COLLECTION", "Acción no válida.");
  } catch (error) { return failed(error); }
}
