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
  LegacyImportAttestationV3,
  LegacyImportCompletenessException,
  LegacyImportIssuerOrigin,
  LegacyImportProvenance,
  LegacyImportProvenanceV2,
  LegacyImportRelationshipKind,
  LegacyImportRelationshipRole,
  LegacyImportRolloutRepairEvidenceV1,
  LegacyImportSource,
} from "@/lib/types";
import {
  buildDocumentSnapshot,
  hashDocumentSnapshotWithAlgorithm,
  hashStrongDocumentPdfSnapshotContent,
  hashStrongDocumentSnapshotContent,
  inspectDocumentSnapshotsIntegrity,
  stableStringifySnapshot,
} from "./snapshots";
import { inspectAppIssuedDocumentRecovery } from "./app-issued-recovery";
import { hasAppIssuedRecoveryProtectionClaim } from "./app-issued-recovery-protection";

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
  evidenceBasis:
    | "persisted_lines_user_confirmed"
    | "verified_legacy_snapshot"
    | "verified_importer_rollout_bundle";
  rolloutRepairEvidence?: LegacyImportRolloutRepairEvidenceV1;
}

export interface LegacyImportRepairRelationshipMember {
  role: LegacyImportRelationshipRole;
  documentId: string;
  documentNumber: string;
  amounts: {
    subtotal: number;
    iva: number;
    total: number;
  };
}

export interface LegacyImportRepairRelationshipGroup {
  relation: LegacyImportRelationshipKind;
  groupFingerprint: string;
  documentIds: string[];
  documentNumbers: string[];
  members: LegacyImportRepairRelationshipMember[];
}

export interface LegacyImportRepairReviewItem {
  documentId: string;
  documentNumber: string;
  reasons: LegacyImportRepairReviewReason[];
}

export interface LegacyImportRepairPreview {
  schemaVersion: 2 | 3;
  precondition: string;
  affectedCount: number;
  candidates: LegacyImportRepairCandidate[];
  relationshipGroups: LegacyImportRepairRelationshipGroup[];
  manualReview: LegacyImportRepairReviewItem[];
  alreadyAttestedDocumentIds: string[];
}

export type LegacyImportRepairApplyResult =
  | {
      status: "applied";
      data: AppData;
      appliedDocumentIds: string[];
      appliedRelationshipGroupFingerprints: string[];
    }
  | {
      status: "blocked";
      reason: "stale_preview" | "no_candidates" | "candidate_invalid";
    };

export type LegacyImportAttestationInspection =
  { ok: true; snapshot: DocumentSnapshot } | { ok: false; reason: string };

export type UsableHistoricalDocumentEvidence =
  | {
      ok: true;
      kind:
        | "app_issued_sealed"
        | "app_issued_pdf_recovered"
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
  // La misma huella protege tanto la transición como la copia previa. Sería
  // incorrecto mantenerla válida si cambia un gasto, cliente, contador, cola
  // cloud o cualquier otro dato que la reparación conservará al persistir.
  return sha256Stable(data);
}

function sourceForPrefix(prefix: string): LegacyImportSource | null {
  return (
    (Object.entries(SOURCE_PREFIXES).find(
      ([, value]) => value === prefix,
    )?.[0] as LegacyImportSource | undefined) ?? null
  );
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
    (provenance.importedAt === null || isIsoDateTime(provenance.importedAt)) &&
    isIsoDateTime(provenance.provenanceRecordedAt) &&
    (provenance.issuerOrigin === "source_document" ||
      provenance.issuerOrigin === "current_profile_at_import" ||
      provenance.issuerOrigin === "unknown_legacy_import") &&
    (provenance.documentStateAtImport === "draft" ||
      provenance.documentStateAtImport === "issued" ||
      provenance.documentStateAtImport === "unknown_legacy_import"),
  );
}

function isValidRolloutRepairEvidence(
  evidence: LegacyImportAttestationV2["rolloutRepairEvidence"],
): evidence is LegacyImportRolloutRepairEvidenceV1 {
  const isSha256 = (value: string) => /^sha256:[0-9a-f]{64}$/.test(value);
  return Boolean(
    evidence &&
    evidence.schemaVersion === 1 &&
    evidence.kind === "verified_importer_rollout_bundle" &&
    isSha256(evidence.beforeDocumentFingerprint) &&
    isSha256(evidence.bundleFingerprint) &&
    isSha256(evidence.documentSnapshotStrongHash) &&
    isSha256(evidence.pdfSnapshotStrongHash) &&
    isSha256(evidence.sealContextHash) &&
    typeof evidence.hadVerifactuProfileContext === "boolean" &&
    evidence.rollback === "external_workspace_backup",
  );
}

export function detectLegacyImportSource(
  document: Pick<Document, "id" | "type"> &
    Partial<
      Pick<Document, "legacyImportProvenance" | "legacyImportAttestation">
    >,
): LegacyImportSource | null {
  const [prefix, kind, suffix, ...extra] = document.id.split(":");
  const namespaceSource = prefix ? sourceForPrefix(prefix) : null;
  const provenance = document.legacyImportProvenance;
  const provenanceValid = isValidLegacyImportProvenance(provenance);
  const provenanceSource = provenanceValid ? provenance.importer : null;

  if (namespaceSource) {
    const safeV3Receipt = Boolean(
      kind === "recibo" &&
      provenanceValid &&
      document.legacyImportAttestation?.schemaVersion === 3 &&
      document.legacyImportAttestation.relationshipGroup.role === "receipt" &&
      document.legacyImportAttestation.importer === namespaceSource,
    );
    if (
      (provenance && !provenanceValid) ||
      !kind ||
      !suffix ||
      extra.length > 0 ||
      kind !== document.type ||
      (kind !== "factura" && kind !== "presupuesto" && !safeV3Receipt) ||
      (provenanceSource && provenanceSource !== namespaceSource)
    ) {
      return null;
    }
    return namespaceSource;
  }
  return provenanceSource;
}

/**
 * El namespace de recibo solo se abre dentro del detector atómico V3. La API
 * pública anterior continúa rechazándolo hasta que ya existe una atestación
 * V3 válida, evitando que un recibo aislado se cuele por la ruta V2.
 */
function detectLegacyImportSourceForRelationshipRepair(
  document: Document,
): LegacyImportSource | null {
  const [prefix, kind, suffix, ...extra] = document.id.split(":");
  const namespaceSource = prefix ? sourceForPrefix(prefix) : null;
  const provenance = document.legacyImportProvenance;
  const provenanceValid = isValidLegacyImportProvenance(provenance);
  const provenanceSource = provenanceValid ? provenance.importer : null;
  if (namespaceSource) {
    if (
      !kind ||
      !suffix ||
      extra.length > 0 ||
      kind !== document.type ||
      (kind !== "factura" && kind !== "recibo") ||
      (provenance && !provenanceValid) ||
      (provenanceSource && provenanceSource !== namespaceSource)
    ) {
      return null;
    }
    return namespaceSource;
  }
  if (document.type !== "factura" && document.type !== "recibo") return null;
  return provenanceSource;
}

function hasKnownImportPrefix(document: Document): boolean {
  const prefix = document.id.split(":", 1)[0];
  return Object.values(SOURCE_PREFIXES).includes(prefix);
}

/**
 * Identifica cualquier documento cuya procedencia sea una importacion externa,
 * con independencia de que su atestacion sea utilizable para calculos.
 */
export function hasLegacyImportOrigin(document: Document): boolean {
  const snapshotSource = document.documentSnapshot?.source;
  return Boolean(
    document.legacyImportAttestation ||
      document.legacyImportProvenance ||
      hasKnownImportPrefix(document) ||
      snapshotSource === "legacy_import_attested" ||
      snapshotSource === "legacy_backfill",
  );
}

function attestationHashPayload(attestation: unknown): unknown {
  return attestation;
}

function acceptedStateBaseFromDocument(
  document: Document,
): Omit<LegacyImportAttestationV3["acceptedState"], "relationships"> {
  return {
    status: document.status,
    documentLifecycle:
      document.documentLifecycle === "canceled" ? "canceled" : "issued",
    integrityLock: "locked",
    deliveryStatus: document.deliveryStatus ?? null,
    paymentStatus: document.paymentStatus ?? null,
    acceptanceStatus: document.acceptanceStatus ?? null,
    issuedAt: document.issuedAt ?? null,
    sentAt: document.sentAt ?? null,
    paidAt: document.paidAt ?? null,
    acceptedAt: document.acceptedAt ?? null,
    updatedAt: document.updatedAt,
  };
}

function acceptedStateFromDocument(
  document: Document,
): LegacyImportAttestationV2["acceptedState"] {
  return {
    ...acceptedStateBaseFromDocument(document),
    documentLifecycle: "issued",
    relationships: {
      sourceQuoteDocumentId: document.sourceQuoteDocumentId ?? null,
      sourceQuoteNumber: document.sourceQuoteNumber ?? null,
      rectifiedById: null,
      receiptDocumentId: null,
      sourceDocumentId: null,
    },
  };
}

function acceptedRelationshipStateFromDocument(
  document: Document,
): LegacyImportAttestationV3["acceptedState"] {
  return {
    ...acceptedStateBaseFromDocument(document),
    relationships: {
      sourceQuoteDocumentId: document.sourceQuoteDocumentId ?? null,
      sourceQuoteNumber: document.sourceQuoteNumber ?? null,
      rectifiedById: document.rectifiedById ?? null,
      receiptDocumentId: document.receiptDocumentId ?? null,
      sourceDocumentId: document.sourceDocumentId ?? null,
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
  rolloutRepairEvidence?: LegacyImportRolloutRepairEvidenceV1,
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
    ...(rolloutRepairEvidence ? { rolloutRepairEvidence } : {}),
  };
  return {
    ...withoutHash,
    attestationHash: sha256Stable(attestationHashPayload(withoutHash)),
  };
}

function buildRelationshipAttestation(
  document: Document,
  importer: LegacyImportSource,
  snapshot: DocumentSnapshot,
  fiscalSource: Document & { issuer: NonNullable<Document["issuer"]> },
  importProvenance: LegacyImportProvenanceV2,
  amountOrigin: LegacyImportAttestationV2["amountOrigin"],
  attestedAt: string,
  relationshipGroup: LegacyImportAttestationV3["relationshipGroup"],
  rolloutRepairEvidence?: LegacyImportRolloutRepairEvidenceV1,
): LegacyImportAttestationV3 {
  const sourceRecord = sourceRecordFromDocument(fiscalSource);
  const withoutHash: Omit<LegacyImportAttestationV3, "attestationHash"> = {
    schemaVersion: 3,
    kind: ATTESTATION_KIND,
    importer,
    documentId: document.id,
    attestedAt,
    snapshotContentHash: hashStrongDocumentSnapshotContent(snapshot),
    originalEvidence: {
      kind: "source_files_not_stored",
      preservation: "user_managed",
    },
    acceptedState: acceptedRelationshipStateFromDocument(document),
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
    relationshipGroup,
    ...(rolloutRepairEvidence ? { rolloutRepairEvidence } : {}),
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
  if (
    isValidLegacyImportProvenance(existing) &&
    existing.importer === importer
  ) {
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
    documentStateAtImport: document.status === "borrador" ? "draft" : "issued",
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
  const isV3 = attestation.schemaVersion === 3;
  if (
    (attestation.schemaVersion !== 1 &&
      attestation.schemaVersion !== 2 &&
      attestation.schemaVersion !== 3) ||
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
    attestation.acceptedState.integrityLock !== "locked" ||
    document.integrityLock !== "locked" ||
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
    !isV3 &&
    (attestation.acceptedState.documentLifecycle !== "issued" ||
      attestation.acceptedState.relationships.rectifiedById !== null ||
      attestation.acceptedState.relationships.receiptDocumentId !== null ||
      attestation.acceptedState.relationships.sourceDocumentId !== null ||
      document.documentLifecycle !== "issued" ||
      Boolean(document.rectifiedById) ||
      Boolean(document.receiptDocumentId) ||
      Boolean(document.sourceDocumentId) ||
      Boolean(document.rectification))
  ) {
    return { ok: false, reason: "attestation_contract_invalid" };
  }
  if (
    isV3 &&
    (!attestation.relationshipGroup ||
      !attestation.relationshipGroup.counterpartDocumentId ||
      attestation.relationshipGroup.counterpartDocumentId === document.id ||
      !attestation.relationshipGroup.groupFingerprint.startsWith("sha256:") ||
      !attestation.relationshipGroup.relationshipHash.startsWith("sha256:") ||
      (attestation.relationshipGroup.kind === "invoice_receipt") !==
        (attestation.relationshipGroup.role === "invoice" ||
          attestation.relationshipGroup.role === "receipt") ||
      (attestation.relationshipGroup.kind !== "invoice_receipt") !==
        (attestation.relationshipGroup.role === "original_invoice" ||
          attestation.relationshipGroup.role === "rectification"))
  ) {
    return { ok: false, reason: "attestation_relationship_invalid" };
  }
  if (
    stableStringifySnapshot(attestation.acceptedState) !==
    stableStringifySnapshot(
      isV3
        ? acceptedRelationshipStateFromDocument(document)
        : acceptedStateFromDocument(document),
    )
  ) {
    return { ok: false, reason: "attested_state_mismatch" };
  }
  if (
    isV3 &&
    stableStringifySnapshot(document.rectification ?? null) !==
      stableStringifySnapshot(snapshot.rectification ?? null)
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
  if (attestation.schemaVersion === 2 || attestation.schemaVersion === 3) {
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
      (attestation.rolloutRepairEvidence &&
        (!isValidRolloutRepairEvidence(attestation.rolloutRepairEvidence) ||
          snapshot.source !== "legacy_import_attested" ||
          attestation.amountOrigin !== "verified_legacy_snapshot")) ||
      stableStringifySnapshot(attestation.importProvenance) !==
        stableStringifySnapshot(document.legacyImportProvenance) ||
      snapshot.items.length === 0 ||
      !document.issuer ||
      attestation.sourceRecordHash !== sha256Stable(attestation.sourceRecord) ||
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
  if (hasAppIssuedRecoveryProtectionClaim(document)) {
    const recovery = inspectAppIssuedDocumentRecovery(document);
    if (!recovery.ok || !recovery.active) {
      return { ok: false, issues: ["app_issued_recovery_invalid"] };
    }
    const allowedIssues =
      recovery.kind === "pre_canonical_rectification_v1"
        ? new Set<DocumentSnapshotIntegrityIssue>([
            "document_snapshot_missing",
            "pdf_snapshot_missing",
            "snapshot_seal_missing",
          ])
        : recovery.kind === "pre_seal_snapshot_pdf_gap_v1"
          ? new Set<DocumentSnapshotIntegrityIssue>([
              "document_snapshot_semantic_invalid",
            ])
          : new Set<DocumentSnapshotIntegrityIssue>();
    const unexpectedIssues = (document.snapshotIntegrity?.issues ?? []).filter(
      (issue) => !allowedIssues.has(issue),
    );
    if (unexpectedIssues.length > 0) {
      return { ok: false, issues: [...new Set(unexpectedIssues)] };
    }
    return {
      ok: true,
      kind: "app_issued_pdf_recovered",
      snapshot: recovery.snapshot,
    };
  }

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
      ...(document.legacyImportAttestation.schemaVersion >= 2
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
  // A recovery snapshot is valid only inside its versioned attestation. It must
  // never become a standalone substitute for the canonical sealed bundle.
  if (document.documentSnapshot?.source === "app_issued_recovery") {
    return { ok: false, issues: ["app_issued_recovery_invalid"] };
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
    kind: modernEvidence ? "app_issued_sealed" : "legacy_backfill_compatible",
    snapshot: document.documentSnapshot,
  };
}

export function isDocumentUsableForFinancialCalculations(
  document: Document,
): boolean {
  if (hasAppIssuedRecoveryProtectionClaim(document)) {
    return inspectUsableHistoricalDocumentEvidence(document).ok;
  }
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

function projectLegacySnapshotOntoDocument(
  document: Document,
  snapshot: DocumentSnapshot,
): Document {
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
  return projectLegacySnapshotOntoDocument(document, snapshot);
}

export type VerifiedImporterRolloutBundleInspection =
  | {
      ok: true;
      importer: LegacyImportSource;
      fiscalSource: Document;
      snapshot: DocumentSnapshot;
      evidence: LegacyImportRolloutRepairEvidenceV1;
    }
  | { ok: false };

function hasCompatibleRolloutImporterFingerprint(
  document: Document,
  importer: LegacyImportSource,
): boolean {
  if (importer === "pcfacturacion") {
    return hasNoAppActionTimestamps(document);
  }
  if (importer === "generic_documents") {
    // El importador Word/Excel/PDF ya generaba IDs `generic-documents:*` y el
    // rollout podía sellar el bundle antes de que provenance V2 se persistiera.
    // El source legacy_backfill íntegro y la ausencia de acciones de Factu son
    // la prueba; una emisión posterior usa source `issue` y queda excluida.
    return hasNoAppActionTimestamps(document);
  }
  return hasHistoricalImporterIssuedAtProof(document, importer);
}

function hasOnlyCompatibleRolloutIntegritySignal(
  document: Document,
  allowHistoricalRelationship: boolean,
): boolean {
  if (!document.snapshotIntegrity) return true;
  if (!allowHistoricalRelationship) return false;
  return Boolean(
    document.snapshotIntegrity.status === "blocked" &&
    document.snapshotIntegrity.issues.length > 0 &&
    document.snapshotIntegrity.issues.every(
      (issue) => issue === "document_relationship_invalid",
    ),
  );
}

/**
 * Reconoce exclusivamente el paquete completo que la migración inicial creó
 * para un importador conocido. No es una excepción general a la evidencia
 * moderna: cualquier pieza parcial, hash inválido, acción posterior o registro
 * Veri*Factu real permanece bloqueado.
 */
export function inspectVerifiedImporterRolloutBundle(
  document: Document,
  options: { allowHistoricalRelationship?: boolean } = {},
): VerifiedImporterRolloutBundleInspection {
  const allowHistoricalRelationship =
    options.allowHistoricalRelationship === true;
  const importer = allowHistoricalRelationship
    ? detectLegacyImportSourceForRelationshipRepair(document)
    : detectLegacyImportSource(document);
  const snapshot = document.documentSnapshot;
  const pdfSnapshot = document.pdfSnapshot;
  const seal = document.snapshotSeal;
  if (
    !importer ||
    !snapshot ||
    !pdfSnapshot ||
    !seal ||
    document.snapshotIntegrityRequired !== true ||
    snapshot.source !== "legacy_backfill" ||
    snapshot.documentType !== document.type ||
    document.legacyImportAttestation ||
    document.appIssuedRecoveryAttestation ||
    (document.legacyImportProvenance?.schemaVersion === 2 &&
      document.legacyImportProvenance.documentStateAtImport === "draft") ||
    document.verifactu ||
    document.verifactuPersistence ||
    snapshot.verifactu ||
    document.integrityQuarantine ||
    document.status === "borrador" ||
    (!allowHistoricalRelationship && document.status === "anulada") ||
    (!allowHistoricalRelationship && document.status === "rectificada") ||
    (!allowHistoricalRelationship && document.documentLifecycle !== "issued") ||
    document.integrityLock !== "locked" ||
    (!allowHistoricalRelationship && Boolean(document.rectification)) ||
    (!allowHistoricalRelationship && Boolean(document.rectifiedById)) ||
    (!allowHistoricalRelationship && Boolean(document.receiptDocumentId)) ||
    (!allowHistoricalRelationship && Boolean(document.sourceDocumentId)) ||
    !hasCompatibleRolloutImporterFingerprint(document, importer) ||
    !hasOnlyCompatibleRolloutIntegritySignal(
      document,
      allowHistoricalRelationship,
    ) ||
    snapshot.capturedAt !== (document.issuedAt ?? document.updatedAt) ||
    pdfSnapshot.renderedAt !== snapshot.capturedAt
  ) {
    return { ok: false };
  }
  const integrity = inspectDocumentSnapshotsIntegrity(document, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });
  if (!integrity.ok) return { ok: false };

  const documentSnapshotStrongHash =
    hashStrongDocumentSnapshotContent(snapshot);
  const evidence: LegacyImportRolloutRepairEvidenceV1 = {
    schemaVersion: 1,
    kind: "verified_importer_rollout_bundle",
    beforeDocumentFingerprint: documentFingerprint(document),
    bundleFingerprint: sha256Stable({
      documentSnapshot: snapshot,
      pdfSnapshot,
      snapshotSeal: seal,
      snapshotIntegrityRequired: true,
    }),
    documentSnapshotStrongHash,
    pdfSnapshotStrongHash: hashStrongDocumentPdfSnapshotContent(
      pdfSnapshot,
      documentSnapshotStrongHash,
    ),
    sealContextHash: seal.contextHash,
    hadVerifactuProfileContext: Boolean(
      snapshot.fiscalContext.verifactu?.enabled,
    ),
    rollback: "external_workspace_backup",
  };
  return {
    ok: true,
    importer,
    fiscalSource: projectLegacySnapshotOntoDocument(document, snapshot),
    snapshot,
    evidence,
  };
}

function verifiedRelationshipRolloutProjection(
  document: Document,
): VerifiedImporterRolloutBundleInspection {
  return inspectVerifiedImporterRolloutBundle(document, {
    allowHistoricalRelationship: true,
  });
}

function historicalRelationshipFiscalProjection(
  document: Document,
): Document | null {
  const legacySnapshot = verifiedLegacyBackfillProjection(document);
  if (legacySnapshot) return legacySnapshot;
  const rollout = verifiedRelationshipRolloutProjection(document);
  return rollout.ok ? rollout.fiscalSource : null;
}

interface LegacyRepairEvidenceProjection {
  fiscalSource: Document;
  evidenceBasis: LegacyImportRepairCandidate["evidenceBasis"];
  rolloutRepairEvidence?: LegacyImportRolloutRepairEvidenceV1;
}

function legacyRepairEvidenceProjection(
  document: Document,
  allowRolloutBundle = true,
): LegacyRepairEvidenceProjection {
  const legacySnapshotProjection = verifiedLegacyBackfillProjection(document);
  if (legacySnapshotProjection) {
    return {
      fiscalSource: legacySnapshotProjection,
      evidenceBasis: "verified_legacy_snapshot",
    };
  }
  if (allowRolloutBundle) {
    const rollout = inspectVerifiedImporterRolloutBundle(document);
    if (rollout.ok) {
      return {
        fiscalSource: rollout.fiscalSource,
        evidenceBasis: "verified_importer_rollout_bundle",
        rolloutRepairEvidence: rollout.evidence,
      };
    }
  }
  return {
    fiscalSource: document,
    evidenceBasis: "persisted_lines_user_confirmed",
  };
}

interface PreparedLegacyImportDocument {
  document: Document;
  fiscalSource: Document & { issuer: NonNullable<Document["issuer"]> };
  snapshot: DocumentSnapshot;
  amountOrigin: LegacyImportAttestationV2["amountOrigin"];
  rolloutRepairEvidence?: LegacyImportRolloutRepairEvidenceV1;
}

function sanitizeVerifiedRolloutSnapshot(
  snapshot: DocumentSnapshot,
  options: { relationshipSourceDocumentId?: string } = {},
): DocumentSnapshot {
  const originalIntegrity = inspectDocumentSnapshotsIntegrity(
    { documentSnapshot: snapshot },
    { requireDocumentSnapshot: true },
  );
  if (
    !originalIntegrity.ok ||
    originalIntegrity.documentSnapshot.status !== "verified"
  ) {
    throw new Error("legacy_rollout_snapshot_invalid");
  }
  const fiscalContext = { ...snapshot.fiscalContext };
  delete fiscalContext.verifactu;
  const sanitized: DocumentSnapshot = {
    ...snapshot,
    source: "legacy_import_attested",
    fiscalContext,
    snapshotHash: "",
  };
  if (
    options.relationshipSourceDocumentId &&
    !Object.prototype.hasOwnProperty.call(snapshot, "sourceDocumentId")
  ) {
    // El contrato de snapshot de aquel rollout aún no congelaba el origen del
    // recibo. V3 puede añadirlo solo después de validar ambos extremos vivos,
    // recíprocos y atómicos; la huella del bundle anterior queda auditada.
    sanitized.sourceDocumentId = options.relationshipSourceDocumentId;
  }
  delete sanitized.verifactu;
  sanitized.snapshotHash = hashDocumentSnapshotWithAlgorithm(
    sanitized,
    originalIntegrity.documentSnapshot.algorithm,
  );
  const integrity = inspectDocumentSnapshotsIntegrity(
    { documentSnapshot: sanitized },
    { requireDocumentSnapshot: true },
  );
  if (!integrity.ok) {
    throw new Error(
      `legacy_rollout_snapshot_invalid:${integrity.issues.join(",")}`,
    );
  }
  return sanitized;
}

function prepareLegacyImportDocument(
  document: Document,
  profile: BusinessProfile,
  options: { allowHistoricalRelationship?: boolean } = {},
): PreparedLegacyImportDocument | null {
  const legacySnapshotProjection = verifiedLegacyBackfillProjection(document);
  const rolloutBundle = inspectVerifiedImporterRolloutBundle(document, options);
  const fiscalSource =
    legacySnapshotProjection ??
    (rolloutBundle.ok ? rolloutBundle.fiscalSource : document);
  if (!fiscalSource.issuer) return null;
  const historicalProfile: BusinessProfile = {
    ...profile,
    iva: {
      rates: [
        ...new Set(fiscalSource.items.map((item) => item.ivaPercent)),
      ].sort((left, right) => left - right),
      defaultRate: fiscalSource.items[0]?.ivaPercent ?? 0,
    },
    vatExempt: false,
    verifactu: undefined,
  };
  const snapshot = legacySnapshotProjection
    ? document.documentSnapshot!
    : rolloutBundle.ok
      ? sanitizeVerifiedRolloutSnapshot(rolloutBundle.snapshot, {
          ...(options.allowHistoricalRelationship &&
          rolloutBundle.fiscalSource.type === "recibo" &&
          document.sourceDocumentId
            ? { relationshipSourceDocumentId: document.sourceDocumentId }
            : {}),
        })
      : buildDocumentSnapshot(fiscalSource, historicalProfile, {
          source: "legacy_import_attested",
          capturedAt: fiscalSource.issuer.capturedAt,
          issuer: fiscalSource.issuer,
        });
  return {
    document,
    fiscalSource: { ...fiscalSource, issuer: fiscalSource.issuer },
    snapshot,
    amountOrigin:
      legacySnapshotProjection || rolloutBundle.ok
        ? "verified_legacy_snapshot"
        : "persisted_lines_user_confirmed",
    ...(rolloutBundle.ok
      ? { rolloutRepairEvidence: rolloutBundle.evidence }
      : {}),
  };
}

function protectedLegacyImportDocument(
  prepared: PreparedLegacyImportDocument,
): Document {
  const { document, fiscalSource } = prepared;
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
    documentLifecycle:
      document.documentLifecycle === "canceled" || document.status === "anulada"
        ? "canceled"
        : "issued",
    integrityLock: "locked",
  };
  if (fiscalSource.rectification) {
    protectedDocument.rectification = { ...fiscalSource.rectification };
  } else {
    delete protectedDocument.rectification;
  }
  return protectedDocument;
}

function roundedSnapshotAmounts(snapshot: DocumentSnapshot) {
  return {
    subtotal: roundMoney(snapshot.taxSummary.subtotal),
    iva: roundMoney(snapshot.taxSummary.iva),
    total: roundMoney(snapshot.taxSummary.total),
  };
}

function comparableLegacyLines(snapshot: DocumentSnapshot): string {
  return stableStringifySnapshot(
    snapshot.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unit: item.unit?.trim() ?? "",
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
      subtotal: item.subtotal,
      ivaAmount: item.ivaAmount,
      total: item.total,
    })),
  );
}

function taxSummariesEqual(
  left: DocumentSnapshot,
  right: DocumentSnapshot,
): boolean {
  return (
    stableStringifySnapshot(left.taxSummary) ===
    stableStringifySnapshot(right.taxSummary)
  );
}

function taxSummariesCancel(
  original: DocumentSnapshot,
  cancellation: DocumentSnapshot,
): boolean {
  const originalRows = new Map(
    original.taxSummary.byRate.map((row) => [row.ivaPercent, row]),
  );
  const cancellationRows = new Map(
    cancellation.taxSummary.byRate.map((row) => [row.ivaPercent, row]),
  );
  if (
    original.taxSummary.vatExempt !== cancellation.taxSummary.vatExempt ||
    originalRows.size !== cancellationRows.size ||
    roundMoney(
      original.taxSummary.subtotal + cancellation.taxSummary.subtotal,
    ) !== 0 ||
    roundMoney(original.taxSummary.iva + cancellation.taxSummary.iva) !== 0 ||
    roundMoney(original.taxSummary.total + cancellation.taxSummary.total) !== 0
  ) {
    return false;
  }
  for (const [rate, originalRow] of originalRows) {
    const cancellationRow = cancellationRows.get(rate);
    if (
      !cancellationRow ||
      roundMoney(originalRow.taxableBase + cancellationRow.taxableBase) !== 0 ||
      roundMoney(originalRow.ivaAmount + cancellationRow.ivaAmount) !== 0 ||
      roundMoney(originalRow.total + cancellationRow.total) !== 0
    ) {
      return false;
    }
  }
  return true;
}

function relationshipContentHash(
  relation: LegacyImportRelationshipKind,
  members: Array<{
    role: LegacyImportRelationshipRole;
    document: Document;
    snapshot: DocumentSnapshot;
  }>,
): string {
  return sha256Stable({
    schemaVersion: 3,
    relation,
    members: members.map(({ role, document, snapshot }) => ({
      role,
      documentId: document.id,
      documentNumber: snapshot.number,
      documentDate: snapshot.date,
      status: document.status,
      documentLifecycle: document.documentLifecycle,
      relationships:
        acceptedRelationshipStateFromDocument(document).relationships,
      rectification: snapshot.rectification ?? null,
      sourceDocumentId: snapshot.sourceDocumentId ?? null,
      snapshotContentHash: hashStrongDocumentSnapshotContent(snapshot),
      taxSummary: snapshot.taxSummary,
    })),
  });
}

function relationshipFingerprint(
  relation: LegacyImportRelationshipKind,
  relationshipHash: string,
  members: Array<{
    role: LegacyImportRelationshipRole;
    documentId: string;
  }>,
): string {
  return sha256Stable({
    schemaVersion: 3,
    relation,
    relationshipHash,
    members,
  });
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
  options: { allowHistoricalRelationship?: boolean } = {},
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
  if (inspectVerifiedImporterRolloutBundle(document, options).ok) return true;
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
  const verifiedSnapshot = Boolean(
    verifiedLegacyBackfillProjection(document) ||
    inspectVerifiedImporterRolloutBundle(document).ok,
  );
  return Boolean(
    importer &&
    verifiedSnapshot &&
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

function isSafeHistoricalRelationshipCandidate(
  document: Document,
  duplicateIds: ReadonlySet<string>,
  snapshotIntegrityVersion: AppData["snapshotIntegrityVersion"],
): boolean {
  const importer = detectLegacyImportSourceForRelationshipRepair(document);
  const legacyProjection = verifiedLegacyBackfillProjection(document);
  const rollout = verifiedRelationshipRolloutProjection(document);
  const projection =
    legacyProjection ?? (rollout.ok ? rollout.fiscalSource : null);
  return Boolean(
    importer &&
    !duplicateIds.has(document.id) &&
    !document.legacyImportAttestation &&
    document.status !== "borrador" &&
    document.integrityLock === "locked" &&
    (document.documentLifecycle === "issued" ||
      document.documentLifecycle === "canceled") &&
    snapshotIntegrityVersion === 1 &&
    hasUnambiguousHistoricalRepairFingerprint(document, importer, {
      allowHistoricalRelationship: true,
    }) &&
    hasSafeStoredFiscalContent(projection ?? document) &&
    ((!document.documentSnapshot && !rollout.ok) || Boolean(projection)) &&
    (rollout.ok || !document.pdfSnapshot) &&
    (rollout.ok || !document.snapshotSeal) &&
    !document.verifactu &&
    !document.verifactuPersistence &&
    !document.documentSnapshot?.verifactu &&
    (rollout.ok ||
      !document.documentSnapshot?.fiscalContext.verifactu?.enabled) &&
    !document.integrityQuarantine &&
    (rollout.ok || rolloutIssuesAreOnlyMissing(document)),
  );
}

function relationshipSemanticsMatch(
  relation: LegacyImportRelationshipKind,
  first: PreparedLegacyImportDocument,
  second: PreparedLegacyImportDocument,
): boolean {
  const left = protectedLegacyImportDocument(first);
  const right = protectedLegacyImportDocument(second);
  const leftIssuerNif = normalizedFiscalIdentityText(first.snapshot.issuer.nif);
  const rightIssuerNif = normalizedFiscalIdentityText(
    second.snapshot.issuer.nif,
  );
  const issuerIdentityCompatible = Boolean(
    !leftIssuerNif || !rightIssuerNif || leftIssuerNif === rightIssuerNif,
  );
  if (!issuerIdentityCompatible) return false;
  if (relation === "invoice_receipt") {
    return Boolean(
      left.type === "factura" &&
      right.type === "recibo" &&
      !left.rectification &&
      !left.rectifiedById &&
      !left.sourceDocumentId &&
      left.receiptDocumentId === right.id &&
      !right.rectification &&
      !right.rectifiedById &&
      !right.receiptDocumentId &&
      right.sourceDocumentId === left.id &&
      second.snapshot.sourceDocumentId === left.id &&
      left.status === "pagado" &&
      right.status === "pagado" &&
      left.documentLifecycle === "issued" &&
      right.documentLifecycle === "issued" &&
      right.date >= left.date &&
      stableStringifySnapshot(left.client) ===
        stableStringifySnapshot(right.client) &&
      comparableLegacyLines(first.snapshot) ===
        comparableLegacyLines(second.snapshot) &&
      taxSummariesEqual(first.snapshot, second.snapshot),
    );
  }

  const rectification = second.snapshot.rectification;
  const correction = relation === "rectification_correction";
  return Boolean(
    left.type === "factura" &&
    right.type === "factura" &&
    !first.snapshot.rectification &&
    !left.receiptDocumentId &&
    !left.sourceDocumentId &&
    rectification &&
    rectification.type === (correction ? "correccion" : "anulacion") &&
    rectification.originalDocumentId === left.id &&
    rectification.originalNumber === first.snapshot.number &&
    rectification.originalDate === first.snapshot.date &&
    left.rectifiedById === right.id &&
    !right.rectifiedById &&
    !right.receiptDocumentId &&
    !right.sourceDocumentId &&
    right.date >= left.date &&
    right.documentLifecycle === "issued" &&
    (right.status === "enviado" ||
      right.status === "pagado" ||
      right.status === "vencido") &&
    (correction
      ? left.status === "rectificada" &&
        left.documentLifecycle === "issued" &&
        first.snapshot.taxSummary.total > 0 &&
        second.snapshot.taxSummary.total > 0 &&
        comparableLegacyLines(first.snapshot) ===
          comparableLegacyLines(second.snapshot) &&
        taxSummariesEqual(first.snapshot, second.snapshot)
      : left.status === "anulada" &&
        left.documentLifecycle === "canceled" &&
        stableStringifySnapshot(first.snapshot.customer) ===
          stableStringifySnapshot(second.snapshot.customer) &&
        taxSummariesCancel(first.snapshot, second.snapshot)),
  );
}

interface DetectedLegacyRelationshipGroup {
  preview: LegacyImportRepairRelationshipGroup;
  preparedById: Map<string, PreparedLegacyImportDocument>;
}

function detectLegacyRelationshipGroups(
  data: AppData,
  duplicateIds: ReadonlySet<string>,
): DetectedLegacyRelationshipGroup[] {
  const byId = new Map(
    data.documents.map((document) => [document.id, document]),
  );
  const rectificationsByOriginal = new Map<string, Document[]>();
  const receiptsByInvoice = new Map<string, Document[]>();
  for (const document of data.documents) {
    const projected =
      historicalRelationshipFiscalProjection(document) ?? document;
    const rectification = projected.rectification;
    if (rectification) {
      const existing =
        rectificationsByOriginal.get(rectification.originalDocumentId) ?? [];
      existing.push(document);
      rectificationsByOriginal.set(rectification.originalDocumentId, existing);
    }
    if (projected.type === "recibo" && projected.sourceDocumentId) {
      const existing = receiptsByInvoice.get(projected.sourceDocumentId) ?? [];
      existing.push(document);
      receiptsByInvoice.set(projected.sourceDocumentId, existing);
    }
  }

  const detected: DetectedLegacyRelationshipGroup[] = [];
  const claimedIds = new Set<string>();
  const addGroup = (
    relation: LegacyImportRelationshipKind,
    specs: Array<{ role: LegacyImportRelationshipRole; document: Document }>,
  ) => {
    if (specs.some(({ document }) => claimedIds.has(document.id))) return;
    if (
      specs.some(
        ({ document }) =>
          !isSafeHistoricalRelationshipCandidate(
            document,
            duplicateIds,
            data.snapshotIntegrityVersion,
          ),
      )
    ) {
      return;
    }
    const prepared = specs.map(({ role, document }) => ({
      role,
      prepared: prepareLegacyImportDocument(document, data.profile, {
        allowHistoricalRelationship: true,
      }),
    }));
    if (prepared.some(({ prepared: value }) => !value)) return;
    const first = prepared[0].prepared!;
    const second = prepared[1].prepared!;
    if (!relationshipSemanticsMatch(relation, first, second)) return;
    const relationshipHash = relationshipContentHash(
      relation,
      prepared.map(({ role, prepared: value }) => ({
        role,
        document: protectedLegacyImportDocument(value!),
        snapshot: value!.snapshot,
      })),
    );
    const groupFingerprint = relationshipFingerprint(
      relation,
      relationshipHash,
      specs.map(({ role, document }) => ({
        role,
        documentId: document.id,
      })),
    );
    const members = prepared.map(({ role, prepared: value }) => ({
      role,
      documentId: value!.document.id,
      documentNumber: value!.snapshot.number,
      amounts: roundedSnapshotAmounts(value!.snapshot),
    }));
    const preview: LegacyImportRepairRelationshipGroup = {
      relation,
      groupFingerprint,
      documentIds: members.map((member) => member.documentId),
      documentNumbers: members.map((member) => member.documentNumber),
      members,
    };
    detected.push({
      preview,
      preparedById: new Map(
        prepared.map(({ prepared: value }) => [value!.document.id, value!]),
      ),
    });
    specs.forEach(({ document }) => claimedIds.add(document.id));
  };

  for (const [originalId, rectifications] of rectificationsByOriginal) {
    if (rectifications.length !== 1) continue;
    const original = byId.get(originalId);
    const rectification = rectifications[0];
    const projected =
      historicalRelationshipFiscalProjection(rectification) ?? rectification;
    if (!original || original.rectifiedById !== rectification.id) continue;
    addGroup(
      projected.rectification?.type === "anulacion"
        ? "rectification_cancellation"
        : "rectification_correction",
      [
        { role: "original_invoice", document: original },
        { role: "rectification", document: rectification },
      ],
    );
  }

  for (const [invoiceId, receipts] of receiptsByInvoice) {
    if (receipts.length !== 1) continue;
    const invoice = byId.get(invoiceId);
    const receipt = receipts[0];
    if (!invoice || invoice.receiptDocumentId !== receipt.id) continue;
    addGroup("invoice_receipt", [
      { role: "invoice", document: invoice },
      { role: "receipt", document: receipt },
    ]);
  }

  return detected.sort((left, right) =>
    left.preview.groupFingerprint.localeCompare(right.preview.groupFingerprint),
  );
}

function reviewReasons(
  document: Document,
  duplicateIds: ReadonlySet<string>,
  context: "repair" | "direct_import" = "repair",
  precomputedEvidence?: LegacyRepairEvidenceProjection,
): LegacyImportRepairReviewReason[] {
  const reasons: LegacyImportRepairReviewReason[] = [];
  const evidence =
    precomputedEvidence ??
    legacyRepairEvidenceProjection(document, context === "repair");
  const legacySnapshotProjection =
    evidence.evidenceBasis === "verified_legacy_snapshot";
  const rolloutBundle =
    evidence.evidenceBasis === "verified_importer_rollout_bundle";
  const fiscalSource = evidence.fiscalSource;
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
    (document.documentSnapshot &&
      !legacySnapshotProjection &&
      !rolloutBundle) ||
    (document.pdfSnapshot && !rolloutBundle) ||
    (document.snapshotSeal && !rolloutBundle) ||
    (context === "repair" &&
      !rolloutBundle &&
      !hasUnambiguousHistoricalRepairFingerprint(document, importer))
  ) {
    reasons.push("existing_integrity_evidence");
  }
  if (
    document.verifactu ||
    document.verifactuPersistence ||
    document.documentSnapshot?.verifactu ||
    (document.documentSnapshot?.fiscalContext?.verifactu?.enabled &&
      !rolloutBundle)
  ) {
    reasons.push("verifactu_evidence");
  }
  if (document.integrityQuarantine) reasons.push("integrity_quarantine");
  if (!rolloutBundle && !rolloutIssuesAreOnlyMissing(document)) {
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
  return (
    Boolean(normalizedFiscalIdentityText(value)) &&
    hasUsualSpanishTaxIdShape(value)
  );
}

function fiscalIdentityFromDocument(
  document: Document,
  evidence?: LegacyRepairEvidenceProjection,
): string | null {
  const projected =
    evidence?.fiscalSource ??
    legacyRepairEvidenceProjection(document).fiscalSource;
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

function fiscalNumberIdentityFromDocument(
  document: Document,
  evidence?: LegacyRepairEvidenceProjection,
): string | null {
  const projected =
    evidence?.fiscalSource ??
    legacyRepairEvidenceProjection(document).fiscalSource;
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
  const repairEvidenceByDocument = new Map<
    Document,
    LegacyRepairEvidenceProjection
  >();
  const repairEvidenceFor = (
    document: Document,
  ): LegacyRepairEvidenceProjection => {
    const existing = repairEvidenceByDocument.get(document);
    if (existing) return existing;
    const evidence = legacyRepairEvidenceProjection(document);
    repairEvidenceByDocument.set(document, evidence);
    return evidence;
  };
  const reportedDuplicateIds = new Set<string>();
  const detectedRelationshipGroups = detectLegacyRelationshipGroups(
    data,
    duplicateIds,
  );
  const existingRelationshipInspection =
    inspectLegacyImportRelationshipCollection(data.documents);
  const relationshipCandidateIds = new Set(
    detectedRelationshipGroups.flatMap(({ preview }) => preview.documentIds),
  );

  for (const detected of detectedRelationshipGroups) {
    for (const member of detected.preview.members) {
      const prepared = detected.preparedById.get(member.documentId)!;
      const importer = detectLegacyImportSourceForRelationshipRepair(
        prepared.document,
      )!;
      candidates.push({
        documentId: member.documentId,
        documentNumber: member.documentNumber,
        importer,
        issuerOrigin: issuerOriginForPreview(prepared.document, importer),
        completenessExceptions: completenessExceptionsFromDocument(
          prepared.fiscalSource,
        ),
        amounts: member.amounts,
        beforeFingerprint: documentFingerprint(prepared.document),
        evidenceBasis: prepared.rolloutRepairEvidence
          ? "verified_importer_rollout_bundle"
          : "verified_legacy_snapshot",
        ...(prepared.rolloutRepairEvidence
          ? { rolloutRepairEvidence: prepared.rolloutRepairEvidence }
          : {}),
      });
    }
  }

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
    if (relationshipCandidateIds.has(document.id)) continue;
    if (document.legacyImportAttestation) {
      const locallyValid = inspectLegacyImportAttestation(document).ok;
      const collectionValid =
        document.legacyImportAttestation.schemaVersion !== 3 ||
        existingRelationshipInspection.validDocumentIds.has(document.id);
      if (locallyValid && collectionValid) {
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
    const evidence = repairEvidenceFor(document);
    const reasons = reviewReasons(document, duplicateIds, "repair", evidence);
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
    const fiscalSource = evidence.fiscalSource;
    if (!fiscalSource.issuer) {
      manualReview.push({
        documentId: document.id,
        documentNumber: document.number,
        reasons: ["issuer_incomplete"],
      });
      continue;
    }
    const amounts =
      evidence.evidenceBasis === "verified_legacy_snapshot" ||
      evidence.evidenceBasis === "verified_importer_rollout_bundle"
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
      evidenceBasis: evidence.evidenceBasis,
      ...(evidence.rolloutRepairEvidence
        ? { rolloutRepairEvidence: evidence.rolloutRepairEvidence }
        : {}),
    });
  }

  const candidateIds = new Set(
    candidates.map((candidate) => candidate.documentId),
  );
  const claims = new Map<string, Set<string>>();
  for (const document of data.documents) {
    const identity =
      storedFiscalIdentityClaim(document) ??
      (candidateIds.has(document.id) || document.status !== "borrador"
        ? fiscalIdentityFromDocument(document, repairEvidenceFor(document))
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
    const identity = document
      ? fiscalIdentityFromDocument(document, repairEvidenceFor(document))
      : null;
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
    const identity = fiscalNumberIdentityFromDocument(
      document,
      repairEvidenceFor(document),
    );
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
      ? fiscalNumberIdentityFromDocument(document, repairEvidenceFor(document))
      : null;
    const entries = identity ? (numberClaims.get(identity) ?? []) : [];
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
    const numberIdentity = fiscalNumberIdentityFromDocument(
      document,
      repairEvidenceFor(document),
    );
    const numberEntries = numberIdentity
      ? (numberClaims.get(numberIdentity) ?? [])
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
  const safeCandidateIds = new Set(
    safeCandidates.map((candidate) => candidate.documentId),
  );
  const relationshipGroups = detectedRelationshipGroups
    .map(({ preview }) => preview)
    .filter((group) =>
      group.documentIds.every((documentId) => safeCandidateIds.has(documentId)),
    );
  const acceptedRelationshipFingerprints = new Set(
    relationshipGroups.map((group) => group.groupFingerprint),
  );
  for (const { preview: rejectedGroup } of detectedRelationshipGroups) {
    if (acceptedRelationshipFingerprints.has(rejectedGroup.groupFingerprint)) {
      continue;
    }
    for (const member of rejectedGroup.members) {
      const existing = manualReview.find(
        (item) => item.documentId === member.documentId,
      );
      if (existing) {
        if (!existing.reasons.includes("unsupported_historical_relation")) {
          existing.reasons.push("unsupported_historical_relation");
        }
      } else {
        manualReview.push({
          documentId: member.documentId,
          documentNumber: member.documentNumber,
          reasons: ["unsupported_historical_relation"],
        });
      }
    }
  }
  const safeRelationshipIds = new Set(
    relationshipGroups.flatMap((group) => group.documentIds),
  );
  const finalCandidates = safeCandidates.filter(
    (candidate) =>
      !relationshipCandidateIds.has(candidate.documentId) ||
      safeRelationshipIds.has(candidate.documentId),
  );

  return {
    schemaVersion: relationshipGroups.length > 0 ? 3 : 2,
    precondition: previewPrecondition(data),
    affectedCount: finalCandidates.length,
    candidates: finalCandidates,
    relationshipGroups,
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
  const prepared = prepareLegacyImportDocument(document, profile);
  if (!prepared) throw new Error("legacy_import_issuer_missing");
  const protectedDocument: Document = {
    ...protectedLegacyImportDocument(prepared),
    documentLifecycle: "issued",
  };
  const attestation = buildAttestation(
    protectedDocument,
    importer,
    prepared.snapshot,
    prepared.fiscalSource,
    importProvenance,
    prepared.amountOrigin,
    attestedAt,
    prepared.rolloutRepairEvidence,
  );
  const next: Document = {
    ...protectedDocument,
    documentSnapshot: prepared.snapshot,
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

function rolesForRelationship(
  kind: LegacyImportRelationshipKind,
): [LegacyImportRelationshipRole, LegacyImportRelationshipRole] {
  return kind === "invoice_receipt"
    ? ["invoice", "receipt"]
    : ["original_invoice", "rectification"];
}

function buildAttestedRelationshipGroup(
  group: LegacyImportRepairRelationshipGroup,
  documentsById: ReadonlyMap<string, Document>,
  candidatesById: ReadonlyMap<string, LegacyImportRepairCandidate>,
  profile: BusinessProfile,
  attestedAt: string,
): Document[] {
  const expectedRoles = rolesForRelationship(group.relation);
  if (
    group.members.length !== 2 ||
    stableStringifySnapshot(group.members.map((member) => member.role)) !==
      stableStringifySnapshot(expectedRoles)
  ) {
    throw new Error("legacy_relationship_roles_invalid");
  }
  const rawSpecs = group.members.map((member) => {
    const document = documentsById.get(member.documentId);
    const candidate = candidatesById.get(member.documentId);
    if (!document || !candidate) {
      throw new Error("legacy_relationship_member_missing");
    }
    return { role: member.role, document, candidate };
  });
  const preparedSpecs = rawSpecs.map(({ role, document, candidate }) => {
    const prepared = prepareLegacyImportDocument(document, profile, {
      allowHistoricalRelationship: true,
    });
    if (!prepared) throw new Error("legacy_import_issuer_missing");
    return {
      role,
      candidate,
      prepared,
      protectedDocument: protectedLegacyImportDocument(prepared),
    };
  });
  if (
    !relationshipSemanticsMatch(
      group.relation,
      preparedSpecs[0].prepared,
      preparedSpecs[1].prepared,
    )
  ) {
    throw new Error("legacy_relationship_semantics_mismatch");
  }
  const relationshipHash = relationshipContentHash(
    group.relation,
    preparedSpecs.map(({ role, protectedDocument, prepared }) => ({
      role,
      document: protectedDocument,
      snapshot: prepared.snapshot,
    })),
  );
  if (
    relationshipFingerprint(
      group.relation,
      relationshipHash,
      rawSpecs.map(({ role, document }) => ({
        role,
        documentId: document.id,
      })),
    ) !== group.groupFingerprint
  ) {
    throw new Error("legacy_relationship_fingerprint_mismatch");
  }
  return preparedSpecs.map(
    ({ role, candidate, prepared, protectedDocument }, index) => {
      const counterpart = preparedSpecs[index === 0 ? 1 : 0];
      const provenance = provenanceForRepair(
        prepared.document,
        candidate.importer,
        attestedAt,
      );
      const attestation = buildRelationshipAttestation(
        protectedDocument,
        candidate.importer,
        prepared.snapshot,
        prepared.fiscalSource,
        provenance,
        prepared.amountOrigin,
        attestedAt,
        {
          kind: group.relation,
          role,
          counterpartDocumentId: counterpart.prepared.document.id,
          groupFingerprint: group.groupFingerprint,
          relationshipHash,
        },
        prepared.rolloutRepairEvidence,
      );
      const next: Document = {
        ...protectedDocument,
        documentSnapshot: prepared.snapshot,
        legacyImportAttestation: attestation,
        legacyImportProvenance: provenance,
      };
      delete next.pdfSnapshot;
      delete next.snapshotSeal;
      delete next.snapshotIntegrityRequired;
      delete next.snapshotIntegrity;
      const inspected = inspectLegacyImportAttestation(next);
      if (!inspected.ok) throw new Error(inspected.reason);
      return projectLegacyImportSnapshotOntoDocument(next);
    },
  );
}

export interface LegacyImportRelationshipCollectionInspection {
  claimedDocumentIds: Set<string>;
  validDocumentIds: Set<string>;
}

/** Revalida el hash y ambos extremos; ningún V3 huérfano es utilizable. */
export function inspectLegacyImportRelationshipCollection(
  documents: Document[],
): LegacyImportRelationshipCollectionInspection {
  const claimedDocumentIds = new Set<string>();
  const validDocumentIds = new Set<string>();
  const groups = new Map<string, Document[]>();
  for (const document of documents) {
    const attestation = document.legacyImportAttestation;
    if (attestation?.schemaVersion !== 3) continue;
    claimedDocumentIds.add(document.id);
    const members =
      groups.get(attestation.relationshipGroup.groupFingerprint) ?? [];
    members.push(document);
    groups.set(attestation.relationshipGroup.groupFingerprint, members);
  }
  for (const members of groups.values()) {
    if (members.length !== 2) continue;
    if (
      members.some((document) => !inspectLegacyImportAttestation(document).ok)
    ) {
      continue;
    }
    const firstAttestation = members[0]
      .legacyImportAttestation as LegacyImportAttestationV3;
    const kind = firstAttestation.relationshipGroup.kind;
    const expectedRoles = rolesForRelationship(kind);
    const ordered = expectedRoles.map((role) =>
      members.find(
        (document) =>
          (document.legacyImportAttestation as LegacyImportAttestationV3)
            .relationshipGroup.role === role,
      ),
    );
    if (ordered.some((document) => !document)) continue;
    const [first, second] = ordered as [Document, Document];
    const firstGroup = (
      first.legacyImportAttestation as LegacyImportAttestationV3
    ).relationshipGroup;
    const secondGroup = (
      second.legacyImportAttestation as LegacyImportAttestationV3
    ).relationshipGroup;
    if (
      secondGroup.kind !== kind ||
      firstGroup.relationshipHash !== secondGroup.relationshipHash ||
      firstGroup.counterpartDocumentId !== second.id ||
      secondGroup.counterpartDocumentId !== first.id ||
      firstGroup.groupFingerprint !== secondGroup.groupFingerprint ||
      !first.documentSnapshot ||
      !second.documentSnapshot ||
      !first.issuer ||
      !second.issuer
    ) {
      continue;
    }
    const preparedFirst: PreparedLegacyImportDocument = {
      document: first,
      fiscalSource: { ...first, issuer: first.issuer },
      snapshot: first.documentSnapshot,
      amountOrigin: (first.legacyImportAttestation as LegacyImportAttestationV3)
        .amountOrigin,
    };
    const preparedSecond: PreparedLegacyImportDocument = {
      document: second,
      fiscalSource: { ...second, issuer: second.issuer },
      snapshot: second.documentSnapshot,
      amountOrigin: (
        second.legacyImportAttestation as LegacyImportAttestationV3
      ).amountOrigin,
    };
    if (!relationshipSemanticsMatch(kind, preparedFirst, preparedSecond)) {
      continue;
    }
    const recomputed = relationshipContentHash(kind, [
      {
        role: expectedRoles[0],
        document: first,
        snapshot: first.documentSnapshot,
      },
      {
        role: expectedRoles[1],
        document: second,
        snapshot: second.documentSnapshot,
      },
    ]);
    if (recomputed !== firstGroup.relationshipHash) continue;
    const recomputedGroupFingerprint = relationshipFingerprint(
      kind,
      recomputed,
      [
        { role: expectedRoles[0], documentId: first.id },
        { role: expectedRoles[1], documentId: second.id },
      ],
    );
    if (recomputedGroupFingerprint !== firstGroup.groupFingerprint) continue;
    validDocumentIds.add(first.id);
    validDocumentIds.add(second.id);
  }
  return { claimedDocumentIds, validDocumentIds };
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
    preview.schemaVersion !== current.schemaVersion ||
    preview.precondition !== current.precondition ||
    stableStringifySnapshot(preview.candidates) !==
      stableStringifySnapshot(current.candidates) ||
    stableStringifySnapshot(preview.relationshipGroups) !==
      stableStringifySnapshot(current.relationshipGroups)
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
    const documentsById = new Map(
      data.documents.map((document) => [document.id, document]),
    );
    const relationshipReplacements = new Map<string, Document>();
    for (const group of current.relationshipGroups) {
      const replacements = buildAttestedRelationshipGroup(
        group,
        documentsById,
        byId,
        data.profile,
        attestedAt,
      );
      replacements.forEach((document) =>
        relationshipReplacements.set(document.id, document),
      );
    }
    const documents = data.documents.map((document) => {
      const candidate = byId.get(document.id);
      if (!candidate) return document;
      if (documentFingerprint(document) !== candidate.beforeFingerprint) {
        throw new Error("stale_candidate");
      }
      const relationshipReplacement = relationshipReplacements.get(document.id);
      if (relationshipReplacement) return relationshipReplacement;
      return buildAttestedDocument(
        document,
        data.profile,
        candidate.importer,
        attestedAt,
        provenanceForRepair(document, candidate.importer, attestedAt),
      );
    });
    const relationshipInspection =
      inspectLegacyImportRelationshipCollection(documents);
    if (
      [...relationshipInspection.claimedDocumentIds].some(
        (documentId) =>
          !relationshipInspection.validDocumentIds.has(documentId),
      )
    ) {
      throw new Error("legacy_relationship_collection_invalid");
    }
    return {
      status: "applied",
      data: { ...data, documents },
      appliedDocumentIds: current.candidates.map(
        (candidate) => candidate.documentId,
      ),
      appliedRelationshipGroupFingerprints: current.relationshipGroups.map(
        (group) => group.groupFingerprint,
      ),
    };
  } catch {
    return { status: "blocked", reason: "candidate_invalid" };
  }
}
