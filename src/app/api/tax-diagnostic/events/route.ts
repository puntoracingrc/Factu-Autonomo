import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { normalizeTaxProductEvent } from "@/lib/tax-diagnostic-insights/contracts";
import { persistTaxProductEvent } from "@/lib/tax-diagnostic-insights/server-store";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readTextBody } from "@/lib/server/request-body";

const MAX_EVENT_BYTES = 12 * 1024;

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    request,
    { namespace: "tax_product_events", limit: 240, windowMs: 10 * 60_000 },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const body = await readTextBody(request, {
    maxBytes: MAX_EVENT_BYTES,
    invalidMessage: "Evento inválido",
    tooLargeMessage: "Evento demasiado grande",
  });
  if (!body.ok) return body.response;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.data || "{}");
  } catch {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }
  const event = normalizeTaxProductEvent(parsed);
  if (!event) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  // Product analytics is deliberately best-effort: its storage must never
  // block a fiscal diagnosis, and the response never exposes store errors.
  const persisted = await persistTaxProductEvent(event, user.id).catch(() => false);
  return NextResponse.json({ ok: persisted }, { status: persisted ? 200 : 202 });
}
