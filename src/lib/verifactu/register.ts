import { resolveIssuerNif } from "../issuer-snapshot";
import type { BusinessProfile, Document } from "../types";
import { GENESIS_HASH } from "./constants";
import { normalizeHuellaAnterior } from "./hash";
import {
  documentTotalForVerifactu,
  getVerifactuEnvironment,
  initialChainState,
  needsVerifactuRegistration,
  normalizeVerifactuSettings,
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
import { buildCanonicalDocumentForProtectedEffect } from "../document-integrity/pdf-source";
import {
  assertDocumentSnapshotsIntegrity,
  attachRegisteredVerifactuToSnapshots,
} from "../document-integrity";

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
  const lastHash = normalizeChainHash(
    chain.lastHash === GENESIS_HASH ? "" : chain.lastHash,
  );
  if (!Number.isSafeInteger(chain.recordCount) || chain.recordCount < 0) {
    throw new Error("El contador de la cadena VeriFactu no es válido");
  }
  if (
    lastHash &&
    (!chain.lastNumSerie?.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(chain.lastFechaExpedicion?.trim() ?? "") ||
      chain.recordCount < 1)
  ) {
    throw new Error("La cadena VeriFactu persistida está incompleta");
  }
  if (!lastHash && chain.recordCount !== 0) {
    throw new Error("La cadena VeriFactu persistida no contiene su última huella");
  }
  return {
    issuerNif: chain.issuerNif,
    lastHash,
    lastNumSerie: chain.lastNumSerie,
    lastFechaExpedicion: chain.lastFechaExpedicion,
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
  const requestedProfile = input.profile;
  if (
    input.doc.documentSnapshot ||
    input.doc.pdfSnapshot ||
    input.doc.snapshotSeal ||
    input.doc.snapshotIntegrityRequired
  ) {
    assertDocumentSnapshotsIntegrity(input.doc, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
      requireSnapshotSeal: true,
    });
  }
  const doc = buildCanonicalDocumentForProtectedEffect(
    input.doc,
    requestedProfile,
  );
  const snapshot = doc.documentSnapshot;
  const profile: BusinessProfile = snapshot
    ? {
        ...requestedProfile,
        name: snapshot.issuer.name,
        nif: snapshot.issuer.nif,
        vatExempt: snapshot.fiscalContext.vatExempt,
        verifactu: normalizeVerifactuSettings(
          snapshot.fiscalContext.verifactu,
        ),
      }
    : requestedProfile;
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

  const issuerNif = resolveIssuerNif(doc, profile);

  const qrUrl = buildQrUrl({
    nif: issuerNif,
    numserie: doc.number,
    fecha: doc.date,
    importe,
    environment,
  });

  const csv = input.csv;
  const status =
    input.status ??
    (environment === "test" ? "test_registered" : "registered");

  const vatExempt = isVatExempt(profile);
  const amounts = documentAmounts(doc, vatExempt);
  const chainNumSerie =
    recordType === "anulacion" && doc.rectification
      ? doc.rectification.originalNumber
      : doc.number;
  const chainFechaExpedicion =
    recordType === "anulacion" && doc.rectification
      ? doc.rectification.originalDate
      : doc.date;

  const verifactu: VerifactuInfo = {
    recordHash,
    previousHash: chain.lastHash,
    recordTimestamp,
    qrUrl,
    ...(csv ? { csv } : {}),
    status,
    recordType,
    environment,
    submittedAt: new Date().toISOString(),
    tipoFactura: resolveTipoFactura(doc),
    cuotaTotal: formatQrAmount(amounts.iva),
    importeTotal: formatQrAmount(amounts.total),
  };

  const xml = buildRegistroFacturacionXml({
    doc,
    profile,
    issuerNif: issuerNif,
    numserie: chainNumSerie,
    fecha: chainFechaExpedicion,
    importe: amounts.total,
    cuotaTotal: amounts.iva,
    tipoFactura: verifactu.tipoFactura ?? "F1",
    recordType,
    recordHash,
    previousHash: chain.lastHash,
    previousNumSerie: chain.lastNumSerie,
    previousFechaExpedicion: chain.lastFechaExpedicion,
    recordTimestamp,
    vatExempt,
  });

  return {
    verifactu,
    xml,
    chain: {
      issuerNif: chain.issuerNif,
      lastHash: recordHash,
      lastNumSerie: chainNumSerie,
      lastFechaExpedicion: chainFechaExpedicion,
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
    const canonicalDocument = buildCanonicalDocumentForProtectedEffect(
      doc,
      input.profile,
    );

    const result = await registerDocumentVerifactu({
      doc: canonicalDocument,
      profile: input.profile,
      chain,
    });
    if (!result) continue;

    documents[i] = attachRegisteredVerifactuToSnapshots({
      ...canonicalDocument,
      verifactu: result.verifactu,
      verifactuPersistence: "simulation",
    });
    chain = result.chain;
  }

  return {
    documents,
    chain: chain.recordCount > 0 ? chain : input.chain ?? null,
  };
}
