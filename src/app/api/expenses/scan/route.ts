import { NextResponse } from "next/server";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { isAdminUser } from "@/lib/admin/access";
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
} from "@/lib/expense-scan/openai";
import {
  resolveScanMimeType,
  validateScanFile,
} from "@/lib/expense-scan/file-validation";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { validateRequestBodySize } from "@/lib/server/request-body";

export const runtime = "nodejs";

const EXPENSE_SCAN_RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const USER_EXPENSE_SCAN_RATE_LIMIT = 20;
const ADMIN_EXPENSE_SCAN_RATE_LIMIT = 300;

function expenseScanRateLimitPolicy(adminUser: boolean) {
  return {
    namespace: adminUser ? "admin_expenses_scan" : "expenses_scan",
    limit: adminUser ? ADMIN_EXPENSE_SCAN_RATE_LIMIT : USER_EXPENSE_SCAN_RATE_LIMIT,
    windowMs: EXPENSE_SCAN_RATE_LIMIT_WINDOW_MS,
  };
}

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
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_scan_quota",
      limit: 180,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

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
  const rateLimit = await checkRateLimit(
    request,
    expenseScanRateLimitPolicy(Boolean(user && isAdminUser(user))),
    user?.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const oversized = await validateRequestBodySize(
    request,
    4.25 * 1024 * 1024,
    "El archivo supera el límite seguro de subida.",
  );
  if (oversized) return oversized;

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
