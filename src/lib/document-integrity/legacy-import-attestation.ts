import { hasUsualSpanishTaxIdShape } from "@/lib/business-profile";
import { documentTotals, roundMoney } from "@/lib/calculations";
import { clientAddressToFormFields } from "@/lib/customer-address";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { invoiceClientMissingDocumentLabels } from "@/lib/invoice-compliance";
import type {
  AppData,
  BusinessProfile,
  Document,
  DocumentSnapshot,
  DocumentSnapshotIntegrityIssue,
  LegacyImportAttestationV1,
  LegacyImportSource,
} from "@/lib/types";
import {
  buildDocumentSnapshot,
  hashStrongDocumentSnapshotContent,
  inspectDocumentSnapshotsIntegrity,
  stableStringifySnapshot,
} from "./snapshots";

const ATTESTATION_KIND = "historical_import_user_accepted" as const;
const MISSING_ROLLOUT_ISSUES = new Set([
  "document_snapshot_missing",
  "pdf_snapshot_missing",
  "snapshot_seal_missing",
]);

export function hasOnlyLegacyImportRolloutResidue(
  document: Pick<Document, "snapshotIntegrity">,
): boolean {
  const issues = document.snapshotIntegrity?.issues;
  return Boolean(
    document.snapshotIntegrity?.status === "blocked" &&
      issues &&
      issues.length > 0 &&
      issues.every((issue) => MISSING_ROLLOUT_ISSUES.has(issue)),
  );
}

const SOURCE_PREFIXES: Record<LegacyImportSource, string> = {
  pcfacturacion: "pcfacturacion",
  holded: "holded",
  facturadirecta: "facturadirecta",
  generic_documents: "generic-documents",
};

export type LegacyImportRepairReviewReason =
  | "namespace_type_mismatch"
  | "duplicate_document_id"
  | "draft_document"
  | "unsupported_historical_relation"
  | "existing_integrity_evidence"
  | "verifactu_evidence"
  | "integrity_quarantine"
  | "unexpected_integrity_issue"
  | "issuer_incomplete"
  | "fiscal_content_invalid"
  | "attestation_invalid";

export interface LegacyImportRepairCandidate {
  documentId: string;
  documentNumber: string;
  importer: LegacyImportSource;
  beforeFingerprint: string;
}

export interface LegacyImportRepairReviewItem {
  documentId: string;
  documentNumber: string;
  reasons: LegacyImportRepairReviewReason[];
}

export interface LegacyImportRepairPreview {
  schemaVersion: 1;
  precondition: string;
  affectedCount: number;
  candidates: LegacyImportRepairCandidate[];
  manualReview: LegacyImportRepairReviewItem[];
  alreadyAttestedDocumentIds: string[];
}

export type LegacyImportRepairApplyResult =
  | {
      status: "applied";
      data: AppData;
      appliedDocumentIds: string[];
    }
  | {
      status: "blocked";
      reason: "stale_preview" | "no_candidates" | "candidate_invalid";
    };

export type LegacyImportAttestationInspection =
  | { ok: true; snapshot: DocumentSnapshot }
  | { ok: false; reason: string };

export type UsableHistoricalDocumentEvidence =
  | {
      ok: true;
      kind:
        | "app_issued_sealed"
        | "legacy_import_user_attested"
        | "legacy_backfill_compatible";
      snapshot: DocumentSnapshot;
    }
  | { ok: false; issues: DocumentSnapshotIntegrityIssue[] };

function sha256Stable(value: unknown): string {
  return `sha256:${sha256Hex(stableStringifySnapshot(value))}`;
}

function documentFingerprint(document: Document): string {
  return sha256Stable(document);
}

function previewPrecondition(data: AppData): string {
  return sha256Stable({
    snapshotIntegrityVersion: data.snapshotIntegrityVersion,
    profile: data.profile,
    documents: data.documents.map(documentFingerprint),
  });
}

function sourceForPrefix(prefix: string): LegacyImportSource | null {
  return (
    Object.entries(SOURCE_PREFIXES).find(([, value]) => value === prefix)?.[0] as
      | LegacyImportSource
      | undefined
  ) ?? null;
}

export function detectLegacyImportSource(
  document: Pick<Document, "id" | "type">,
): LegacyImportSource | null {
  const [prefix, kind, suffix, ...extra] = document.id.split(":");
  if (!prefix || !kind || !suffix || extra.length > 0) return null;
  if (kind !== document.type) return null;
  if (kind !== "factura" && kind !== "presupuesto") return null;
  return sourceForPrefix(prefix);
}

function hasKnownImportPrefix(document: Document): boolean {
  const prefix = document.id.split(":", 1)[0];
  return Object.values(SOURCE_PREFIXES).includes(prefix);
}

function attestationHashPayload(
  attestation: Omit<LegacyImportAttestationV1, "attestationHash">,
): unknown {
  return attestation;
}

function buildAttestation(
  document: Document,
  importer: LegacyImportSource,
  snapshot: DocumentSnapshot,
  attestedAt: string,
): LegacyImportAttestationV1 {
  const withoutHash: Omit<LegacyImportAttestationV1, "attestationHash"> = {
    schemaVersion: 1,
    kind: ATTESTATION_KIND,
    importer,
    documentId: document.id,
    attestedAt,
    snapshotContentHash: hashStrongDocumentSnapshotContent(snapshot),
    originalEvidence: {
      kind: "source_files_not_stored",
      preservation: "user_managed",
    },
  };
  return {
    ...withoutHash,
    attestationHash: sha256Stable(attestationHashPayload(withoutHash)),
  };
}

function isIsoDateTime(value: string): boolean {
  return Boolean(value) && Number.isFinite(Date.parse(value));
}

export function inspectLegacyImportAttestation(
  document: Document,
): LegacyImportAttestationInspection {
  const attestation = document.legacyImportAttestation;
  const snapshot = document.documentSnapshot;
  if (!attestation || !snapshot) {
    return { ok: false, reason: "missing_attestation_or_snapshot" };
  }
  if (
    attestation.schemaVersion !== 1 ||
    attestation.kind !== ATTESTATION_KIND ||
    attestation.documentId !== document.id ||
    !attestation.originalEvidence ||
    attestation.originalEvidence.kind !== "source_files_not_stored" ||
    attestation.originalEvidence.preservation !== "user_managed" ||
    !isIsoDateTime(attestation.attestedAt) ||
    detectLegacyImportSource(document) !== attestation.importer ||
    (snapshot.source !== "legacy_import_attested" &&
      snapshot.source !== "legacy_backfill") ||
    document.legacyImportProvenance?.schemaVersion !== 1 ||
    document.legacyImportProvenance.kind !== "external_import" ||
    document.legacyImportProvenance.importer !== attestation.importer ||
    document.legacyImportProvenance.importedAt !== attestation.attestedAt ||
    snapshot.documentType !== document.type ||
    document.pdfSnapshot ||
    document.snapshotSeal ||
    document.snapshotIntegrityRequired ||
    document.verifactu ||
    document.verifactuPersistence ||
    document.integrityQuarantine
  ) {
    return { ok: false, reason: "attestation_contract_invalid" };
  }
  const integrity = inspectDocumentSnapshotsIntegrity(
    { documentSnapshot: snapshot },
    { requireDocumentSnapshot: true },
  );
  if (!integrity.ok) {
    return { ok: false, reason: "snapshot_invalid" };
  }
  if (
    attestation.snapshotContentHash !==
    hashStrongDocumentSnapshotContent(snapshot)
  ) {
    return { ok: false, reason: "snapshot_content_mismatch" };
  }
  const { attestationHash, ...withoutHash } = attestation;
  if (attestationHash !== sha256Stable(attestationHashPayload(withoutHash))) {
    return { ok: false, reason: "attestation_hash_mismatch" };
  }
  return { ok: true, snapshot };
}

export function isUsableLegacyImportedDocument(document: Document): boolean {
  return inspectLegacyImportAttestation(document).ok;
}

/**
 * Política única para decidir si un documento histórico puede alimentar
 * importes, relaciones y exportaciones. La evidencia moderna siempre se
 * comprueba antes y nunca puede degradarse a la rama legacy.
 */
export function inspectUsableHistoricalDocumentEvidence(
  document: Document,
): UsableHistoricalDocumentEvidence {
  if (document.legacyImportAttestation) {
    const legacy = inspectLegacyImportAttestation(document);
    if (!legacy.ok) {
      return { ok: false, issues: ["legacy_import_attestation_invalid"] };
    }
    if (document.snapshotIntegrity?.status === "blocked") {
      return { ok: false, issues: [...document.snapshotIntegrity.issues] };
    }
    return {
      ok: true,
      kind: "legacy_import_user_attested",
      snapshot: legacy.snapshot,
    };
  }

  if (document.documentSnapshot?.source === "legacy_import_attested") {
    return { ok: false, issues: ["legacy_import_attestation_invalid"] };
  }

  const snapshotSource = document.documentSnapshot?.source;
  if (
    snapshotSource === "legacy_backfill" &&
    detectLegacyImportSource(document)
  ) {
    return { ok: false, issues: ["legacy_import_attestation_invalid"] };
  }
  const modernEvidence = Boolean(
    snapshotSource === "issue" ||
      snapshotSource === "customer_repair" ||
      document.pdfSnapshot ||
      document.snapshotSeal ||
      document.snapshotIntegrityRequired ||
      document.issuedAt ||
      document.verifactu ||
      document.verifactuPersistence,
  );
  const integrity = inspectDocumentSnapshotsIntegrity(document, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: modernEvidence,
    requireSnapshotSeal: modernEvidence,
  });
  const issues = [
    ...(document.snapshotIntegrity?.status === "blocked"
      ? document.snapshotIntegrity.issues
      : []),
    ...integrity.issues,
  ];
  if (!integrity.ok || issues.length > 0 || !document.documentSnapshot) {
    return { ok: false, issues: [...new Set(issues)] };
  }
  return {
    ok: true,
    kind: modernEvidence
      ? "app_issued_sealed"
      : "legacy_backfill_compatible",
    snapshot: document.documentSnapshot,
  };
}

export function isDocumentUsableForFinancialCalculations(
  document: Document,
): boolean {
  if (
    document.integrityQuarantine ||
    document.snapshotIntegrity?.status === "blocked"
  ) {
    return false;
  }
  const hasHistoricalEvidence = Boolean(
    document.documentSnapshot ||
      document.pdfSnapshot ||
      document.snapshotSeal ||
      document.snapshotIntegrityRequired ||
      document.legacyImportAttestation ||
      document.issuedAt ||
      document.documentLifecycle === "issued" ||
      document.documentLifecycle === "canceled" ||
      document.integrityLock === "locked",
  );
  if (hasHistoricalEvidence) {
    return inspectUsableHistoricalDocumentEvidence(document).ok;
  }
  if (document.status === "borrador") return true;
  // Compatibilidad exclusiva para objetos pre-rollout aún no normalizados.
  // load/normalize materializa lifecycle+lock y los bloquea antes de producción.
  return (
    document.documentLifecycle === undefined &&
    document.integrityLock === undefined
  );
}

export function projectLegacyImportSnapshotOntoDocument(
  document: Document,
): Document {
  const inspected = inspectLegacyImportAttestation(document);
  if (!inspected.ok) return document;
  const snapshot = inspected.snapshot;
  const projected: Document = {
    ...document,
    type: snapshot.documentType,
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
    paymentTerms: snapshot.paymentTerms,
    issuer: { ...snapshot.issuer },
    rectification: snapshot.rectification
      ? { ...snapshot.rectification }
      : undefined,
    status: document.status === "borrador" ? "enviado" : document.status,
    documentLifecycle:
      document.documentLifecycle === "canceled" || document.status === "anulada"
        ? "canceled"
        : "issued",
    integrityLock: "locked",
  };
  if (Object.prototype.hasOwnProperty.call(snapshot, "sourceDocumentId")) {
    projected.sourceDocumentId = snapshot.sourceDocumentId;
  }
  delete projected.snapshotIntegrity;
  return projected;
}

function issuerIsComplete(document: Document): boolean {
  const issuer = document.issuer;
  return Boolean(
    issuer?.name.trim() &&
      hasUsualSpanishTaxIdShape(issuer.nif) &&
      issuer.address.trim() &&
      issuer.city.trim() &&
      issuer.postalCode.trim(),
  );
}

function hasFiniteFiscalContent(document: Document): boolean {
  const totals = documentTotals(document, false);
  const clientAddress = clientAddressToFormFields(document.client);
  const clientIsComplete =
    document.type !== "factura" ||
    invoiceClientMissingDocumentLabels({
      name: document.client.name,
      nif: document.client.nif,
      address: clientAddress.streetLine,
      postalCode: clientAddress.postalCode,
      city: clientAddress.city,
    }).length === 0;
  return Boolean(
    document.number.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(document.date) &&
      document.client?.name?.trim() &&
      document.items.length > 0 &&
      document.items.every(
        (item) =>
          item.description.trim() &&
          Number.isFinite(item.quantity) &&
          Number.isFinite(item.unitPrice) &&
          Number.isFinite(item.ivaPercent) &&
          item.ivaPercent >= 0 &&
          item.ivaPercent <= 100,
      ) &&
      clientIsComplete &&
      roundMoney(totals.subtotal) >= 0 &&
      roundMoney(totals.iva) >= 0 &&
      roundMoney(totals.total) >= 0,
  );
}

function verifiedLegacyBackfillProjection(document: Document): Document | null {
  const snapshot = document.documentSnapshot;
  if (
    snapshot?.source !== "legacy_backfill" ||
    snapshot.documentType !== document.type ||
    document.pdfSnapshot ||
    document.snapshotSeal ||
    !inspectDocumentSnapshotsIntegrity(
      { documentSnapshot: snapshot },
      { requireDocumentSnapshot: true },
    ).ok
  ) {
    return null;
  }
  const projected: Document = {
    ...document,
    type: snapshot.documentType,
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
    paymentTerms: snapshot.paymentTerms,
    issuer: { ...snapshot.issuer },
    rectification: snapshot.rectification
      ? { ...snapshot.rectification }
      : undefined,
  };
  if (Object.prototype.hasOwnProperty.call(snapshot, "sourceDocumentId")) {
    projected.sourceDocumentId = snapshot.sourceDocumentId;
  }
  return projected;
}

function rolloutIssuesAreOnlyMissing(document: Document): boolean {
  const issues = document.snapshotIntegrity?.issues ?? [];
  return issues.every((issue) => MISSING_ROLLOUT_ISSUES.has(issue));
}

function reviewReasons(
  document: Document,
  duplicateIds: ReadonlySet<string>,
): LegacyImportRepairReviewReason[] {
  const reasons: LegacyImportRepairReviewReason[] = [];
  const legacySnapshotProjection = verifiedLegacyBackfillProjection(document);
  const fiscalSource = legacySnapshotProjection ?? document;
  if (!detectLegacyImportSource(document)) reasons.push("namespace_type_mismatch");
  if (duplicateIds.has(document.id)) reasons.push("duplicate_document_id");
  if (document.status === "borrador") reasons.push("draft_document");
  if (fiscalSource.rectification || fiscalSource.type === "recibo") {
    reasons.push("unsupported_historical_relation");
  }
  if (
    (document.documentSnapshot && !legacySnapshotProjection) ||
    document.pdfSnapshot ||
    document.snapshotSeal
  ) {
    reasons.push("existing_integrity_evidence");
  }
  if (document.verifactu || document.verifactuPersistence) {
    reasons.push("verifactu_evidence");
  }
  if (document.integrityQuarantine) reasons.push("integrity_quarantine");
  if (!rolloutIssuesAreOnlyMissing(document)) {
    reasons.push("unexpected_integrity_issue");
  }
  if (!issuerIsComplete(fiscalSource)) reasons.push("issuer_incomplete");
  if (!hasFiniteFiscalContent(fiscalSource)) {
    reasons.push("fiscal_content_invalid");
  }
  return [...new Set(reasons)];
}

function duplicateDocumentIds(documents: Document[]): Set<string> {
  const counts = new Map<string, number>();
  documents.forEach((document) =>
    counts.set(document.id, (counts.get(document.id) ?? 0) + 1),
  );
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([documentId]) => documentId),
  );
}

export function buildLegacyImportRepairPreview(
  data: AppData,
): LegacyImportRepairPreview {
  const candidates: LegacyImportRepairCandidate[] = [];
  const manualReview: LegacyImportRepairReviewItem[] = [];
  const alreadyAttestedDocumentIds: string[] = [];
  const duplicateIds = duplicateDocumentIds(data.documents);

  for (const document of data.documents) {
    if (document.legacyImportAttestation) {
      if (inspectLegacyImportAttestation(document).ok) {
        alreadyAttestedDocumentIds.push(document.id);
      } else {
        manualReview.push({
          documentId: document.id,
          documentNumber: document.number,
          reasons: ["attestation_invalid"],
        });
      }
      continue;
    }
    if (!hasKnownImportPrefix(document)) continue;
    const reasons = reviewReasons(document, duplicateIds);
    if (data.snapshotIntegrityVersion !== 1) {
      reasons.push("unexpected_integrity_issue");
    }
    const importer = detectLegacyImportSource(document);
    if (reasons.length > 0 || !importer) {
      manualReview.push({
        documentId: document.id,
        documentNumber: document.number,
        reasons: [...new Set(reasons)],
      });
      continue;
    }
    candidates.push({
      documentId: document.id,
      documentNumber: document.number,
      importer,
      beforeFingerprint: documentFingerprint(document),
    });
  }

  return {
    schemaVersion: 1,
    precondition: previewPrecondition(data),
    affectedCount: candidates.length,
    candidates,
    manualReview,
    alreadyAttestedDocumentIds,
  };
}

function buildAttestedDocument(
  document: Document,
  profile: BusinessProfile,
  importer: LegacyImportSource,
  attestedAt: string,
): Document {
  const legacySnapshotProjection = verifiedLegacyBackfillProjection(document);
  const fiscalSource = legacySnapshotProjection ?? document;
  if (!fiscalSource.issuer) throw new Error("legacy_import_issuer_missing");
  const historicalProfile: BusinessProfile = {
    ...profile,
    iva: {
      rates: [...new Set(fiscalSource.items.map((item) => item.ivaPercent))].sort(
        (left, right) => left - right,
      ),
      defaultRate: fiscalSource.items[0]?.ivaPercent ?? 0,
    },
    vatExempt: false,
    verifactu: undefined,
  };
  const snapshot = legacySnapshotProjection
    ? document.documentSnapshot!
    : buildDocumentSnapshot(fiscalSource, historicalProfile, {
        source: "legacy_import_attested",
        capturedAt: fiscalSource.issuer.capturedAt,
        issuer: fiscalSource.issuer,
      });
  const attestation = buildAttestation(
    document,
    importer,
    snapshot,
    attestedAt,
  );
  const next: Document = {
    ...document,
    documentSnapshot: snapshot,
    legacyImportAttestation: attestation,
    legacyImportProvenance: {
      schemaVersion: 1,
      kind: "external_import",
      importer,
      importedAt: attestedAt,
    },
    documentLifecycle:
      document.documentLifecycle === "canceled" || document.status === "anulada"
        ? "canceled"
        : "issued",
    integrityLock: "locked",
  };
  delete next.pdfSnapshot;
  delete next.snapshotSeal;
  delete next.snapshotIntegrityRequired;
  delete next.snapshotIntegrity;
  const inspected = inspectLegacyImportAttestation(next);
  if (!inspected.ok) throw new Error(inspected.reason);
  return projectLegacyImportSnapshotOntoDocument(next);
}

export function attestNewImportedDocument(
  document: Document,
  profile: BusinessProfile,
  importer: LegacyImportSource,
  attestedAt = new Date().toISOString(),
): Document {
  if (detectLegacyImportSource(document) !== importer) return document;
  const provenance = {
    schemaVersion: 1 as const,
    kind: "external_import" as const,
    importer,
    importedAt: attestedAt,
  };
  if (document.status === "borrador") {
    return { ...document, legacyImportProvenance: provenance };
  }
  if (document.legacyImportAttestation) return document;
  if (reviewReasons(document, new Set()).length > 0) return document;
  return buildAttestedDocument(
    { ...document, legacyImportProvenance: provenance },
    profile,
    importer,
    attestedAt,
  );
}

export function applyLegacyImportRepair(
  data: AppData,
  preview: LegacyImportRepairPreview,
  attestedAt = new Date().toISOString(),
): LegacyImportRepairApplyResult {
  const current = buildLegacyImportRepairPreview(data);
  if (
    preview.schemaVersion !== 1 ||
    preview.precondition !== current.precondition ||
    stableStringifySnapshot(preview.candidates) !==
      stableStringifySnapshot(current.candidates)
  ) {
    return { status: "blocked", reason: "stale_preview" };
  }
  if (current.candidates.length === 0) {
    return { status: "blocked", reason: "no_candidates" };
  }
  const byId = new Map(
    current.candidates.map((candidate) => [candidate.documentId, candidate]),
  );
  try {
    const documents = data.documents.map((document) => {
      const candidate = byId.get(document.id);
      if (!candidate) return document;
      if (documentFingerprint(document) !== candidate.beforeFingerprint) {
        throw new Error("stale_candidate");
      }
      return buildAttestedDocument(
        document,
        data.profile,
        candidate.importer,
        attestedAt,
      );
    });
    return {
      status: "applied",
      data: { ...data, documents },
      appliedDocumentIds: current.candidates.map(
        (candidate) => candidate.documentId,
      ),
    };
  } catch {
    return { status: "blocked", reason: "candidate_invalid" };
  }
}
