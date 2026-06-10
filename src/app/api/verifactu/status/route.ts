import { NextResponse } from "next/server";
import { isAeatSubmitConfigured, getServerVerifactuEnvironment } from "@/lib/verifactu/config";
import { VERIFACTU_SOFTWARE } from "@/lib/verifactu/constants";

export async function GET() {
  return NextResponse.json({
    software: VERIFACTU_SOFTWARE,
    environment: getServerVerifactuEnvironment(),
    aeatSubmitConfigured: isAeatSubmitConfigured(),
    qrHosts: {
      test: "https://prewww2.aeat.es",
      production: "https://www2.agenciatributaria.gob.es",
    },
  });
}
