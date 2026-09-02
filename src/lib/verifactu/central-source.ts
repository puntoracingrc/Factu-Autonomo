import { createHash } from "node:crypto";

import {
  hashDocumentSnapshot,
  inspectDocumentSnapshotsIntegrity,
} from "@/lib/document-integrity/snapshots";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
  type DocumentSnapshot,
} from "@/lib/types";
import { documentAmounts } from "@/lib/vat-regime";

import { computeDocumentRecordHash } from "./record-input";
import { buildQrUrl, normalizeIssuerNif } from "./qr";
import { formatAeatRecordTimestamp } from "./timestamp";
import { resolveTipoFactura } from "./tipo-factura";
import { buildRegistroFacturacionXml } from "./xml";

export interface CentralInvoiceVerifactuSource {
  centralDocumentId: string;
  centralIdentityId: string;
  centralKind: "invoice" | "rectification";
  environment: "test";
  localDocumentId: string;
  issuerNif: string;
  fullNumber: string;
  centralIssuedAt: string;
  emittedSnapshot: unknown;
  emittedHash: string;
}

export interface CentralVerifactuChainHead {
  lastHash: string;
  lastNumserie: string | null;
  lastFechaExpedicion: string | null;
  recordCount: number;
  stateVersion: number;
}

export interface CentralVerifactuRecordCandidate {
  issuerNif: string;
  recordType: "alta";
  recordHash: string;
  previousHash: string;
  previousNumserie: string | null;
  previousFechaExpedicion: string | null;
  recordTimestamp: string;
  numserie: string;
  fechaExpedicion: string;
  tipoFactura: string;
  xml: string;
  xmlSha256: string;
  qrUrl: string;
}

export class CentralVerifactuSourceError extends Error {
  constructor(
    readonly code:
      | "SOURCE_INVALID"
      | "SOURCE_IDENTITY_MISMATCH"
      | "SOURCE_SNAPSHOT_INVALID"
      | "SOURCE_TOTALS_MISMATCH",
  ) {
    super(code);
    this.name = "CentralVerifactuSourceError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalSnapshot(value: unknown): DocumentSnapshot {
  if (!isObject(value)) {
    throw new CentralVerifactuSourceError("SOURCE_SNAPSHOT_INVALID");
  }
  try {
    const snapshot = value as unknown as DocumentSnapshot;
    const withMaterializedHash: DocumentSnapshot = {
      ...snapshot,
      snapshotHash: hashDocumentSnapshot(snapshot),
    };
    const integrity = inspectDocumentSnapshotsIntegrity(
      { documentSnapshot: withMaterializedHash },
      { requireDocumentSnapshot: true },
    );
    if (!integrity.ok) {
      throw new CentralVerifactuSourceError("SOURCE_SNAPSHOT_INVALID");
    }
    return withMaterializedHash;
  } catch (error) {
    if (error instanceof CentralVerifactuSourceError) throw error;
    throw new CentralVerifactuSourceError("SOURCE_SNAPSHOT_INVALID");
  }
}

function documentAndProfileFromSource(source: CentralInvoiceVerifactuSource): {
  document: Document;
  profile: BusinessProfile;
  snapshot: DocumentSnapshot;
} {
  const snapshot = canonicalSnapshot(source.emittedSnapshot);
  let sourceNif: string;
  let snapshotNif: string;
  try {
    sourceNif = normalizeIssuerNif(source.issuerNif);
    snapshotNif = normalizeIssuerNif(snapshot.issuer.nif);
  } catch {
    throw new CentralVerifactuSourceError("SOURCE_IDENTITY_MISMATCH");
  }
  const expectsRectification = source.centralKind === "rectification";
  if (
    source.environment !== "test" ||
    snapshot.documentType !== "factura" ||
    snapshot.number !== source.fullNumber ||
    snapshotNif !== sourceNif ||
    Boolean(snapshot.rectification) !== expectsRectification ||
    snapshot.documentKind !==
      (expectsRectification ? "factura_rectificativa" : "factura")
  ) {
    throw new CentralVerifactuSourceError("SOURCE_IDENTITY_MISMATCH");
  }

  const document: Document = {
    id: source.localDocumentId,
    type: "factura",
    number: snapshot.number,
    date: snapshot.date,
    dueDate: snapshot.dueDate,
    client: { ...snapshot.customer },
    items: snapshot.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
    })),
    notes: snapshot.notes,
    salesTerms: snapshot.salesTerms,
    paymentTerms: snapshot.paymentTerms,
    status: "enviado",
    issuer: { ...snapshot.issuer },
    rectification: snapshot.rectification
      ? {
          ...snapshot.rectification,
          ...(snapshot.rectification.originalAmounts
            ? {
                originalAmounts: {
                  ...snapshot.rectification.originalAmounts,
                },
              }
            : {}),
        }
      : undefined,
    documentSnapshot: snapshot,
    createdAt: source.centralIssuedAt,
    updatedAt: source.centralIssuedAt,
  };
  const profile: BusinessProfile = {
    ...DEFAULT_PROFILE,
    ...snapshot.issuer,
    iva: {
      rates: [...snapshot.fiscalContext.iva.rates],
      defaultRate: snapshot.fiscalContext.iva.defaultRate,
    },
    vatExempt: snapshot.fiscalContext.vatExempt,
    verifactu: { enabled: true, environment: "test", optInVersion: 1 },
  };
  const calculated = documentAmounts(
    document,
    snapshot.fiscalContext.vatExempt,
  );
  if (
    Math.abs(calculated.subtotal - snapshot.taxSummary.subtotal) > 0.001 ||
    Math.abs(calculated.iva - snapshot.taxSummary.iva) > 0.001 ||
    Math.abs(calculated.total - snapshot.taxSummary.total) > 0.001
  ) {
    throw new CentralVerifactuSourceError("SOURCE_TOTALS_MISMATCH");
  }
  return { document, profile, snapshot };
}

export async function buildCentralVerifactuRecordCandidate(input: {
  source: CentralInvoiceVerifactuSource;
  chain: CentralVerifactuChainHead | null;
  now?: Date;
}): Promise<CentralVerifactuRecordCandidate> {
  const { document, profile, snapshot } = documentAndProfileFromSource(
    input.source,
  );
  const previousHash = input.chain?.lastHash ?? "";
  const recordTimestamp = formatAeatRecordTimestamp(input.now ?? new Date());
  const recordHash = await computeDocumentRecordHash({
    doc: document,
    profile,
    recordType: "alta",
    previousHash,
    recordTimestamp,
  });
  const tipoFactura = resolveTipoFactura(document);
  const xml = buildRegistroFacturacionXml({
    doc: document,
    profile,
    issuerNif: input.source.issuerNif,
    numserie: document.number,
    fecha: document.date,
    importe: snapshot.taxSummary.total,
    cuotaTotal: snapshot.taxSummary.iva,
    tipoFactura,
    recordType: "alta",
    recordHash,
    previousHash,
    previousNumSerie: input.chain?.lastNumserie ?? undefined,
    previousFechaExpedicion:
      input.chain?.lastFechaExpedicion ?? undefined,
    recordTimestamp,
    vatExempt: snapshot.fiscalContext.vatExempt,
  });

  return {
    issuerNif: normalizeIssuerNif(input.source.issuerNif),
    recordType: "alta",
    recordHash,
    previousHash,
    previousNumserie: input.chain?.lastNumserie ?? null,
    previousFechaExpedicion: input.chain?.lastFechaExpedicion ?? null,
    recordTimestamp,
    numserie: document.number,
    fechaExpedicion: document.date,
    tipoFactura,
    xml,
    xmlSha256: createHash("sha256").update(xml, "utf8").digest("hex"),
    qrUrl: buildQrUrl({
      nif: input.source.issuerNif,
      numserie: document.number,
      fecha: document.date,
      importe: snapshot.taxSummary.total,
      environment: "test",
    }),
  };
}
