import { NextResponse } from "next/server";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import {
  buildScanQuota,
  UNLIMITED_AI_CREDIT_UNITS,
} from "@/lib/billing/scan-limits";
import {
  consumeExpenseScan,
  getExpenseScanQuota,
} from "@/lib/billing/scan-usage-server";
import { currentMonthKey } from "@/lib/billing/usage";
import {
  extractExpenseFromImage,
  fileToBase64,
  resolveScanMimeType,
  validateScanFile,
} from "@/lib/expense-scan/openai";

function buildAiLearningTestQuota() {
  return buildScanQuota(
    "pro_plus",
    0,
    0,
    currentMonthKey(),
    0,
    0,
    UNLIMITED_AI_CREDIT_UNITS,
  );
}

function hasAiLearningScanAccess(email?: string | null): boolean {
  return aiLearningAccountForEmail(email).allowed;
}

export async function GET(request: Request) {
  if (!isBillingEnforced()) {
    const quota = await getExpenseScanQuota("dev");
    return NextResponse.json({ quota });
  }

  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json(
      { error: "Inicia sesión para escanear gastos" },
      { status: 401 },
    );
  }

  if (hasAiLearningScanAccess(user.email)) {
    return NextResponse.json({ quota: buildAiLearningTestQuota() });
  }

  const quota = await getExpenseScanQuota(user.id);
  return NextResponse.json({ quota });
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });

  if (isBillingEnforced() && !user) {
    return NextResponse.json(
      {
        error:
          "Crea una cuenta e inicia sesión para escanear facturas de gasto.",
      },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo de la factura." },
      { status: 400 },
    );
  }

  const fileError = validateScanFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const userId = user?.id ?? "dev";
  const gate =
    user && hasAiLearningScanAccess(user.email)
      ? { allowed: true, quota: buildAiLearningTestQuota() }
      : await consumeExpenseScan(userId);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: gate.reason, quota: gate.quota },
      { status: gate.blockedByQuota ? 402 : 503 },
    );
  }

  const base64 = await fileToBase64(file);
  const result = await extractExpenseFromImage(
    base64,
    resolveScanMimeType(file),
  );
  if (result.error) {
    return NextResponse.json(
      { error: result.error, quota: gate.quota },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: result.data,
    quota: gate.quota,
  });
}
