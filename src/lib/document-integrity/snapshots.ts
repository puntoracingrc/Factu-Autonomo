import { roundMoney, lineIva, lineSubtotal } from "@/lib/calculations";
import { normalizeDocumentTemplate } from "@/lib/document-templates";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import { documentAmounts } from "@/lib/vat-regime";
import type {
  BusinessProfile,
  Client,
  Document,
  DocumentKind,
  DocumentPdfSnapshot,
  DocumentSnapshot,
  DocumentSnapshotSource,
  FiscalContextSnapshot,
  IssuerSnapshot,
  LineItem,
  LineItemSnapshot,
  NumberingSnapshot,
  RectificationInfo,
  TaxRateSummarySnapshot,
  TaxSummarySnapshot,
  VerifactuInfo,
} from "@/lib/types";

export const DOCUMENT_SNAPSHOT_SCHEMA_VERSION = 1;
export const DOCUMENT_PDF_SNAPSHOT_SCHEMA_VERSION = 1;
export const DOCUMENT_PDF_RENDERER_VERSION = "document-pdf-renderer-v1";

type JsonRecord = Record<string, unknown>;

function nowIso(now: Date | string = new Date()): string {
  return typeof now === "string" ? now : now.toISOString();
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    return Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .reduce<JsonRecord>((acc, key) => {
        acc[key] = stableNormalize(record[key]);
        return acc;
      }, {});
  }

  return value;
}

export function stableStringifySnapshot(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function hashStableValue(value: unknown): string {
  const input = stableStringifySnapshot(value);
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function documentKindForSnapshot(doc: Pick<Document, "type" | "rectification">): DocumentKind {
  if (doc.type === "factura" && doc.rectification) return "factura_rectificativa";
  return doc.type;
}

function snapshotLineItems(items: LineItem[], vatExempt: boolean): LineItemSnapshot[] {
  return items.map((item) => {
    const subtotal = roundMoney(lineSubtotal(item));
    const ivaAmount = vatExempt ? 0 : roundMoney(lineIva(item));
    const total = roundMoney(subtotal + ivaAmount);

    return {
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
      subtotal,
      ivaAmount,
      total,
    };
  });
}

function snapshotTaxSummary(
  doc: Pick<Document, "items">,
  vatExempt: boolean,
): TaxSummarySnapshot {
  const amounts = documentAmounts(doc, vatExempt);
  const byRate = new Map<number, TaxRateSummarySnapshot>();

  for (const item of doc.items) {
    const ivaPercent = vatExempt ? 0 : item.ivaPercent;
    const subtotal = roundMoney(lineSubtotal(item));
    const ivaAmount = vatExempt ? 0 : roundMoney(lineIva(item));
    const previous =
      byRate.get(ivaPercent) ??
      ({
        ivaPercent,
        taxableBase: 0,
        ivaAmount: 0,
        total: 0,
      } satisfies TaxRateSummarySnapshot);

    byRate.set(ivaPercent, {
      ivaPercent,
      taxableBase: roundMoney(previous.taxableBase + subtotal),
      ivaAmount: roundMoney(previous.ivaAmount + ivaAmount),
      total: roundMoney(previous.total + subtotal + ivaAmount),
    });
  }

  return {
    subtotal: roundMoney(amounts.subtotal),
    iva: roundMoney(amounts.iva),
    total: roundMoney(amounts.total),
    vatExempt,
    byRate: Array.from(byRate.values()).sort(
      (left, right) => left.ivaPercent - right.ivaPercent,
    ),
  };
}

function snapshotNumbering(
  doc: Pick<Document, "number" | "date" | "type" | "rectification">,
  profile: BusinessProfile,
): NumberingSnapshot {
  const documentKind = documentKindForSnapshot(doc);
  return {
    documentKind,
    number: doc.number,
    year: new Date(doc.date).getFullYear(),
    format: { ...profile.numbering.formats[documentKind] },
  };
}

function snapshotFiscalContext(profile: BusinessProfile): FiscalContextSnapshot {
  return {
    vatExempt: Boolean(profile.vatExempt),
    iva: {
      rates: [...profile.iva.rates],
      defaultRate: profile.iva.defaultRate,
    },
    ...(profile.verifactu ? { verifactu: { ...profile.verifactu } } : {}),
  };
}

function cloneClient(client: Client): Client {
  return { ...client };
}

function cloneIssuer(issuer: IssuerSnapshot): IssuerSnapshot {
  return { ...issuer };
}

function cloneRectification(
  rectification: RectificationInfo | undefined,
): RectificationInfo | undefined {
  return rectification ? { ...rectification } : undefined;
}

function cloneVerifactu(verifactu: VerifactuInfo | undefined): VerifactuInfo | undefined {
  return verifactu ? { ...verifactu } : undefined;
}

function documentSnapshotHashPayload(
  snapshot: Omit<DocumentSnapshot, "snapshotHash"> & {
    snapshotHash?: string;
  },
): unknown {
  const content = { ...snapshot } as JsonRecord;
  delete content.capturedAt;
  delete content.source;
  delete content.snapshotHash;

  const issuerContent = { ...snapshot.issuer } as JsonRecord;
  delete issuerContent.capturedAt;

  return {
    ...content,
    issuer: issuerContent,
    items: snapshot.items.map((item) => {
      const itemContent = { ...item } as JsonRecord;
      delete itemContent.id;
      return itemContent;
    }),
  };
}

export function hashDocumentSnapshot(
  snapshot: Omit<DocumentSnapshot, "snapshotHash"> & {
    snapshotHash?: string;
  },
): string {
  return hashStableValue(documentSnapshotHashPayload(snapshot));
}

export function hashDocumentPdfSnapshot(
  snapshot: Omit<DocumentPdfSnapshot, "contentHash"> & {
    contentHash?: string;
    documentSnapshotHash: string;
  },
): string {
  const content = { ...snapshot } as JsonRecord;
  delete content.renderedAt;
  delete content.contentHash;
  return hashStableValue(content);
}

export interface BuildDocumentSnapshotOptions {
  capturedAt?: Date | string;
  source?: DocumentSnapshotSource;
  issuer?: IssuerSnapshot;
}

export function buildDocumentSnapshot(
  doc: Document,
  profile: BusinessProfile,
  options: BuildDocumentSnapshotOptions = {},
): DocumentSnapshot {
  const capturedAt = nowIso(options.capturedAt);
  const issuer =
    options.issuer ?? doc.issuer ?? captureIssuerSnapshot(profile, capturedAt);
  const vatExempt = Boolean(profile.vatExempt);
  const rectification = cloneRectification(doc.rectification);
  const verifactu = cloneVerifactu(doc.verifactu);

  const snapshotWithoutHash: Omit<DocumentSnapshot, "snapshotHash"> = {
    schemaVersion: DOCUMENT_SNAPSHOT_SCHEMA_VERSION,
    capturedAt,
    source: options.source ?? "issue",
    documentType: doc.type,
    documentKind: documentKindForSnapshot(doc),
    number: doc.number,
    date: doc.date,
    ...(doc.dueDate ? { dueDate: doc.dueDate } : {}),
    issuer: cloneIssuer(issuer),
    customer: cloneClient(doc.client),
    items: snapshotLineItems(doc.items, vatExempt),
    taxSummary: snapshotTaxSummary(doc, vatExempt),
    currency: "EUR",
    ...(doc.paymentTerms ? { paymentTerms: doc.paymentTerms } : {}),
    ...(doc.notes ? { notes: doc.notes } : {}),
    ...(rectification ? { rectification } : {}),
    numbering: snapshotNumbering(doc, profile),
    fiscalContext: snapshotFiscalContext(profile),
    ...(verifactu ? { verifactu } : {}),
  };

  return {
    ...snapshotWithoutHash,
    snapshotHash: hashDocumentSnapshot(snapshotWithoutHash),
  };
}

export function buildDocumentPdfSnapshot(
  documentSnapshot: DocumentSnapshot,
  profile: BusinessProfile,
  renderedAt: Date | string = new Date(),
): DocumentPdfSnapshot {
  const renderedAtIso = nowIso(renderedAt);
  const template = normalizeDocumentTemplate(profile.documentTemplate);
  const contentHash = hashDocumentPdfSnapshot({
    schemaVersion: DOCUMENT_PDF_SNAPSHOT_SCHEMA_VERSION,
    renderedAt: renderedAtIso,
    rendererVersion: DOCUMENT_PDF_RENDERER_VERSION,
    template,
    documentSnapshotHash: documentSnapshot.snapshotHash,
  });

  return {
    schemaVersion: DOCUMENT_PDF_SNAPSHOT_SCHEMA_VERSION,
    renderedAt: renderedAtIso,
    rendererVersion: DOCUMENT_PDF_RENDERER_VERSION,
    template,
    contentHash,
  };
}

export function hasDocumentSnapshot(
  doc: Document,
): doc is Document & { documentSnapshot: DocumentSnapshot } {
  return Boolean(doc.documentSnapshot);
}

export function getDocumentSnapshotSource(
  doc: Document,
): DocumentSnapshotSource | undefined {
  return doc.documentSnapshot?.source;
}

export function deriveLegacySnapshotForReadOnly(
  doc: Document,
  profile: BusinessProfile,
  capturedAt: Date | string = doc.issuedAt ?? doc.updatedAt,
): DocumentSnapshot {
  if (doc.documentSnapshot) return doc.documentSnapshot;
  return buildDocumentSnapshot(doc, profile, {
    capturedAt,
    source: "legacy_backfill",
    issuer: doc.issuer ?? captureIssuerSnapshot(profile, nowIso(capturedAt)),
  });
}
