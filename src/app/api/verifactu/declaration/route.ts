import { NextResponse } from "next/server";
import { buildDeclarationOfConformity } from "@/lib/verifactu/declaration";
import { isAeatSubmitConfigured } from "@/lib/verifactu/config";
import { getServerVerifactuEnvironment } from "@/lib/verifactu/config";

export async function GET() {
  const declaration = buildDeclarationOfConformity();
  return NextResponse.json({
    declaration,
    server: {
      environment: getServerVerifactuEnvironment(),
      aeatSubmitConfigured: isAeatSubmitConfigured(),
    },
  });
}
