import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  canUseExpenseInbox,
  ensureExpenseInboxAlias,
  getExpenseInboxCopyRecipient,
  getExpenseInboxDeliveryStatus,
  getExpenseInboxItem,
  listExpenseInboxItems,
  retryExpenseInboxItem,
  rotateExpenseInboxAlias,
  updateExpenseInboxItemStatus,
} from "@/lib/expense-inbox-server";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Authorization",
} as const;

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  return withPrivateHeaders(response);
}

function withPrivateHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function serverError(error: unknown) {
  return privateJson(
    {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el buzón de gastos.",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson(
      { error: "Inicia sesión para usar el buzón de gastos." },
      { status: 401 },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_inbox_read",
      limit: 180,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  try {
    const access = await canUseExpenseInbox(user.id);
    if (!access.allowed) {
      return privateJson({ error: access.reason }, { status: 402 });
    }

    const url = new URL(request.url);
    const itemId = url.searchParams.get("id");
    const alias = await ensureExpenseInboxAlias(user.id);
    const [deliveryStatus, copyRecipient] = await Promise.all([
      getExpenseInboxDeliveryStatus(),
      getExpenseInboxCopyRecipient(user.id).catch(() => null),
    ]);

    if (itemId) {
      const item = await getExpenseInboxItem(user.id, itemId);
      if (!item) {
        return privateJson(
          { error: "No encuentro esa factura del buzón." },
          { status: 404 },
        );
      }
      return privateJson({ alias, deliveryStatus, copyRecipient, item });
    }

    const items = await listExpenseInboxItems(user.id);
    return privateJson({
      alias,
      deliveryStatus,
      copyRecipient,
      items,
      pendingCount: items.filter((item) => item.status === "pending").length,
      errorCount: items.filter((item) => item.status === "error").length,
    });
  } catch (error) {
    return serverError(error);
  }
}
export async function PATCH(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson(
      { error: "Inicia sesión para actualizar el buzón de gastos." },
      { status: 401 },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_inbox_update",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  const bodyResult = await readJsonBody<{
    action?: unknown;
    id?: unknown;
    status?: unknown;
  }>(request, {
    maxBytes: 8 * 1024,
    invalidMessage: "Petición de buzón no válida.",
  });
  if (!bodyResult.ok) return withPrivateHeaders(bodyResult.response);

  try {
    const body = bodyResult.data;
    if (body.action === "rotate-alias") {
      const rotateRateLimit = await checkRateLimit(
        request,
        {
          namespace: "expense_inbox_rotate_alias",
          limit: 5,
          windowMs: 60 * 60_000,
        },
        user.id,
      );
      if (!rotateRateLimit.allowed) {
        return withPrivateHeaders(rateLimitExceededResponse(rotateRateLimit));
      }

      const access = await canUseExpenseInbox(user.id);
      if (!access.allowed) {
        return privateJson({ error: access.reason }, { status: 402 });
      }

      const alias = await rotateExpenseInboxAlias(user.id);
      const deliveryStatus = await getExpenseInboxDeliveryStatus();
      return privateJson({ alias, deliveryStatus });
    }

    if (body.action === "retry") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) {
        return privateJson(
          { error: "Falta el identificador de la factura." },
          { status: 400 },
        );
      }
      const retryRateLimit = await checkRateLimit(
        request,
        {
          namespace: "expense_inbox_retry",
          limit: 12,
          windowMs: 60 * 60_000,
        },
        user.id,
      );
      if (!retryRateLimit.allowed) {
        return withPrivateHeaders(rateLimitExceededResponse(retryRateLimit));
      }
      const item = await retryExpenseInboxItem({ userId: user.id, itemId: id });
      return privateJson({ item });
    }

    const id = typeof body.id === "string" ? body.id : "";
    const status =
      body.status === "processed" || body.status === "ignored"
        ? body.status
        : null;
    if (!id || !status) {
      return privateJson(
        { error: "Falta el identificador o el estado no es válido." },
        { status: 400 },
      );
    }

    await updateExpenseInboxItemStatus({
      userId: user.id,
      itemId: id,
      status,
    });

    return privateJson({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
