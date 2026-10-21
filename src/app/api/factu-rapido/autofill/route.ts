import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/server/request-body";
import { authenticateQuick, QuickError } from "@/lib/quick-invoicing/server";
import { fillQuickWithAi, parseQuickAiInput } from "@/lib/quick-invoicing/ai-fill-server";
import { QUICK_AI_IMAGE_BYTES } from "@/lib/quick-invoicing/ai-fill";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", Vary: "Authorization, X-Factu-Device-Token, X-Factu-Company-Id", "X-Robots-Tag": "noindex, nofollow" };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers }); }
export async function POST(request: Request) {
  try {
    const context = await authenticateQuick(request, { purpose: "autofill" });
    const body = await readJsonBody(request, { maxBytes: Math.ceil(QUICK_AI_IMAGE_BYTES / 3) * 4 + 64 * 1024 });
    if (!body.ok) return json({ ok: false, code: "INVALID_AI_INPUT", message: body.response.status === 413 ? "El texto o la imagen superan el tamaño permitido." : "Petición no válida." }, body.response.status);
    const input = parseQuickAiInput(body.data);
    const suggestion = await fillQuickWithAi(context, input, request.signal);
    return json({ ok: true, suggestion });
  } catch (error) {
    if (error instanceof QuickError) return json({ ok: false, code: error.code, message: error.message }, error.status);
    return json({ ok: false, code: "AI_UNAVAILABLE", message: "No se pudo rellenar ahora. Tus campos no se han cambiado; puedes seguir a mano." }, 503);
  }
}
