import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { submitRegistroToAeat } from "@/lib/verifactu/aeat-submit";
import {
  getVerifactuEnvironment,
  normalizeVerifactuSettings,
} from "@/lib/verifactu/eligibility";
import { registerDocumentVerifactu, resolveChainState } from "@/lib/verifactu/register";
import {
  findVerifactuRecordByDocument,
  loadVerifactuChain,
  persistVerifactuRecord,
  upsertVerifactuChain,
} from "@/lib/verifactu/server-db";
import type { BusinessProfile, Document, VerifactuChainState } from "@/lib/types";

interface RegisterBody {
  document: Document;
  profile: Pick<BusinessProfile, "nif" | "verifactu">;
  chain?: VerifactuChainState | null;
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para registrar Veri*Factu" }, { status: 401 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const profile: BusinessProfile = {
    name: "",
    nif: body.profile.nif ?? "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    iva: { rates: [21], defaultRate: 21 },
    numbering: {
      year: new Date().getFullYear(),
      lastSequence: {
        factura: 0,
        factura_rectificativa: 0,
        presupuesto: 0,
        recibo: 0,
      },
      formats: {
        factura: { template: "F-{year}-{num}", padding: 4 },
        factura_rectificativa: { template: "FR-{year}-{num}", padding: 4 },
        presupuesto: { template: "P-{year}-{num}", padding: 4 },
        recibo: { template: "R-{year}-{num}", padding: 4 },
      },
    },
    verifactu: normalizeVerifactuSettings(body.profile.verifactu),
  };

  const doc = body.document;

  if (doc.type !== "factura" || doc.status === "borrador" || !profile.nif?.trim()) {
    return NextResponse.json(
      { error: "Este documento no requiere registro Veri*Factu" },
      { status: 422 },
    );
  }

  const existing = await findVerifactuRecordByDocument({
    userId: user.id,
    documentId: doc.id,
  });
  if (existing) {
    return NextResponse.json({
      verifactu: existing.verifactu,
      chain: existing.chain,
      persisted: true,
      aeatOk: true,
      duplicate: true,
    });
  }

  const serverChain = await loadVerifactuChain({
    userId: user.id,
    issuerNif: profile.nif.trim().toUpperCase(),
  });

  const chain = resolveChainState(profile, serverChain ?? body.chain ?? null);

  let result = await registerDocumentVerifactu({
    doc,
    profile,
    chain,
  });

  if (!result) {
    return NextResponse.json({ error: "No se pudo generar el registro" }, { status: 422 });
  }

  const aeat = await submitRegistroToAeat({
    xml: result.xml,
    environment: getVerifactuEnvironment(profile),
  });

  if (aeat.ok && aeat.csv) {
    result = {
      ...result,
      verifactu: {
        ...result.verifactu,
        csv: aeat.csv,
        status:
          getVerifactuEnvironment(profile) === "test"
            ? "test_registered"
            : "registered",
      },
    };
  } else if (!aeat.ok) {
    result = {
      ...result,
      verifactu: {
        ...result.verifactu,
        status: "failed",
        errorMessage: aeat.errorMessage,
      },
    };
  }

  const persistedRecord = await persistVerifactuRecord({
    userId: user.id,
    documentId: doc.id,
    issuerNif: profile.nif,
    numserie: doc.number,
    verifactu: result.verifactu,
    xml: result.xml,
    aeatResponse: aeat.rawResponse,
  });

  const persistedChain = await upsertVerifactuChain({
    userId: user.id,
    chain: result.chain,
  });

  return NextResponse.json({
    verifactu: result.verifactu,
    chain: result.chain,
    xml: result.xml,
    persisted: persistedRecord && persistedChain,
    aeatOk: aeat.ok,
  });
}
