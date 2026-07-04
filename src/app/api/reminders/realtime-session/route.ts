import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { resolveEffectivePlan } from "@/lib/billing/subscription";

const OPENAI_REALTIME_CLIENT_SECRETS_URL =
  "https://api.openai.com/v1/realtime/client_secrets";

function realtimeTranscriptionModel(): string {
  return (
    process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL?.trim() ||
    "gpt-realtime-whisper"
  );
}

function safetyIdentifier(userId: string): string {
  return createHash("sha256")
    .update(`factura-autonomo:reminders:${userId}`)
    .digest("hex");
}

async function canUseReminderVoice(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  if (!isBillingEnforced()) return { allowed: true };

  const subscription = await fetchUserSubscriptionServer(userId);
  const plan: PlanId = resolveEffectivePlan(subscription);
  if (!getPlanLimits(plan).aiTextAutofill) {
    return {
      allowed: false,
      reason: "La voz IA para recordatorios requiere plan Pro.",
    };
  }

  return { allowed: true };
}

function readClientSecret(payload: unknown): {
  value?: string;
  expiresAt?: number;
} {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const nested =
    record.client_secret && typeof record.client_secret === "object"
      ? (record.client_secret as Record<string, unknown>)
      : null;

  const value =
    typeof record.value === "string"
      ? record.value
      : typeof nested?.value === "string"
        ? nested.value
        : undefined;
  const expiresAt =
    typeof record.expires_at === "number"
      ? record.expires_at
      : typeof nested?.expires_at === "number"
        ? nested.expires_at
        : undefined;

  return { value, expiresAt };
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });

  if (isBillingEnforced() && !user) {
    return NextResponse.json(
      { error: "Inicia sesión con una cuenta Pro para usar voz IA." },
      { status: 401 },
    );
  }

  const userId = user?.id ?? "dev";
  const gate = await canUseReminderVoice(userId);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 402 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "La voz IA no está configurada en el servidor." },
      { status: 503 },
    );
  }

  const model = realtimeTranscriptionModel();
  const openaiResponse = await fetch(OPENAI_REALTIME_CLIENT_SECRETS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": safetyIdentifier(userId),
    },
    body: JSON.stringify({
      session: {
        type: "transcription",
        audio: {
          input: {
            transcription: {
              model,
              language: "es",
              delay: "low",
            },
          },
        },
      },
    }),
  });

  const payload = (await openaiResponse.json().catch(() => null)) as unknown;
  if (!openaiResponse.ok) {
    return NextResponse.json(
      { error: "No se pudo iniciar la voz IA. Inténtalo de nuevo." },
      { status: 502 },
    );
  }

  const clientSecret = readClientSecret(payload);
  if (!clientSecret.value) {
    return NextResponse.json(
      { error: "OpenAI no devolvió una sesión de voz válida." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    clientSecret: clientSecret.value,
    expiresAt: clientSecret.expiresAt,
    model,
  });
}
