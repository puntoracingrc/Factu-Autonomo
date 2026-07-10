import { NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

type CspReportValue = string | number | boolean | null;

const SAFE_REPORT_KEYS = [
  "blocked-uri",
  "column-number",
  "disposition",
  "document-uri",
  "effective-directive",
  "line-number",
  "original-policy",
  "referrer",
  "script-sample",
  "source-file",
  "status-code",
  "violated-directive",
] as const;

export const runtime = "nodejs";

function sanitizeReportValue(value: unknown): CspReportValue | undefined {
  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (value === null) return null;
  return undefined;
}

function sanitizeCspReport(body: unknown): Record<string, CspReportValue> | null {
  if (!body || typeof body !== "object") return null;
  const maybeReport =
    "csp-report" in body && typeof body["csp-report"] === "object"
      ? body["csp-report"]
      : body;
  if (!maybeReport || typeof maybeReport !== "object") return null;

  const report: Record<string, CspReportValue> = {};
  for (const key of SAFE_REPORT_KEYS) {
    const value = sanitizeReportValue(
      (maybeReport as Record<string, unknown>)[key],
    );
    if (value !== undefined) report[key] = value;
  }

  return Object.keys(report).length > 0 ? report : null;
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    namespace: "security_csp_report",
    limit: 120,
    windowMs: 10 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const bodyResult = await readJsonBody(request, {
    maxBytes: 32 * 1024,
    invalidMessage: "Informe CSP no válido.",
    tooLargeMessage: "El informe CSP es demasiado grande.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const report = sanitizeCspReport(bodyResult.data);
  if (!report) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (process.env.SECURITY_CSP_REPORT_LOGGING !== "false") {
    console.warn("security_csp_report", report);
  }

  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
