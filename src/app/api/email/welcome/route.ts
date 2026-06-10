import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email/config";
import { sendWelcomeEmailForUser } from "@/lib/email/welcome";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, skipped: true, error: "Email no configurado" },
      { status: 503 },
    );
  }

  let body: { userId?: string; email?: string; recipientName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const email = body.email?.trim();

  if (!userId || !email) {
    return NextResponse.json(
      { error: "userId y email son obligatorios" },
      { status: 400 },
    );
  }

  const result = await sendWelcomeEmailForUser({
    userId,
    email,
    recipientName: body.recipientName?.trim(),
  });

  if (!result.ok && !result.skipped) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "No se pudo enviar" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped ?? false,
  });
}
