import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { rejectOversizedContentLength } from "@/lib/server/request-body";

function protectedResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization");
  return response;
}

/**
 * Contención deliberada: la ruta no contiene un camino de registro latente.
 * Solo podrá sustituirse por una implementación con autorización usuario↔NIF,
 * persistencia transaccional de registro+cadena e idempotencia fiscal servidor.
 */
export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return protectedResponse(
      NextResponse.json(
        { error: "Inicia sesión para registrar Veri*Factu" },
        { status: 401 },
      ),
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "verifactu_register",
      limit: 60,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return protectedResponse(rateLimitExceededResponse(rateLimit));
  }

  const oversized = rejectOversizedContentLength(
    request,
    1024,
    "La solicitud VeriFactu es demasiado grande.",
  );
  if (oversized) return protectedResponse(oversized);

  return protectedResponse(
    NextResponse.json(
      {
        error:
          "El registro VeriFactu no está habilitado hasta completar los controles fiscales de servidor.",
      },
      { status: 503 },
    ),
  );
}
