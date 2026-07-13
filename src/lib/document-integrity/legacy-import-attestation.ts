import { hasUsualSpanishTaxIdShape } from "@/lib/business-profile";
import { documentTotals, roundMoney } from "@/lib/calculations";
import { clientAddressToFormFields } from "@/lib/customer-address";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import type {
  AppData,
  BusinessProfile,
  Document,
  DocumentSnapshot,
  DocumentSnapshotIntegrityIssue,
  LegacyImportAttestationV2,
  LegacyImportCompletenessException,
  LegacyImportIssuerOrigin,
  LegacyImportProvenance,
  LegacyImportProvenanceV2,
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
  | "duplicate_fiscal_identity"
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
  issuerOrigin: LegacyImportIssuerOrigin;
  completenessExceptions: LegacyImportCompletenessException[];
  amounts: {
    subtotal: number;
    iva: number;
    total: number;
  };
  beforeFingerprint: string;
}

export interface LegacyImportRepairReviewItem {
  documentId: string;
  documentNumber: string;
  reasons: LegacyImportRepairReviewReason[];
}

export interface LegacyImportRepairPreview {
  schemaVersion: 2;
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
      acceptedContentPolicy?: "stored_fiscal_content_user_authoritative";
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

function isValidLegacyImportProvenance(
  provenance: Document["legacyImportProvenance"],
): provenance is LegacyImportProvenance {
  if (
    !provenance ||
    provenance.kind !== "external_import" ||
    !Object.prototype.hasOwnProperty.call(SOURCE_PREFIXES, provenance.importer)
  ) {
    return false;
  }
  if (provenance.schemaVersion === 1) {
    return isIsoDateTime(provenance.importedAt);
  }
  return Boolean(
    provenance.schemaVersion === 2 &&
      (provenance.importedAt === null ||
        isIsoDateTime(provenance.importedAt)) &&
      isIsoDateTime(provenance.provenanceRecordedAt) &&
      (provenance.issuerOrigin === "source_document" ||
        provenance.issuerOrigin === "current_profile_at_import" ||
        provenance.issuerOrigin === "unknown_legacy_import") &&
      (provenance.documentStateAtImport === "draft" ||
        provenance.documentStateAtImport === "issued" ||
        provenance.documentStateAtImport === "unknown_legacy_import"),
  );
}

export function detectLegacyImportSource(
  document: Pick<Document, "id" | "type"> &
    Partial<Pick<Document, "legacyImportProvenance">>,
): LegacyImportSource | null {
  const [prefix, kind, suffix, ...extra] = document.id.split(":");
  const namespaceSource = prefix ? sourceForPrefix(prefix) : null;
  const provenance = document.legacyImportProvenance;
  const provenanceValid = isValidLegacyImportProvenance(provenance);
  const provenanceSource = provenanceValid
    ? provenance.importer
    : null;

  if (namespaceSource) {
    if (
      (provenance && !provenanceValid) ||
      !kind ||
      !suffix ||
      extra.length > 0 ||
      kind !== document.type ||
      (kind !== "factura" && kind !== "presupuesto") ||
      (provenanceSource && provenanceSource !== namespaceSource)
    ) {
      return null;
    }
    return namespaceSource;
  }
  return provenanceSource;
}

function hasKnownImportPrefix(document: Document): boolean {
  const prefix = document.id.split(":", 1)[0];
  return Object.values(SOURCE_PREFIXES).includes(prefix);
}

function attestationHashPayload(attestation: unknown): unknown {
  return attestation;
}

function acceptedStateFromDocument(
  document: Document,
): LegacyImportAttestationV2["acceptedState"] {
  return {
    status: document.status,
    documentLifecycle: "issued",
    integrityLock: "locked",
    deliveryStatus: document.deliveryStatus ?? null,
    paymentStatus: document.paymentStatus ?? null,
    acceptanceStatus: document.acceptanceStatus ?? null,
    issuedAt: document.issuedAt ?? null,
    sentAt: document.sentAt ?? null,
    paidAt: document.paidAt ?? null,
    acceptedAt: document.acceptedAt ?? null,
    updatedAt: document.updatedAt,
    relationships: {
      sourceQuoteDocumentId: document.sourceQuoteDocumentId ?? null,
      sourceQuoteNumber: document.sourceQuoteNumber ?? null,
      rectifiedById: null,
      receiptDocumentId: null,
      sourceDocumentId: null,
    },
  };
}

function sourceRecordFromDocument(
  document: Document & { issuer: NonNullable<Document["issuer"]> },
): LegacyImportAttestationV2["sourceRecord"] {
  return {
    type: document.type,
    number: document.number,
    date: document.date,
    dueDate: document.dueDate,
    client: { ...document.client },
    // Las proyecciones PDF pueden añadir subtotal/IVA/total calculados a cada
    // línea. El contrato fiscal congelado solo contiene los campos persistidos
    // de LineItem, de modo que ese enriquecimiento efímero no parece una
    // manipulación y una modificación real sí sigue cambiando el hash.
    items: document.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
    })),
    issuer: { ...document.issuer },
    notes: document.notes,
    paymentTerms: document.paymentTerms,
  };
}

function completenessExceptionsFromDocument(
  document: Document & { issuer: NonNullable<Document["issuer"]> },
): LegacyImportCompletenessException[] {
  const exceptions: LegacyImportCompletenessException[] = [];
  const issuer = document.issuer;
  if (!issuer.name.trim()) exceptions.push("issuer_name_missing");
  const issuerNif = issuer.nif.trim();
  if (!issuerNif || !hasUsualSpanishTaxIdShape(issuerNif)) {
    exceptions.push("issuer_nif_missing_or_nonstandard");
  }
  if (!issuer.address.trim()) exceptions.push("issuer_address_missing");
  if (!issuer.city.trim()) exceptions.push("issuer_city_missing");
  if (!issuer.postalCode.trim()) {
    exceptions.push("issuer_postal_code_missing");
  }

  if (document.type === "factura") {
    const customerAddress = clientAddressToFormFields(document.client);
    if (!document.client.name.trim()) exceptions.push("customer_name_missing");
    const customerNif = document.client.nif?.trim() ?? "";
    if (!customerNif || !hasUsualSpanishTaxIdShape(customerNif)) {
      exceptions.push("customer_nif_missing_or_nonstandard");
    }
    if (!customerAddress.streetLine.trim()) {
      exceptions.push("customer_address_missing");
    }
    if (!customerAddress.city.trim()) exceptions.push("customer_city_missing");
    if (!customerAddress.postalCode.trim()) {
      exceptions.push("customer_postal_code_missing");
    }
  }
  if (document.items.some((item) => !item.description.trim())) {
    exceptions.push("line_description_missing");
  }
  return exceptions;
}

function buildAttestation(
  document: Document,
  importer: LegacyImportSource,
  snapshot: DocumentSnapshot,
  fiscalSource: Document & { issuer: NonNullable<Document["issuer"]> },
  importProvenance: LegacyImportProvenanceV2,
  amountOrigin: LegacyImportAttestationV2["amountOrigin"],
  attestedAt: string,
): LegacyImportAttestationV2 {
  const sourceRecord = sourceRecordFromDocument(fiscalSource);
  const withoutHash: Omit<LegacyImportAttestationV2, "attestationHash"> = {
    schemaVersion: 2,
    kind: ATTESTATION_KIND,
    importer,
    documentId: document.id,
    attestedAt,
    snapshotContentHash: hashStrongDocumentSnapshotContent(snapshot),
    originalEvidence: {
      kind: "source_files_not_stored",
      preservation: "user_managed",
    },
    acceptedState: acceptedStateFromDocument(document),
    acceptanceBasis: "amounts_as_filed_user_attested",
    amountOrigin,
    importProvenance,
    sourceRecord,
    sourceRecordHash: sha256Stable(sourceRecord),
    acceptedTaxSummary: snapshot.taxSummary,
    acceptedContentPolicy: {
      kind: "stored_fiscal_content_user_authoritative",
      completenessExceptions: completenessExceptionsFromDocument(fiscalSource),
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

function defaultIssuerOrigin(
  importer: LegacyImportSource,
): LegacyImportIssuerOrigin {
  return importer === "generic_documents"
    ? "unknown_legacy_import"
    : "current_profile_at_import";
}

function provenanceForRepair(
  document: Document,
  importer: LegacyImportSource,
  recordedAt: string,
): LegacyImportProvenanceV2 {
  const existing = document.legacyImportProvenance;
  if (isValidLegacyImportProvenance(existing) && existing.importer === importer) {
    if (existing.schemaVersion === 2) return { ...existing };
    return {
      schemaVersion: 2,
      kind: "external_import",
      importer,
      importedAt: existing.importedAt,
      provenanceRecordedAt: recordedAt,
      issuerOrigin: defaultIssuerOrigin(importer),
      documentStateAtImport: "unknown_legacy_import",
    };
  }
  return {
    schemaVersion: 2,
    kind: "external_import",
    importer,
    importedAt: null,
    provenanceRecordedAt: recordedAt,
    issuerOrigin: defaultIssuerOrigin(importer),
    documentStateAtImport: "unknown_legacy_import",
  };
}

function provenanceForNewImport(
  document: Document,
  importer: LegacyImportSource,
  importedAt: string,
  issuerOrigin: LegacyImportIssuerOrigin,
): LegacyImportProvenanceV2 {
  const existing = document.legacyImportProvenance;
  if (
    isValidLegacyImportProvenance(existing) &&
    existing.schemaVersion === 2 &&
    existing.importer === importer
  ) {
    return { ...existing };
  }
  return {
    schemaVersion: 2,
    kind: "external_import",
    importer,
    importedAt,
    provenanceRecordedAt: importedAt,
    issuerOrigin,
    documentStateAtImport:
      document.status === "borrador" ? "draft" : "issued",
  };
}

function issuerOriginForPreview(
  document: Document,
  importer: LegacyImportSource,
): LegacyImportIssuerOrigin {
  const provenance = document.legacyImportProvenance;
  return provenance?.schemaVersion === 2 &&
    isValidLegacyImportProvenance(provenance)
    ? provenance.issuerOrigin
    : defaultIssuerOrigin(importer);
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
    (attestation.schemaVersion !== 1 && attestation.schemaVersion !== 2) ||
    attestation.kind !== ATTESTATION_KIND ||
    attestation.documentId !== document.id ||
    !attestation.originalEvidence ||
    attestation.originalEvidence.kind !== "source_files_not_stored" ||
    attestation.originalEvidence.preservation !== "user_managed" ||
    !isIsoDateTime(attestation.attestedAt) ||
    detectLegacyImportSource(document) !== attestation.importer ||
    (snapshot.source !== "legacy_import_attested" &&
      snapshot.source !== "legacy_backfill") ||
    !isValidLegacyImportProvenance(document.legacyImportProvenance) ||
    document.legacyImportProvenance.importer !== attestation.importer ||
    !attestation.acceptedState ||
    !attestation.acceptedState.relationships ||
    attestation.acceptedState.documentLifecycle !== "issued" ||
    attestation.acceptedState.integrityLock !== "locked" ||
    attestation.acceptedState.relationships.rectifiedById !== null ||
    attestation.acceptedState.relationships.receiptDocumentId !== null ||
    attestation.acceptedState.relationships.sourceDocumentId !== null ||
    document.documentLifecycle !== "issued" ||
    document.integrityLock !== "locked" ||
    Boolean(document.rectifiedById) ||
    Boolean(document.receiptDocumentId) ||
    Boolean(document.sourceDocumentId) ||
    Boolean(document.rectification) ||
    snapshot.documentType !== document.type ||
    document.pdfSnapshot ||
    document.snapshotSeal ||
    document.snapshotIntegrityRequired ||
    document.verifactu ||
    document.verifactuPersistence ||
    snapshot.verifactu ||
    snapshot.fiscalContext.verifactu?.enabled ||
    document.integrityQuarantine ||
    Boolean(document.snapshotIntegrity)
  ) {
    return { ok: false, reason: "attestation_contract_invalid" };
  }
  if (
    stableStringifySnapshot(attestation.acceptedState) !==
    stableStringifySnapshot(acceptedStateFromDocument(document))
  ) {
    return { ok: false, reason: "attested_state_mismatch" };
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
  if (attestation.schemaVersion === 2) {
    if (
      document.legacyImportProvenance.schemaVersion !== 2 ||
      document.legacyImportProvenance.documentStateAtImport === "draft" ||
      attestation.importProvenance.schemaVersion !== 2 ||
      attestation.importProvenance.documentStateAtImport === "draft" ||
      attestation.acceptanceBasis !== "amounts_as_filed_user_attested" ||
      (attestation.amountOrigin !== "verified_legacy_snapshot" &&
        attestation.amountOrigin !== "persisted_lines_user_confirmed") ||
      attestation.acceptedContentPolicy?.kind !==
        "stored_fiscal_content_user_authoritative" ||
      stableStringifySnapshot(attestation.importProvenance) !==
        stableStringifySnapshot(document.legacyImportProvenance) ||
      snapshot.items.length === 0 ||
      !document.issuer ||
      attestation.sourceRecordHash !==
        sha256Stable(attestation.sourceRecord) ||
      stableStringifySnapshot(attestation.sourceRecord) !==
        stableStringifySnapshot(
          sourceRecordFromDocument({
            ...document,
            issuer: document.issuer,
          }),
        ) ||
      stableStringifySnapshot(attestation.acceptedTaxSummary) !==
        stableStringifySnapshot(snapshot.taxSummary) ||
      stableStringifySnapshot(
        attestation.acceptedContentPolicy.completenessExceptions,
      ) !==
        stableStringifySnapshot(
          completenessExceptionsFromDocument({
            ...document,
            issuer: document.issuer,
          }),
        )
    ) {
      return { ok: false, reason: "attestation_content_policy_invalid" };
    }
  } else if (
    document.legacyImportProvenance.schemaVersion !== 1 ||
    document.legacyImportProvenance.importedAt !== attestation.attestedAt
  ) {
    return { ok: false, reason: "attestation_contract_invalid" };
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
 * Una reclamación legacy, incluso corrupta o incompleta, siempre conserva el
 * modo protegido. La validez para cálculos se decide por separado y nunca
 * puede ampliar permisos de edición al fallar una verificación.
 */
export function hasLegacyImportProtectionClaim(document: Document): boolean {
  const snapshotSource = document.documentSnapshot?.source;
  const provisionalHistoricalImport = Boolean(
    (document.legacyImportProvenance || hasKnownImportPrefix(document)) &&
      document.status !== "borrador" &&
      document.documentLifecycle === "issued" &&
      document.integrityLock === "locked" &&
      snapshotSource !== "issue" &&
      snapshotSource !== "customer_repair",
  );
  return Boolean(
    document.legacyImportAttestation ||
      snapshotSource === "legacy_import_attested" ||
      snapshotSource === "legacy_backfill" ||
      provisionalHistoricalImport,
  );
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
      ...(document.legacyImportAttestation.schemaVersion === 2
        ? {
            acceptedContentPolicy:
              "stored_fiscal_content_user_authoritative" as const,
          }
        : {}),
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
  return document.status === "borrador";
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
  return projected;
}

function hasSafeStoredFiscalContent(document: Document): boolean {
  const totals = documentTotals(document, false);
  return Boolean(
    document.number.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(document.date) &&
      (!document.issuer || isIsoDateTime(document.issuer.capturedAt)) &&
      document.items.length > 0 &&
      document.items.every(
        (item) =>
          Number.isFinite(item.quantity) &&
          Number.isFinite(item.unitPrice) &&
          Number.isFinite(item.ivaPercent),
      ) &&
      Number.isFinite(roundMoney(totals.subtotal)) &&
      Number.isFinite(roundMoney(totals.iva)) &&
      Number.isFinite(roundMoney(totals.total)),
  );
}

function verifiedLegacyBackfillProjection(document: Document): Document | null {
  const snapshot = document.documentSnapshot;
  if (
    snapshot?.source !== "legacy_backfill" ||
    snapshot.documentType !== document.type ||
    Boolean(snapshot.verifactu) ||
    Boolean(snapshot.fiscalContext.verifactu?.enabled) ||
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
  if (!document.snapshotIntegrity) return true;
  return hasOnlyLegacyImportRolloutResidue(document);
}

function hasHistoricalImporterIssuedAtProof(
  document: Document,
  importer: LegacyImportSource | null,
): boolean {
  const provenance = document.legacyImportProvenance;
  const importedAt =
    isValidLegacyImportProvenance(provenance) &&
    provenance.importer === importer
      ? provenance.importedAt
      : null;
  // Holded y FacturaDirecta persisten issuedAt como la fecha histórica al
  // importar directamente un documento ya emitido. Esa fecha debe ser
  // anterior a la importación registrada. Un borrador externo emitido después
  // por Factu tiene issuedAt igual o posterior y nunca puede degradarse a V2.
  return Boolean(
    (importer === "holded" || importer === "facturadirecta") &&
      document.issuedAt &&
      document.issuedAt === document.createdAt &&
      document.updatedAt === document.createdAt &&
      (!importedAt || Date.parse(document.issuedAt) < Date.parse(importedAt)) &&
      !document.sentAt &&
      !document.paidAt &&
      !document.acceptedAt,
  );
}

function hasNoAppActionTimestamps(document: Document): boolean {
  return Boolean(
    !document.issuedAt &&
      !document.sentAt &&
      !document.paidAt &&
      !document.acceptedAt,
  );
}

function hasUnambiguousHistoricalRepairFingerprint(
  document: Document,
  importer: LegacyImportSource | null,
): boolean {
  if (!importer) return false;
  const provenance = document.legacyImportProvenance;
  if (
    provenance?.schemaVersion === 2 &&
    provenance.documentStateAtImport === "draft"
  ) {
    return false;
  }

  // `legacy_backfill` solo lo producían los importadores al normalizar un
  // documento externo ya persistido. Un snapshot íntegro de ese origen es la
  // prueba más fuerte disponible para workspaces anteriores a V2, donde la
  // procedencia aún no se guardaba en el propio Document.
  if (verifiedLegacyBackfillProjection(document)) return true;

  if (importer === "pcfacturacion") {
    return Boolean(
      hasNoAppActionTimestamps(document) &&
        document.updatedAt === document.createdAt &&
        document.deliveryStatus === undefined &&
        document.paymentStatus === undefined &&
        document.acceptanceStatus === undefined,
    );
  }

  if (importer === "generic_documents") {
    return Boolean(
      provenance?.schemaVersion === 2 &&
        provenance.documentStateAtImport === "issued" &&
        hasNoAppActionTimestamps(document) &&
        document.deliveryStatus === undefined &&
        document.paymentStatus === undefined &&
        document.acceptanceStatus === undefined,
    );
  }

  return hasHistoricalImporterIssuedAtProof(document, importer);
}

/**
 * Excepción estrecha para que el validador relacional no confunda un NIF
 * antiguo ausente/no estándar con corrupción antes de que el usuario pueda
 * ver y confirmar la reparación. No convierte el documento en utilizable: la
 * atestación V2 explícita sigue siendo obligatoria.
 */
export function isVerifiedLegacyImportRepairSnapshotCandidate(
  document: Document,
): boolean {
  const importer = detectLegacyImportSource(document);
  return Boolean(
    importer &&
      verifiedLegacyBackfillProjection(document) &&
      hasUnambiguousHistoricalRepairFingerprint(document, importer) &&
      !document.verifactu &&
      !document.verifactuPersistence &&
      !document.integrityQuarantine &&
      document.status !== "borrador" &&
      document.status !== "anulada" &&
      document.status !== "rectificada" &&
      document.documentLifecycle === "issued" &&
      document.integrityLock === "locked" &&
      !document.rectification &&
      !document.rectifiedById &&
      !document.receiptDocumentId &&
      !document.sourceDocumentId,
  );
}

function reviewReasons(
  document: Document,
  duplicateIds: ReadonlySet<string>,
  context: "repair" | "direct_import" = "repair",
): LegacyImportRepairReviewReason[] {
  const reasons: LegacyImportRepairReviewReason[] = [];
  const legacySnapshotProjection = verifiedLegacyBackfillProjection(document);
  const fiscalSource = legacySnapshotProjection ?? document;
  const importer = detectLegacyImportSource(document);
  if (!importer) reasons.push("namespace_type_mismatch");
  if (duplicateIds.has(document.id)) reasons.push("duplicate_document_id");
  if (document.status === "borrador") reasons.push("draft_document");
  if (
    fiscalSource.rectification ||
    document.rectification ||
    fiscalSource.type === "recibo" ||
    document.status === "anulada" ||
    document.status === "rectificada" ||
    document.documentLifecycle === "canceled" ||
    Boolean(document.rectifiedById) ||
    Boolean(document.receiptDocumentId) ||
    Boolean(document.sourceDocumentId)
  ) {
    reasons.push("unsupported_historical_relation");
  }
  if (
    (document.documentSnapshot && !legacySnapshotProjection) ||
    document.pdfSnapshot ||
    document.snapshotSeal ||
    (context === "repair" &&
      !hasUnambiguousHistoricalRepairFingerprint(document, importer))
  ) {
    reasons.push("existing_integrity_evidence");
  }
  if (
    document.verifactu ||
    document.verifactuPersistence ||
    document.documentSnapshot?.verifactu ||
    document.documentSnapshot?.fiscalContext?.verifactu?.enabled
  ) {
    reasons.push("verifactu_evidence");
  }
  if (document.integrityQuarantine) reasons.push("integrity_quarantine");
  if (!rolloutIssuesAreOnlyMissing(document)) {
    reasons.push("unexpected_integrity_issue");
  }
  if (!fiscalSource.issuer) reasons.push("issuer_incomplete");
  if (!hasSafeStoredFiscalContent(fiscalSource)) {
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

function normalizedFiscalIdentityText(value: string | undefined): string {
  return value?.replace(/[\s.-]/g, "").toUpperCase() ?? "";
}

function hasStrongIssuerIdentity(value: string | undefined): boolean {
  return Boolean(normalizedFiscalIdentityText(value)) &&
    hasUsualSpanishTaxIdShape(value);
}

function fiscalIdentityFromDocument(document: Document): string | null {
  const projected = verifiedLegacyBackfillProjection(document) ?? document;
  if (projected.type !== "factura" && projected.type !== "recibo") return null;
  const issuerNif = normalizedFiscalIdentityText(projected.issuer?.nif);
  const number = projected.number.trim().toUpperCase();
  const year = projected.date.slice(0, 4);
  if (
    !hasStrongIssuerIdentity(projected.issuer?.nif) ||
    !issuerNif ||
    !number ||
    !/^\d{4}$/.test(year)
  ) {
    return null;
  }
  return [projected.type, issuerNif, year, number].join("|");
}

function storedFiscalIdentityClaim(document: Document): string | null {
  const snapshot = document.documentSnapshot;
  if (
    !snapshot ||
    (snapshot.documentType !== "factura" &&
      snapshot.documentType !== "recibo") ||
    !inspectDocumentSnapshotsIntegrity(document, {
      requireDocumentSnapshot: true,
    }).ok
  ) {
    return null;
  }
  const issuerNif = normalizedFiscalIdentityText(snapshot.issuer.nif);
  const number = snapshot.number.trim().toUpperCase();
  const year = snapshot.date.slice(0, 4);
  if (
    !hasStrongIssuerIdentity(snapshot.issuer.nif) ||
    !issuerNif ||
    !number ||
    !/^\d{4}$/.test(year)
  ) {
    return null;
  }
  return [snapshot.documentType, issuerNif, year, number].join("|");
}

function fiscalNumberIdentityFromDocument(document: Document): string | null {
  const projected = verifiedLegacyBackfillProjection(document) ?? document;
  if (projected.type !== "factura" && projected.type !== "recibo") return null;
  const number = projected.number.trim().toUpperCase();
  const year = projected.date.slice(0, 4);
  if (!number || !/^\d{4}$/.test(year)) return null;
  return [projected.type, year, number].join("|");
}

export function buildLegacyImportRepairPreview(
  data: AppData,
): LegacyImportRepairPreview {
  const candidates: LegacyImportRepairCandidate[] = [];
  const manualReview: LegacyImportRepairReviewItem[] = [];
  const alreadyAttestedDocumentIds: string[] = [];
  const duplicateIds = duplicateDocumentIds(data.documents);
  const reportedDuplicateIds = new Set<string>();

  for (const document of data.documents) {
    if (duplicateIds.has(document.id)) {
      if (!reportedDuplicateIds.has(document.id)) {
        reportedDuplicateIds.add(document.id);
        manualReview.push({
          documentId: document.id,
          documentNumber: document.number,
          reasons: ["duplicate_document_id"],
        });
      }
      continue;
    }
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
    if (!hasKnownImportPrefix(document) && !document.legacyImportProvenance) {
      continue;
    }
    const reasons = reviewReasons(document, duplicateIds);
    if (
      document.documentLifecycle !== "issued" ||
      document.integrityLock !== "locked"
    ) {
      reasons.push("unexpected_integrity_issue");
    }
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
    const legacySnapshotProjection = verifiedLegacyBackfillProjection(document);
    const fiscalSource = legacySnapshotProjection ?? document;
    if (!fiscalSource.issuer) {
      manualReview.push({
        documentId: document.id,
        documentNumber: document.number,
        reasons: ["issuer_incomplete"],
      });
      continue;
    }
    const amounts = legacySnapshotProjection
      ? document.documentSnapshot!.taxSummary
      : documentTotals(fiscalSource, false);
    candidates.push({
      documentId: document.id,
      documentNumber: fiscalSource.number,
      importer,
      issuerOrigin: issuerOriginForPreview(document, importer),
      completenessExceptions: completenessExceptionsFromDocument({
        ...fiscalSource,
        issuer: fiscalSource.issuer,
      }),
      amounts: {
        subtotal: roundMoney(amounts.subtotal),
        iva: roundMoney(amounts.iva),
        total: roundMoney(amounts.total),
      },
      beforeFingerprint: documentFingerprint(document),
    });
  }

  const candidateIds = new Set(candidates.map((candidate) => candidate.documentId));
  const claims = new Map<string, Set<string>>();
  for (const document of data.documents) {
    const identity =
      storedFiscalIdentityClaim(document) ??
      (candidateIds.has(document.id) || document.status !== "borrador"
        ? fiscalIdentityFromDocument(document)
        : null);
    if (!identity) continue;
    const ids = claims.get(identity) ?? new Set<string>();
    ids.add(document.id);
    claims.set(identity, ids);
  }
  const collidingCandidateIds = new Set<string>();
  for (const candidate of candidates) {
    const document = data.documents.find(
      (entry) => entry.id === candidate.documentId,
    );
    const identity = document ? fiscalIdentityFromDocument(document) : null;
    if (identity && (claims.get(identity)?.size ?? 0) > 1) {
      collidingCandidateIds.add(candidate.documentId);
      manualReview.push({
        documentId: candidate.documentId,
        documentNumber: candidate.documentNumber,
        reasons: ["duplicate_fiscal_identity"],
      });
    }
  }
  // Si falta el NIF histórico no existe una identidad fiscal fuerte. En ese
  // caso, cualquier coincidencia tipo+año+número dentro del mismo workspace
  // queda en revisión en vez de poder aceptar dos veces la misma factura.
  const numberClaims = new Map<
    string,
    Array<{ documentId: string; hasStrongIdentity: boolean }>
  >();
  for (const document of data.documents) {
    if (document.status === "borrador" && !candidateIds.has(document.id)) {
      continue;
    }
    const identity = fiscalNumberIdentityFromDocument(document);
    if (!identity) continue;
    const entries = numberClaims.get(identity) ?? [];
    entries.push({
      documentId: document.id,
      hasStrongIdentity: Boolean(
        storedFiscalIdentityClaim(document) ??
          fiscalIdentityFromDocument(document),
      ),
    });
    numberClaims.set(identity, entries);
  }
  for (const candidate of candidates) {
    const document = data.documents.find(
      (entry) => entry.id === candidate.documentId,
    );
    const identity = document
      ? fiscalNumberIdentityFromDocument(document)
      : null;
    const entries = identity ? numberClaims.get(identity) ?? [] : [];
    if (
      entries.length > 1 &&
      entries.some((entry) => !entry.hasStrongIdentity) &&
      !collidingCandidateIds.has(candidate.documentId)
    ) {
      collidingCandidateIds.add(candidate.documentId);
      manualReview.push({
        documentId: candidate.documentId,
        documentNumber: candidate.documentNumber,
        reasons: ["duplicate_fiscal_identity"],
      });
    }
  }
  const collidingAttestedIds = new Set<string>();
  for (const documentId of alreadyAttestedDocumentIds) {
    const document = data.documents.find((entry) => entry.id === documentId);
    if (!document) continue;
    const strongIdentity = storedFiscalIdentityClaim(document);
    const numberIdentity = fiscalNumberIdentityFromDocument(document);
    const numberEntries = numberIdentity
      ? numberClaims.get(numberIdentity) ?? []
      : [];
    const hasStrongCollision = Boolean(
      strongIdentity && (claims.get(strongIdentity)?.size ?? 0) > 1,
    );
    const hasWeakCollision =
      numberEntries.length > 1 &&
      numberEntries.some((entry) => !entry.hasStrongIdentity);
    if (!hasStrongCollision && !hasWeakCollision) continue;
    collidingAttestedIds.add(document.id);
    manualReview.push({
      documentId: document.id,
      documentNumber: document.number,
      reasons: ["duplicate_fiscal_identity"],
    });
  }
  const safeCandidates = candidates.filter(
    (candidate) => !collidingCandidateIds.has(candidate.documentId),
  );

  return {
    schemaVersion: 2,
    precondition: previewPrecondition(data),
    affectedCount: safeCandidates.length,
    candidates: safeCandidates,
    manualReview,
    alreadyAttestedDocumentIds: alreadyAttestedDocumentIds.filter(
      (documentId) => !collidingAttestedIds.has(documentId),
    ),
  };
}

function buildAttestedDocument(
  document: Document,
  profile: BusinessProfile,
  importer: LegacyImportSource,
  attestedAt: string,
  importProvenance: LegacyImportProvenanceV2,
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
  const protectedDocument: Document = {
    ...document,
    type: fiscalSource.type,
    number: fiscalSource.number,
    date: fiscalSource.date,
    dueDate: fiscalSource.dueDate,
    client: { ...fiscalSource.client },
    items: fiscalSource.items.map((item) => ({ ...item })),
    issuer: { ...fiscalSource.issuer },
    notes: fiscalSource.notes,
    paymentTerms: fiscalSource.paymentTerms,
    documentLifecycle: "issued",
    integrityLock: "locked",
  };
  const attestation = buildAttestation(
    protectedDocument,
    importer,
    snapshot,
    { ...fiscalSource, issuer: fiscalSource.issuer },
    importProvenance,
    legacySnapshotProjection
      ? "verified_legacy_snapshot"
      : "persisted_lines_user_confirmed",
    attestedAt,
  );
  const next: Document = {
    ...protectedDocument,
    documentSnapshot: snapshot,
    legacyImportAttestation: attestation,
    legacyImportProvenance: importProvenance,
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
  options: {
    issuerOrigin?: LegacyImportIssuerOrigin;
  } = {},
): Document {
  if (detectLegacyImportSource(document) !== importer) return document;
  if (document.legacyImportAttestation) return document;
  // Los parsers actuales entregan registros frescos sin procedencia. Si ya
  // existe provenance, el documento pudo ser un borrador importado y emitido
  // después por Factu; nunca se reinterpreta mediante este atajo directo.
  if (document.legacyImportProvenance) return document;
  const provenance = provenanceForNewImport(
    document,
    importer,
    attestedAt,
    options.issuerOrigin ?? defaultIssuerOrigin(importer),
  );
  if (document.status === "borrador") {
    return { ...document, legacyImportProvenance: provenance };
  }
  const importedCandidate = {
    ...document,
    legacyImportProvenance: provenance,
  };
  if (reviewReasons(importedCandidate, new Set(), "direct_import").length > 0) {
    return document;
  }
  return buildAttestedDocument(
    importedCandidate,
    profile,
    importer,
    attestedAt,
    provenance,
  );
}

export function applyLegacyImportRepair(
  data: AppData,
  preview: LegacyImportRepairPreview,
  attestedAt = new Date().toISOString(),
): LegacyImportRepairApplyResult {
  const current = buildLegacyImportRepairPreview(data);
  if (
    preview.schemaVersion !== 2 ||
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
        provenanceForRepair(document, candidate.importer, attestedAt),
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
