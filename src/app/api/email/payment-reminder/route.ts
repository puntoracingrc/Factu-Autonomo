import { NextResponse } from "next/server";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import { sendPaymentReminderEmail } from "@/lib/email/send-payment-reminder";
import type { BusinessProfile, Document } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE },
      { status: 401 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, skipped: true, error: "Email no configurado" },
      { status: 503 },
    );
  }

  let body: {
    doc?: Document;
    profile?: BusinessProfile;
    message?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.doc || !body.profile) {
    return NextResponse.json(
      { error: "Faltan datos de la factura o del perfil" },
      { status: 400 },
    );
  }

  const result = await sendPaymentReminderEmail({
    doc: body.doc,
    profile: body.profile,
    message: body.message ?? "",
  });

  if (result.skipped) {
    return NextResponse.json(
      { ok: false, skipped: true, error: result.error },
      { status: 503 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "No se pudo enviar" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, emailId: result.emailId });
}
