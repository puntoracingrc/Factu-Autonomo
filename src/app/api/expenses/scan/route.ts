import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import {
  consumeExpenseScan,
  getExpenseScanQuota,
} from "@/lib/billing/scan-usage-server";
import {
  extractExpenseFromImage,
  fileToBase64,
  resolveScanMimeType,
  validateScanFile,
} from "@/lib/expense-scan/openai";

export async function GET(request: Request) {
  if (!isBillingEnforced()) {
    const quota = await getExpenseScanQuota("dev");
    return NextResponse.json({ quota });
  }

  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para escanear gastos" }, { status: 401 });
  }

  const quota = await getExpenseScanQuota(user.id);
  return NextResponse.json({ quota });
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));

  if (isBillingEnforced() && !user) {
    return NextResponse.json(
      { error: "Crea una cuenta e inicia sesión para escanear facturas de gasto." },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo de la factura." }, { status: 400 });
  }

  const fileError = validateScanFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const userId = user?.id ?? "dev";
  const gate = await consumeExpenseScan(userId);
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
    return NextResponse.json({ error: result.error, quota: gate.quota }, { status: 422 });
  }

  return NextResponse.json({
    data: result.data,
    quota: gate.quota,
  });
}
