import {
  lineIva,
  lineMoneyAmounts,
  lineSubtotal,
  roundMoney,
  roundMoneySymmetric,
} from "@/lib/calculations";
import { normalizeDocumentTemplate } from "@/lib/document-templates";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import {
  legacyFnv1a32,
  sha256Hex,
} from "@/lib/document-integrity/snapshot-hash";
import type {
  BusinessProfile,
  Client,
  Document,
  DocumentKind,
  DocumentPdfSnapshot,
  DocumentSnapshot,
  DocumentSnapshotIntegrityIssue,
  DocumentSnapshotSeal,
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
      .reduce<JsonRecord>(
        (acc, key) => {
          acc[key] = stableNormalize(record[key]);
          return acc;
        },
        Object.create(null) as JsonRecord,
      );
  }

  return value;
}

export function stableStringifySnapshot(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function sha256StableValue(value: unknown): string {
  const input = stableStringifySnapshot(value);
  return `sha256:${sha256Hex(input)}`;
}

function legacyHashStableValue(value: unknown): string {
  return `fnv1a32:${legacyFnv1a32(stableStringifySnapshot(value))}`;
}

function hashDocumentSnapshotContext(
  documentId: string,
  snapshot: DocumentSnapshot,
): string {
  return sha256StableValue({
    documentId,
    capturedAt: snapshot.capturedAt,
    source: snapshot.source,
    issuerCapturedAt: snapshot.issuer.capturedAt,
  });
}

export function hashStrongDocumentSnapshotContent(
  snapshot: DocumentSnapshot,
): string {
  const content = { ...snapshot } as JsonRecord;
  delete content.snapshotHash;
  return sha256StableValue(content);
}

export function hashStrongDocumentPdfSnapshotContent(
  snapshot: DocumentPdfSnapshot,
  documentContentHash: string,
): string {
  const content = {
    ...snapshot,
    documentContentHash,
  } as JsonRecord;
  delete content.contentHash;
  return sha256StableValue(content);
}

export function documentKindForSnapshot(
  doc: Pick<Document, "type" | "rectification">,
): DocumentKind {
  if (doc.type === "factura" && doc.rectification)
    return "factura_rectificativa";
  return doc.type;
}

function snapshotLineItems(
  items: LineItem[],
  vatExempt: boolean,
): LineItemSnapshot[] {
  return items.map((item) => {
    const amounts = lineMoneyAmounts(item, vatExempt);

    return {
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
      subtotal: amounts.subtotal,
      ivaAmount: amounts.iva,
      total: amounts.total,
    };
  });
}

function legacySnapshotLineItems(
  items: LineItem[],
  vatExempt: boolean,
): LineItemSnapshot[] {
  return items.map((item) => {
    const subtotal = roundMoney(lineSubtotal(item));
    const ivaAmount = vatExempt ? 0 : roundMoney(lineIva(item));
    return {
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
      subtotal,
      ivaAmount,
      total: roundMoney(subtotal + ivaAmount),
    };
  });
}

function taxSummaryFromFrozenItems(
  frozenItems: LineItemSnapshot[],
  vatExempt: boolean,
  round: (amount: number) => number,
): TaxSummarySnapshot {
  const byRate = new Map<number, TaxRateSummarySnapshot>();

  for (const item of frozenItems) {
    const ivaPercent = vatExempt ? 0 : item.ivaPercent;
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
      taxableBase: round(previous.taxableBase + item.subtotal),
      ivaAmount: round(previous.ivaAmount + item.ivaAmount),
      total: round(previous.total + item.total),
    });
  }

  return {
    subtotal: round(frozenItems.reduce((sum, item) => sum + item.subtotal, 0)),
    iva: round(frozenItems.reduce((sum, item) => sum + item.ivaAmount, 0)),
    total: round(frozenItems.reduce((sum, item) => sum + item.total, 0)),
    vatExempt,
    byRate: Array.from(byRate.values()).sort(
      (left, right) => left.ivaPercent - right.ivaPercent,
    ),
  };
}

function snapshotTaxSummary(
  doc: Pick<Document, "items">,
  vatExempt: boolean,
): TaxSummarySnapshot {
  return taxSummaryFromFrozenItems(
    snapshotLineItems(doc.items, vatExempt),
    vatExempt,
    roundMoneySymmetric,
  );
}

function legacySnapshotTaxSummary(
  doc: Pick<Document, "items">,
  vatExempt: boolean,
): TaxSummarySnapshot {
  const lineBased = taxSummaryFromFrozenItems(
    legacySnapshotLineItems(doc.items, vatExempt),
    vatExempt,
    roundMoney,
  );
  const rawSubtotal = doc.items.reduce(
    (sum, item) => sum + lineSubtotal(item),
    0,
  );
  const rawIva = vatExempt
    ? 0
    : doc.items.reduce((sum, item) => sum + lineIva(item), 0);
  return {
    ...lineBased,
    subtotal: roundMoney(rawSubtotal),
    iva: roundMoney(rawIva),
    total: roundMoney(rawSubtotal + rawIva),
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

function snapshotFiscalContext(
  profile: BusinessProfile,
): FiscalContextSnapshot {
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

function cloneVerifactu(
  verifactu: VerifactuInfo | undefined,
): VerifactuInfo | undefined {
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
  return sha256StableValue(documentSnapshotHashPayload(snapshot));
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
  return sha256StableValue(content);
}

export type SnapshotHashAlgorithm = "sha256" | "fnv1a32";

/**
 * Recalcula un snapshot transformado sin convertir silenciosamente un
 * histórico con redondeo FNV compatible al contrato SHA moderno. El contenido
 * sigue protegido además por los hashes fuertes de la atestación.
 */
export function hashDocumentSnapshotWithAlgorithm(
  snapshot: Omit<DocumentSnapshot, "snapshotHash"> & {
    snapshotHash?: string;
  },
  algorithm: SnapshotHashAlgorithm,
): string {
  const payload = documentSnapshotHashPayload(snapshot);
  return algorithm === "fnv1a32"
    ? legacyHashStableValue(payload)
    : sha256StableValue(payload);
}

export type SnapshotHashVerification =
  | { status: "missing"; algorithm: null }
  | { status: "verified"; algorithm: SnapshotHashAlgorithm }
  | { status: "mismatch"; algorithm: SnapshotHashAlgorithm }
  | { status: "unsupported"; algorithm: null }
  | { status: "invalid"; algorithm: SnapshotHashAlgorithm };

export interface DocumentSnapshotsIntegrityResult {
  ok: boolean;
  documentSnapshot: SnapshotHashVerification;
  pdfSnapshot: SnapshotHashVerification;
  issues: DocumentSnapshotIntegrityIssue[];
}

export interface DocumentSnapshotIntegrityRequirements {
  requireDocumentSnapshot?: boolean;
  requirePdfSnapshot?: boolean;
  requireSnapshotSeal?: boolean;
  /** Solo para validar el snapshot anidado dentro de una atestación recovery. */
  allowAppIssuedRecoverySnapshot?: boolean;
}

type DocumentSnapshotIntegrityInput = Pick<
  Document,
  | "documentSnapshot"
  | "pdfSnapshot"
  | "snapshotSeal"
  | "snapshotIntegrityRequired"
> &
  Partial<Pick<Document, "id" | "status">>;

function verifyStoredHash(
  value: unknown,
  storedHash: unknown,
): SnapshotHashVerification {
  let algorithm: SnapshotHashAlgorithm | null = null;
  if (
    typeof storedHash === "string" &&
    /^sha256:[a-f0-9]{64}$/.test(storedHash)
  ) {
    algorithm = "sha256";
  } else if (
    typeof storedHash === "string" &&
    /^fnv1a32:[a-f0-9]{8}$/.test(storedHash)
  ) {
    algorithm = "fnv1a32";
  }

  if (!algorithm) return { status: "unsupported", algorithm: null };

  try {
    const expected =
      algorithm === "sha256"
        ? sha256StableValue(value)
        : legacyHashStableValue(value);
    return expected === storedHash
      ? { status: "verified", algorithm }
      : { status: "mismatch", algorithm };
  } catch {
    return { status: "invalid", algorithm };
  }
}

export function verifyDocumentSnapshotHash(
  snapshot: DocumentSnapshot | undefined,
): SnapshotHashVerification {
  if (!snapshot) return { status: "missing", algorithm: null };

  try {
    return verifyStoredHash(
      documentSnapshotHashPayload(snapshot),
      snapshot.snapshotHash,
    );
  } catch {
    const algorithm =
      typeof snapshot.snapshotHash === "string" &&
      snapshot.snapshotHash.startsWith("fnv1a32:")
        ? "fnv1a32"
        : "sha256";
    return { status: "invalid", algorithm };
  }
}

export function verifyDocumentPdfSnapshotHash(
  snapshot: DocumentPdfSnapshot | undefined,
  documentSnapshotHash: string | undefined,
): SnapshotHashVerification {
  if (!snapshot) return { status: "missing", algorithm: null };
  if (!documentSnapshotHash) return { status: "invalid", algorithm: "sha256" };

  try {
    const content = { ...snapshot, documentSnapshotHash } as JsonRecord;
    delete content.renderedAt;
    delete content.contentHash;
    return verifyStoredHash(content, snapshot.contentHash);
  } catch {
    const algorithm =
      typeof snapshot.contentHash === "string" &&
      snapshot.contentHash.startsWith("fnv1a32:")
        ? "fnv1a32"
        : "sha256";
    return { status: "invalid", algorithm };
  }
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isDocumentSnapshotSemanticallyValid(
  snapshot: DocumentSnapshot,
  allowLegacyTaxRounding = false,
): boolean {
  try {
    if (snapshot.schemaVersion !== DOCUMENT_SNAPSHOT_SCHEMA_VERSION)
      return false;
    if (!isIsoDateTime(snapshot.capturedAt)) return false;
    if (!isIsoDateTime(snapshot.issuer?.capturedAt)) return false;
    if (
      !(
        [
          "issue",
          "legacy_backfill",
          "legacy_import_attested",
          "customer_repair",
          "app_issued_recovery",
        ] as const
      ).includes(snapshot.source)
    ) {
      return false;
    }
    if (
      !(["factura", "presupuesto", "recibo"] as const).includes(
        snapshot.documentType,
      )
    ) {
      return false;
    }
    if (!snapshot.number?.trim() || !isIsoDate(snapshot.date)) return false;
    if (snapshot.dueDate && !isIsoDate(snapshot.dueDate)) return false;
    if (snapshot.currency !== "EUR" || !Array.isArray(snapshot.items))
      return false;
    if (
      !snapshot.fiscalContext ||
      !snapshot.taxSummary ||
      !snapshot.numbering
    ) {
      return false;
    }
    if (
      typeof snapshot.fiscalContext.vatExempt !== "boolean" ||
      typeof snapshot.taxSummary.vatExempt !== "boolean" ||
      !Array.isArray(snapshot.fiscalContext.iva?.rates) ||
      !snapshot.fiscalContext.iva.rates.every(isFiniteNumber) ||
      !isFiniteNumber(snapshot.fiscalContext.iva.defaultRate) ||
      typeof snapshot.issuer !== "object" ||
      typeof snapshot.issuer.name !== "string" ||
      typeof snapshot.issuer.nif !== "string" ||
      typeof snapshot.issuer.address !== "string" ||
      typeof snapshot.issuer.city !== "string" ||
      typeof snapshot.issuer.postalCode !== "string" ||
      ![
        snapshot.issuer.commercialName,
        snapshot.issuer.vatId,
        snapshot.issuer.province,
        snapshot.issuer.country,
        snapshot.issuer.phone,
        snapshot.issuer.email,
        snapshot.issuer.website,
        snapshot.issuer.iban,
        snapshot.issuer.logoUrl,
      ].every(isOptionalString) ||
      typeof snapshot.customer !== "object" ||
      typeof snapshot.customer.name !== "string" ||
      (snapshot.customer.customerType !== undefined &&
        snapshot.customer.customerType !== "person" &&
        snapshot.customer.customerType !== "company") ||
      (snapshot.customer.residenceType !== undefined &&
        !(
          [
            "",
            "flat",
            "house",
            "chalet",
            "duplex",
            "attic",
            "ground_floor",
            "local",
            "shop",
            "office",
            "warehouse",
            "workshop",
            "storage",
            "garage",
            "storage_room",
            "plot",
            "farm",
          ] as const
        ).includes(snapshot.customer.residenceType)) ||
      ![
        snapshot.customer.firstName,
        snapshot.customer.lastName,
        snapshot.customer.contactName,
        snapshot.customer.nif,
        snapshot.customer.email,
        snapshot.customer.phone,
        snapshot.customer.streetType,
        snapshot.customer.addressExtra,
        snapshot.customer.address,
        snapshot.customer.city,
        snapshot.customer.postalCode,
        snapshot.notes,
        snapshot.paymentTerms,
      ].every(isOptionalString)
    ) {
      return false;
    }
    if (
      snapshot.rectification &&
      (snapshot.documentType !== "factura" ||
        typeof snapshot.rectification.originalDocumentId !== "string" ||
        typeof snapshot.rectification.originalNumber !== "string" ||
        !isIsoDate(snapshot.rectification.originalDate) ||
        typeof snapshot.rectification.reason !== "string" ||
        !(["anulacion", "correccion"] as const).includes(
          snapshot.rectification.type,
        ))
    ) {
      return false;
    }
    if (
      snapshot.sourceDocumentId !== undefined &&
      (snapshot.documentType !== "recibo" ||
        typeof snapshot.sourceDocumentId !== "string" ||
        !snapshot.sourceDocumentId.trim())
    ) {
      return false;
    }
    if (
      snapshot.fiscalContext.verifactu &&
      (typeof snapshot.fiscalContext.verifactu.enabled !== "boolean" ||
        (snapshot.fiscalContext.verifactu.optInVersion !== undefined &&
          snapshot.fiscalContext.verifactu.optInVersion !== 1) ||
        !(["test", "production"] as const).includes(
          snapshot.fiscalContext.verifactu.environment,
        ))
    ) {
      return false;
    }
    if (
      snapshot.verifactu &&
      (snapshot.documentType !== "factura" ||
        !/^[a-f\d]{64}$/i.test(snapshot.verifactu.recordHash) ||
        !(
          snapshot.verifactu.previousHash === "" ||
          /^[a-f\d]{64}$/i.test(snapshot.verifactu.previousHash)
        ) ||
        !isIsoDateTime(snapshot.verifactu.recordTimestamp) ||
        typeof snapshot.verifactu.qrUrl !== "string" ||
        !snapshot.verifactu.qrUrl.trim() ||
        ![
          snapshot.verifactu.csv,
          snapshot.verifactu.tipoFactura,
          snapshot.verifactu.cuotaTotal,
          snapshot.verifactu.importeTotal,
          snapshot.verifactu.errorMessage,
        ].every(isOptionalString) ||
        (snapshot.verifactu.submittedAt !== undefined &&
          !isIsoDateTime(snapshot.verifactu.submittedAt)) ||
        !(
          [
            "registered",
            "test_registered",
            "pending",
            "failed",
            "not_required",
          ] as const
        ).includes(snapshot.verifactu.status) ||
        !(["alta", "anulacion"] as const).includes(
          snapshot.verifactu.recordType,
        ) ||
        !(["test", "production"] as const).includes(
          snapshot.verifactu.environment,
        ) ||
        (snapshot.verifactu.status === "registered" &&
          snapshot.verifactu.environment !== "production") ||
        (snapshot.verifactu.status === "test_registered" &&
          snapshot.verifactu.environment !== "test") ||
        ((snapshot.verifactu.status === "registered" ||
          snapshot.verifactu.status === "test_registered") &&
          snapshot.fiscalContext.verifactu?.enabled !== true) ||
        (snapshot.fiscalContext.verifactu &&
          snapshot.verifactu.environment !==
            snapshot.fiscalContext.verifactu.environment))
    ) {
      return false;
    }

    for (const item of snapshot.items) {
      if (
        typeof item?.id !== "string" ||
        typeof item.description !== "string" ||
        !isOptionalString(item.unit) ||
        !isFiniteNumber(item.quantity) ||
        !isFiniteNumber(item.unitPrice) ||
        !isFiniteNumber(item.ivaPercent) ||
        !isFiniteNumber(item.subtotal) ||
        !isFiniteNumber(item.ivaAmount) ||
        !isFiniteNumber(item.total)
      ) {
        return false;
      }
      const currentAmounts = lineMoneyAmounts(
        item,
        snapshot.fiscalContext.vatExempt,
      );
      const matchesCurrent =
        item.subtotal === currentAmounts.subtotal &&
        item.ivaAmount === currentAmounts.iva &&
        item.total === currentAmounts.total;
      const legacySubtotal = roundMoney(lineSubtotal(item));
      const legacyIva = snapshot.fiscalContext.vatExempt
        ? 0
        : roundMoney(lineIva(item));
      const matchesLegacy =
        allowLegacyTaxRounding &&
        item.subtotal === legacySubtotal &&
        item.ivaAmount === legacyIva &&
        item.total === roundMoney(legacySubtotal + legacyIva);
      if (!matchesCurrent && !matchesLegacy) {
        return false;
      }
    }

    const expectedKind =
      snapshot.documentType === "factura" && snapshot.rectification
        ? "factura_rectificativa"
        : snapshot.documentType;
    if (
      snapshot.documentKind !== expectedKind ||
      snapshot.numbering.documentKind !== expectedKind ||
      snapshot.numbering.number !== snapshot.number ||
      snapshot.numbering.year !== Number(snapshot.date.slice(0, 4)) ||
      typeof snapshot.numbering.format?.template !== "string" ||
      !snapshot.numbering.format.template.trim() ||
      !Number.isInteger(snapshot.numbering.format.padding) ||
      snapshot.numbering.format.padding < 1
    ) {
      return false;
    }

    if (snapshot.taxSummary.vatExempt !== snapshot.fiscalContext.vatExempt) {
      return false;
    }
    const expectedTaxSummary = snapshotTaxSummary(
      { items: snapshot.items },
      snapshot.fiscalContext.vatExempt,
    );
    const actualTaxSummary = stableStringifySnapshot(snapshot.taxSummary);
    if (actualTaxSummary === stableStringifySnapshot(expectedTaxSummary)) {
      return true;
    }
    return (
      allowLegacyTaxRounding &&
      actualTaxSummary ===
        stableStringifySnapshot(
          legacySnapshotTaxSummary(
            { items: snapshot.items },
            snapshot.fiscalContext.vatExempt,
          ),
        )
    );
  } catch {
    return false;
  }
}

function isDocumentPdfSnapshotSemanticallyValid(
  snapshot: DocumentPdfSnapshot,
): boolean {
  try {
    return (
      snapshot.schemaVersion === DOCUMENT_PDF_SNAPSHOT_SCHEMA_VERSION &&
      snapshot.rendererVersion === DOCUMENT_PDF_RENDERER_VERSION &&
      isIsoDateTime(snapshot.renderedAt) &&
      stableStringifySnapshot(snapshot.template) ===
        stableStringifySnapshot(normalizeDocumentTemplate(snapshot.template))
    );
  } catch {
    return false;
  }
}

function integrityIssueForVerification(
  target: "document" | "pdf",
  verification: SnapshotHashVerification,
): DocumentSnapshotIntegrityIssue | null {
  if (verification.status === "verified" || verification.status === "missing") {
    return null;
  }
  if (verification.status === "mismatch") {
    return target === "document"
      ? "document_hash_mismatch"
      : "pdf_hash_mismatch";
  }
  if (verification.status === "unsupported") {
    return target === "document"
      ? "document_hash_unsupported"
      : "pdf_hash_unsupported";
  }
  return target === "document"
    ? "document_snapshot_invalid"
    : "pdf_snapshot_invalid";
}

export function inspectDocumentSnapshotsIntegrity(
  doc: DocumentSnapshotIntegrityInput,
  requirements: DocumentSnapshotIntegrityRequirements = {},
): DocumentSnapshotsIntegrityResult {
  const documentSnapshot = verifyDocumentSnapshotHash(doc.documentSnapshot);
  const pdfSnapshot = verifyDocumentPdfSnapshotHash(
    doc.pdfSnapshot,
    doc.documentSnapshot?.snapshotHash,
  );
  const issues: DocumentSnapshotIntegrityIssue[] = [];

  // `app_issued_recovery` is evidence nested inside its versioned attestation,
  // never a canonical snapshot that may be mounted on a persisted Document.
  // The only caller allowed to inspect that nested evidence opts in explicitly.
  if (
    doc.documentSnapshot?.source === "app_issued_recovery" &&
    !requirements.allowAppIssuedRecoverySnapshot
  ) {
    issues.push("app_issued_recovery_invalid");
  }

  const requireSealedPair = Boolean(doc.snapshotIntegrityRequired);
  if (
    doc.status === "borrador" &&
    (doc.documentSnapshot || doc.pdfSnapshot) &&
    !doc.snapshotSeal &&
    !doc.snapshotIntegrityRequired
  ) {
    issues.push("draft_snapshot_state_invalid");
  }
  if (
    (requirements.requireDocumentSnapshot || requireSealedPair) &&
    !doc.documentSnapshot
  ) {
    issues.push("document_snapshot_missing");
  }
  if (
    (requirements.requirePdfSnapshot || requireSealedPair) &&
    !doc.pdfSnapshot
  ) {
    issues.push("pdf_snapshot_missing");
  }
  if (
    (requirements.requireSnapshotSeal || requireSealedPair) &&
    !doc.snapshotSeal
  ) {
    issues.push("snapshot_seal_missing");
  }

  if (doc.snapshotSeal) {
    const seal = doc.snapshotSeal as Partial<DocumentSnapshotSeal>;
    if (
      seal.version !== 1 ||
      typeof seal.documentId !== "string" ||
      !seal.documentId.trim() ||
      typeof seal.contextHash !== "string" ||
      typeof seal.documentContentHash !== "string" ||
      typeof seal.pdfContentHash !== "string" ||
      typeof seal.documentSnapshotHash !== "string" ||
      typeof seal.pdfSnapshotHash !== "string"
    ) {
      issues.push("snapshot_seal_invalid");
    } else {
      if (!doc.id || seal.documentId !== doc.id) {
        issues.push("document_seal_identity_mismatch");
      }
      try {
        if (
          doc.documentSnapshot &&
          (!doc.id ||
            seal.contextHash !==
              hashDocumentSnapshotContext(doc.id, doc.documentSnapshot))
        ) {
          issues.push("snapshot_context_mismatch");
        }
        if (
          doc.documentSnapshot &&
          seal.documentContentHash !==
            hashStrongDocumentSnapshotContent(doc.documentSnapshot)
        ) {
          issues.push("document_strong_hash_mismatch");
        }
        if (doc.documentSnapshot && doc.pdfSnapshot) {
          const strongDocumentHash = hashStrongDocumentSnapshotContent(
            doc.documentSnapshot,
          );
          const strongPdfHash = hashStrongDocumentPdfSnapshotContent(
            doc.pdfSnapshot,
            strongDocumentHash,
          );
          if (seal.pdfContentHash !== strongPdfHash) {
            issues.push("pdf_strong_hash_mismatch");
          }
        }
      } catch {
        issues.push("snapshot_seal_invalid");
      }
      if (!doc.documentSnapshot) {
        if (!issues.includes("document_snapshot_missing")) {
          issues.push("document_snapshot_missing");
        }
      } else if (
        doc.documentSnapshot.snapshotHash !== seal.documentSnapshotHash
      ) {
        issues.push("document_seal_mismatch");
      }

      if (!doc.pdfSnapshot) {
        if (!issues.includes("pdf_snapshot_missing")) {
          issues.push("pdf_snapshot_missing");
        }
      } else if (doc.pdfSnapshot.contentHash !== seal.pdfSnapshotHash) {
        issues.push("pdf_seal_mismatch");
      }
    }
  }

  const documentIssue = integrityIssueForVerification(
    "document",
    documentSnapshot,
  );
  if (documentIssue) issues.push(documentIssue);
  if (
    doc.documentSnapshot &&
    !isDocumentSnapshotSemanticallyValid(
      doc.documentSnapshot,
      documentSnapshot.algorithm === "fnv1a32",
    )
  ) {
    issues.push("document_snapshot_semantic_invalid");
  }

  if (doc.pdfSnapshot && !doc.documentSnapshot) {
    issues.push("pdf_without_document_snapshot");
  } else {
    const pdfIssue = integrityIssueForVerification("pdf", pdfSnapshot);
    if (pdfIssue) issues.push(pdfIssue);
    if (
      doc.pdfSnapshot &&
      !isDocumentPdfSnapshotSemanticallyValid(doc.pdfSnapshot)
    ) {
      issues.push("pdf_snapshot_semantic_invalid");
    }
  }

  return {
    ok: issues.length === 0,
    documentSnapshot,
    pdfSnapshot,
    issues,
  };
}

export class DocumentSnapshotIntegrityError extends Error {
  readonly code = "DOCUMENT_SNAPSHOT_INTEGRITY_FAILED";
  readonly issues: readonly DocumentSnapshotIntegrityIssue[];

  constructor(issues: readonly DocumentSnapshotIntegrityIssue[]) {
    super(
      "No se puede usar el documento porque su snapshot no supera la comprobación de integridad.",
    );
    this.name = "DocumentSnapshotIntegrityError";
    this.issues = [...issues];
  }
}

export function assertDocumentSnapshotsIntegrity(
  doc: DocumentSnapshotIntegrityInput,
  requirements: DocumentSnapshotIntegrityRequirements = {},
): void {
  const result = inspectDocumentSnapshotsIntegrity(doc, requirements);
  if (!result.ok) throw new DocumentSnapshotIntegrityError(result.issues);
}

export function withDocumentSnapshotIntegritySignal(
  doc: Document,
  requirements: DocumentSnapshotIntegrityRequirements = {},
): Document {
  const result = inspectDocumentSnapshotsIntegrity(doc, requirements);
  const next = { ...doc };
  delete next.snapshotIntegrity;

  if (result.ok) return next;
  return {
    ...next,
    snapshotIntegrity: {
      status: "blocked",
      issues: [...result.issues],
    },
  };
}

export function buildDocumentSnapshotSeal(
  documentId: string,
  documentSnapshot: DocumentSnapshot,
  pdfSnapshot: DocumentPdfSnapshot,
): DocumentSnapshotSeal {
  assertDocumentSnapshotsIntegrity({ documentSnapshot, pdfSnapshot });
  if (!documentId.trim()) {
    throw new Error("El sello documental requiere un identificador estable.");
  }
  const documentContentHash =
    hashStrongDocumentSnapshotContent(documentSnapshot);
  return {
    version: 1,
    documentId,
    contextHash: hashDocumentSnapshotContext(documentId, documentSnapshot),
    documentContentHash,
    pdfContentHash: hashStrongDocumentPdfSnapshotContent(
      pdfSnapshot,
      documentContentHash,
    ),
    documentSnapshotHash: documentSnapshot.snapshotHash,
    pdfSnapshotHash: pdfSnapshot.contentHash,
  };
}

export function projectCanonicalSnapshotOntoDocument(doc: Document): Document {
  const snapshot = doc.documentSnapshot;
  if (!snapshot) return doc;
  assertDocumentSnapshotsIntegrity(doc, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });

  return {
    ...doc,
    type: snapshot.documentType,
    number: snapshot.number,
    date: snapshot.date,
    dueDate: snapshot.dueDate,
    client: cloneClient(snapshot.customer),
    items: snapshot.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
    })),
    notes: snapshot.notes,
    paymentTerms: snapshot.paymentTerms,
    issuer: cloneIssuer(snapshot.issuer),
    rectification: cloneRectification(snapshot.rectification),
    sourceDocumentId: Object.prototype.hasOwnProperty.call(
      snapshot,
      "sourceDocumentId",
    )
      ? snapshot.sourceDocumentId
      : doc.sourceDocumentId,
    verifactu: cloneVerifactu(snapshot.verifactu),
    status: doc.status === "borrador" ? "enviado" : doc.status,
    documentLifecycle:
      doc.documentLifecycle === "canceled" || doc.status === "anulada"
        ? "canceled"
        : "issued",
    integrityLock: "locked",
  };
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
  const source = options.source ?? "issue";
  const issuer =
    options.issuer ?? doc.issuer ?? captureIssuerSnapshot(profile, capturedAt);
  const vatExempt = Boolean(profile.vatExempt);
  const rectification = cloneRectification(doc.rectification);
  const verifactu = cloneVerifactu(doc.verifactu);
  if (
    verifactu &&
    (verifactu.status === "registered" ||
      verifactu.status === "test_registered") &&
    doc.verifactuPersistence !== "server_confirmed"
  ) {
    throw new DocumentSnapshotIntegrityError([
      "document_snapshot_semantic_invalid",
    ]);
  }

  const snapshotWithoutHash: Omit<DocumentSnapshot, "snapshotHash"> = {
    schemaVersion: DOCUMENT_SNAPSHOT_SCHEMA_VERSION,
    capturedAt,
    source,
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
    ...((source === "issue" || source === "legacy_import_attested") &&
    doc.type === "recibo" &&
    doc.sourceDocumentId?.trim()
      ? { sourceDocumentId: doc.sourceDocumentId.trim() }
      : {}),
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
  assertDocumentSnapshotsIntegrity({ documentSnapshot });
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

export function attachRegisteredVerifactuToSnapshots(doc: Document): Document {
  const verifactu = doc.verifactu;
  if (
    !verifactu ||
    (verifactu.status !== "registered" &&
      verifactu.status !== "test_registered")
  ) {
    return projectCanonicalSnapshotOntoDocument(doc);
  }
  if (doc.verifactuPersistence !== "server_confirmed") {
    throw new DocumentSnapshotIntegrityError([
      "document_snapshot_semantic_invalid",
    ]);
  }

  // Never turn tampered historical content into a newly valid snapshot.
  assertDocumentSnapshotsIntegrity(doc, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });

  const existingVerifactu = doc.documentSnapshot!.verifactu;
  if (doc.documentSnapshot!.documentType !== "factura") {
    throw new DocumentSnapshotIntegrityError([
      "document_snapshot_semantic_invalid",
    ]);
  }
  if (existingVerifactu) {
    if (
      stableStringifySnapshot(existingVerifactu) !==
      stableStringifySnapshot(verifactu)
    ) {
      throw new DocumentSnapshotIntegrityError([
        "document_snapshot_semantic_invalid",
      ]);
    }
    if (
      doc.documentSnapshot!.fiscalContext.verifactu?.enabled === true &&
      doc.documentSnapshot!.fiscalContext.verifactu?.optInVersion === 1
    ) {
      return projectCanonicalSnapshotOntoDocument(doc);
    }
  }

  const documentSnapshot: DocumentSnapshot = {
    ...doc.documentSnapshot!,
    fiscalContext: {
      ...doc.documentSnapshot!.fiscalContext,
      verifactu: {
        enabled: true,
        environment: verifactu.environment,
        optInVersion: 1,
      },
    },
    verifactu: cloneVerifactu(verifactu),
    snapshotHash: "",
  };
  documentSnapshot.snapshotHash = hashDocumentSnapshot(documentSnapshot);

  const pdfSnapshot = doc.pdfSnapshot
    ? {
        ...doc.pdfSnapshot,
        contentHash: hashDocumentPdfSnapshot({
          ...doc.pdfSnapshot,
          documentSnapshotHash: documentSnapshot.snapshotHash,
        }),
      }
    : undefined;

  return projectCanonicalSnapshotOntoDocument(
    withDocumentSnapshotIntegritySignal({
      ...doc,
      documentSnapshot,
      pdfSnapshot,
      snapshotSeal:
        pdfSnapshot &&
        buildDocumentSnapshotSeal(doc.id, documentSnapshot, pdfSnapshot),
      snapshotIntegrityRequired: pdfSnapshot ? true : undefined,
    }),
  );
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
  if (doc.documentSnapshot) {
    assertDocumentSnapshotsIntegrity(doc);
    return doc.documentSnapshot;
  }
  return buildDocumentSnapshot(doc, profile, {
    capturedAt,
    source: "legacy_backfill",
    issuer: doc.issuer ?? captureIssuerSnapshot(profile, nowIso(capturedAt)),
  });
}
