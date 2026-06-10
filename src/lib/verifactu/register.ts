import type { BusinessProfile, Document } from "../types";
import { GENESIS_HASH } from "./constants";
import { normalizeHuellaAnterior } from "./hash";
import {
  documentTotalForVerifactu,
  getVerifactuEnvironment,
  initialChainState,
  needsVerifactuRegistration,
  verifactuRecordType,
} from "./eligibility";
import { buildQrUrl } from "./qr";
import { computeDocumentRecordHash } from "./record-input";
import { formatAeatRecordTimestamp } from "./timestamp";
import { resolveTipoFactura } from "./tipo-factura";
import type {
  VerifactuChainState,
  VerifactuInfo,
  VerifactuRegisterResult,
} from "./types";
import { buildRegistroFacturacionXml } from "./xml";
import { documentAmounts, isVatExempt } from "../vat-regime";
import { formatQrAmount } from "./qr";

function generateTestCsv(numserie: string): string {
  const suffix = numserie.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase();
  return `A-TEST${suffix.padStart(8, "0").slice(0, 8)}`;
}

function normalizeChainHash(hash: string | null | undefined): string {
  const normalized = normalizeHuellaAnterior(hash);
  return normalized ?? "";
}

export function resolveChainState(
  profile: BusinessProfile,
  chain?: VerifactuChainState | null,
): VerifactuChainState {
  if (!profile.nif?.trim()) {
    return { issuerNif: "", lastHash: "", recordCount: 0 };
  }
  const base = initialChainState(profile);
  if (!chain) return base;
  if (chain.issuerNif !== base.issuerNif) return base;
  return {
    issuerNif: chain.issuerNif,
    lastHash: normalizeChainHash(
      chain.lastHash === GENESIS_HASH ? "" : chain.lastHash,
    ),
    recordCount: chain.recordCount ?? 0,
  };
}

export async function registerDocumentVerifactu(input: {
  doc: Document;
  profile: BusinessProfile;
  chain?: VerifactuChainState | null;
  csv?: string;
  status?: VerifactuInfo["status"];
}): Promise<VerifactuRegisterResult | null> {
  const { doc, profile } = input;
  if (!needsVerifactuRegistration(doc, profile)) return null;

  const environment = getVerifactuEnvironment(profile);
  const chain = resolveChainState(profile, input.chain);
  const recordType = verifactuRecordType(doc);
  const importe = documentTotalForVerifactu(doc, profile);
  const recordTimestamp = formatAeatRecordTimestamp();
  const previousHash = normalizeHuellaAnterior(chain.lastHash);

  const recordHash = await computeDocumentRecordHash({
    doc,
    profile,
    recordType,
    previousHash,
    recordTimestamp,
  });

  const qrUrl = buildQrUrl({
    nif: profile.nif,
    numserie: doc.number,
    fecha: doc.date,
    importe,
    environment,
  });

  const csv = input.csv ?? generateTestCsv(doc.number);
  const status =
    input.status ??
    (environment === "test" ? "test_registered" : "registered");

  const vatExempt = isVatExempt(profile);
  const amounts = documentAmounts(doc, vatExempt);

  const verifactu: VerifactuInfo = {
    recordHash,
    previousHash: chain.lastHash,
    recordTimestamp,
    qrUrl,
    csv,
    status,
    recordType,
    environment,
    submittedAt: new Date().toISOString(),
    tipoFactura: resolveTipoFactura(doc),
    cuotaTotal: formatQrAmount(amounts.iva),
    importeTotal: formatQrAmount(amounts.total),
  };

  const xml = buildRegistroFacturacionXml({
    issuerNif: profile.nif,
    numserie: doc.number,
    fecha: doc.date,
    importe: amounts.total,
    cuotaTotal: amounts.iva,
    tipoFactura: verifactu.tipoFactura ?? "F1",
    recordType,
    recordHash,
    previousHash: chain.lastHash,
    recordTimestamp,
    csv,
  });

  return {
    verifactu,
    xml,
    chain: {
      issuerNif: chain.issuerNif,
      lastHash: recordHash,
      recordCount: chain.recordCount + 1,
    },
  };
}

export async function applyVerifactuToDocuments(input: {
  documents: Document[];
  profile: BusinessProfile;
  chain?: VerifactuChainState | null;
}): Promise<{ documents: Document[]; chain: VerifactuChainState | null }> {
  let chain = resolveChainState(input.profile, input.chain);
  const documents = [...input.documents];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!needsVerifactuRegistration(doc, input.profile)) continue;

    const result = await registerDocumentVerifactu({
      doc,
      profile: input.profile,
      chain,
    });
    if (!result) continue;

    documents[i] = { ...doc, verifactu: result.verifactu };
    chain = result.chain;
  }

  return {
    documents,
    chain: chain.recordCount > 0 ? chain : input.chain ?? null,
  };
}
