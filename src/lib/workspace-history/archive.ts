import { countersFromDocuments } from "@/lib/documents";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import { normalizeLoadedData } from "@/lib/storage";
import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";

export const CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE =
  "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_V1";

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const UTF8_ENCODER = new TextEncoder();

export type HistoricalWorkspaceDocumentKind =
  | "factura"
  | "factura_rectificativa";

export interface HistoricalWorkspaceArchiveDocument {
  localDocumentId: string;
  documentKind: HistoricalWorkspaceDocumentKind;
  contentHash: string;
  payload: Document;
}

export interface HistoricalWorkspaceArchiveManifest {
  schema: typeof CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE;
  archiveId: string;
  documentCount: number;
  manifestHash: string;
  documents: HistoricalWorkspaceArchiveDocument[];
}

export interface HistoricalWorkspaceArchiveMergeSummary {
  archiveId: string;
  manifestHash: string;
  documentCount: number;
  added: number;
  unchanged: number;
  centralKept: number;
}

export class HistoricalWorkspaceArchiveError extends Error {
  constructor(
    readonly code:
      | "EMPTY_ARCHIVE"
      | "INVALID_ARCHIVE"
      | "DOCUMENT_HASH_MISMATCH"
      | "MANIFEST_HASH_MISMATCH"
      | "LOCAL_DOCUMENT_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "HistoricalWorkspaceArchiveError";
  }
}

function cloneDocument(document: Document): Document {
  return JSON.parse(JSON.stringify(document)) as Document;
}

function documentKind(document: Document): HistoricalWorkspaceDocumentKind {
  return document.rectification ? "factura_rectificativa" : "factura";
}

function compareUtf8(left: string, right: string): number {
  const leftBytes = UTF8_ENCODER.encode(left);
  const rightBytes = UTF8_ENCODER.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.length - rightBytes.length;
}

export function historicalWorkspaceDocumentHash(document: Document): string {
  return `sha256:${sha256Hex(stableStringifySnapshot(document))}`;
}

function orderedManifestHash(
  documents: readonly Pick<
    HistoricalWorkspaceArchiveDocument,
    "localDocumentId" | "contentHash"
  >[],
): string {
  const lines = [...documents]
    .sort((left, right) =>
      compareUtf8(left.localDocumentId, right.localDocumentId),
    )
    .map((document) => `${document.localDocumentId}:${document.contentHash}`)
    .join("\n");
  return `sha256:${sha256Hex(lines)}`;
}

function isArchiveDocument(
  value: HistoricalWorkspaceArchiveDocument,
): boolean {
  return Boolean(
    value &&
      typeof value.localDocumentId === "string" &&
      value.localDocumentId.length >= 1 &&
      value.localDocumentId.length <= 200 &&
      (value.documentKind === "factura" ||
        value.documentKind === "factura_rectificativa") &&
      SHA256_PATTERN.test(value.contentHash) &&
      value.payload?.id === value.localDocumentId &&
      value.payload?.type === "factura" &&
      !value.payload.centralInvoiceAuthority &&
      documentKind(value.payload) === value.documentKind,
  );
}

export function historicalWorkspaceDocuments(
  documents: readonly Document[],
): Document[] {
  return documents.filter(
    (document) =>
      document.type === "factura" && !document.centralInvoiceAuthority,
  );
}

export function buildHistoricalWorkspaceArchive(
  documents: readonly Document[],
  archiveId = crypto.randomUUID(),
): HistoricalWorkspaceArchiveManifest {
  const entries = historicalWorkspaceDocuments(documents)
    .map((document): HistoricalWorkspaceArchiveDocument => {
      const payload = cloneDocument(document);
      return {
        localDocumentId: payload.id,
        documentKind: documentKind(payload),
        contentHash: historicalWorkspaceDocumentHash(payload),
        payload,
      };
    })
    .sort((left, right) =>
      compareUtf8(left.localDocumentId, right.localDocumentId),
    );
  if (entries.length === 0) {
    throw new HistoricalWorkspaceArchiveError(
      "EMPTY_ARCHIVE",
      "No hay facturas históricas locales que preparar.",
    );
  }
  if (
    new Set(entries.map((entry) => entry.localDocumentId)).size !==
    entries.length
  ) {
    throw new HistoricalWorkspaceArchiveError(
      "INVALID_ARCHIVE",
      "La copia local contiene identificadores de factura repetidos.",
    );
  }

  return {
    schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE,
    archiveId,
    documentCount: entries.length,
    manifestHash: orderedManifestHash(entries),
    documents: entries,
  };
}

export function verifyHistoricalWorkspaceArchive(input: {
  archiveId: string;
  documentCount: number;
  manifestHash: string;
  documents: HistoricalWorkspaceArchiveDocument[];
}): HistoricalWorkspaceArchiveManifest {
  if (
    !input.archiveId ||
    !Number.isInteger(input.documentCount) ||
    input.documentCount < 1 ||
    input.documentCount > 10_000 ||
    !SHA256_PATTERN.test(input.manifestHash) ||
    input.documents.length !== input.documentCount ||
    new Set(input.documents.map((entry) => entry.localDocumentId)).size !==
      input.documents.length ||
    input.documents.some((entry) => !isArchiveDocument(entry))
  ) {
    throw new HistoricalWorkspaceArchiveError(
      "INVALID_ARCHIVE",
      "La recuperación histórica no tiene una estructura válida.",
    );
  }

  const documents = [...input.documents].sort((left, right) =>
    compareUtf8(left.localDocumentId, right.localDocumentId),
  );
  for (const entry of documents) {
    if (historicalWorkspaceDocumentHash(entry.payload) !== entry.contentHash) {
      throw new HistoricalWorkspaceArchiveError(
        "DOCUMENT_HASH_MISMATCH",
        `La factura histórica ${entry.payload.number} no coincide con su huella.`,
      );
    }
  }
  if (orderedManifestHash(documents) !== input.manifestHash) {
    throw new HistoricalWorkspaceArchiveError(
      "MANIFEST_HASH_MISMATCH",
      "La copia histórica completa no coincide con su huella.",
    );
  }

  return {
    schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE,
    archiveId: input.archiveId,
    documentCount: input.documentCount,
    manifestHash: input.manifestHash,
    documents,
  };
}

function fiscalIdentity(document: Document): string {
  return `${document.rectification ? "rectification" : "invoice"}:${document.number
    .trim()
    .toUpperCase()}`;
}

export function mergeHistoricalWorkspaceArchive(
  current: AppData,
  input: Parameters<typeof verifyHistoricalWorkspaceArchive>[0],
): { data: AppData; value: HistoricalWorkspaceArchiveMergeSummary } {
  const archive = verifyHistoricalWorkspaceArchive(input);
  const normalizedArchive = normalizeLoadedData({
    ...EMPTY_DATA,
    profile: current.profile,
    snapshotIntegrityVersion: 1,
    documents: archive.documents.map((entry) => entry.payload),
  }).documents;
  if (
    normalizedArchive.length !== archive.documentCount ||
    new Set(normalizedArchive.map((document) => document.id)).size !==
      archive.documentCount
  ) {
    throw new HistoricalWorkspaceArchiveError(
      "INVALID_ARCHIVE",
      "No se pudieron normalizar todas las facturas históricas.",
    );
  }

  const documents = [...current.documents];
  const byId = new Map(documents.map((document, index) => [document.id, index]));
  const centralByFiscalIdentity = new Map(
    documents
      .filter((document) => Boolean(document.centralInvoiceAuthority))
      .map((document) => [fiscalIdentity(document), document] as const),
  );
  let added = 0;
  let unchanged = 0;
  let centralKept = 0;

  for (const incoming of normalizedArchive) {
    const sameIdIndex = byId.get(incoming.id);
    if (sameIdIndex !== undefined) {
      const existing = documents[sameIdIndex]!;
      if (existing.centralInvoiceAuthority) {
        centralKept += 1;
        continue;
      }
      if (
        stableStringifySnapshot(existing) !== stableStringifySnapshot(incoming)
      ) {
        throw new HistoricalWorkspaceArchiveError(
          "LOCAL_DOCUMENT_CONFLICT",
          `La factura local ${incoming.number} cambió y no se ha reemplazado.`,
        );
      }
      unchanged += 1;
      continue;
    }

    if (centralByFiscalIdentity.has(fiscalIdentity(incoming))) {
      centralKept += 1;
      continue;
    }
    byId.set(incoming.id, documents.length);
    documents.push(incoming);
    added += 1;
  }

  const normalized = normalizeLoadedData({
    ...current,
    snapshotIntegrityVersion: 1,
    documents,
  });
  const calculatedCounters = countersFromDocuments(
    normalized.documents,
    normalized.profile.numbering.year,
    normalized.profile.numbering,
  );
  const data: AppData = {
    ...normalized,
    historicalWorkspaceArchiveReceipt: {
      schema: "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_RECEIPT_V1",
      archiveId: archive.archiveId,
      manifestHash: archive.manifestHash,
      documentCount: archive.documentCount,
      appliedAt: new Date().toISOString(),
    },
    counters: {
      factura: Math.max(current.counters.factura, calculatedCounters.factura),
      factura_rectificativa: Math.max(
        current.counters.factura_rectificativa,
        calculatedCounters.factura_rectificativa,
      ),
      presupuesto: Math.max(
        current.counters.presupuesto,
        calculatedCounters.presupuesto,
      ),
      recibo: Math.max(current.counters.recibo, calculatedCounters.recibo),
    },
  };

  return {
    data,
    value: {
      archiveId: archive.archiveId,
      manifestHash: archive.manifestHash,
      documentCount: archive.documentCount,
      added,
      unchanged,
      centralKept,
    },
  };
}
