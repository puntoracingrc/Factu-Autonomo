import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import {
  consumeExpenseScan,
  getExpenseScanQuota,
} from "@/lib/billing/scan-usage-server";
import {
  buildUnlimitedAiQuota,
  hasUnlimitedAiAccess,
  unlimitedAiUsageResult,
} from "@/lib/billing/unlimited-ai-access";
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
import { isAiRouteAuthenticationRequired } from "@/lib/server/ai-route-auth-policy";
import { validateRequestBodySize } from "@/lib/server/request-body";

export const runtime = "nodejs";

const EXPENSE_SCAN_RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const USER_EXPENSE_SCAN_RATE_LIMIT = 20;
const ADMIN_EXPENSE_SCAN_RATE_LIMIT = 300;

function expenseScanRateLimitPolicy(adminUser: boolean) {
  return {
    namespace: adminUser ? "admin_expenses_scan" : "expenses_scan",
    limit: adminUser
      ? ADMIN_EXPENSE_SCAN_RATE_LIMIT
      : USER_EXPENSE_SCAN_RATE_LIMIT,
    windowMs: EXPENSE_SCAN_RATE_LIMIT_WINDOW_MS,
  };
}

export async function GET(request: Request) {
  if (!isAiRouteAuthenticationRequired(request)) {
    const quota = await getExpenseScanQuota("dev");
    return NextResponse.json({ quota });
  }

  const auth = await getCompanyRouteAuthFromBearer(
    request.headers.get("authorization"),
    request.headers.get(FACTU_COMPANY_HEADER),
  );
  if (!auth) {
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
    auth.actorUserId,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  if (hasUnlimitedAiAccess({ email: auth.userEmail ?? undefined })) {
    return NextResponse.json({ quota: buildUnlimitedAiQuota() });
  }

  const quota = await getExpenseScanQuota(auth.billingUserId);
  return NextResponse.json({ quota });
}

export async function POST(request: Request) {
  const auth = await getCompanyRouteAuthFromBearer(
    request.headers.get("authorization"),
    request.headers.get(FACTU_COMPANY_HEADER),
  );

  if (isAiRouteAuthenticationRequired(request) && !auth) {
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
    expenseScanRateLimitPolicy(Boolean(auth && isAdminEmail(auth.userEmail))),
    auth?.actorUserId,
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

  const userId = auth?.billingUserId ?? "dev";
  const gate =
    auth && hasUnlimitedAiAccess({ email: auth.userEmail ?? undefined })
      ? unlimitedAiUsageResult()
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
      {
        error: result.error,
        code: result.errorCode,
        quota: gate.quota,
      },
      { status: result.errorCode === "SCAN_SERVICE_UNAVAILABLE" ? 503 : 422 },
    );
  }

  return NextResponse.json({
    data: result.data,
    quota: gate.quota,
  });
}
