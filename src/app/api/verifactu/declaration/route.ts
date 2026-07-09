import { NextResponse } from "next/server";
import { buildDeclarationOfConformity } from "@/lib/verifactu/declaration";
import { isAeatSubmitConfigured } from "@/lib/verifactu/config";
import { getServerVerifactuEnvironment } from "@/lib/verifactu/config";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    namespace: "verifactu_declaration",
    limit: 120,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const declaration = buildDeclarationOfConformity();
  return NextResponse.json({
    declaration,
    server: {
      environment: getServerVerifactuEnvironment(),
      aeatSubmitConfigured: isAeatSubmitConfigured(),
    },
  });
}
