import {
  validateAdministrativeDomainProjection,
  type AdministrativeDomainProjection,
  type AdministrativeMoneyKind,
} from "./administrative-domain";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
} from "./input-contract";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import type {
  AdministrativeDocumentType,
  ConfidenceBand,
  ExternalReferenceType,
  FieldEvidence,
  FiscalNotificationsWorkspace,
  UnknownExtractedField,
} from "./types";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewDocumentV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
} from "./vertical-slice-review.v1";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_ENGINE_ID_V1 =
  "fiscal-notification-vertical-slice-workspace" as const;
export const FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_VERSION_V1 =
  "1.0.0" as const;

export interface AppendFiscalNotificationVerticalSliceReviewInputV1 {
  readonly ownerScope: string;
  readonly reviewId: string;
  readonly createdAt: string;
  readonly workspace: FiscalNotificationsWorkspace | null;
  readonly analysis: FiscalNotificationLocalAnalysisResult;
}

export type AppendFiscalNotificationVerticalSliceReviewResultV1 = {
  readonly status: "APPLIED" | "EXISTING";
  readonly schemaVersion: 1;
  readonly engineId: typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_ENGINE_ID_V1;
  readonly engineVersion: typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_VERSION_V1;
  readonly documentIds: readonly string[];
  readonly workspace: FiscalNotificationsWorkspace;
  readonly sourceContentRetention: "NOT_RETAINED";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
};

export class FiscalNotificationVerticalSliceWorkspaceErrorV1 extends Error {
  constructor(readonly code: "INVALID_INPUT" | "NO_STRUCTURED_FACTS") {
    super(`FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_${code}`);
    this.name = "FiscalNotificationVerticalSliceWorkspaceErrorV1";
  }
}

const INPUT_KEYS = new Set([
  "ownerScope",
  "reviewId",
  "createdAt",
  "workspace",
  "analysis",
]);
const ANALYSIS_KEYS = new Set([
  "schemaVersion",
  "analysisVersion",
  "technicalReview",
  "ephemeralEnforcementMoneyFacts",
  "ephemeralEnforcementExplicitFields",
  "ephemeralEnforcementPartyFacts",
  "ephemeralDeferralGrantFacts",
  "ephemeralOffsetAgreementFacts",
  "ephemeralVerticalSliceReview",
  "textAcquisition",
  "sourceContentPolicy",
  "requiresHumanReview",
  "materializationPolicy",
]);
const TECHNICAL_REVIEW_KEYS = new Set([
  "schemaVersion",
  "flowVersion",
  "status",
  "reason",
  "engineId",
  "engineVersion",
  "pageCount",
  "byteLength",
  "sha256",
  "candidates",
  "selectedFamilyId",
  "providerCalled",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const TEXT_ACQUISITION_KEYS = new Set(["mode", "averageConfidence"]);
const REVIEW_ID =
  /^review:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const AEAT_AUTHORITY_ID = "authority:aeat";
const VERTICAL_FIELD_PREFIX = "VSR1";

interface TechnicalSourceV1 {
  readonly pageCount: number;
  readonly byteLength: number;
  readonly sha256: string;
  readonly rulesVersion: string;
}

/**
 * Guarda solo la ficha estructurada que el usuario ha decidido conservar.
 * Un mismo PDF puede producir varias fichas documentales; el archivo, su
 * nombre y el texto completo nunca se retienen. Los hechos continúan en
 * revisión y no crean deuda, pago, plazo, gasto ni asiento.
 */
export function appendFiscalNotificationVerticalSliceReviewV1(
  value: AppendFiscalNotificationVerticalSliceReviewInputV1,
): AppendFiscalNotificationVerticalSliceReviewResultV1 {
  const input = snapshotRecord(value, INPUT_KEYS);
  if (!input) throw invalidInput();
  assertBoundedOwnerScope(input.ownerScope, "ownerScope");
  if (
    typeof input.ownerScope !== "string" ||
    !input.ownerScope.startsWith("user:")
  ) {
    throw invalidInput();
  }
  const ownerScope = input.ownerScope;
  const reviewUuid = parseReviewId(input.reviewId);
  const createdAt = parseIsoTimestamp(input.createdAt);
  const analysis = snapshotRecord(input.analysis, ANALYSIS_KEYS);
  if (
    !analysis ||
    analysis.schemaVersion !== 6 ||
    analysis.analysisVersion !== "6.0.0" ||
    analysis.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
    analysis.requiresHumanReview !== true ||
    analysis.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
  ) {
    throw invalidInput();
  }
  validateTextAcquisition(analysis.textAcquisition);
  const source = parseTechnicalSource(analysis.technicalReview);
  const review = parseFiscalNotificationVerticalSliceReviewV1(
    analysis.ephemeralVerticalSliceReview,
  );
  if (review.status !== "REVIEW_REQUIRED" || review.documents.length === 0) {
    throw new FiscalNotificationVerticalSliceWorkspaceErrorV1(
      "NO_STRUCTURED_FACTS",
    );
  }
  if (review.documents.some((document) => document.pageTo > source.pageCount)) {
    throw invalidInput();
  }
  const workspace = parseWorkspace(input.workspace, ownerScope, createdAt);
  preflightReview(review.documents, source, workspace);
  const sourceMatch = findSourceFile(workspace, source.sha256, ownerScope);
  if (
    sourceMatch &&
    (sourceMatch.pageCount !== source.pageCount ||
      sourceMatch.fileSize !== source.byteLength)
  ) {
    throw invalidInput();
  }
  const packageId = sourceMatch?.packageId ?? `package:${reviewUuid}`;
  const fileId = sourceMatch?.id ?? `file:${reviewUuid}`;
  if (!sourceMatch) {
    assertUnusedId(workspace.packages, packageId);
    assertUnusedId(workspace.files, fileId);
  }
  ensureAeatAuthority(workspace, ownerScope);

  const documentIds: string[] = [];
  const missingDocuments: FiscalNotificationVerticalSliceReviewDocumentV1[] = [];
  for (const document of review.documents) {
    const existing = findExistingReviewDocument(
      workspace,
      fileId,
      document.familyId,
    );
    if (existing) {
      documentIds.push(existing.id);
      continue;
    }
    missingDocuments.push(document);
    documentIds.push(documentId(reviewUuid, document.extractorId));
  }

  if (missingDocuments.length === 0) {
    return freezeResult("EXISTING", documentIds, workspace);
  }
  if (!sourceMatch) {
    workspace.packages.push({
      id: packageId,
      ownerScope,
      fileIds: [fileId],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "NEEDS_REVIEW",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: createdAt,
    });
    workspace.files.push({
      id: fileId,
      packageId,
      ownerScope,
      role: "PRIMARY",
      mimeType: "application/pdf",
      fileSize: source.byteLength,
      pageCount: source.pageCount,
      sha256: source.sha256,
      contentFingerprint: source.sha256,
      sourceContentRetention: "NOT_RETAINED",
      uploadedAt: createdAt,
    });
  }

  for (const document of missingDocuments) {
    appendDocument({
      workspace,
      ownerScope,
      reviewUuid,
      createdAt,
      packageId,
      fileId,
      source,
      document,
    });
  }
  workspace.revision += 1;
  workspace.updatedAt = createdAt;
  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    ownerScope,
  );
  if (!validation.valid) throw invalidInput();
  return freezeResult("APPLIED", documentIds, workspace);
}

function appendDocument(input: {
  workspace: FiscalNotificationsWorkspace;
  ownerScope: string;
  reviewUuid: string;
  createdAt: string;
  packageId: string;
  fileId: string;
  source: TechnicalSourceV1;
  document: FiscalNotificationVerticalSliceReviewDocumentV1;
}): void {
  const { workspace, ownerScope, reviewUuid, createdAt, document } = input;
  const id = documentId(reviewUuid, document.extractorId);
  const snapshotId = `analysis:${reviewUuid}:vertical:${document.extractorId}`;
  assertUnusedId(workspace.documents, id);
  assertUnusedId(workspace.analysisSnapshots, snapshotId);

  const evidence: FieldEvidence[] = [];
  const references: FiscalNotificationsWorkspace["references"] = [];
  const unknownFields: UnknownExtractedField[] = [
    {
      labelRaw: "VSR1|DETAIL|SOURCE_PAGE_RANGE|Páginas en el PDF",
      valueRaw:
        document.pageFrom === document.pageTo
          ? String(document.pageFrom)
          : `${document.pageFrom}–${document.pageTo}`,
      page: document.pageFrom,
      confidence: "EXACT",
    },
  ];
  const moneyFacts: NonNullable<
    AdministrativeDomainProjection["moneyFacts"]
  >[number][] = [];
  const evidenceIds = new Set<string>();

  document.fields.forEach((field, fieldIndex) => {
    const fieldEvidenceIds = field.sourcePageNumbers.map((pageNumber) => {
      const evidenceId = `evidence:${reviewUuid}:vertical:${document.extractorId}:${fieldIndex}:${pageNumber}`;
      assertBoundedId(evidenceId, "evidenceId");
      if (
        evidenceIds.has(evidenceId) ||
        workspace.evidence.some((item) => item.id === evidenceId)
      ) {
        throw invalidInput();
      }
      evidenceIds.add(evidenceId);
      evidence.push({
        id: evidenceId,
        ownerScope,
        documentId: id,
        pageNumber,
        textSnippet: field.sourceLabel,
        rawValue: field.normalizedValue ?? field.displayValue,
        extractionMethod: "RULE",
        confidence: confidenceBand(field.confidence),
        assertionType: "EXPLICIT_IN_DOCUMENT",
      });
      return evidenceId;
    });
    const primaryEvidenceId = fieldEvidenceIds[0];
    if (!primaryEvidenceId) throw invalidInput();
    unknownFields.push({
      labelRaw: encodeVerticalFieldLabel(field),
      valueRaw: field.displayValue,
      page: field.sourcePageNumbers[0]!,
      evidenceId: primaryEvidenceId,
      confidence: confidenceBand(field.confidence),
    });
    if (field.semantic === "REFERENCE") {
      references.push({
        id: `reference:${reviewUuid}:vertical:${document.extractorId}:${fieldIndex}`,
        ownerScope,
        referenceType: referenceType(field.canonicalType),
        rawValue: field.displayValue,
        normalizedValue: field.normalizedValue ?? normalizeReference(field.displayValue),
        issuer: "AEAT",
        scope: "DOCUMENT",
        documentId: id,
        isPrimary: references.length === 0,
        confidence: confidenceBand(field.confidence),
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: fieldEvidenceIds,
        createdAt,
      });
    }
    if (field.semantic === "MONEY") {
      if (field.amountCents === null || field.currency !== "EUR") {
        throw invalidInput();
      }
      moneyFacts.push({
        id: `money:${reviewUuid}:vertical:${document.extractorId}:${fieldIndex}`,
        ownerScope,
        documentId: id,
        kind: moneyKind(field.canonicalType, document.familyId),
        amountCents: field.amountCents,
        currency: "EUR",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: fieldEvidenceIds,
        lineageParentIds: [],
        status: "PROPOSED",
        createdAt,
      });
    }
  });

  const administrativeDomain = buildAdministrativeDomain({
    ownerScope,
    documentId: id,
    createdAt,
    document,
    moneyFacts,
  });
  const documentType = documentTypeForFamily(document.familyId);
  const issueDate = normalizedDate(document, "ISSUE_DATE");
  const signingDate = normalizedDate(document, "SIGNING_DATE");
  const effectiveNotificationDate = normalizedDate(
    document,
    "EFFECTIVE_NOTIFICATION_DATE",
  );

  workspace.references.push(...references);
  workspace.evidence.push(...evidence);
  workspace.documents.push({
    id,
    packageId: input.packageId,
    fileId: input.fileId,
    ownerScope,
    documentType,
    documentSubtype: document.familyId,
    titleRaw: document.title,
    titleNormalized: normalizeTitle(document.title),
    authorityId: AEAT_AUTHORITY_ID,
    ...(issueDate ? { issueDate } : {}),
    ...(signingDate ? { signatureDate: signingDate } : {}),
    notificationDates: effectiveNotificationDate
      ? { effectiveAt: effectiveNotificationDate }
      : {},
    status: "UNKNOWN",
    urgency: "REVIEW",
    extractionVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_VERSION_V1,
    analysisStatus: "NEEDS_REVIEW",
    humanReviewStatus: "PENDING",
    authenticityStatus: "NOT_CHECKED",
    partIds: [],
    referenceIds: references.map((item) => item.id),
    debtIds: [],
    caseIds: [],
    analysisSnapshotIds: [snapshotId],
    createdAt,
    updatedAt: createdAt,
  });
  workspace.analysisSnapshots.push({
    id: snapshotId,
    ownerScope,
    documentId: id,
    version: 1,
    extractorVersion: `${FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_ENGINE_ID_V1}/${FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_VERSION_V1}/${document.extractorId}`,
    rulesVersion: input.source.rulesVersion,
    structuredData: {
      schemaVersion: 1,
      documentType,
      administrativeDomain,
      paymentOptionIds: [],
      unknownFields,
      validationCodes: [
        "AUTHENTICITY_NOT_CHECKED",
        "HUMAN_REVIEW_REQUIRED",
        "NO_OPERATIONAL_EFFECT",
        "SOURCE_CONTENT_NOT_RETAINED",
      ],
      factSummary: [],
      calculatedSummary: [],
      inferenceSummary: [],
      userConfirmedSummary: [],
      documentFields: {
        title: document.title,
        ...(issueDate ? { issueDate } : {}),
        ...(effectiveNotificationDate
          ? { effectiveNotificationDate }
          : {}),
      },
    },
    plainLanguageExplanation: [
      "Datos impresos extraídos y guardados para revisión.",
      "El PDF, su nombre y el texto completo no se conservan.",
    ],
    validationWarnings: [
      "La autenticidad no se ha comprobado.",
      "No se ha creado deuda, pago, plazo, gasto ni asiento.",
      ...(document.warnings.length > 0
        ? ["El extractor ha señalado campos que requieren revisión."]
        : []),
    ],
    evidenceIds: [...evidenceIds],
    confidenceBand: confidenceBand(document.confidence),
    requiresHumanReview: true,
    createdAt,
    createdBySystem: true,
  });
}

function buildAdministrativeDomain(input: {
  ownerScope: string;
  documentId: string;
  createdAt: string;
  document: FiscalNotificationVerticalSliceReviewDocumentV1;
  moneyFacts: AdministrativeDomainProjection["moneyFacts"];
}): AdministrativeDomainProjection {
  const candidate: AdministrativeDomainProjection = {
    schemaVersion: 1,
    ownerScope: input.ownerScope,
    documentId: input.documentId,
    extractorId: input.document.extractorId,
    extractorVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_VERSION_V1,
    createdAt: input.createdAt,
    familyId: input.document.familyId,
    status: "REVIEW_REQUIRED",
    roleAssertions: [],
    moneyFacts: input.moneyFacts,
    missingFieldIds: [],
    alternativeFamilyIds: [],
    validationIssues: [],
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    requiresHumanReview: true,
  };
  const validation = validateAdministrativeDomainProjection(
    candidate,
    input.ownerScope,
    input.documentId,
  );
  if (!validation.valid || !validation.projection) throw invalidInput();
  return validation.projection;
}

function preflightReview(
  documents: readonly FiscalNotificationVerticalSliceReviewDocumentV1[],
  source: TechnicalSourceV1,
  workspace: FiscalNotificationsWorkspace,
): void {
  let fields = 0;
  let evidence = 0;
  for (const document of documents) {
    fields += document.fields.length;
    for (const field of document.fields) evidence += field.sourcePageNumbers.length;
  }
  if (
    fields > FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems ||
    evidence > FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems ||
    source.pageCount > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
  ) {
    throw invalidInput();
  }
  if (
    workspace.evidence.length + evidence >
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems ||
    workspace.documents.length + documents.length >
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems
  ) {
    throw invalidInput();
  }
}

function parseTechnicalSource(value: unknown): TechnicalSourceV1 {
  const source = snapshotRecord(value, TECHNICAL_REVIEW_KEYS);
  if (
    !source ||
    source.schemaVersion !== 1 ||
    source.flowVersion !== "1.0.0" ||
    !Number.isSafeInteger(source.pageCount) ||
    Number(source.pageCount) < 1 ||
    Number(source.pageCount) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages ||
    !Number.isSafeInteger(source.byteLength) ||
    Number(source.byteLength) < 1 ||
    Number(source.byteLength) > MAX_SOURCE_BYTES ||
    typeof source.sha256 !== "string" ||
    !SHA256.test(source.sha256) ||
    source.providerCalled !== false ||
    source.selectedFamilyId !== null ||
    source.requiresHumanReview !== true ||
    source.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    source.retainedSourceContent !== "NONE"
  ) {
    throw invalidInput();
  }
  if (
    source.engineVersion !== null &&
    typeof source.engineVersion !== "string"
  ) {
    throw invalidInput();
  }
  if (source.engineVersion !== null) {
    assertBoundedId(source.engineVersion, "technicalReview.engineVersion");
  }
  return Object.freeze({
    pageCount: Number(source.pageCount),
    byteLength: Number(source.byteLength),
    sha256: source.sha256,
    rulesVersion: source.engineVersion ?? "unavailable",
  });
}

function validateTextAcquisition(value: unknown): void {
  if (value === undefined) return;
  const input = snapshotRecord(value, TEXT_ACQUISITION_KEYS);
  if (
    !input ||
    (input.mode !== "PDF_TEXT_LAYER" && input.mode !== "LOCAL_OCR") ||
    (input.averageConfidence !== null &&
      (typeof input.averageConfidence !== "number" ||
        !Number.isFinite(input.averageConfidence) ||
        input.averageConfidence < 0 ||
        input.averageConfidence > 1))
  ) {
    throw invalidInput();
  }
}

function parseWorkspace(
  value: unknown,
  ownerScope: string,
  createdAt: string,
): FiscalNotificationsWorkspace {
  if (value === null) {
    return {
      schemaVersion: 1,
      workspaceId: "fiscal-notifications-workspace-v1",
      ownerScope,
      revision: 0,
      createdAt,
      updatedAt: createdAt,
      packages: [],
      files: [],
      documents: [],
      parts: [],
      authorities: [],
      references: [],
      evidence: [],
      debts: [],
      debtObservations: [],
      cases: [],
      relations: [],
      analysisSnapshots: [],
      paymentOptions: [],
      paymentPlans: [],
      installments: [],
      interestCalculations: [],
      deadlineRules: [],
      obligations: [],
      timeline: [],
      accountingDrafts: [],
      auditEvents: [],
    };
  }
  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    value,
    ownerScope,
  );
  if (!validation.valid) throw invalidInput();
  let copy: FiscalNotificationsWorkspace;
  try {
    copy = structuredClone(value) as FiscalNotificationsWorkspace;
  } catch {
    throw invalidInput();
  }
  if (
    Date.parse(createdAt) < Date.parse(copy.updatedAt) ||
    copy.revision >= Number.MAX_SAFE_INTEGER
  ) {
    throw invalidInput();
  }
  return copy;
}

function findSourceFile(
  workspace: FiscalNotificationsWorkspace,
  sha256: string,
  ownerScope: string,
): FiscalNotificationsWorkspace["files"][number] | null {
  const matches = workspace.files.filter((file) => file.sha256 === sha256);
  if (matches.length === 0) return null;
  if (matches.length !== 1) throw invalidInput();
  const file = matches[0]!;
  const ownerPackage = workspace.packages.find(
    (item) => item.id === file.packageId,
  );
  if (
    file.ownerScope !== ownerScope ||
    file.sourceContentRetention !== "NOT_RETAINED" ||
    !ownerPackage ||
    ownerPackage.ownerScope !== ownerScope ||
    !ownerPackage.fileIds.includes(file.id)
  ) {
    throw invalidInput();
  }
  return file;
}

function findExistingReviewDocument(
  workspace: FiscalNotificationsWorkspace,
  fileId: string,
  familyId: string,
): FiscalNotificationsWorkspace["documents"][number] | null {
  const matches = workspace.documents.filter(
    (document) =>
      document.fileId === fileId && document.documentSubtype === familyId,
  );
  if (matches.length > 1) throw invalidInput();
  return matches[0] ?? null;
}

function ensureAeatAuthority(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
): void {
  const authority = workspace.authorities.find(
    (item) => item.id === AEAT_AUTHORITY_ID,
  );
  if (authority) {
    if (
      authority.ownerScope !== ownerScope ||
      authority.administrationType !== "AEAT" ||
      authority.nameNormalized !==
        "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA" ||
      authority.officialDomain !== "sede.agenciatributaria.gob.es"
    ) {
      throw invalidInput();
    }
    return;
  }
  workspace.authorities.push({
    id: AEAT_AUTHORITY_ID,
    ownerScope,
    administrationType: "AEAT",
    nameRaw: "Agencia Estatal de Administración Tributaria",
    nameNormalized: "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
    officialDomain: "sede.agenciatributaria.gob.es",
  });
}

function documentTypeForFamily(familyId: string): AdministrativeDocumentType {
  switch (familyId) {
    case "compliance.formal_filing_requirement":
      return "AEAT_INFORMATION_REQUEST";
    case "assessment.allegations_and_proposal":
      return "AEAT_ASSESSMENT_PROPOSAL";
    case "assessment.final_provisional_assessment":
      return "AEAT_ASSESSMENT";
    case "payment.payment_form":
      return "AEAT_PAYMENT_FORM";
    case "payment.receipt":
    case "payment.failed_or_reversed":
      return "GENERIC_ADMINISTRATIVE_NOTICE";
    default:
      throw invalidInput();
  }
}

function referenceType(value: string): ExternalReferenceType {
  const mapping: Readonly<Record<string, ExternalReferenceType>> = {
    PROCEDURE_ID: "PROCEDURE_NUMBER",
    EXPEDIENTE_ID: "EXPEDIENT_NUMBER",
    ACT_ID: "DOCUMENT_REFERENCE",
    NOTIFICATION_ID: "NOTIFICATION_ID",
    LIQUIDATION_KEY: "LIQUIDATION_KEY",
    DEBT_KEY: "DEBT_KEY",
    SEIZURE_ORDER_ID: "DOCUMENT_REFERENCE",
    AGREEMENT_ID: "DOCUMENT_REFERENCE",
    REGISTRY_ID: "OFFICIAL_REGISTRY_NUMBER",
    FILING_RECEIPT_ID: "OFFICIAL_REGISTRY_NUMBER",
    PAYMENT_RECEIPT_ID: "PAYMENT_JUSTIFICANTE",
    NRC: "NRC",
    CSV: "CSV",
    NIF: "OTHER",
    MODEL: "TAX_MODEL",
    FISCAL_YEAR: "TAX_EXERCISE",
    TAX_PERIOD: "TAX_PERIOD",
    BANK_REFERENCE: "PAYMENT_JUSTIFICANTE",
    THIRD_PARTY_RESPONSE_ID: "OFFICIAL_REGISTRY_NUMBER",
    OTHER_OFFICIAL_REFERENCE: "OTHER",
  };
  const mapped = mapping[value];
  if (!mapped) throw invalidInput();
  return mapped;
}

function moneyKind(value: string, familyId: string): AdministrativeMoneyKind {
  switch (value) {
    case "PRINCIPAL":
      return "ORIGINAL_TAX_PRINCIPAL";
    case "TAX_QUOTA":
      return familyId === "assessment.allegations_and_proposal"
        ? "PROPOSED_QUOTA"
        : "FINAL_QUOTA";
    case "PENALTY":
      return "SANCTION_INITIAL";
    case "SURCHARGE":
    case "EXECUTIVE_SURCHARGE":
      return "EXECUTIVE_SURCHARGE_PRINTED";
    case "LATE_INTEREST":
      return "LATE_PAYMENT_INTEREST";
    case "COSTS":
      return "COSTS";
    case "PAYMENT_ON_ACCOUNT":
      return "PAYMENT_ON_ACCOUNT";
    case "TOTAL_PAID":
    case "PARTIAL_PAYMENT":
      return "PAYMENT_CONFIRMED";
    case "TOTAL_CLAIMED":
    case "OTHER":
      return "DOCUMENT_TOTAL";
    default:
      throw invalidInput();
  }
}

function normalizedDate(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
  canonicalType: string,
): string | undefined {
  const values = document.fields
    .filter(
      (field) =>
        field.semantic === "DATE" &&
        field.canonicalType === canonicalType &&
        field.normalizedValue !== null,
    )
    .map((field) => field.normalizedValue!);
  if (values.length > 1 && new Set(values).size > 1) return undefined;
  return values[0];
}

function confidenceBand(value: number): ConfidenceBand {
  if (value >= 0.99) return "EXACT";
  if (value >= 0.85) return "HIGH";
  if (value >= 0.6) return "MEDIUM";
  return "LOW";
}

function encodeVerticalFieldLabel(
  field: Pick<
    FiscalNotificationVerticalSliceReviewFieldV1,
    "semantic" | "canonicalType" | "label"
  >,
): string {
  return `${VERTICAL_FIELD_PREFIX}|${field.semantic}|${field.canonicalType}|${field.label}`;
}

function normalizeReference(value: string): string {
  return value.toLocaleUpperCase("es").replace(/[\t \u00a0]+/gu, "");
}

function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleUpperCase("es");
}

function documentId(reviewUuid: string, extractorId: string): string {
  const id = `document:${reviewUuid}:vertical:${extractorId}`;
  assertBoundedId(id, "documentId");
  return id;
}

function assertUnusedId(
  collection: readonly { readonly id: string }[],
  id: string,
): void {
  assertBoundedId(id, "id");
  if (collection.some((item) => item.id === id)) throw invalidInput();
}

function parseReviewId(value: unknown): string {
  assertBoundedId(value, "reviewId");
  const match = REVIEW_ID.exec(value as string);
  if (!match?.[1]) throw invalidInput();
  return match[1];
}

function parseIsoTimestamp(value: unknown): string {
  if (typeof value !== "string") throw invalidInput();
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw invalidInput();
  }
  return value;
}

function snapshotRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const copy: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowedKeys.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      copy[key] = descriptor.value;
    }
    return copy;
  } catch {
    return null;
  }
}

function freezeResult(
  status: "APPLIED" | "EXISTING",
  documentIds: readonly string[],
  workspace: FiscalNotificationsWorkspace,
): AppendFiscalNotificationVerticalSliceReviewResultV1 {
  deepFreeze(workspace);
  return Object.freeze({
    status,
    schemaVersion: 1,
    engineId: FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_ENGINE_ID_V1,
    engineVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_WORKSPACE_VERSION_V1,
    documentIds: Object.freeze([...documentIds]),
    workspace,
    sourceContentRetention: "NOT_RETAINED",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function invalidInput(): FiscalNotificationVerticalSliceWorkspaceErrorV1 {
  return new FiscalNotificationVerticalSliceWorkspaceErrorV1("INVALID_INPUT");
}
