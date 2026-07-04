import { documentAmounts } from "@/lib/vat-regime";
import {
  deriveDocumentLifecycle,
  isDocumentIntegrityLocked,
} from "@/lib/document-integrity";
import {
  deriveLegacySnapshotForReadOnly,
} from "@/lib/document-integrity/snapshots";
import { normalizeDocumentTemplate } from "@/lib/document-templates";
import { resolveIssuerForDocument, type IssuerProfile } from "@/lib/issuer-snapshot";
import type {
  BusinessProfile,
  Document,
  DocumentPdfSnapshot,
  DocumentSnapshot,
  DocumentTemplateSettings,
  LineItem,
  LineItemSnapshot,
  TaxSummarySnapshot,
} from "@/lib/types";

export type DocumentPdfSourceKind =
  | "live"
  | "snapshot"
  | "snapshot_without_pdf_settings"
  | "legacy_read_only";

export interface DocumentPdfLineView extends LineItem {
  subtotal?: number;
  ivaAmount?: number;
  total?: number;
}

export interface DocumentPdfViewModel {
  source: DocumentPdfSourceKind;
  doc: Document;
  issuer: IssuerProfile;
  items: DocumentPdfLineView[];
  taxSummary?: TaxSummarySnapshot;
  template: DocumentTemplateSettings;
  vatExempt: boolean;
  logoUrl?: string;
  documentSnapshot?: DocumentSnapshot;
  pdfSnapshot?: DocumentPdfSnapshot;
  hasOriginalDocumentSnapshot: boolean;
  hasOriginalPdfSnapshot: boolean;
}

function cloneTaxSummary(summary: TaxSummarySnapshot): TaxSummarySnapshot {
  return {
    ...summary,
    byRate: summary.byRate.map((row) => ({ ...row })),
  };
}

function lineFromSnapshot(item: LineItemSnapshot): DocumentPdfLineView {
  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    ivaPercent: item.ivaPercent,
    subtotal: item.subtotal,
    ivaAmount: item.ivaAmount,
    total: item.total,
  };
}

function docFromSnapshot(
  base: Document,
  snapshot: DocumentSnapshot,
  issuer: IssuerProfile,
): Document {
  return {
    ...base,
    type: snapshot.documentType,
    number: snapshot.number,
    date: snapshot.date,
    dueDate: snapshot.dueDate,
    client: { ...snapshot.customer },
    items: snapshot.items.map(lineFromSnapshot),
    notes: snapshot.notes,
    paymentTerms: snapshot.paymentTerms,
    issuer: {
      ...snapshot.issuer,
      commercialName: issuer.commercialName,
      website: issuer.website,
    },
    rectification: snapshot.rectification
      ? { ...snapshot.rectification }
      : undefined,
    verifactu: snapshot.verifactu ? { ...snapshot.verifactu } : undefined,
  };
}

function issuerFromSnapshot(
  snapshot: DocumentSnapshot,
  profile: BusinessProfile,
): IssuerProfile {
  return {
    commercialName:
      snapshot.issuer.commercialName?.trim() ||
      profile.commercialName?.trim() ||
      undefined,
    name: snapshot.issuer.name,
    nif: snapshot.issuer.nif,
    vatId: snapshot.issuer.vatId,
    address: snapshot.issuer.address,
    city: snapshot.issuer.city,
    postalCode: snapshot.issuer.postalCode,
    province: snapshot.issuer.province,
    country: snapshot.issuer.country,
    phone: snapshot.issuer.phone,
    email: snapshot.issuer.email,
    website:
      snapshot.issuer.website?.trim() ||
      profile.website?.trim() ||
      undefined,
    iban: snapshot.issuer.iban,
    logoUrl: snapshot.issuer.logoUrl,
  };
}

function logoUrlFromIssuer(issuer: IssuerProfile): string | undefined {
  return issuer.logoUrl?.startsWith("data:image/") ? issuer.logoUrl : undefined;
}

function liveViewModel(doc: Document, profile: BusinessProfile): DocumentPdfViewModel {
  const issuer = resolveIssuerForDocument(doc, profile);
  const vatExempt = Boolean(profile.vatExempt);

  return {
    source: "live",
    doc,
    issuer,
    items: doc.items.map((item) => ({ ...item })),
    taxSummary: undefined,
    template: normalizeDocumentTemplate(profile.documentTemplate),
    vatExempt,
    logoUrl: logoUrlFromIssuer(issuer),
    documentSnapshot: doc.documentSnapshot,
    pdfSnapshot: doc.pdfSnapshot,
    hasOriginalDocumentSnapshot: Boolean(doc.documentSnapshot),
    hasOriginalPdfSnapshot: Boolean(doc.pdfSnapshot),
  };
}

function snapshotViewModel(
  doc: Document,
  profile: BusinessProfile,
  snapshot: DocumentSnapshot,
  pdfSnapshot: DocumentPdfSnapshot | undefined,
  source: DocumentPdfSourceKind,
  hasOriginalDocumentSnapshot: boolean,
): DocumentPdfViewModel {
  const issuer = issuerFromSnapshot(snapshot, profile);
  const template = normalizeDocumentTemplate(
    pdfSnapshot?.template ?? profile.documentTemplate,
  );
  const viewDoc = docFromSnapshot(doc, snapshot, issuer);

  return {
    source,
    doc: viewDoc,
    issuer,
    items: snapshot.items.map(lineFromSnapshot),
    taxSummary: cloneTaxSummary(snapshot.taxSummary),
    template,
    vatExempt: snapshot.taxSummary.vatExempt,
    logoUrl: logoUrlFromIssuer(issuer),
    documentSnapshot: snapshot,
    pdfSnapshot,
    hasOriginalDocumentSnapshot,
    hasOriginalPdfSnapshot: Boolean(pdfSnapshot),
  };
}

export function isHistoricalPdfRenderRequired(doc: Document): boolean {
  if (doc.type === "presupuesto") return false;

  return (
    Boolean(doc.documentSnapshot) ||
    Boolean(doc.pdfSnapshot) ||
    deriveDocumentLifecycle(doc) !== "draft" ||
    isDocumentIntegrityLocked(doc)
  );
}

export function getDocumentPdfSource(
  doc: Document,
): DocumentPdfSourceKind {
  if (!isHistoricalPdfRenderRequired(doc)) return "live";
  if (doc.documentSnapshot && doc.pdfSnapshot) return "snapshot";
  if (doc.documentSnapshot) return "snapshot_without_pdf_settings";
  return "legacy_read_only";
}

export function buildPdfViewModelFromLiveDocument(
  doc: Document,
  profile: BusinessProfile,
): DocumentPdfViewModel {
  return liveViewModel(doc, profile);
}

export function buildPdfViewModelFromDocumentSnapshot(
  doc: Document,
  profile: BusinessProfile,
  snapshot = doc.documentSnapshot,
): DocumentPdfViewModel {
  if (!snapshot) {
    return snapshotViewModel(
      doc,
      profile,
      deriveLegacySnapshotForReadOnly(doc, profile),
      undefined,
      "legacy_read_only",
      false,
    );
  }

  return snapshotViewModel(
    doc,
    profile,
    snapshot,
    doc.pdfSnapshot,
    doc.pdfSnapshot ? "snapshot" : "snapshot_without_pdf_settings",
    true,
  );
}

export function buildPdfViewModelForDocument(
  doc: Document,
  profile: BusinessProfile,
): DocumentPdfViewModel {
  if (!isHistoricalPdfRenderRequired(doc)) {
    return buildPdfViewModelFromLiveDocument(doc, profile);
  }

  return buildPdfViewModelFromDocumentSnapshot(doc, profile);
}

export function documentPdfViewAmounts(view: DocumentPdfViewModel): {
  subtotal: number;
  iva: number;
  total: number;
} {
  const amounts =
    view.taxSummary ?? documentAmounts({ items: view.items }, view.vatExempt);
  return {
    subtotal: amounts.subtotal,
    iva: amounts.iva,
    total: amounts.total,
  };
}
