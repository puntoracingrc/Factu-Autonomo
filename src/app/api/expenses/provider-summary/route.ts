import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { parseProviderInvoiceSummaryText } from "@/lib/provider-summary-expenses";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";

async function extractPdfText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: "expenses_provider_summary",
    limit: 8,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Sube un PDF o texto con el resumen del proveedor." },
      { status: 400 },
    );
  }

  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json(
      { error: "El archivo es demasiado grande para importar este resumen." },
      { status: 413 },
    );
  }

  const text =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      ? await extractPdfText(file)
      : await file.text();
  const parsed = parseProviderInvoiceSummaryText(text);

  return NextResponse.json({
    fileName: file.name,
    providerName: parsed.providerName,
    rows: parsed.rows,
    warnings: parsed.warnings,
  });
}
