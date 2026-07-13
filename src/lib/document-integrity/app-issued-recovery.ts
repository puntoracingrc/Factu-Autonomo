import { hasUsualSpanishTaxIdShape } from "@/lib/business-profile";
import { roundMoney } from "@/lib/calculations";
import type {
  AppData,
  AppIssuedDocumentRecoveryAcceptedStateV1,
  AppIssuedDocumentRecoveryAttestation,
  AppIssuedDocumentRecoveryAttestationV1,
  AppIssuedDocumentRecoveryAttestationV2,
  AppIssuedDocumentRecoveryBeforeEvidenceV1,
  AppIssuedDocumentRecoveryKind,
  AppIssuedDocumentRecoveryPdfEvidenceV1,
  AppIssuedDocumentRecoveryRole,
  AppIssuedDocumentRecoveryVerifactuDispositionV2,
  BusinessProfile,
  Document,
  DocumentSnapshot,
  DocumentSnapshotIntegrityIssue,
  IssuerSnapshot,
} from "@/lib/types";
import { sha256Hex } from "./snapshot-hash";
import { hasAppIssuedRecoveryProtectionClaim } from "./app-issued-recovery-protection";
import {
  buildDocumentSnapshot,
  inspectDocumentSnapshotsIntegrity,
  stableStringifySnapshot,
} from "./snapshots";

export const APP_ISSUED_RECOVERY_SCHEMA_VERSION = 2 as const;
const APP_ISSUED_RECOVERY_ATTESTATION_V1 = 1 as const;
const APP_ISSUED_RECOVERY_ATTESTATION_V2 = 2 as const;

const LEGACY_PREFIXES = [
  "pcfacturacion:",
  "holded:",
  "facturadirecta:",
  "generic-documents:",
] as const;
const MISSING_BUNDLE_ISSUES = new Set<DocumentSnapshotIntegrityIssue>([
  "document_snapshot_missing",
  "pdf_snapshot_missing",
  "snapshot_seal_missing",
  "document_relationship_invalid",
]);
const RELATIONSHIP_ONLY_ISSUES = new Set<DocumentSnapshotIntegrityIssue>([
  "document_relationship_invalid",
]);

export type AppIssuedDocumentRecoveryReviewReason =
  | "duplicate_document_id"
  | "legacy_document"
  | "verifactu_evidence"
  | "integrity_quarantine"
  | "existing_evidence_invalid"
  | "partial_evidence"
  | "unexpected_integrity_issue"
  | "relationship_invalid"
  | "pdf_evidence_missing"
  | "pdf_evidence_invalid"
  | "fiscal_content_mismatch"
  | "recovery_attestation_invalid";

export interface AppIssuedDocumentRecoveryPdfEvidenceByDocumentId {
  readonly [documentId: string]: AppIssuedDocumentRecoveryPdfEvidenceV1;
}

export interface AppIssuedDocumentRecoveryCandidateMember {
  documentId: string;
  documentNumber: string;
  role: AppIssuedDocumentRecoveryRole;
  counterpartDocumentId: string | null;
  beforeFingerprint: string;
  afterFingerprint: string;
  needsAttestation: boolean;
  verifactuDisposition?: AppIssuedDocumentRecoveryVerifactuDispositionV2;
  sourcePdfEvidence?: AppIssuedDocumentRecoveryPdfEvidenceV1;
  recoveredSnapshot?: DocumentSnapshot;
}

export interface AppIssuedDocumentRecoveryCandidate {
  recoveryKind: AppIssuedDocumentRecoveryKind;
  candidateKey: string;
  groupFingerprint: string;
  documentIds: string[];
  repairIds: string[];
  members: AppIssuedDocumentRecoveryCandidateMember[];
}

export type AppIssuedDocumentRecoveryPreviewScope =
  | { mode: "all"; candidateKeys: [] }
  | { mode: "selected"; candidateKeys: string[] };

export interface AppIssuedDocumentRecoveryPreviewOptions {
  selectedCandidateKeys?: readonly string[];
}

export interface AppIssuedDocumentRecoveryReviewItem {
  documentId: string;
  documentNumber: string;
  reasons: AppIssuedDocumentRecoveryReviewReason[];
}

export interface AppIssuedDocumentRecoveryPreview {
  schemaVersion: typeof APP_ISSUED_RECOVERY_SCHEMA_VERSION;
  precondition: string;
  scope: AppIssuedDocumentRecoveryPreviewScope;
  unknownCandidateKeys: string[];
  affectedCount: number;
  candidates: AppIssuedDocumentRecoveryCandidate[];
  manualReview: AppIssuedDocumentRecoveryReviewItem[];
  requiredPdfDocumentIds: string[];
  alreadyAppliedRepairIds: string[];
}

export type AppIssuedDocumentRecoveryApplyResult =
  | { status: "applied"; data: AppData; appliedRepairIds: string[] }
  | {
      status: "blocked";
      reason: "stale_preview" | "no_candidates" | "candidate_invalid";
    };

export interface AppIssuedDocumentRecoveryRollbackCandidate {
  recoveryKind: AppIssuedDocumentRecoveryKind;
  candidateKey: string;
  groupFingerprint: string;
  documentIds: string[];
  repairIds: string[];
}

export interface AppIssuedDocumentRecoveryRollbackPreview {
  schemaVersion: typeof APP_ISSUED_RECOVERY_SCHEMA_VERSION;
  precondition: string;
  scope: AppIssuedDocumentRecoveryPreviewScope;
  unknownCandidateKeys: string[];
  affectedCount: number;
  candidates: AppIssuedDocumentRecoveryRollbackCandidate[];
  blockedRepairIds: string[];
}

export type AppIssuedDocumentRecoveryRollbackResult =
  | { status: "applied"; data: AppData; rolledBackRepairIds: string[] }
  | {
      status: "blocked";
      reason: "stale_preview" | "no_candidates" | "candidate_invalid";
    };

export type AppIssuedDocumentRecoveryInspection =
  | {
      ok: true;
      active: boolean;
      kind: AppIssuedDocumentRecoveryKind;
      snapshot: DocumentSnapshot;
      attestation: AppIssuedDocumentRecoveryAttestation;
    }
  | { ok: false; issues: DocumentSnapshotIntegrityIssue[] };

export interface AppIssuedDocumentRecoveryCollectionInspection {
  claimedDocumentIds: Set<string>;
  validDocumentIds: Set<string>;
  issuesByDocumentId: Map<string, DocumentSnapshotIntegrityIssue[]>;
}

function hashStable(value: unknown): string {
  return `sha256:${sha256Hex(stableStringifySnapshot(value))}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withoutDerivedRecovery(
  document: Document,
): Omit<Document, "appIssuedRecoveryAttestation" | "snapshotIntegrity"> {
  const {
    appIssuedRecoveryAttestation: _attestation,
    snapshotIntegrity: _derivedSignal,
    ...domain
  } = document;
  void _attestation;
  void _derivedSignal;
  return domain;
}

function domainFingerprint(document: Document): string {
  return hashStable(withoutDerivedRecovery(document));
}

function dataPrecondition(
  data: AppData,
  evidence: AppIssuedDocumentRecoveryPdfEvidenceByDocumentId,
  scope: AppIssuedDocumentRecoveryPreviewScope,
): string {
  return hashStable({ data, evidence, scope });
}

function isLegacy(document: Document): boolean {
  return Boolean(
    document.legacyImportAttestation ||
    document.legacyImportProvenance ||
    document.documentSnapshot?.source === "legacy_backfill" ||
    document.documentSnapshot?.source === "legacy_import_attested" ||
    LEGACY_PREFIXES.some((prefix) => document.id.startsWith(prefix)),
  );
}

function hasExplicitLegacyClaim(document: Document): boolean {
  return Boolean(
    document.legacyImportAttestation ||
      document.legacyImportProvenance ||
      document.documentSnapshot?.source === "legacy_import_attested" ||
      LEGACY_PREFIXES.some((prefix) => document.id.startsWith(prefix))
  );
}

function isCanonicalUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isWellFormedUnattestedTestVerifactuArtifact(
  document: Document,
): boolean {
  const record = document.verifactu;
  const snapshotRecord = document.documentSnapshot?.verifactu;
  const snapshotContext = document.documentSnapshot?.fiscalContext.verifactu;
  const expectedKeys = [
    "csv",
    "cuotaTotal",
    "environment",
    "importeTotal",
    "previousHash",
    "qrUrl",
    "recordHash",
    "recordTimestamp",
    "recordType",
    "status",
    "submittedAt",
    "tipoFactura",
  ];
  const parseAmount = (value: string | undefined): number | null => {
    if (!value?.trim()) return null;
    const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? roundMoney(parsed) : null;
  };
  const isValidQrUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  };
  return Boolean(
    record &&
      document.verifactuPersistence === "legacy_unverified" &&
      stableStringifySnapshot(Object.keys(record).sort()) ===
        stableStringifySnapshot(expectedKeys) &&
      record.status === "test_registered" &&
      record.environment === "test" &&
      /^[a-f0-9]{64}$/i.test(record.recordHash) &&
      record.previousHash === "" &&
      Number.isFinite(Date.parse(record.recordTimestamp)) &&
      isValidQrUrl(record.qrUrl) &&
      record.recordType === "alta" &&
      record.submittedAt &&
      Number.isFinite(Date.parse(record.submittedAt)) &&
      record.csv?.trim() &&
      record.tipoFactura?.trim() &&
      parseAmount(record.cuotaTotal) ===
        roundMoney(document.documentSnapshot?.taxSummary.iva ?? Number.NaN) &&
      parseAmount(record.importeTotal) ===
        roundMoney(document.documentSnapshot?.taxSummary.total ?? Number.NaN) &&
      snapshotContext?.enabled === false &&
      snapshotContext.environment === "test" &&
      snapshotRecord &&
      stableStringifySnapshot(snapshotRecord) ===
        stableStringifySnapshot(record)
  );
}

function hasDocumentVerifactuEvidence(document: Document): boolean {
  return Boolean(
    document.verifactu ||
      document.verifactuPersistence ||
      document.documentSnapshot?.verifactu
  );
}

function verifactuDisposition(
  document: Document,
  allowUnattestedTestArtifact = false,
): AppIssuedDocumentRecoveryVerifactuDispositionV2 | null {
  if (hasDocumentVerifactuEvidence(document)) {
    return allowUnattestedTestArtifact &&
      isWellFormedUnattestedTestVerifactuArtifact(document)
      ? "preserved_unattested_test_artifact"
      : null;
  }
  return document.documentSnapshot?.fiscalContext.verifactu?.enabled
    ? "profile_context_only"
    : "none";
}

function hasVerifactuEvidence(document: Document): boolean {
  return hasDocumentVerifactuEvidence(document);
}

function onlyIssues(
  document: Document,
  allowed: ReadonlySet<DocumentSnapshotIntegrityIssue>,
): boolean {
  const issues = document.snapshotIntegrity?.issues ?? [];
  return issues.length > 0 && issues.every((issue) => allowed.has(issue));
}

function strictBundleSnapshot(document: Document): DocumentSnapshot | null {
  if (
    !document.documentSnapshot ||
    !document.pdfSnapshot ||
    !document.snapshotSeal ||
    !inspectDocumentSnapshotsIntegrity(document, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
      requireSnapshotSeal: true,
    }).ok
  ) {
    return null;
  }
  return document.documentSnapshot;
}

function hasNoBundle(document: Document): boolean {
  return Boolean(
    !document.documentSnapshot &&
    !document.pdfSnapshot &&
    !document.snapshotSeal,
  );
}

function normalizedTaxId(value: string | undefined): string {
  return value?.replace(/[\s.-]/g, "").toUpperCase() ?? "";
}

function compatibleIssuerTaxIds(
  left: IssuerSnapshot,
  right: IssuerSnapshot,
): boolean {
  const leftNif = normalizedTaxId(left.nif);
  const rightNif = normalizedTaxId(right.nif);
  return Boolean(
    leftNif &&
    rightNif &&
    hasUsualSpanishTaxIdShape(leftNif) &&
    hasUsualSpanishTaxIdShape(rightNif) &&
    leftNif === rightNif,
  );
}

function rectificationSnapshotsMatch(
  original: DocumentSnapshot,
  rectification: DocumentSnapshot,
): boolean {
  const relation = rectification.rectification;
  return Boolean(
    original.documentKind === "factura" &&
    !original.rectification &&
    rectification.documentKind === "factura_rectificativa" &&
    relation?.type === "correccion" &&
    relation.originalDocumentId &&
    relation.originalNumber === original.number &&
    relation.originalDate === original.date &&
    rectification.date >= original.date &&
    compatibleIssuerTaxIds(original.issuer, rectification.issuer),
  );
}

function moneyEqual(left: number, right: number): boolean {
  return roundMoney(left) === roundMoney(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function evidenceValid(
  value: AppIssuedDocumentRecoveryPdfEvidenceV1 | undefined,
  document: Document,
  snapshot: DocumentSnapshot,
): boolean {
  if (
    !isRecord(value) ||
    !isRecord(snapshot) ||
    !isRecord(snapshot.taxSummary)
  ) {
    return false;
  }
  const evidence = value as unknown as AppIssuedDocumentRecoveryPdfEvidenceV1;
  if (
    evidence.kind !== "external_pdf_user_confirmed" ||
    !/^[a-f0-9]{64}$/.test(evidence.sha256) ||
    !Number.isSafeInteger(evidence.byteLength) ||
    evidence.byteLength <= 0 ||
    evidence.mediaType !== "application/pdf" ||
    evidence.preservation !== "user_managed" ||
    !isRecord(evidence.confirmedSummary)
  ) {
    return false;
  }
  const summary = evidence.confirmedSummary;
  if (
    summary.number !== document.number ||
    summary.date !== document.date ||
    !Number.isFinite(summary.subtotal) ||
    !Number.isFinite(summary.iva) ||
    !Number.isFinite(summary.total) ||
    !/^sha256:[a-f0-9]{64}$/.test(summary.confirmedFiscalContentHash) ||
    summary.confirmedFiscalContentHash !== snapshot.snapshotHash
  ) {
    return false;
  }
  return (
    moneyEqual(summary.subtotal, snapshot.taxSummary.subtotal) &&
    moneyEqual(summary.iva, snapshot.taxSummary.iva) &&
    moneyEqual(summary.total, snapshot.taxSummary.total)
  );
}

function issuerProfile(
  current: BusinessProfile,
  issuer: IssuerSnapshot,
  document: Document,
  fiscalSource?: DocumentSnapshot,
): BusinessProfile | null {
  const issuerNif = normalizedTaxId(issuer.nif);
  if (
    !issuerNif ||
    !hasUsualSpanishTaxIdShape(issuerNif) ||
    issuerNif !== normalizedTaxId(current.nif)
  ) {
    return null;
  }
  const lineRates = [
    ...new Set(
      document.items
        .map((item) => item.ivaPercent)
        .filter((rate) => Number.isFinite(rate) && rate >= 0),
    ),
  ].sort((left, right) => left - right);
  // Sin snapshot fiscal previo, un documento solo a tipo 0 no permite
  // distinguir de forma inequívoca entre exención y tipo cero. Esta reparación
  // estrecha no debe inferir el régimen a partir del perfil actual.
  if (!fiscalSource && !lineRates.some((rate) => rate > 0)) return null;
  const iva = fiscalSource
    ? clone(fiscalSource.fiscalContext.iva)
    : {
        rates: lineRates,
        defaultRate: lineRates[0]!,
      };
  return {
    ...current,
    commercialName: issuer.commercialName,
    name: issuer.name,
    nif: issuer.nif,
    vatId: issuer.vatId,
    address: issuer.address,
    city: issuer.city,
    postalCode: issuer.postalCode,
    province: issuer.province,
    country: issuer.country,
    phone: issuer.phone ?? "",
    email: issuer.email ?? "",
    website: issuer.website,
    iban: issuer.iban,
    logoUrl: issuer.logoUrl,
    vatExempt: fiscalSource?.fiscalContext.vatExempt ?? false,
    iva,
    verifactu: undefined,
  };
}

function recoveredSnapshot(
  document: Document,
  profile: BusinessProfile,
  issuer: IssuerSnapshot,
  capturedAt: string,
  options: { omitUnattestedVerifactu?: boolean } = {},
): DocumentSnapshot | null {
  try {
    const sourceDocument = options.omitUnattestedVerifactu
      ? { ...document, verifactu: undefined, verifactuPersistence: undefined }
      : document;
    const snapshot = buildDocumentSnapshot(sourceDocument, profile, {
      capturedAt,
      source: "app_issued_recovery",
      issuer,
    });
    if (
      !inspectDocumentSnapshotsIntegrity(
        { documentSnapshot: snapshot },
        {
          requireDocumentSnapshot: true,
          allowAppIssuedRecoverySnapshot: true,
        },
      ).ok
    ) {
      return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function profileFromFrozenSnapshot(
  current: BusinessProfile,
  snapshot: DocumentSnapshot,
  document: Document,
): BusinessProfile | null {
  const profile = issuerProfile(current, snapshot.issuer, document, snapshot);
  if (!profile) return null;
  return {
    ...profile,
    numbering: {
      ...profile.numbering,
      formats: {
        ...profile.numbering.formats,
        [snapshot.documentKind]: { ...snapshot.numbering.format },
      },
    },
    verifactu: snapshot.fiscalContext.verifactu
      ? { ...snapshot.fiscalContext.verifactu }
      : undefined,
  };
}

function comparableFiscalSnapshot(snapshot: DocumentSnapshot): string {
  return stableStringifySnapshot({
    documentType: snapshot.documentType,
    documentKind: snapshot.documentKind,
    number: snapshot.number,
    date: snapshot.date,
    dueDate: snapshot.dueDate ?? null,
    issuer: snapshot.issuer,
    customer: snapshot.customer,
    items: snapshot.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit ?? null,
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
      subtotal: item.subtotal,
      ivaAmount: item.ivaAmount,
      total: item.total,
    })),
    taxSummary: snapshot.taxSummary,
    currency: snapshot.currency,
    paymentTerms: snapshot.paymentTerms ?? null,
    notes: snapshot.notes ?? null,
    rectification: snapshot.rectification ?? null,
    sourceDocumentId: snapshot.sourceDocumentId ?? null,
    fiscalContext: snapshot.fiscalContext,
  });
}

function acceptedState(
  document: Document,
): AppIssuedDocumentRecoveryAcceptedStateV1 {
  const lifecycle =
    document.documentLifecycle === "canceled" || document.status === "anulada"
      ? "canceled"
      : "issued";
  return {
    status: document.status,
    documentLifecycle: lifecycle,
    integrityLock: "locked",
    deliveryStatus: document.deliveryStatus ?? null,
    paymentStatus: document.paymentStatus ?? null,
    acceptanceStatus: document.acceptanceStatus ?? null,
    issuedAt: document.issuedAt ?? null,
    sentAt: document.sentAt ?? null,
    paidAt: document.paidAt ?? null,
    acceptedAt: document.acceptedAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    relationships: {
      sourceQuoteDocumentId: document.sourceQuoteDocumentId ?? null,
      sourceQuoteNumber: document.sourceQuoteNumber ?? null,
      rectifiedById: document.rectifiedById ?? null,
      receiptDocumentId: document.receiptDocumentId ?? null,
      sourceDocumentId: document.sourceDocumentId ?? null,
    },
  };
}

function slot<T>(
  value: T | undefined,
): { present: false } | { present: true; value: T } {
  return value === undefined
    ? { present: false }
    : { present: true, value: clone(value) };
}

function beforeEvidence(
  document: Document,
): AppIssuedDocumentRecoveryBeforeEvidenceV1 {
  return {
    documentSnapshot: slot(document.documentSnapshot),
    pdfSnapshot: slot(document.pdfSnapshot),
    snapshotSeal: slot(document.snapshotSeal),
    snapshotIntegrityRequired: slot(document.snapshotIntegrityRequired),
    snapshotIntegrity: slot(document.snapshotIntegrity),
    verifactu: slot(document.verifactu),
    verifactuPersistence: slot(document.verifactuPersistence),
  };
}

function evidenceSlotMatches<T>(
  stored: { present: false } | { present: true; value: T } | unknown,
  current: T | undefined,
): boolean {
  if (!isRecord(stored) || typeof stored.present !== "boolean") return false;
  return stored.present
    ? Object.prototype.hasOwnProperty.call(stored, "value") &&
        current !== undefined &&
        stableStringifySnapshot(stored.value) ===
          stableStringifySnapshot(current)
    : current === undefined;
}

function immutableEvidenceMatches(
  document: Document,
  stored: AppIssuedDocumentRecoveryBeforeEvidenceV1 | unknown,
): boolean {
  if (!isRecord(stored)) return false;
  return (
    evidenceSlotMatches(stored.documentSnapshot, document.documentSnapshot) &&
    evidenceSlotMatches(stored.pdfSnapshot, document.pdfSnapshot) &&
    evidenceSlotMatches(stored.snapshotSeal, document.snapshotSeal) &&
    evidenceSlotMatches(
      stored.snapshotIntegrityRequired,
      document.snapshotIntegrityRequired,
    ) &&
    evidenceSlotMatches(stored.verifactu, document.verifactu) &&
    evidenceSlotMatches(
      stored.verifactuPersistence,
      document.verifactuPersistence,
    )
  );
}

type AppIssuedDocumentRecoveryAttestationWithoutHash =
  | Omit<AppIssuedDocumentRecoveryAttestationV1, "attestationHash">
  | Omit<AppIssuedDocumentRecoveryAttestationV2, "attestationHash">;

function attestationHash(
  attestation: AppIssuedDocumentRecoveryAttestationWithoutHash,
): string {
  return hashStable(attestation);
}

function eventsValid(
  attestation: AppIssuedDocumentRecoveryAttestation,
): boolean {
  return Boolean(
    Array.isArray(attestation.events) &&
    attestation.events.length > 0 &&
    attestation.events.every(
      (event, index) =>
        isRecord(event) &&
        event.action === (index % 2 === 0 ? "applied" : "rolled_back") &&
        typeof event.at === "string" &&
        Number.isFinite(Date.parse(event.at)),
    ) &&
    attestation.events.at(-1)?.action ===
      (attestation.status === "applied" ? "applied" : "rolled_back"),
  );
}

function groupFingerprint(
  recoveryKind: AppIssuedDocumentRecoveryKind,
  members: readonly AppIssuedDocumentRecoveryCandidateMember[],
): string {
  if (
    recoveryKind === "pre_canonical_rectification_v1" ||
    recoveryKind === "receipt_source_snapshot_gap_v1"
  ) {
    // Contrato persistido V1: no añadir campos ni cambiar la versión. Estas
    // huellas ya viven en copias y workspaces reales y deben seguir siendo
    // byte-compatibles tras ampliar el motor con recuperaciones V2.
    return hashStable({
      schemaVersion: APP_ISSUED_RECOVERY_ATTESTATION_V1,
      recoveryKind,
      members: members.map((member) => ({
        documentId: member.documentId,
        role: member.role,
        counterpartDocumentId: member.counterpartDocumentId,
        beforeFingerprint: member.beforeFingerprint,
        sourcePdfEvidence: member.sourcePdfEvidence,
        recoveredSnapshotHash: member.recoveredSnapshot?.snapshotHash ?? null,
      })),
    });
  }
  return hashStable({
    schemaVersion: APP_ISSUED_RECOVERY_ATTESTATION_V2,
    recoveryKind,
    members: members.map((member) => ({
      documentId: member.documentId,
      role: member.role,
      counterpartDocumentId: member.counterpartDocumentId,
      beforeFingerprint: member.beforeFingerprint,
      verifactuDisposition: member.verifactuDisposition ?? null,
      sourcePdfEvidence: member.sourcePdfEvidence,
      recoveredSnapshotHash: member.recoveredSnapshot?.snapshotHash ?? null,
    })),
  });
}

function stableCandidateKey(
  recoveryKind: AppIssuedDocumentRecoveryKind,
  members: readonly Pick<
    AppIssuedDocumentRecoveryCandidateMember,
    "documentId" | "role" | "counterpartDocumentId"
  >[],
): string {
  return hashStable({
    recoveryKind,
    members: members.map((member) => ({
      documentId: member.documentId,
      role: member.role,
      counterpartDocumentId: member.counterpartDocumentId,
    })),
  });
}

function repairId(
  recoveryKind: AppIssuedDocumentRecoveryKind,
  fingerprint: string,
  documentId: string,
): string {
  return `app-issued-recovery:${recoveryKind}:${fingerprint}:${documentId}:v1`;
}

function candidate(
  recoveryKind: AppIssuedDocumentRecoveryKind,
  members: AppIssuedDocumentRecoveryCandidateMember[],
): AppIssuedDocumentRecoveryCandidate {
  const fingerprint = groupFingerprint(recoveryKind, members);
  const repairIds = members
    .filter((member) => member.needsAttestation)
    .map((member) => repairId(recoveryKind, fingerprint, member.documentId));
  return {
    recoveryKind,
    candidateKey: stableCandidateKey(recoveryKind, members),
    groupFingerprint: fingerprint,
    documentIds: members.map((member) => member.documentId),
    repairIds,
    members,
  };
}

function preservesRolledBackHistory(
  data: AppData,
  group: AppIssuedDocumentRecoveryCandidate,
  manualReview: AppIssuedDocumentRecoveryReviewItem[],
): boolean {
  const byId = new Map(
    data.documents.map((document) => [document.id, document] as const),
  );
  const hasRolledBackHistory = group.members.some(
    (member) =>
      byId.get(member.documentId)?.appIssuedRecoveryAttestation?.status ===
      "rolled_back",
  );
  for (const member of group.members) {
    const document = byId.get(member.documentId);
    const previous = document?.appIssuedRecoveryAttestation;
    if (!previous) {
      // En un grupo que ya dejó historial de rollback, la ausencia de uno de
      // los claims requeridos no puede reinterpretarse como primera
      // aplicación. La pareja completa es la unidad auditable.
      if (hasRolledBackHistory && member.needsAttestation && document) {
        review(manualReview, document, ["recovery_attestation_invalid"]);
        return false;
      }
      continue;
    }
    const inspection = document
      ? inspectAppIssuedDocumentRecovery(document)
      : null;
    if (
      !member.needsAttestation ||
      previous.status !== "rolled_back" ||
      !inspection?.ok ||
      inspection.active ||
      previous.recoveryKind !== group.recoveryKind ||
      previous.groupFingerprint !== group.groupFingerprint ||
      previous.beforeFingerprint !== member.beforeFingerprint ||
      previous.afterFingerprint !== member.afterFingerprint ||
      previous.repairId !==
        repairId(
          group.recoveryKind,
          group.groupFingerprint,
          member.documentId,
        )
    ) {
      if (document) {
        review(manualReview, document, ["recovery_attestation_invalid"]);
      }
      return false;
    }
  }
  return true;
}

function previewScope(
  options: AppIssuedDocumentRecoveryPreviewOptions,
): AppIssuedDocumentRecoveryPreviewScope {
  if (!options.selectedCandidateKeys) {
    return { mode: "all", candidateKeys: [] };
  }
  return {
    mode: "selected",
    candidateKeys: [...new Set(options.selectedCandidateKeys)].sort(),
  };
}

function selectCandidates<T extends { candidateKey: string }>(
  candidates: readonly T[],
  scope: AppIssuedDocumentRecoveryPreviewScope,
): { selected: T[]; unknownCandidateKeys: string[] } {
  if (scope.mode === "all") {
    return { selected: [...candidates], unknownCandidateKeys: [] };
  }
  const byKey = new Map(candidates.map((entry) => [entry.candidateKey, entry]));
  return {
    selected: scope.candidateKeys.flatMap((key) => {
      const entry = byKey.get(key);
      return entry ? [entry] : [];
    }),
    unknownCandidateKeys: scope.candidateKeys.filter((key) => !byKey.has(key)),
  };
}

function review(
  target: AppIssuedDocumentRecoveryReviewItem[],
  document: Document,
  reasons: AppIssuedDocumentRecoveryReviewReason[],
): void {
  const existing = target.find((item) => item.documentId === document.id);
  if (existing) {
    existing.reasons = [...new Set([...existing.reasons, ...reasons])];
  } else {
    target.push({
      documentId: document.id,
      documentNumber: document.number,
      reasons: [...new Set(reasons)],
    });
  }
}

function commonBlockReasons(
  document: Document,
): AppIssuedDocumentRecoveryReviewReason[] {
  const reasons: AppIssuedDocumentRecoveryReviewReason[] = [];
  if (isLegacy(document)) reasons.push("legacy_document");
  if (hasVerifactuEvidence(document)) reasons.push("verifactu_evidence");
  if (document.integrityQuarantine) reasons.push("integrity_quarantine");
  if (
    (document.documentLifecycle !== "issued" &&
      document.documentLifecycle !== "canceled") ||
    document.integrityLock !== "locked"
  ) {
    reasons.push("unexpected_integrity_issue");
  }
  if (
    hasAppIssuedRecoveryProtectionClaim(document) &&
    !inspectAppIssuedDocumentRecovery(document).ok
  ) {
    reasons.push("recovery_attestation_invalid");
  }
  return reasons;
}

function hasReusableRolledBackClaim(
  document: Document,
  allowedKinds: readonly AppIssuedDocumentRecoveryKind[],
): boolean {
  const attestation = document.appIssuedRecoveryAttestation;
  if (
    attestation?.status !== "rolled_back" ||
    !allowedKinds.includes(attestation.recoveryKind)
  ) {
    return false;
  }
  const inspection = inspectAppIssuedDocumentRecovery(document);
  return inspection.ok && !inspection.active;
}

function preSealStandaloneInvoiceCandidate(
  data: AppData,
  document: Document,
  evidence: AppIssuedDocumentRecoveryPdfEvidenceByDocumentId,
  manualReview: AppIssuedDocumentRecoveryReviewItem[],
): AppIssuedDocumentRecoveryCandidate | null {
  const disposition = verifactuDisposition(document, true);
  const reusableRolledBackClaim = hasReusableRolledBackClaim(document, [
    "pre_seal_snapshot_pdf_gap_v1",
  ]);
  if (hasExplicitLegacyClaim(document)) {
    review(manualReview, document, ["legacy_document"]);
    return null;
  }
  if (!disposition) {
    review(manualReview, document, ["verifactu_evidence"]);
    return null;
  }
  if (
    document.type !== "factura" ||
    document.status !== "pagado" ||
    document.documentLifecycle !== "issued" ||
    document.integrityLock !== "locked" ||
    !isCanonicalUuid(document.id) ||
    document.rectification ||
    document.rectifiedById ||
    document.receiptDocumentId ||
    document.sourceDocumentId ||
    document.integrityQuarantine ||
    (hasAppIssuedRecoveryProtectionClaim(document) &&
      !reusableRolledBackClaim)
  ) {
    review(manualReview, document, ["unexpected_integrity_issue"]);
    return null;
  }
  const snapshot = document.documentSnapshot;
  const pdfSnapshot = document.pdfSnapshot;
  if (
    !snapshot ||
    !pdfSnapshot ||
    document.snapshotSeal ||
    document.snapshotIntegrityRequired !== undefined ||
    snapshot.source !== "legacy_backfill" ||
    snapshot.documentType !== "factura" ||
    snapshot.documentKind !== "factura" ||
    snapshot.rectification ||
    snapshot.sourceDocumentId
  ) {
    review(manualReview, document, ["partial_evidence"]);
    return null;
  }
  const integrity = inspectDocumentSnapshotsIntegrity(document, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
  });
  const directIssues = new Set(integrity.issues);
  const storedIssues = new Set(document.snapshotIntegrity?.issues ?? []);
  if (
    integrity.documentSnapshot.status !== "verified" ||
    integrity.pdfSnapshot.status !== "verified" ||
    directIssues.size !== 1 ||
    !directIssues.has("document_snapshot_semantic_invalid") ||
    storedIssues.size !== 1 ||
    !storedIssues.has("document_snapshot_semantic_invalid")
  ) {
    review(manualReview, document, ["existing_evidence_invalid"]);
    return null;
  }
  const profile = profileFromFrozenSnapshot(
    data.profile,
    snapshot,
    document,
  );
  const recovered = profile
    ? recoveredSnapshot(
        document,
        profile,
        snapshot.issuer,
        snapshot.capturedAt,
        { omitUnattestedVerifactu: true },
      )
    : null;
  if (
    !recovered ||
    recovered.verifactu ||
    comparableFiscalSnapshot(snapshot) !== comparableFiscalSnapshot(recovered)
  ) {
    review(manualReview, document, ["fiscal_content_mismatch"]);
    return null;
  }
  const sourcePdfEvidence = evidence[document.id];
  if (
    sourcePdfEvidence &&
    !evidenceValid(sourcePdfEvidence, document, recovered)
  ) {
    review(manualReview, document, ["pdf_evidence_invalid"]);
    return null;
  }
  const detected = candidate("pre_seal_snapshot_pdf_gap_v1", [
    {
      documentId: document.id,
      documentNumber: document.number,
      role: "standalone_invoice",
      counterpartDocumentId: null,
      beforeFingerprint: domainFingerprint(document),
      afterFingerprint: domainFingerprint(document),
      needsAttestation: true,
      verifactuDisposition: disposition,
      ...(sourcePdfEvidence
        ? { sourcePdfEvidence: clone(sourcePdfEvidence) }
        : {}),
      recoveredSnapshot: recovered,
    },
  ]);
  return preservesRolledBackHistory(data, detected, manualReview)
    ? detected
    : null;
}

function isPotentialPreSealStandaloneInvoice(document: Document): boolean {
  return Boolean(
    document.type === "factura" &&
      document.status === "pagado" &&
      document.documentLifecycle === "issued" &&
      document.integrityLock === "locked" &&
      isCanonicalUuid(document.id) &&
      document.documentSnapshot?.source === "legacy_backfill" &&
      document.pdfSnapshot &&
      !document.snapshotSeal &&
      document.snapshotIntegrity?.issues.includes(
        "document_snapshot_semantic_invalid",
      ) &&
      (document.verifactu || document.verifactuPersistence)
  );
}

function rectificationCandidate(
  data: AppData,
  original: Document,
  rectification: Document,
  evidence: AppIssuedDocumentRecoveryPdfEvidenceByDocumentId,
  manualReview: AppIssuedDocumentRecoveryReviewItem[],
): AppIssuedDocumentRecoveryCandidate | null {
  const common = [
    ...commonBlockReasons(original),
    ...commonBlockReasons(rectification),
  ];
  if (common.length > 0) {
    review(manualReview, rectification, common);
    return null;
  }
  const relation = rectification.rectification;
  const rectificationClaims = data.documents.filter(
    (document) =>
      document.rectification?.type === "correccion" &&
      document.rectification.originalDocumentId === original.id,
  );
  const originalClaims = data.documents.filter(
    (document) => document.rectifiedById === rectification.id,
  );
  if (
    !relation ||
    relation.type !== "correccion" ||
    original.type !== "factura" ||
    rectification.type !== "factura" ||
    original.rectification ||
    original.rectifiedById !== rectification.id ||
    original.status !== "rectificada" ||
    relation.originalDocumentId !== original.id ||
    relation.originalNumber !== original.number ||
    relation.originalDate !== original.date ||
    rectification.date < original.date ||
    rectification.status === "borrador" ||
    rectificationClaims.length !== 1 ||
    originalClaims.length !== 1
  ) {
    review(manualReview, rectification, ["relationship_invalid"]);
    return null;
  }

  const originalStrict = strictBundleSnapshot(original);
  const rectificationStrict = strictBundleSnapshot(rectification);
  // Una pareja que ya conserva ambos bundles modernos no pertenece a este
  // repair. Sus señales se resuelven por la policy normal de integridad.
  if (originalStrict && rectificationStrict) return null;
  if (originalStrict && !onlyIssues(original, RELATIONSHIP_ONLY_ISSUES)) {
    review(manualReview, original, ["unexpected_integrity_issue"]);
    return null;
  }
  if (
    rectificationStrict &&
    !onlyIssues(rectification, RELATIONSHIP_ONLY_ISSUES)
  ) {
    review(manualReview, rectification, ["unexpected_integrity_issue"]);
    return null;
  }
  if (!originalStrict && !hasNoBundle(original)) {
    review(manualReview, original, ["partial_evidence"]);
    return null;
  }
  if (!rectificationStrict && !hasNoBundle(rectification)) {
    review(manualReview, rectification, ["partial_evidence"]);
    return null;
  }
  if (!originalStrict && !onlyIssues(original, MISSING_BUNDLE_ISSUES)) {
    review(manualReview, original, ["unexpected_integrity_issue"]);
    return null;
  }
  if (
    !rectificationStrict &&
    !onlyIssues(rectification, MISSING_BUNDLE_ISSUES)
  ) {
    review(manualReview, rectification, ["unexpected_integrity_issue"]);
    return null;
  }

  const sourceIssuer = originalStrict?.issuer ?? original.issuer;
  const rectificationIssuer =
    rectificationStrict?.issuer ?? rectification.issuer;
  if (
    !sourceIssuer ||
    !rectificationIssuer ||
    !compatibleIssuerTaxIds(sourceIssuer, rectificationIssuer)
  ) {
    review(manualReview, original, ["fiscal_content_mismatch"]);
    return null;
  }
  const sourceProfile = issuerProfile(
    data.profile,
    sourceIssuer,
    original,
    originalStrict ?? undefined,
  );
  if (!sourceProfile) {
    review(manualReview, original, ["fiscal_content_mismatch"]);
    return null;
  }

  const originalEvidence = evidence[original.id];
  const recoveredOriginal = originalStrict
    ? undefined
    : recoveredSnapshot(
        original,
        sourceProfile,
        sourceIssuer,
        original.createdAt,
      );
  if (!originalStrict && !recoveredOriginal) {
    review(manualReview, original, ["fiscal_content_mismatch"]);
    return null;
  }
  if (
    !originalStrict &&
    originalEvidence &&
    !evidenceValid(originalEvidence, original, recoveredOriginal!)
  ) {
    review(manualReview, original, ["pdf_evidence_invalid"]);
    return null;
  }

  const originalSnapshot = originalStrict ?? recoveredOriginal!;
  const derivedProfile = issuerProfile(
    data.profile,
    originalSnapshot.issuer,
    rectification,
    originalSnapshot,
  );
  const rectificationEvidence = evidence[rectification.id];
  const recoveredRectification =
    rectificationStrict || !derivedProfile
      ? undefined
      : recoveredSnapshot(
          rectification,
          derivedProfile,
          originalSnapshot.issuer,
          rectification.createdAt,
        );
  if (!rectificationStrict && (!derivedProfile || !recoveredRectification)) {
    review(manualReview, rectification, ["fiscal_content_mismatch"]);
    return null;
  }
  if (
    !rectificationStrict &&
    rectificationEvidence &&
    !evidenceValid(
      rectificationEvidence,
      rectification,
      recoveredRectification!,
    )
  ) {
    review(manualReview, rectification, ["pdf_evidence_invalid"]);
    return null;
  }

  const rectificationSnapshot = rectificationStrict ?? recoveredRectification!;
  if (
    !rectificationSnapshotsMatch(originalSnapshot, rectificationSnapshot) ||
    rectificationSnapshot.rectification?.originalDocumentId !== original.id ||
    stableStringifySnapshot(rectificationSnapshot.rectification) !==
      stableStringifySnapshot(relation)
  ) {
    review(manualReview, rectification, ["relationship_invalid"]);
    return null;
  }

  const members: AppIssuedDocumentRecoveryCandidateMember[] = [
    {
      documentId: original.id,
      documentNumber: original.number,
      role: "original_invoice",
      counterpartDocumentId: rectification.id,
      beforeFingerprint: domainFingerprint(original),
      afterFingerprint: domainFingerprint(original),
      needsAttestation: !originalStrict,
      ...(originalEvidence
        ? { sourcePdfEvidence: clone(originalEvidence) }
        : {}),
      ...(recoveredOriginal ? { recoveredSnapshot: recoveredOriginal } : {}),
    },
    {
      documentId: rectification.id,
      documentNumber: rectification.number,
      role: "rectification",
      counterpartDocumentId: original.id,
      beforeFingerprint: domainFingerprint(rectification),
      afterFingerprint: domainFingerprint(rectification),
      needsAttestation: !rectificationStrict,
      ...(rectificationEvidence
        ? { sourcePdfEvidence: clone(rectificationEvidence) }
        : {}),
      ...(recoveredRectification
        ? { recoveredSnapshot: recoveredRectification }
        : {}),
    },
  ];
  const detected = candidate("pre_canonical_rectification_v1", members);
  return preservesRolledBackHistory(data, detected, manualReview)
    ? detected
    : null;
}

function comparableLines(snapshot: DocumentSnapshot): string {
  return stableStringifySnapshot(
    snapshot.items.map((line) => ({
      description: line.description.trim(),
      quantity: line.quantity,
      unit: line.unit?.trim() ?? "",
      unitPrice: line.unitPrice,
      ivaPercent: line.ivaPercent,
      subtotal: line.subtotal,
      ivaAmount: line.ivaAmount,
      total: line.total,
    })),
  );
}

function receiptRelationValid(
  invoice: Document,
  receipt: Document,
  invoiceSnapshot: DocumentSnapshot,
  receiptSnapshot: DocumentSnapshot,
  markerMode: "paid" | "legacy_missing" = "paid",
): boolean {
  const paymentMarkersMatch =
    markerMode === "legacy_missing"
      ? invoice.paymentStatus === undefined &&
        invoice.paidAt === undefined &&
        receipt.paymentStatus === undefined &&
        receipt.paidAt === undefined
      : invoice.paymentStatus === "paid" &&
        Boolean(invoice.paidAt) &&
        receipt.paymentStatus === "paid" &&
        Boolean(receipt.paidAt);
  return Boolean(
    invoiceSnapshot.documentType === "factura" &&
    !invoiceSnapshot.rectification &&
    receiptSnapshot.documentType === "recibo" &&
    !Object.prototype.hasOwnProperty.call(
      receiptSnapshot,
      "sourceDocumentId",
    ) &&
    receipt.sourceDocumentId === invoice.id &&
    invoice.receiptDocumentId === receipt.id &&
    invoice.status === "pagado" &&
    receipt.status === "pagado" &&
    paymentMarkersMatch &&
    receiptSnapshot.date >= invoiceSnapshot.date &&
    receiptSnapshot.notes?.trim() ===
      `Pago de la factura ${invoiceSnapshot.number}` &&
    normalizedTaxId(invoiceSnapshot.issuer.nif) ===
      normalizedTaxId(receiptSnapshot.issuer.nif) &&
    hasUsualSpanishTaxIdShape(normalizedTaxId(invoiceSnapshot.issuer.nif)) &&
    stableStringifySnapshot(invoiceSnapshot.customer) ===
      stableStringifySnapshot(receiptSnapshot.customer) &&
    comparableLines(invoiceSnapshot) === comparableLines(receiptSnapshot) &&
    moneyEqual(
      invoiceSnapshot.taxSummary.subtotal,
      receiptSnapshot.taxSummary.subtotal,
    ) &&
    moneyEqual(
      invoiceSnapshot.taxSummary.iva,
      receiptSnapshot.taxSummary.iva,
    ) &&
    moneyEqual(
      invoiceSnapshot.taxSummary.total,
      receiptSnapshot.taxSummary.total,
    ),
  );
}

function isBareBackfillReceiptPairMember(
  document: Document,
  allowRecoveryClaim = false,
): boolean {
  return Boolean(
    isCanonicalUuid(document.id) &&
      !hasExplicitLegacyClaim(document) &&
      (document.documentSnapshot?.source === "legacy_backfill" ||
        document.documentSnapshot?.source === "issue") &&
      !hasDocumentVerifactuEvidence(document) &&
      !document.integrityQuarantine &&
      (allowRecoveryClaim || !hasAppIssuedRecoveryProtectionClaim(document))
  );
}

function receiptMarkerMode(
  invoice: Document,
  receipt: Document,
): "paid" | "legacy_missing" | null {
  if (
    invoice.paymentStatus === "paid" &&
    invoice.paidAt &&
    receipt.paymentStatus === "paid" &&
    receipt.paidAt
  ) {
    return "paid";
  }
  if (
    invoice.paymentStatus === undefined &&
    invoice.paidAt === undefined &&
    receipt.paymentStatus === undefined &&
    receipt.paidAt === undefined
  ) {
    return "legacy_missing";
  }
  return null;
}

function receiptCandidate(
  data: AppData,
  invoice: Document,
  receipt: Document,
  manualReview: AppIssuedDocumentRecoveryReviewItem[],
): AppIssuedDocumentRecoveryCandidate | null {
  const reusableRolledBackReceiptClaim = hasReusableRolledBackClaim(receipt, [
    "receipt_source_snapshot_gap_v1",
    "receipt_source_and_payment_markers_gap_v1",
  ]);
  const bareBackfillPair = Boolean(
    receipt.documentSnapshot?.source === "legacy_backfill" &&
      isBareBackfillReceiptPairMember(invoice) &&
      isBareBackfillReceiptPairMember(
        receipt,
        reusableRolledBackReceiptClaim,
      ),
  );
  if (!bareBackfillPair) {
    const common = [
      ...commonBlockReasons(invoice),
      ...commonBlockReasons(receipt),
    ];
    if (common.length > 0) {
      review(manualReview, receipt, common);
      return null;
    }
  }
  if (
    data.documents.filter(
      (document) =>
        document.type === "recibo" && document.sourceDocumentId === invoice.id,
    ).length !== 1 ||
    data.documents.filter(
      (document) => document.receiptDocumentId === receipt.id,
    ).length !== 1
  ) {
    review(manualReview, receipt, ["relationship_invalid"]);
    return null;
  }
  const invoiceSnapshot = strictBundleSnapshot(invoice);
  const receiptSnapshot = strictBundleSnapshot(receipt);
  if (!invoiceSnapshot || !receiptSnapshot) {
    review(manualReview, receipt, ["existing_evidence_invalid"]);
    return null;
  }
  const markerMode = receiptMarkerMode(invoice, receipt);
  if (
    !markerMode ||
    invoice.documentLifecycle !== "issued" ||
    receipt.documentLifecycle !== "issued" ||
    invoice.integrityLock !== "locked" ||
    receipt.integrityLock !== "locked" ||
    (bareBackfillPair && invoice.snapshotIntegrity) ||
    (bareBackfillPair &&
      verifactuDisposition(invoice) === null) ||
    (bareBackfillPair && verifactuDisposition(receipt) === null)
  ) {
    review(manualReview, receipt, ["relationship_invalid"]);
    return null;
  }
  // Un recibo canónico ya congela su factura origen dentro del snapshot. No
  // debe aparecer como candidato ni como exclusión del repair histórico.
  if (receiptSnapshot.sourceDocumentId === receipt.sourceDocumentId) {
    return null;
  }
  if (
    !onlyIssues(receipt, RELATIONSHIP_ONLY_ISSUES) ||
    !receiptRelationValid(
      invoice,
      receipt,
      invoiceSnapshot,
      receiptSnapshot,
      markerMode,
    )
  ) {
    review(manualReview, receipt, ["relationship_invalid"]);
    return null;
  }
  const recoveryKind =
    bareBackfillPair && markerMode === "legacy_missing"
      ? "receipt_source_and_payment_markers_gap_v1"
      : "receipt_source_snapshot_gap_v1";
  if (
    receipt.appIssuedRecoveryAttestation &&
    (!reusableRolledBackReceiptClaim ||
      receipt.appIssuedRecoveryAttestation.recoveryKind !== recoveryKind)
  ) {
    review(manualReview, receipt, ["recovery_attestation_invalid"]);
    return null;
  }
  const detected = candidate(recoveryKind, [
    {
      documentId: invoice.id,
      documentNumber: invoice.number,
      role: "invoice",
      counterpartDocumentId: receipt.id,
      beforeFingerprint: domainFingerprint(invoice),
      afterFingerprint: domainFingerprint(invoice),
      needsAttestation: false,
      ...(recoveryKind === "receipt_source_and_payment_markers_gap_v1"
        ? { verifactuDisposition: verifactuDisposition(invoice)! }
        : {}),
    },
    {
      documentId: receipt.id,
      documentNumber: receipt.number,
      role: "receipt",
      counterpartDocumentId: invoice.id,
      beforeFingerprint: domainFingerprint(receipt),
      afterFingerprint: domainFingerprint(receipt),
      needsAttestation: true,
      ...(recoveryKind === "receipt_source_and_payment_markers_gap_v1"
        ? { verifactuDisposition: verifactuDisposition(receipt)! }
        : {}),
    },
  ]);
  return preservesRolledBackHistory(data, detected, manualReview)
    ? detected
    : null;
}

function duplicateIds(documents: readonly Document[]): Set<string> {
  const counts = new Map<string, number>();
  documents.forEach((document) =>
    counts.set(document.id, (counts.get(document.id) ?? 0) + 1),
  );
  return new Set(
    [...counts].filter(([, count]) => count !== 1).map(([id]) => id),
  );
}

function evidenceFromPreview(
  preview: AppIssuedDocumentRecoveryPreview,
): AppIssuedDocumentRecoveryPdfEvidenceByDocumentId {
  const evidence: Record<string, AppIssuedDocumentRecoveryPdfEvidenceV1> = {};
  preview.candidates.forEach((group) =>
    group.members.forEach((member) => {
      if (member.sourcePdfEvidence) {
        evidence[member.documentId] = clone(member.sourcePdfEvidence);
      }
    }),
  );
  return evidence;
}

export function buildAppIssuedDocumentRecoveryPreview(
  data: AppData,
  suppliedEvidence: AppIssuedDocumentRecoveryPdfEvidenceByDocumentId = {},
  options: AppIssuedDocumentRecoveryPreviewOptions = {},
): AppIssuedDocumentRecoveryPreview {
  const evidence: Record<string, AppIssuedDocumentRecoveryPdfEvidenceV1> = {
    ...suppliedEvidence,
  };
  const conflictingRolledBackEvidenceIds = new Set<string>();
  for (const document of data.documents) {
    const previous = document.appIssuedRecoveryAttestation;
    if (previous?.status === "rolled_back" && previous.sourcePdfEvidence) {
      const supplied = evidence[document.id];
      if (
        supplied &&
        stableStringifySnapshot(supplied) !==
          stableStringifySnapshot(previous.sourcePdfEvidence)
      ) {
        conflictingRolledBackEvidenceIds.add(document.id);
      }
      // El historial append-only se reaplica únicamente con la evidencia que
      // ya quedó auditada; nunca se sustituye silenciosamente tras rollback.
      evidence[document.id] = clone(previous.sourcePdfEvidence);
    }
  }

  const duplicates = duplicateIds(data.documents);
  const manualReview: AppIssuedDocumentRecoveryReviewItem[] = [];
  const candidates: AppIssuedDocumentRecoveryCandidate[] = [];
  const alreadyAppliedRepairIds: string[] = [];
  const byId = new Map(
    data.documents.map((document) => [document.id, document]),
  );

  for (const document of data.documents) {
    if (duplicates.has(document.id)) {
      review(manualReview, document, ["duplicate_document_id"]);
      continue;
    }
    const existing = document.appIssuedRecoveryAttestation;
    if (existing?.status === "applied") {
      const inspected = inspectAppIssuedDocumentRecovery(document);
      if (inspected.ok) alreadyAppliedRepairIds.push(existing.repairId);
      else review(manualReview, document, ["recovery_attestation_invalid"]);
    }
  }

  for (const document of data.documents) {
    if (
      !isPotentialPreSealStandaloneInvoice(document) ||
      duplicates.has(document.id) ||
      document.appIssuedRecoveryAttestation?.status === "applied"
    ) {
      continue;
    }
    if (conflictingRolledBackEvidenceIds.has(document.id)) {
      review(manualReview, document, ["pdf_evidence_invalid"]);
      continue;
    }
    const detected = preSealStandaloneInvoiceCandidate(
      data,
      document,
      evidence,
      manualReview,
    );
    if (detected) candidates.push(detected);
  }

  for (const rectification of data.documents) {
    if (
      rectification.rectification?.type !== "correccion" ||
      duplicates.has(rectification.id) ||
      rectification.appIssuedRecoveryAttestation?.status === "applied"
    ) {
      continue;
    }
    const original = byId.get(rectification.rectification.originalDocumentId);
    if (!original || duplicates.has(original.id)) {
      review(manualReview, rectification, ["relationship_invalid"]);
      continue;
    }
    if (
      conflictingRolledBackEvidenceIds.has(rectification.id) ||
      conflictingRolledBackEvidenceIds.has(original.id)
    ) {
      if (conflictingRolledBackEvidenceIds.has(original.id)) {
        review(manualReview, original, ["pdf_evidence_invalid"]);
      }
      if (conflictingRolledBackEvidenceIds.has(rectification.id)) {
        review(manualReview, rectification, ["pdf_evidence_invalid"]);
      }
      continue;
    }
    const detected = rectificationCandidate(
      data,
      original,
      rectification,
      evidence,
      manualReview,
    );
    if (detected) candidates.push(detected);
  }

  for (const receipt of data.documents) {
    if (
      receipt.type !== "recibo" ||
      !receipt.sourceDocumentId ||
      duplicates.has(receipt.id) ||
      receipt.appIssuedRecoveryAttestation?.status === "applied"
    ) {
      continue;
    }
    const invoice = byId.get(receipt.sourceDocumentId);
    if (!invoice || duplicates.has(invoice.id)) {
      review(manualReview, receipt, ["relationship_invalid"]);
      continue;
    }
    const detected = receiptCandidate(data, invoice, receipt, manualReview);
    if (detected) candidates.push(detected);
  }

  const allDeduplicated = [
    ...new Map(
      candidates.map((entry) => [entry.groupFingerprint, entry]),
    ).values(),
  ];
  const scope = previewScope(options);
  const { selected: deduplicated, unknownCandidateKeys } = selectCandidates(
    allDeduplicated,
    scope,
  );
  const selectedDocumentIds = new Set(
    deduplicated.flatMap((entry) =>
      entry.members.map((member) => member.documentId),
    ),
  );
  const selectedEvidence = Object.fromEntries(
    Object.entries(evidence).filter(([documentId]) =>
      selectedDocumentIds.has(documentId),
    ),
  );
  return {
    schemaVersion: APP_ISSUED_RECOVERY_SCHEMA_VERSION,
    precondition: dataPrecondition(data, selectedEvidence, scope),
    scope,
    unknownCandidateKeys,
    affectedCount: deduplicated.reduce(
      (total, entry) => total + entry.repairIds.length,
      0,
    ),
    candidates: deduplicated,
    manualReview,
    requiredPdfDocumentIds: deduplicated.flatMap((entry) =>
      entry.recoveryKind === "pre_canonical_rectification_v1" ||
        entry.recoveryKind === "pre_seal_snapshot_pdf_gap_v1"
        ? entry.members
            .filter(
              (member) => member.needsAttestation && !member.sourcePdfEvidence,
            )
            .map((member) => member.documentId)
        : [],
    ),
    alreadyAppliedRepairIds,
  };
}

function createAttestation(
  document: Document,
  member: AppIssuedDocumentRecoveryCandidateMember,
  group: AppIssuedDocumentRecoveryCandidate,
  now: string,
): AppIssuedDocumentRecoveryAttestation {
  const previous = document.appIssuedRecoveryAttestation;
  if (
    previous?.status === "rolled_back" &&
    previous.recoveryKind === group.recoveryKind &&
    previous.groupFingerprint === group.groupFingerprint &&
    previous.beforeFingerprint === member.beforeFingerprint &&
    previous.afterFingerprint === member.afterFingerprint
  ) {
    const renewed = {
      ...attestationWithoutHash(previous),
      status: "applied",
      events: [...previous.events, { action: "applied", at: now }],
    } as AppIssuedDocumentRecoveryAttestationWithoutHash;
    return { ...renewed, attestationHash: attestationHash(renewed) };
  }
  const recovered = member.recoveredSnapshot
    ? clone(member.recoveredSnapshot)
    : undefined;
  const common = {
      kind: "app_issued_document_recovery",
      repairId: repairId(
        group.recoveryKind,
        group.groupFingerprint,
        document.id,
      ),
      status: "applied",
      documentId: document.id,
      role: member.role,
      counterpartDocumentId: member.counterpartDocumentId,
      groupFingerprint: group.groupFingerprint,
      acceptedState: acceptedState(document),
      beforeEvidence: beforeEvidence(document),
      beforeFingerprint: member.beforeFingerprint,
      afterFingerprint: member.afterFingerprint,
      ...(member.sourcePdfEvidence
        ? { sourcePdfEvidence: clone(member.sourcePdfEvidence) }
        : {}),
      ...(recovered ? { recoveredSnapshot: recovered } : {}),
      events: [{ action: "applied" as const, at: now }],
    };
  const isV2 =
    group.recoveryKind === "pre_seal_snapshot_pdf_gap_v1" ||
    group.recoveryKind === "receipt_source_and_payment_markers_gap_v1";
  const base: AppIssuedDocumentRecoveryAttestationWithoutHash = isV2
      ? {
        ...common,
        schemaVersion: APP_ISSUED_RECOVERY_ATTESTATION_V2,
        recoveryKind: group.recoveryKind,
        verifactuDisposition: member.verifactuDisposition ?? "none",
      } as Omit<AppIssuedDocumentRecoveryAttestationV2, "attestationHash">
    : {
        ...common,
        schemaVersion: APP_ISSUED_RECOVERY_ATTESTATION_V1,
        recoveryKind: group.recoveryKind,
        counterpartDocumentId: member.counterpartDocumentId!,
      } as Omit<AppIssuedDocumentRecoveryAttestationV1, "attestationHash">;
  return { ...base, attestationHash: attestationHash(base) };
}

function allRepairsAlreadyApplied(
  data: AppData,
  preview: AppIssuedDocumentRecoveryPreview,
): boolean {
  const byId = new Map(
    data.documents.map((document) => [document.id, document]),
  );
  const byRepair = new Map(
    data.documents.flatMap((document) =>
      document.appIssuedRecoveryAttestation
        ? [[document.appIssuedRecoveryAttestation.repairId, document] as const]
        : [],
    ),
  );
  const collection = inspectAppIssuedDocumentRecoveryCollection(data.documents);
  return Boolean(
    preview.candidates.length > 0 &&
    preview.candidates.every((group) => {
      const expectedRepairIds = group.members
        .filter((member) => member.needsAttestation)
        .map((member) =>
          repairId(
            group.recoveryKind,
            group.groupFingerprint,
            member.documentId,
          ),
        );
      if (
        group.groupFingerprint !==
          groupFingerprint(group.recoveryKind, group.members) ||
        stableStringifySnapshot(group.documentIds) !==
          stableStringifySnapshot(
            group.members.map((member) => member.documentId),
          ) ||
        stableStringifySnapshot(group.repairIds) !==
          stableStringifySnapshot(expectedRepairIds) ||
        group.members.some((member) => {
          const document = byId.get(member.documentId);
          if (
            !document ||
            domainFingerprint(document) !== member.beforeFingerprint ||
            domainFingerprint(document) !== member.afterFingerprint
          ) {
            return true;
          }
          const attestation = document.appIssuedRecoveryAttestation;
          return member.needsAttestation
            ? !attestation ||
                attestation.repairId !==
                  repairId(
                    group.recoveryKind,
                    group.groupFingerprint,
                    member.documentId,
                  ) ||
                !collection.validDocumentIds.has(member.documentId)
            : Boolean(attestation);
        })
      ) {
        return false;
      }
      return group.repairIds.every((id) => {
        const document = byRepair.get(id);
        const inspection = document
          ? inspectAppIssuedDocumentRecovery(document)
          : null;
        return Boolean(
          inspection?.ok &&
          inspection.active &&
          collection.validDocumentIds.has(document!.id),
        );
      });
    }),
  );
}

export function applyAppIssuedDocumentRecovery(
  data: AppData,
  preview: AppIssuedDocumentRecoveryPreview,
  now: string,
): AppIssuedDocumentRecoveryApplyResult {
  if (allRepairsAlreadyApplied(data, preview)) {
    return { status: "applied", data, appliedRepairIds: [] };
  }
  const evidence = evidenceFromPreview(preview);
  const fresh = buildAppIssuedDocumentRecoveryPreview(data, evidence, {
    selectedCandidateKeys:
      preview.scope?.mode === "selected"
        ? preview.scope.candidateKeys
        : undefined,
  });
  if (
    preview.schemaVersion !== fresh.schemaVersion ||
    preview.precondition !== fresh.precondition ||
    stableStringifySnapshot(preview.candidates) !==
      stableStringifySnapshot(fresh.candidates)
  ) {
    return { status: "blocked", reason: "stale_preview" };
  }
  if (fresh.affectedCount === 0) {
    return { status: "blocked", reason: "no_candidates" };
  }
  if (
    fresh.unknownCandidateKeys.length > 0 ||
    fresh.requiredPdfDocumentIds.length > 0
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  try {
    const replacements = new Map<string, Document>();
    const appliedRepairIds: string[] = [];
    for (const group of fresh.candidates) {
      for (const member of group.members) {
        if (!member.needsAttestation) continue;
        const document = data.documents.find(
          (entry) => entry.id === member.documentId,
        );
        if (
          !document ||
          domainFingerprint(document) !== member.beforeFingerprint
        ) {
          throw new Error("stale_member");
        }
        const attestation = createAttestation(document, member, group, now);
        replacements.set(document.id, {
          ...document,
          appIssuedRecoveryAttestation: attestation,
        });
        appliedRepairIds.push(attestation.repairId);
      }
    }
    const documents = data.documents.map(
      (document) => replacements.get(document.id) ?? document,
    );
    const inspection = inspectAppIssuedDocumentRecoveryCollection(documents);
    if (
      [...replacements.keys()].some(
        (documentId) => !inspection.validDocumentIds.has(documentId),
      )
    ) {
      throw new Error("invalid_recovery_collection");
    }
    return {
      status: "applied",
      data: { ...data, documents },
      appliedRepairIds,
    };
  } catch {
    return { status: "blocked", reason: "candidate_invalid" };
  }
}

function attestationWithoutHash(
  attestation: AppIssuedDocumentRecoveryAttestation,
): AppIssuedDocumentRecoveryAttestationWithoutHash {
  const { attestationHash: _hash, ...withoutHash } = attestation;
  void _hash;
  return withoutHash;
}

export function inspectAppIssuedDocumentRecovery(
  document: Document,
): AppIssuedDocumentRecoveryInspection {
  const invalid = (): AppIssuedDocumentRecoveryInspection => ({
    ok: false,
    issues: ["app_issued_recovery_invalid"],
  });
  const rawAttestation: unknown = document.appIssuedRecoveryAttestation;
  if (!isRecord(rawAttestation)) return invalid();
  const attestation =
    rawAttestation as unknown as AppIssuedDocumentRecoveryAttestation;
  const validV1Kind = Boolean(
    attestation.schemaVersion === APP_ISSUED_RECOVERY_ATTESTATION_V1 &&
      (attestation.recoveryKind === "pre_canonical_rectification_v1" ||
        attestation.recoveryKind === "receipt_source_snapshot_gap_v1"),
  );
  const validV2Kind = Boolean(
    attestation.schemaVersion === APP_ISSUED_RECOVERY_ATTESTATION_V2 &&
      (attestation.recoveryKind === "pre_seal_snapshot_pdf_gap_v1" ||
        attestation.recoveryKind ===
          "receipt_source_and_payment_markers_gap_v1"),
  );
  const standalone =
    attestation.recoveryKind === "pre_seal_snapshot_pdf_gap_v1";
  const bareBackfillReceipt = Boolean(
    (attestation.recoveryKind === "receipt_source_snapshot_gap_v1" ||
      attestation.recoveryKind ===
        "receipt_source_and_payment_markers_gap_v1") &&
      document.documentSnapshot?.source === "legacy_backfill" &&
      isBareBackfillReceiptPairMember(document, true),
  );
  const legacyBlocked = standalone
    ? hasExplicitLegacyClaim(document) ||
      document.documentSnapshot?.source !== "legacy_backfill" ||
      !isCanonicalUuid(document.id)
    : bareBackfillReceipt
      ? false
      : isLegacy(document);
  const expectedDisposition = standalone
    ? verifactuDisposition(document, true)
    : verifactuDisposition(document);
  const verifactuBlocked = standalone
    ? expectedDisposition !== "preserved_unattested_test_artifact"
    : expectedDisposition === null;
  if (
    (!validV1Kind && !validV2Kind) ||
    attestation.kind !== "app_issued_document_recovery" ||
    attestation.documentId !== document.id ||
    (standalone
      ? attestation.counterpartDocumentId !== null
      : !attestation.counterpartDocumentId) ||
    !attestation.groupFingerprint ||
    !attestation.repairId ||
    !eventsValid(attestation) ||
    attestation.attestationHash !==
      attestationHash(attestationWithoutHash(attestation)) ||
    stableStringifySnapshot(attestation.acceptedState) !==
      stableStringifySnapshot(acceptedState(document)) ||
    !immutableEvidenceMatches(document, attestation.beforeEvidence) ||
    domainFingerprint(document) !== attestation.beforeFingerprint ||
    domainFingerprint(document) !== attestation.afterFingerprint ||
    legacyBlocked ||
    verifactuBlocked ||
    (attestation.schemaVersion === APP_ISSUED_RECOVERY_ATTESTATION_V2 &&
      attestation.verifactuDisposition !== expectedDisposition)
  ) {
    return invalid();
  }
  if (attestation.recoveryKind === "pre_canonical_rectification_v1") {
    const snapshot = attestation.recoveredSnapshot;
    const evidence = attestation.sourcePdfEvidence;
    if (
      !snapshot ||
      snapshot.source !== "app_issued_recovery" ||
      !evidence ||
      !hasNoBundle(document) ||
      !evidenceValid(evidence, document, snapshot) ||
      snapshot.number !== evidence.confirmedSummary.number ||
      snapshot.date !== evidence.confirmedSummary.date ||
      !moneyEqual(
        snapshot.taxSummary.subtotal,
        evidence.confirmedSummary.subtotal,
      ) ||
      !moneyEqual(snapshot.taxSummary.iva, evidence.confirmedSummary.iva) ||
      !moneyEqual(snapshot.taxSummary.total, evidence.confirmedSummary.total) ||
      !inspectDocumentSnapshotsIntegrity(
        { documentSnapshot: snapshot },
        {
          requireDocumentSnapshot: true,
          allowAppIssuedRecoverySnapshot: true,
        },
      ).ok
    ) {
      return invalid();
    }
    return {
      ok: true,
      active: attestation.status === "applied",
      kind: attestation.recoveryKind,
      snapshot,
      attestation,
    };
  }
  if (standalone) {
    const snapshot = attestation.recoveredSnapshot;
    const evidence = attestation.sourcePdfEvidence;
    const storedSnapshot = document.documentSnapshot;
    const integrity = inspectDocumentSnapshotsIntegrity(document, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
    });
    if (
      attestation.schemaVersion !== APP_ISSUED_RECOVERY_ATTESTATION_V2 ||
      attestation.role !== "standalone_invoice" ||
      !snapshot ||
      snapshot.source !== "app_issued_recovery" ||
      snapshot.verifactu ||
      !evidence ||
      !storedSnapshot ||
      document.snapshotSeal ||
      document.snapshotIntegrityRequired !== undefined ||
      document.snapshotIntegrity?.issues.length !== 1 ||
      document.snapshotIntegrity.issues[0] !==
        "document_snapshot_semantic_invalid" ||
      integrity.documentSnapshot.status !== "verified" ||
      integrity.pdfSnapshot.status !== "verified" ||
      integrity.issues.length !== 1 ||
      integrity.issues[0] !== "document_snapshot_semantic_invalid" ||
      comparableFiscalSnapshot(storedSnapshot) !==
        comparableFiscalSnapshot(snapshot) ||
      !evidenceValid(evidence, document, snapshot) ||
      !inspectDocumentSnapshotsIntegrity(
        { documentSnapshot: snapshot },
        {
          requireDocumentSnapshot: true,
          allowAppIssuedRecoverySnapshot: true,
        },
      ).ok
    ) {
      return invalid();
    }
    return {
      ok: true,
      active: attestation.status === "applied",
      kind: attestation.recoveryKind,
      snapshot,
      attestation,
    };
  }
  if (
    (attestation.recoveryKind !== "receipt_source_snapshot_gap_v1" &&
      attestation.recoveryKind !==
        "receipt_source_and_payment_markers_gap_v1") ||
    attestation.recoveredSnapshot ||
    attestation.sourcePdfEvidence ||
    attestation.role !== "receipt"
  ) {
    return invalid();
  }
  const snapshot = strictBundleSnapshot(document);
  if (
    !snapshot ||
    snapshot.documentType !== "recibo" ||
    Object.prototype.hasOwnProperty.call(snapshot, "sourceDocumentId")
  ) {
    return invalid();
  }
  return {
    ok: true,
    active: attestation.status === "applied",
    kind: attestation.recoveryKind,
    snapshot,
    attestation,
  };
}

function collectionGroupFingerprintMatches(
  recoveryKind: AppIssuedDocumentRecoveryKind,
  claimedGroupFingerprint: string,
  orderedMembers: readonly {
    document: Document;
    role: AppIssuedDocumentRecoveryRole;
    counterpartDocumentId: string | null;
  }[],
): boolean {
  const members: AppIssuedDocumentRecoveryCandidateMember[] = [];
  const isV2Group =
    recoveryKind === "pre_seal_snapshot_pdf_gap_v1" ||
    recoveryKind === "receipt_source_and_payment_markers_gap_v1";
  for (const member of orderedMembers) {
    const hasClaim = hasAppIssuedRecoveryProtectionClaim(member.document);
    const recovery = hasClaim
      ? inspectAppIssuedDocumentRecovery(member.document)
      : null;
    if (hasClaim && (!recovery?.ok || !recovery.active)) return false;
    const attestation = recovery?.ok ? recovery.attestation : undefined;
    const memberDisposition = isV2Group
      ? attestation?.schemaVersion === APP_ISSUED_RECOVERY_ATTESTATION_V2
        ? attestation.verifactuDisposition
        : verifactuDisposition(
            member.document,
            recoveryKind === "pre_seal_snapshot_pdf_gap_v1",
          )
      : undefined;
    if (
      attestation &&
      (attestation.recoveryKind !== recoveryKind ||
        attestation.role !== member.role ||
        attestation.counterpartDocumentId !== member.counterpartDocumentId ||
        attestation.groupFingerprint !== claimedGroupFingerprint)
    ) {
      return false;
    }
    if (isV2Group && memberDisposition === null) return false;
    const fingerprint = domainFingerprint(member.document);
    members.push({
      documentId: member.document.id,
      documentNumber: member.document.number,
      role: member.role,
      counterpartDocumentId: member.counterpartDocumentId,
      beforeFingerprint: fingerprint,
      afterFingerprint: fingerprint,
      needsAttestation: hasClaim,
      ...(isV2Group
        ? { verifactuDisposition: memberDisposition! }
        : {}),
      ...(attestation?.sourcePdfEvidence
        ? { sourcePdfEvidence: clone(attestation.sourcePdfEvidence) }
        : {}),
      ...(attestation?.recoveredSnapshot
        ? { recoveredSnapshot: clone(attestation.recoveredSnapshot) }
        : {}),
    });
  }
  const recomputed = groupFingerprint(recoveryKind, members);
  if (recomputed !== claimedGroupFingerprint) return false;
  return orderedMembers.every(({ document }) => {
    if (!hasAppIssuedRecoveryProtectionClaim(document)) return true;
    const recovery = inspectAppIssuedDocumentRecovery(document);
    const attestation = recovery.ok ? recovery.attestation : undefined;
    return (
      recovery.ok &&
      recovery.active &&
      attestation?.repairId === repairId(recoveryKind, recomputed, document.id)
    );
  });
}

export function inspectAppIssuedDocumentRecoveryCollection(
  documents: readonly Document[],
): AppIssuedDocumentRecoveryCollectionInspection {
  const claimedDocumentIds = new Set<string>();
  const validDocumentIds = new Set<string>();
  const issuesByDocumentId = new Map<
    string,
    DocumentSnapshotIntegrityIssue[]
  >();
  const duplicates = duplicateIds(documents);
  const byId = new Map(documents.map((document) => [document.id, document]));
  for (const document of documents) {
    if (!hasAppIssuedRecoveryProtectionClaim(document)) continue;
    claimedDocumentIds.add(document.id);
    const local = inspectAppIssuedDocumentRecovery(document);
    if (!local.ok || duplicates.has(document.id) || !local.active) {
      if (!local.ok || duplicates.has(document.id)) {
        issuesByDocumentId.set(document.id, ["app_issued_recovery_invalid"]);
      }
      continue;
    }
    const attestation = local.attestation;
    if (attestation.recoveryKind === "pre_seal_snapshot_pdf_gap_v1") {
      const relationOk = collectionGroupFingerprintMatches(
        attestation.recoveryKind,
        attestation.groupFingerprint,
        [
          {
            document,
            role: "standalone_invoice",
            counterpartDocumentId: null,
          },
        ],
      );
      if (relationOk) validDocumentIds.add(document.id);
      else issuesByDocumentId.set(document.id, [
        "app_issued_recovery_invalid",
      ]);
      continue;
    }
    if (!attestation.counterpartDocumentId) {
      issuesByDocumentId.set(document.id, ["app_issued_recovery_invalid"]);
      continue;
    }
    const counterpart = byId.get(attestation.counterpartDocumentId);
    if (!counterpart || duplicates.has(counterpart.id)) {
      issuesByDocumentId.set(document.id, ["app_issued_recovery_invalid"]);
      continue;
    }
    let relationOk = false;
    if (attestation.recoveryKind === "pre_canonical_rectification_v1") {
      const rectification =
        attestation.role === "rectification" ? document : counterpart;
      const original =
        attestation.role === "original_invoice" ? document : counterpart;
      const rectificationInspection =
        rectification.appIssuedRecoveryAttestation?.status === "applied"
          ? inspectAppIssuedDocumentRecovery(rectification)
          : null;
      const originalInspection =
        original.appIssuedRecoveryAttestation?.status === "applied"
          ? inspectAppIssuedDocumentRecovery(original)
          : null;
      const rectificationSnapshot = rectificationInspection?.ok
        ? rectificationInspection.snapshot
        : strictBundleSnapshot(rectification);
      const originalSnapshot = originalInspection?.ok
        ? originalInspection.snapshot
        : strictBundleSnapshot(original);
      const relation = rectification.rectification;
      relationOk = Boolean(
        originalSnapshot &&
        rectificationSnapshot &&
        relation?.type === "correccion" &&
        relation.originalDocumentId === original.id &&
        relation.originalNumber === originalSnapshot.number &&
        relation.originalDate === originalSnapshot.date &&
        original.rectifiedById === rectification.id &&
        original.status === "rectificada" &&
        rectificationSnapshotsMatch(originalSnapshot, rectificationSnapshot) &&
        rectificationSnapshot.rectification?.originalDocumentId ===
          original.id &&
        stableStringifySnapshot(rectificationSnapshot.rectification) ===
          stableStringifySnapshot(relation) &&
        documents.filter(
          (candidate) =>
            candidate.rectification?.type === "correccion" &&
            candidate.rectification.originalDocumentId === original.id,
        ).length === 1 &&
        documents.filter(
          (candidate) => candidate.rectifiedById === rectification.id,
        ).length === 1 &&
        rectificationSnapshot.date >= originalSnapshot.date &&
        collectionGroupFingerprintMatches(
          attestation.recoveryKind,
          attestation.groupFingerprint,
          [
            {
              document: original,
              role: "original_invoice",
              counterpartDocumentId: rectification.id,
            },
            {
              document: rectification,
              role: "rectification",
              counterpartDocumentId: original.id,
            },
          ],
        ),
      );
    } else {
      const invoice = counterpart;
      const invoiceSnapshot = strictBundleSnapshot(invoice);
      const markerMode =
        attestation.recoveryKind ===
        "receipt_source_and_payment_markers_gap_v1"
          ? "legacy_missing"
          : "paid";
      relationOk = Boolean(
        invoiceSnapshot &&
        documents.filter(
          (candidate) =>
            candidate.type === "recibo" &&
            candidate.sourceDocumentId === invoice.id,
        ).length === 1 &&
        documents.filter(
          (candidate) => candidate.receiptDocumentId === document.id,
        ).length === 1 &&
        receiptRelationValid(
          invoice,
          document,
          invoiceSnapshot,
          local.snapshot,
          markerMode,
        ) &&
        collectionGroupFingerprintMatches(
          attestation.recoveryKind,
          attestation.groupFingerprint,
          [
            {
              document: invoice,
              role: "invoice",
              counterpartDocumentId: document.id,
            },
            {
              document,
              role: "receipt",
              counterpartDocumentId: invoice.id,
            },
          ],
        ),
      );
    }
    if (relationOk) validDocumentIds.add(document.id);
    else issuesByDocumentId.set(document.id, ["app_issued_recovery_invalid"]);
  }
  return { claimedDocumentIds, validDocumentIds, issuesByDocumentId };
}

export function buildAppIssuedDocumentRecoveryRollbackPreview(
  data: AppData,
  options: AppIssuedDocumentRecoveryPreviewOptions = {},
): AppIssuedDocumentRecoveryRollbackPreview {
  const inspection = inspectAppIssuedDocumentRecoveryCollection(data.documents);
  const blockedRepairIds: string[] = [];
  const groups = new Map<string, AppIssuedDocumentRecoveryRollbackCandidate>();
  const byId = new Map(data.documents.map((document) => [document.id, document]));
  for (const document of data.documents) {
    const attestation = document.appIssuedRecoveryAttestation;
    if (!attestation || attestation.status !== "applied") continue;
    if (!inspection.validDocumentIds.has(document.id)) {
      blockedRepairIds.push(attestation.repairId);
      continue;
    }
    const key = `${attestation.recoveryKind}:${attestation.groupFingerprint}`;
    const counterpart = attestation.counterpartDocumentId
      ? byId.get(attestation.counterpartDocumentId)
      : undefined;
    const orderedMembers =
      attestation.recoveryKind === "pre_seal_snapshot_pdf_gap_v1"
        ? [
            {
              documentId: document.id,
              role: "standalone_invoice" as const,
              counterpartDocumentId: null,
            },
          ]
        : attestation.role === "receipt" && counterpart
          ? [
              {
                documentId: counterpart.id,
                role: "invoice" as const,
                counterpartDocumentId: document.id,
              },
              {
                documentId: document.id,
                role: "receipt" as const,
                counterpartDocumentId: counterpart.id,
              },
            ]
          : attestation.role === "rectification" && counterpart
            ? [
                {
                  documentId: counterpart.id,
                  role: "original_invoice" as const,
                  counterpartDocumentId: document.id,
                },
                {
                  documentId: document.id,
                  role: "rectification" as const,
                  counterpartDocumentId: counterpart.id,
                },
              ]
            : attestation.role === "original_invoice" && counterpart
              ? [
                  {
                    documentId: document.id,
                    role: "original_invoice" as const,
                    counterpartDocumentId: counterpart.id,
                  },
                  {
                    documentId: counterpart.id,
                    role: "rectification" as const,
                    counterpartDocumentId: document.id,
                  },
                ]
              : null;
    if (!orderedMembers) {
      blockedRepairIds.push(attestation.repairId);
      continue;
    }
    const rollbackCandidateKey = stableCandidateKey(
      attestation.recoveryKind,
      orderedMembers,
    );
    const existing = groups.get(key);
    if (existing) {
      existing.documentIds.push(document.id);
      existing.repairIds.push(attestation.repairId);
    } else {
      groups.set(key, {
        recoveryKind: attestation.recoveryKind,
        candidateKey: rollbackCandidateKey,
        groupFingerprint: attestation.groupFingerprint,
        documentIds: [document.id],
        repairIds: [attestation.repairId],
      });
    }
  }
  const scope = previewScope(options);
  const { selected: candidates, unknownCandidateKeys } = selectCandidates(
    [...groups.values()],
    scope,
  );
  return {
    schemaVersion: APP_ISSUED_RECOVERY_SCHEMA_VERSION,
    precondition: hashStable({ data, scope }),
    scope,
    unknownCandidateKeys,
    affectedCount: candidates.reduce(
      (total, entry) => total + entry.repairIds.length,
      0,
    ),
    candidates,
    blockedRepairIds,
  };
}

function allRepairsAlreadyRolledBack(
  data: AppData,
  preview: AppIssuedDocumentRecoveryRollbackPreview,
): boolean {
  const requestedRepairIds = preview.candidates.flatMap(
    (candidate) => candidate.repairIds,
  );
  if (
    preview.candidates.length === 0 ||
    requestedRepairIds.length === 0 ||
    new Set(requestedRepairIds).size !== requestedRepairIds.length
  ) {
    return false;
  }
  const requested = new Set(requestedRepairIds);
  const byRepair = new Map(
    data.documents.flatMap((document) =>
      document.appIssuedRecoveryAttestation
        ? [[document.appIssuedRecoveryAttestation.repairId, document] as const]
        : [],
    ),
  );
  const replayDocuments: Document[] = [];
  for (const document of data.documents) {
    const attestation = document.appIssuedRecoveryAttestation;
    if (!attestation || !requested.has(attestation.repairId)) {
      replayDocuments.push(document);
      continue;
    }
    if (
      attestation.status !== "rolled_back" ||
      !inspectAppIssuedDocumentRecovery(document).ok ||
      attestation.events.at(-1)?.action !== "rolled_back"
    ) {
      return false;
    }
    const appliedEvents = attestation.events.slice(0, -1);
    if (appliedEvents.at(-1)?.action !== "applied") return false;
    const active = {
      ...attestationWithoutHash(attestation),
      status: "applied",
      events: appliedEvents,
    } as AppIssuedDocumentRecoveryAttestationWithoutHash;
    replayDocuments.push({
      ...document,
      appIssuedRecoveryAttestation: {
        ...active,
        attestationHash: attestationHash(active),
      },
    });
  }
  const collection =
    inspectAppIssuedDocumentRecoveryCollection(replayDocuments);
  return preview.candidates.every((candidate) =>
    candidate.repairIds.every((id) => {
      const document = byRepair.get(id);
      const attestation = document?.appIssuedRecoveryAttestation;
      return Boolean(
        document &&
        attestation?.status === "rolled_back" &&
        candidate.recoveryKind === attestation.recoveryKind &&
        candidate.groupFingerprint === attestation.groupFingerprint &&
        candidate.documentIds.includes(document.id) &&
        collection.validDocumentIds.has(document.id),
      );
    }),
  );
}

export function rollbackAppIssuedDocumentRecovery(
  data: AppData,
  preview: AppIssuedDocumentRecoveryRollbackPreview,
  now: string,
): AppIssuedDocumentRecoveryRollbackResult {
  if (allRepairsAlreadyRolledBack(data, preview)) {
    return { status: "applied", data, rolledBackRepairIds: [] };
  }
  const fresh = buildAppIssuedDocumentRecoveryRollbackPreview(data, {
    selectedCandidateKeys:
      preview.scope?.mode === "selected"
        ? preview.scope.candidateKeys
        : undefined,
  });
  if (
    preview.schemaVersion !== fresh.schemaVersion ||
    preview.precondition !== fresh.precondition ||
    stableStringifySnapshot(preview.candidates) !==
      stableStringifySnapshot(fresh.candidates)
  ) {
    return { status: "blocked", reason: "stale_preview" };
  }
  if (fresh.affectedCount === 0) {
    return { status: "blocked", reason: "no_candidates" };
  }
  if (fresh.unknownCandidateKeys.length > 0) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  try {
    const requested = new Set(
      fresh.candidates.flatMap((entry) => entry.repairIds),
    );
    const rolledBackRepairIds: string[] = [];
    const documents = data.documents.map((document) => {
      const current = document.appIssuedRecoveryAttestation;
      if (!current || !requested.has(current.repairId)) return document;
      const inspected = inspectAppIssuedDocumentRecovery(document);
      if (!inspected.ok || !inspected.active) throw new Error("stale_repair");
      const rolledBack = {
        ...attestationWithoutHash(current),
        status: "rolled_back",
        events: [...current.events, { action: "rolled_back", at: now }],
      } as AppIssuedDocumentRecoveryAttestationWithoutHash;
      rolledBackRepairIds.push(current.repairId);
      return {
        ...document,
        appIssuedRecoveryAttestation: {
          ...rolledBack,
          attestationHash: attestationHash(rolledBack),
        },
      };
    });
    return {
      status: "applied",
      data: { ...data, documents },
      rolledBackRepairIds,
    };
  } catch {
    return { status: "blocked", reason: "candidate_invalid" };
  }
}
