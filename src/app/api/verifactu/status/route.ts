import { NextResponse } from "next/server";
import {
  getAeatCertificateChannel,
  getServerVerifactuEnvironment,
  getVerifactuCertificateConfig,
  isAeatSubmitConfigured,
} from "@/lib/verifactu/config";
import { VERIFACTU_SOFTWARE } from "@/lib/verifactu/constants";
import { getProducerConfigStatus } from "@/lib/verifactu/producer-config";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: "verifactu_status",
    limit: 120,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const certificateConfigured = getVerifactuCertificateConfig() !== null;
  const aeatSubmitRequested = process.env.VERIFACTU_AEAT_SUBMIT === "true";

  return NextResponse.json({
    software: VERIFACTU_SOFTWARE,
    environment: getServerVerifactuEnvironment(),
    aeatSubmitRequested,
    aeatSubmitConfigured: isAeatSubmitConfigured(),
    certificateConfigured,
    certificateChannel: getAeatCertificateChannel(),
    producerConfig: getProducerConfigStatus(),
    qrHosts: {
      test: "https://prewww2.aeat.es",
      production: "https://www2.agenciatributaria.gob.es",
    },
  });
}
