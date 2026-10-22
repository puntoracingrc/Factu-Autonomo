import { NextResponse } from "next/server";
import { authenticateQuick, QuickError } from "@/lib/quick-invoicing/server";
import { createQuickCardPayment, readQuickCardPayment } from "@/lib/quick-invoicing/payments-server";
import { readTextBody } from "@/lib/server/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", Vary: "Authorization, X-Factu-Device-Token, X-Factu-Company-Id", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
function operation(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new QuickError(400, "INVALID_OPERATION", "Factura no válida.");
  }
  return value;
}
function failed(error: unknown) {
  return error instanceof QuickError ? json({ ok: false, code: error.code, message: error.message }, error.status)
    : json({ ok: false, code: "PAYMENT_UNCONFIRMED", message: "No se pudo comprobar el cobro. Reintenta sobre esta misma factura." }, 503);
}
export async function GET(request: Request) {
  try {
    const context = await authenticateQuick(request, { purpose: "payment" });
    return json({ ok: true, payment: await readQuickCardPayment(context, operation(new URL(request.url).searchParams.get("operationId"))) });
  } catch (error) { return failed(error); }
}
export async function POST(request: Request) {
  try {
    const context = await authenticateQuick(request, { purpose: "payment" });
    const body = await readTextBody(request, { maxBytes: 1024, invalidMessage: "Solicitud no válida.", tooLargeMessage: "Solicitud demasiado grande." });
    if (!body.ok) return body.response;
    let parsed;
    try { parsed = JSON.parse(body.data); } catch { throw new QuickError(400, "INVALID_REQUEST", "Solicitud no válida."); }
    return json({ ok: true, payment: await createQuickCardPayment(context, operation(parsed?.operationId)) });
  } catch (error) { return failed(error); }
}
