import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  canUseExpenseInbox,
  ensureExpenseInboxAlias,
  getExpenseInboxDeliveryStatus,
  getExpenseInboxItem,
  listExpenseInboxItems,
  rotateExpenseInboxAlias,
  updateExpenseInboxItemStatus,
} from "@/lib/expense-inbox-server";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

function serverError(error: unknown) {
  return NextResponse.json(
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
    return NextResponse.json(
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
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  try {
    const access = await canUseExpenseInbox(user.id);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 402 });
    }

    const url = new URL(request.url);
    const itemId = url.searchParams.get("id");
    const alias = await ensureExpenseInboxAlias(user.id);
    const deliveryStatus = await getExpenseInboxDeliveryStatus();

    if (itemId) {
      const item = await getExpenseInboxItem(user.id, itemId);
      if (!item) {
        return NextResponse.json(
          { error: "No encuentro esa factura del buzón." },
          { status: 404 },
        );
      }
      return NextResponse.json({ alias, deliveryStatus, item });
    }

    const items = await listExpenseInboxItems(user.id);
    return NextResponse.json({
      alias,
      deliveryStatus,
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
    return NextResponse.json(
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
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const bodyResult = await readJsonBody<{
      action?: unknown;
      id?: unknown;
      status?: unknown;
  }>(request, {
    maxBytes: 8 * 1024,
    invalidMessage: "Petición de buzón no válida.",
  });
  if (!bodyResult.ok) return bodyResult.response;

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
        return rateLimitExceededResponse(rotateRateLimit);
      }

      const access = await canUseExpenseInbox(user.id);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 402 });
      }

      const alias = await rotateExpenseInboxAlias(user.id);
      const deliveryStatus = await getExpenseInboxDeliveryStatus();
      return NextResponse.json({ alias, deliveryStatus });
    }

    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status === "ignored" ? "ignored" : "processed";
    if (!id) {
      return NextResponse.json(
        { error: "Falta el identificador." },
        { status: 400 },
      );
    }

    await updateExpenseInboxItemStatus({
      userId: user.id,
      itemId: id,
      status,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
