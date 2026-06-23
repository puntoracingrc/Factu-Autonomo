import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscription } from "@/lib/billing/repository";
import { consumeCustomerAiAutofill } from "@/lib/billing/scan-usage-server";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import { enrichCustomerPostalCode } from "@/lib/customer-ai/geocoding";
import { extractCustomerFromText } from "@/lib/customer-ai/openai";

async function canUseCustomerAi(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  if (!isBillingEnforced()) return { allowed: true };

  const subscription = await fetchUserSubscription(userId);
  const plan: PlanId = resolveEffectivePlan(subscription);
  if (!getPlanLimits(plan).aiTextAutofill) {
    return {
      allowed: false,
      reason:
        "El autorrelleno con IA requiere plan Pro. Ve a Precios para activarlo.",
    };
  }

  return { allowed: true };
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));

  if (isBillingEnforced() && !user) {
    return NextResponse.json(
      { error: "Crea una cuenta e inicia sesión para usar el autorrelleno IA." },
      { status: 401 },
    );
  }

  const gate = user ? await canUseCustomerAi(user.id) : { allowed: true };
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 402 });
  }

  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (text.length < 10) {
    return NextResponse.json(
      { error: "Pega al menos una línea con datos de facturación." },
      { status: 400 },
    );
  }

  if (text.length > 4000) {
    return NextResponse.json(
      { error: "El texto es demasiado largo. Usa como máximo 4.000 caracteres." },
      { status: 400 },
    );
  }

  const userId = user?.id ?? "dev";
  const usage = await consumeCustomerAiAutofill(userId);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, quota: usage.quota },
      { status: 402 },
    );
  }

  const result = await extractCustomerFromText(text);
  if (result.error) {
    return NextResponse.json(
      { error: result.error, quota: usage.quota },
      { status: 422 },
    );
  }

  const data = result.data
    ? await enrichCustomerPostalCode(result.data)
    : undefined;

  return NextResponse.json({ data, quota: usage.quota });
}
