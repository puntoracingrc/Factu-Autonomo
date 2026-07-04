import { NextResponse } from "next/server";
import { Webhook } from "svix";
import {
  ingestExpenseInboxEmail,
  ingestResendExpenseInboxEmail,
} from "@/lib/expense-inbox-server";

function expectedSecret(): string {
  return process.env.EXPENSE_INBOX_WEBHOOK_SECRET?.trim() ?? "";
}

function expectedResendSecret(): string {
  return (
    process.env.RESEND_WEBHOOK_SECRET?.trim() ||
    process.env.EXPENSE_INBOX_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

function requestSecret(request: Request): string {
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  return (
    bearer ||
    request.headers.get("x-expense-inbox-secret")?.trim() ||
    request.headers.get("x-webhook-secret")?.trim() ||
    ""
  );
}

function hasResendSignature(request: Request): boolean {
  return Boolean(
    request.headers.get("svix-id") ||
      request.headers.get("svix-timestamp") ||
      request.headers.get("svix-signature"),
  );
}

function verifyResendPayload(request: Request, rawBody: string): unknown {
  const secret = expectedResendSecret();
  if (!secret) throw new Error("Webhook de Resend sin secreto configurado.");

  const webhook = new Webhook(secret);
  return webhook.verify(rawBody, {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  });
}

function isResendReceivedEvent(payload: unknown): boolean {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      (payload as { type?: unknown }).type === "email.received",
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: unknown;
  if (hasResendSignature(request)) {
    try {
      payload = verifyResendPayload(request, rawBody);
    } catch {
      return NextResponse.json({ error: "Webhook no válido." }, { status: 401 });
    }
  } else {
    const secret = expectedSecret();
    if (!secret || requestSecret(request) !== secret) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload no válido." }, { status: 400 });
    }
  }

  try {
    const result = isResendReceivedEvent(payload)
      ? await ingestResendExpenseInboxEmail(payload)
      : await ingestExpenseInboxEmail(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el email.",
      },
      { status: 500 },
    );
  }
}
