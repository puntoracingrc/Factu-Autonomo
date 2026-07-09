import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { isEmailConfigured } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

interface DeleteMfaFactorBody {
  factorId?: unknown;
  confirmationEmail?: unknown;
  recoveryCode?: unknown;
}

interface AdminMfaFactorLike {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
  created_at?: string;
  updated_at?: string;
  last_challenged_at?: string;
}

interface MfaRecoveryChallengeRow {
  id: string;
  user_id: string;
  code_hash: string;
  attempts: number | null;
  expires_at: string;
  used_at: string | null;
}

interface DatabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

const RECOVERY_CODE_TTL_MS = 15 * 60 * 1000;
const MAX_RECOVERY_CODE_ATTEMPTS = 5;

function errorText(error: DatabaseErrorLike): string {
  return [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingRecoveryTable(error: DatabaseErrorLike): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    errorText(error).includes("admin_mfa_recovery_challenges") &&
      /schema cache|does not exist|not find/i.test(error.message ?? "")
  );
}

function codeHash(userId: string, code: string): string {
  const salt =
    process.env.SERVER_RATE_LIMIT_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "facturacion-autonomos";
  return createHash("sha256")
    .update(`${salt}:${userId}:${code}`)
    .digest("hex");
}

function generateRecoveryCode(): string {
  return String(randomInt(100000, 1000000));
}

function safeCode(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, "") : "";
}

function hashEquals(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function recoveryEmailContent(input: {
  email: string;
  code: string;
  expiresAt: string;
}) {
  const expiresLabel = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(input.expiresAt));
  const subject = "Código para recuperar el doble factor";
  const text = [
    "Has pedido ayuda para recuperar el acceso con doble factor en Factu.",
    "",
    `Código: ${input.code}`,
    `Caduca: ${expiresLabel}`,
    "",
    "Si no has pedido esta ayuda, no compartas este código.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <p>Has pedido ayuda para recuperar el acceso con doble factor en Factu.</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${input.code}</p>
      <p>Caduca: ${expiresLabel}</p>
      <p style="color:#64748b">Si no has pedido esta ayuda, no compartas este código.</p>
    </div>
  `;

  return { subject, text, html };
}

function safeFactor(factor: AdminMfaFactorLike) {
  return {
    id: factor.id,
    type: factor.factor_type,
    status: factor.status,
    friendlyName: factor.friendly_name ?? null,
    createdAt: factor.created_at ?? null,
    updatedAt: factor.updated_at ?? null,
    lastChallengedAt: factor.last_challenged_at ?? null,
  };
}

function mfaRequiredResponse() {
  return NextResponse.json(
    {
      code: "admin_mfa_required",
      error: "Verificacion en dos pasos requerida para recuperar MFA.",
    },
    {
      status: 403,
      headers: { "X-Admin-MFA-Required": "1" },
    },
  );
}

async function getTargetUser(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return { user: null, error };
  return { user: data.user, error: null };
}

async function checkAdminMfaRouteAccess(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return { ok: false as const, response: access.response };
  if (access.mfa.currentLevel !== "aal2") {
    return { ok: false as const, response: mfaRequiredResponse() };
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_user_mfa",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return {
      ok: false as const,
      response: rateLimitExceededResponse(rateLimit),
    };
  }

  return { ok: true as const, user: access.user };
}

async function logMfaRecoveryEvent(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  input: {
    targetUserId: string;
    targetEmail: string | null;
    adminUserId: string;
    factor: ReturnType<typeof safeFactor>;
  },
) {
  try {
    await admin.from("app_error_events").insert({
      user_id: input.targetUserId,
      severity: "warning",
      area: "admin_security",
      code: "admin_mfa_factor_deleted",
      message: `Admin elimino un factor MFA de ${input.targetEmail ?? input.targetUserId}.`,
      route: "/admin",
      metadata: {
        adminUserId: input.adminUserId,
        targetUserId: input.targetUserId,
        targetEmail: input.targetEmail,
        factorId: input.factor.id,
        factorType: input.factor.type,
        factorStatus: input.factor.status,
      },
    });
  } catch {
    // La recuperacion no debe fallar si el registro operativo no esta disponible.
  }
}

async function latestRecoveryChallenge(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
): Promise<MfaRecoveryChallengeRow | null> {
  const result = await admin
    .from("admin_mfa_recovery_challenges")
    .select("id,user_id,code_hash,attempts,expires_at,used_at")
    .eq("user_id", userId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (result.error) return null;
  return ((result.data ?? []) as MfaRecoveryChallengeRow[])[0] ?? null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const access = await checkAdminMfaRouteAccess(request);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const { userId } = await params;
  const target = await getTargetUser(admin, userId);
  if (!target.user) {
    return NextResponse.json(
      { error: target.error?.message ?? "Usuario no encontrado" },
      { status: 404 },
    );
  }

  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    email: target.user.email ?? null,
    factors: (data.factors as AdminMfaFactorLike[]).map(safeFactor),
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const access = await checkAdminMfaRouteAccess(request);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email no configurado para enviar códigos" },
      { status: 503 },
    );
  }

  const { userId } = await params;
  const target = await getTargetUser(admin, userId);
  if (!target.user) {
    return NextResponse.json(
      { error: target.error?.message ?? "Usuario no encontrado" },
      { status: 404 },
    );
  }

  const email = target.user.email?.trim();
  if (!email) {
    return NextResponse.json(
      { error: "El usuario no tiene email verificable" },
      { status: 400 },
    );
  }

  const code = generateRecoveryCode();
  const expiresAt = new Date(Date.now() + RECOVERY_CODE_TTL_MS).toISOString();
  const { data, error } = await admin
    .from("admin_mfa_recovery_challenges")
    .insert({
      user_id: userId,
      created_by: access.user.id,
      expires_at: expiresAt,
      code_hash: codeHash(userId, code),
      email,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error && isMissingRecoveryTable(error)) {
      return NextResponse.json(
        { error: "Migración de recuperación MFA pendiente" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: error?.message ?? "No se pudo preparar el código" },
      { status: 500 },
    );
  }

  const content = recoveryEmailContent({ email, code, expiresAt });
  const sent = await sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (!sent.ok) {
    await admin
      .from("admin_mfa_recovery_challenges")
      .update({ used_at: new Date().toISOString() })
      .eq("id", String((data as { id: string }).id));
    return NextResponse.json(
      { error: sent.error ?? "No se pudo enviar el código" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, email, expiresAt });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const access = await checkAdminMfaRouteAccess(request);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const { userId } = await params;
  const body = (await request.json()) as DeleteMfaFactorBody;
  const factorId = typeof body.factorId === "string" ? body.factorId.trim() : "";
  const recoveryCode = safeCode(body.recoveryCode);
  const confirmationEmail =
    typeof body.confirmationEmail === "string"
      ? body.confirmationEmail.trim().toLowerCase()
      : "";

  if (!factorId) {
    return NextResponse.json({ error: "Factor requerido" }, { status: 400 });
  }

  const target = await getTargetUser(admin, userId);
  if (!target.user) {
    return NextResponse.json(
      { error: target.error?.message ?? "Usuario no encontrado" },
      { status: 404 },
    );
  }

  const targetEmail = target.user.email?.trim().toLowerCase() ?? "";
  if (!targetEmail || confirmationEmail !== targetEmail) {
    return NextResponse.json(
      { error: "Confirmación de email incorrecta" },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(recoveryCode)) {
    return NextResponse.json(
      { error: "Código de recuperación inválido" },
      { status: 400 },
    );
  }

  const challenge = await latestRecoveryChallenge(admin, userId);
  if (!challenge) {
    return NextResponse.json(
      { error: "Código de recuperación caducado o inexistente" },
      { status: 400 },
    );
  }

  const attempts = Math.max(0, Number(challenge.attempts ?? 0));
  if (attempts >= MAX_RECOVERY_CODE_ATTEMPTS) {
    return NextResponse.json(
      { error: "Demasiados intentos con este código" },
      { status: 429 },
    );
  }

  if (!hashEquals(challenge.code_hash, codeHash(userId, recoveryCode))) {
    await admin
      .from("admin_mfa_recovery_challenges")
      .update({ attempts: attempts + 1 })
      .eq("id", challenge.id);
    return NextResponse.json(
      { error: "Código de recuperación incorrecto" },
      { status: 400 },
    );
  }

  const listed = await admin.auth.admin.mfa.listFactors({ userId });
  if (listed.error) {
    return NextResponse.json({ error: listed.error.message }, { status: 500 });
  }

  const factor = (listed.data.factors as AdminMfaFactorLike[]).find(
    (item) => item.id === factorId,
  );
  if (!factor) {
    return NextResponse.json({ error: "Factor no encontrado" }, { status: 404 });
  }

  const { error } = await admin.auth.admin.mfa.deleteFactor({
    id: factorId,
    userId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logMfaRecoveryEvent(admin, {
    targetUserId: userId,
    targetEmail: target.user.email ?? null,
    adminUserId: access.user.id,
    factor: safeFactor(factor),
  });
  await admin
    .from("admin_mfa_recovery_challenges")
    .update({ used_at: new Date().toISOString() })
    .eq("id", challenge.id);

  return NextResponse.json({ ok: true });
}
