import { NextResponse } from "next/server";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getExpenseInboxOriginalAttachment } from "@/lib/expense-inbox-server";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

function json(body: unknown, init: ResponseInit = {}): NextResponse {
  const response = NextResponse.json(body, init);
  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return json(
      { error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE },
      { status: 401 },
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_inbox_original_download",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    const response = rateLimitExceededResponse(rateLimit);
    for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  }

  const { id } = await context.params;
  const itemId = id.trim();
  if (!itemId || itemId.length > 160) {
    return json({ error: "El original solicitado no es válido." }, { status: 400 });
  }

  try {
    const original = await getExpenseInboxOriginalAttachment({
      userId: user.id,
      itemId,
    });
    if (!original) {
      return json(
        { error: "No encuentro un original disponible para este gasto." },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(original.buffer), {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": original.contentType,
        "Content-Length": String(original.buffer.byteLength),
        "X-Content-Type-Options": "nosniff",
        "X-Factu-Source-Sha256": original.sourceSha256,
      },
    });
  } catch {
    return json(
      {
        error:
          "No se pudo recuperar el original del buzón. Reinténtalo antes de guardar el gasto.",
      },
      { status: 502 },
    );
  }
}
