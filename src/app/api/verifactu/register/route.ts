import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  ensureCloudDeviceAccess,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import {
  CentralVerifactuSubmissionError,
  submitCentralInvoiceToAeatPreproduction,
} from "@/lib/verifactu/central-submission-service";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Authorization, X-Factu-Device-Token",
} as const;

function protectedResponse<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  return protectedResponse(NextResponse.json(body, init));
}

function parseLocalDocumentId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).length !== 1 ||
    typeof body.localDocumentId !== "string"
  ) {
    return null;
  }
  const id = body.localDocumentId;
  return id && id === id.trim() && id.length <= 200 ? id : null;
}

function submissionErrorResponse(
  error: CentralVerifactuSubmissionError,
): NextResponse {
  switch (error.code) {
    case "INVALID_REQUEST":
      return privateJson(
        { error: "Documento VeriFactu no válido." },
        { status: 400 },
      );
    case "PREPRODUCTION_DISABLED":
      return privateJson(
        { error: "La prueba de preproducción no está habilitada." },
        { status: 503 },
      );
    case "PRODUCER_CONFIG_INCOMPLETE":
      return privateJson(
        { error: "Faltan datos obligatorios del productor del software." },
        { status: 503 },
      );
    case "CERTIFICATE_UNAVAILABLE":
      return privateJson(
        {
          error:
            "No hay un certificado de pruebas activo para esta empresa y NIF.",
        },
        { status: 409 },
      );
    case "XML_PREFLIGHT_FAILED":
      return privateJson(
        { error: "El registro no superó la validación oficial previa." },
        { status: 422 },
      );
    case "ATTEMPT_MISMATCH":
      return privateJson(
        { error: "El envío se detuvo por una discrepancia interna segura." },
        { status: 409 },
      );
    case "LEDGER_FAILURE":
      return privateJson(
        { error: "No se pudo confirmar el estado fiscal en el servidor." },
        { status: 503 },
      );
  }
}

export async function POST(request: Request) {
  const identity = await getUserSessionFromBearer(
    request.headers.get("authorization"),
    { requireEmailConfirmed: true },
  );
  if (!identity) {
    return privateJson(
      { error: "Inicia sesión para registrar VeriFactu." },
      { status: 401 },
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "verifactu_register",
      limit: 5,
      windowMs: 10 * 60_000,
    },
    identity.user.id,
  );
  if (!rateLimit.allowed) {
    return protectedResponse(rateLimitExceededResponse(rateLimit));
  }

  const deviceToken = normalizeCloudDeviceToken(
    request.headers.get("x-factu-device-token"),
  );
  if (!deviceToken) {
    return privateJson(
      { error: "Identificador de dispositivo no válido." },
      { status: 400 },
    );
  }

  try {
    const deviceAccess = await ensureCloudDeviceAccess({
      userId: identity.user.id,
      sessionId: identity.sessionId,
      token: deviceToken,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    if (!deviceAccess.allowed) {
      return privateJson(
        { error: deviceAccess.message, code: deviceAccess.reason },
        { status: 403 },
      );
    }
  } catch {
    return privateJson(
      { error: "No se pudo verificar este dispositivo." },
      { status: 503 },
    );
  }

  const body = await readJsonBody(request, {
    maxBytes: MAX_BODY_BYTES,
    invalidMessage: "Solicitud VeriFactu no válida.",
    tooLargeMessage: "La solicitud VeriFactu es demasiado grande.",
  });
  if (!body.ok) return protectedResponse(body.response);

  const localDocumentId = parseLocalDocumentId(body.data);
  if (!localDocumentId) {
    return privateJson(
      { error: "Solicitud VeriFactu no válida." },
      { status: 400 },
    );
  }

  try {
    const result = await submitCentralInvoiceToAeatPreproduction({
      userId: identity.user.id,
      localDocumentId,
    });
    const status = result.ok
      ? 200
      : result.status === "in_progress" ||
          result.status === "delivery_unknown"
        ? 202
        : 422;
    return privateJson(result, { status });
  } catch (error) {
    if (error instanceof CentralVerifactuSubmissionError) {
      return submissionErrorResponse(error);
    }
    return privateJson(
      { error: "No se pudo completar la prueba VeriFactu." },
      { status: 503 },
    );
  }
}
