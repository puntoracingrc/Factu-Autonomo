import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import {
  ingestExpenseInboxEmail,
  ingestResendExpenseInboxEmail,
} from "@/lib/expense-inbox-server";
import { ExpenseInboxDownloadError } from "@/lib/expense-inbox-download";
import { readTextBody } from "@/lib/server/request-body";

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

function secretsEqual(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
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

function logInboundFailure(error: unknown): void {
  if (error instanceof ExpenseInboxDownloadError) {
    console.error("expense_inbox_inbound_failed", {
      failure: error.failure,
      providerStatus: error.providerStatus,
      providerHostname: error.providerHostname,
    });
    return;
  }

  console.error("expense_inbox_inbound_failed", {
    failure: "processing_error",
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}

export async function POST(request: Request) {
  const bodyResult = await readTextBody(request, {
    maxBytes: 4 * 1024 * 1024,
    invalidMessage: "Payload no válido.",
    tooLargeMessage: "El webhook de correo es demasiado grande.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const rawBody = bodyResult.data;

  let payload: unknown;
  if (hasResendSignature(request)) {
    try {
      payload = verifyResendPayload(request, rawBody);
    } catch {
      return NextResponse.json({ error: "Webhook no válido." }, { status: 401 });
    }
  } else {
    const secret = expectedSecret();
    if (!secret || !secretsEqual(requestSecret(request), secret)) {
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
    logInboundFailure(error);
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
