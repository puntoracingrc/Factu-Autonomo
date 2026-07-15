import {
  validateAdministrativeDomainProjection,
  type AdministrativeDomainProjection,
  type AdministrativeMoneyKind,
} from "./administrative-domain";
import {
  parseAeatEnforcementExplicitFieldsV2,
  type AeatEnforcementPrintedDateFactV2,
  type AeatEnforcementReferenceFactV2,
} from "./aeat-enforcement-explicit-fields.v2";
import type {
  AeatEnforcementMoneyFact,
  AeatEnforcementMoneyFactKind,
  AeatEnforcementMoneyFactsResult,
} from "./aeat-enforcement-money-facts";
import {
  parseAeatEnforcementPartyFactsV1,
} from "./aeat-enforcement-party-facts.v1";
import { parseAeatDeferralGrantFactsContractV1 } from "./aeat-deferral-grant-facts.v1-contract";
import type {
  AeatDeferralGrantFactsResultV1,
  AeatDeferralMoneyFactV1,
  AeatDeferralPrintedDateFactV1,
  AeatDeferralTextFactV1,
} from "./aeat-deferral-grant-facts.v1";
import { parseAeatOffsetAgreementFactsContractV1 } from "./aeat-offset-agreement-facts.v1-contract";
import type {
  AeatOffsetAgreementFactsResultV1,
  AeatOffsetMoneyFactV1,
  AeatOffsetPrintedDateFactV1,
  AeatOffsetTextFactV1,
} from "./aeat-offset-agreement-facts.v1";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
} from "./input-contract";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import type {
  ExternalReferenceType,
  FieldEvidence,
  FiscalNotificationsWorkspace,
  MoneyComponent,
  PaymentOption,
  UnknownExtractedField,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";
import { parseFiscalNotificationVerticalSliceReviewV1 } from "./vertical-slice-review.v1";

export const FISCAL_NOTIFICATION_STRUCTURED_REVIEW_SCHEMA_VERSION_V1 =
  1 as const;
export const FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_ID_V1 =
  "fiscal-notification-structured-review-workspace" as const;
export const FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1 =
  "1.0.0" as const;

export interface AppendAeatEnforcementStructuredReviewInputV1 {
  readonly ownerScope: string;
  readonly reviewId: string;
  readonly createdAt: string;
  readonly workspace: FiscalNotificationsWorkspace | null;
  readonly analysis: FiscalNotificationLocalAnalysisResult;
}

export type AppendAeatEnforcementStructuredReviewResultV1 =
  | {
      readonly status: "APPLIED";
      readonly schemaVersion: 1;
      readonly engineId: "fiscal-notification-structured-review-workspace";
      readonly engineVersion: "1.0.0";
      readonly documentId: string;
      readonly workspace: FiscalNotificationsWorkspace;
      readonly sourceContentRetention: "NOT_RETAINED";
      readonly requiresHumanReview: true;
      readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
    }
  | {
      readonly status: "EXISTING";
      readonly schemaVersion: 1;
      readonly engineId: "fiscal-notification-structured-review-workspace";
      readonly engineVersion: "1.0.0";
      readonly documentId: string;
      readonly workspace: FiscalNotificationsWorkspace;
      readonly sourceContentRetention: "NOT_RETAINED";
      readonly requiresHumanReview: true;
      readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
    };

export type AppendAeatDeferralStructuredReviewResultV1 =
  AppendAeatEnforcementStructuredReviewResultV1;

export type AppendAeatOffsetStructuredReviewResultV1 =
  AppendAeatEnforcementStructuredReviewResultV1;

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
const CANDIDATE_KEYS = new Set([
  "familyId",
  "recognitionPolicyVersion",
  "segmentationVersion",
  "documentType",
  "authoritySignal",
  "handlerId",
  "handlerVersion",
  "signalStatus",
  "matchedAnchors",
  "missingRequiredAnchorIds",
  "conflictingAnchorIds",
  "requiresHumanReview",
]);
const ANCHOR_KEYS = new Set(["anchorId", "pageNumbers"]);
const MONEY_ROOT_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "status",
  "outcome",
  "facts",
  "issues",
  "selectedPaymentAmountKind",
  "semanticPolicy",
  "legalRuleStatus",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const MONEY_FACT_KEYS = new Set([
  "kind",
  "amountCents",
  "currency",
  "evidence",
  "reviewStatus",
]);
const MONEY_EVIDENCE_KEYS = new Set([
  "pageNumber",
  "label",
  "extractionMethod",
  "assertionType",
]);
const MONEY_ISSUE_KEYS = new Set(["code", "kind", "pageNumbers"]);
const MONEY_ISSUE_CODES = new Set([
  "FAMILY_GATE_NOT_SATISFIED",
  "NO_AMOUNT_SECTION",
  "NO_CLOSED_LABEL_MATCH",
  "LABEL_WITHOUT_AMOUNT",
  "INVALID_AMOUNT_FORMAT",
  "DUPLICATE_AMOUNT_SECTION",
  "DUPLICATE_MONEY_LABEL",
  "UNSUPPORTED_SECTION_PREAMBLE",
  "SECTION_SCAN_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);
const MONEY_KINDS = new Set<AeatEnforcementMoneyFactKind>([
  "OUTSTANDING_PRINCIPAL",
  "ORDINARY_ENFORCEMENT_SURCHARGE",
  "PAYMENT_ON_ACCOUNT",
  "DOCUMENT_TOTAL",
]);
const MONEY_EVIDENCE_LABELS: Readonly<
  Record<
    AeatEnforcementMoneyFactKind,
    AeatEnforcementMoneyFact["evidence"][number]["label"]
  >
> = Object.freeze({
  OUTSTANDING_PRINCIPAL: "OUTSTANDING_PRINCIPAL_LABEL",
  ORDINARY_ENFORCEMENT_SURCHARGE:
    "ORDINARY_ENFORCEMENT_SURCHARGE_LABEL",
  PAYMENT_ON_ACCOUNT: "PAYMENT_ON_ACCOUNT_LABEL",
  DOCUMENT_TOTAL: "DOCUMENT_TOTAL_LABEL",
});
const REVIEW_ID =
  /^review:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_AMOUNT_CENTS = 100_000_000_000;
const ENFORCEMENT_REQUIRED_ANCHOR_IDS = new Set([
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "ENFORCEMENT_ORDER_TITLE",
  "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
  "ENFORCEMENT_DEBT_AMOUNT_SECTION",
  "STRUCTURAL_FIRST_PAGE_HEADER",
]);
const DEFERRAL_REQUIRED_ANCHOR_IDS = new Set([
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "DEFERRAL_GRANT_TITLE",
  "DEFERRAL_INSTALLMENT_ANNEX",
  "DEFERRAL_INTEREST_CALCULATION",
  "STRUCTURAL_FIRST_PAGE_HEADER",
]);
const OFFSET_LEGACY_REQUIRED_ANCHOR_IDS = new Set([
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "OFFSET_AGREEMENT_TITLE",
  "OFFSET_CREDIT_AND_DEBT_ANNEX",
  "OFFSET_AGREEMENT_NUMBER",
  "STRUCTURAL_FIRST_PAGE_HEADER",
]);
const OFFSET_STRUCTURAL_REQUIRED_ANCHOR_IDS = new Set([
  "OFFSET_AGREEMENT_TITLE",
  "OFFSET_CREDIT_AND_DEBT_ANNEX",
  "OFFSET_AGREEMENT_NUMBER",
  "STRUCTURAL_PRIMARY_ACT_HEADER",
]);

export class FiscalNotificationStructuredReviewV1Error extends Error {
  constructor(readonly code: "INVALID_INPUT" | "NO_STRUCTURED_FACTS") {
    super(`FISCAL_NOTIFICATION_STRUCTURED_REVIEW_${code}`);
    this.name = "FiscalNotificationStructuredReviewV1Error";
  }
}

/**
 * Convierte resultados exactos y efímeros en entidades del workspace fiscal.
 * El límite es deliberado: guarda hechos estructurados revisables, pero nunca
 * conserva el PDF/texto, confirma autenticidad ni crea deuda o acción.
 */
export function appendAeatEnforcementStructuredReviewV1(
  value: AppendAeatEnforcementStructuredReviewInputV1,
): AppendAeatEnforcementStructuredReviewResultV1 {
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
    analysis.ephemeralDeferralGrantFacts !== null ||
    analysis.ephemeralOffsetAgreementFacts !== null ||
    analysis.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
    analysis.requiresHumanReview !== true ||
    analysis.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
  ) {
    throw invalidInput();
  }
  validateEphemeralAnalysisExtensions(analysis);
  const technicalReview = parseTechnicalReview(analysis.technicalReview);
  const workspace = parseWorkspace(input.workspace, ownerScope, createdAt);

  const explicitFields =
    analysis.ephemeralEnforcementExplicitFields === null
      ? null
      : parseAeatEnforcementExplicitFieldsV2(
          analysis.ephemeralEnforcementExplicitFields,
          technicalReview.pageCount,
        );
  const partyFacts =
    analysis.ephemeralEnforcementPartyFacts === null
      ? null
      : parseAeatEnforcementPartyFactsV1(
          analysis.ephemeralEnforcementPartyFacts,
          technicalReview.pageCount,
        );
  const moneyFacts =
    analysis.ephemeralEnforcementMoneyFacts === null
      ? null
      : parseMoneyFacts(
          analysis.ephemeralEnforcementMoneyFacts,
          technicalReview.pageCount,
        );

  const existingFiles = workspace.files.filter(
    (file) => file.sha256 === technicalReview.sha256,
  );
  if (existingFiles.length > 0) {
    if (existingFiles.length !== 1) throw invalidInput();
    const existingDocuments = workspace.documents.filter(
      (document) => document.fileId === existingFiles[0]!.id,
    );
    if (existingDocuments.length !== 1) throw invalidInput();
    return freezeResult({
      status: "EXISTING",
      documentId: existingDocuments[0]!.id,
      workspace,
    });
  }

  const referenceFacts =
    explicitFields?.outcome === "FACTS_AVAILABLE"
      ? explicitFields.referenceFacts
      : [];
  const printedDateFacts =
    explicitFields?.outcome === "FACTS_AVAILABLE"
      ? explicitFields.printedDateFacts
      : [];
  const exactMoneyFacts =
    moneyFacts?.outcome === "FACTS_AVAILABLE" ? moneyFacts.facts : [];
  const identifiedSubject =
    partyFacts?.outcome === "FACTS_AVAILABLE"
      ? partyFacts.identifiedSubject
      : null;
  if (
    referenceFacts.length === 0 &&
    printedDateFacts.length === 0 &&
    exactMoneyFacts.length === 0 &&
    !identifiedSubject
  ) {
    throw new FiscalNotificationStructuredReviewV1Error(
      "NO_STRUCTURED_FACTS",
    );
  }

  const ids = idsFor(reviewUuid);
  const evidence: FieldEvidence[] = [];
  const evidenceIds = new Set<string>();
  const addEvidence = (entry: FieldEvidence): string => {
    if (evidenceIds.has(entry.id)) throw invalidInput();
    evidenceIds.add(entry.id);
    evidence.push(entry);
    return entry.id;
  };

  const partyEvidenceIds = identifiedSubject
    ? identifiedSubject.evidence.map((item) =>
        addEvidence({
          id: `${ids.evidence}:party:${item.pageNumber}`,
          ownerScope,
          documentId: ids.document,
          pageNumber: item.pageNumber,
          textSnippet: "Identificación del obligado al pago",
          extractionMethod: "RULE",
          confidence: "EXACT",
          assertionType: "EXPLICIT_IN_DOCUMENT",
        }),
      )
    : [];

  const references = referenceFacts.map((fact, index) => {
    const occurrenceIds = fact.pageNumbers.map((pageNumber) =>
      addEvidence({
        id: `${ids.evidence}:reference:${index}:${pageNumber}`,
        ownerScope,
        documentId: ids.document,
        pageNumber,
        textSnippet: referenceEvidenceLabel(fact),
        rawValue: fact.printedValue,
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      }),
    );
    return {
      id: `${ids.reference}:${index}`,
      ownerScope,
      referenceType: fact.kind as ExternalReferenceType,
      rawValue: fact.printedValue,
      normalizedValue: normalizeReference(fact.printedValue),
      issuer: "AEAT",
      scope: "DOCUMENT" as const,
      documentId: ids.document,
      isPrimary: index === 0,
      confidence: "EXACT" as const,
      confirmationStatus: "PENDING" as const,
      extractionMethod: "RULE" as const,
      occurrenceIds,
      createdAt,
    };
  });

  const unknownFields: UnknownExtractedField[] = printedDateFacts.map(
    (fact, index) => {
      const pageNumber = fact.pageNumbers[0];
      if (!pageNumber) throw invalidInput();
      const evidenceId = addEvidence({
        id: `${ids.evidence}:date:${index}:${pageNumber}`,
        ownerScope,
        documentId: ids.document,
        pageNumber,
        textSnippet: printedDateEvidenceLabel(fact),
        rawValue: fact.printedValue,
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      });
      return {
        labelRaw: fact.kind,
        valueRaw: fact.printedValue,
        page: pageNumber,
        evidenceId,
        confidence: "EXACT" as const,
      };
    },
  );

  const moneyProjectionFacts = exactMoneyFacts.map((fact, index) => {
    const factEvidenceIds = fact.evidence.map((item) =>
      addEvidence({
        id: `${ids.evidence}:money:${index}:${item.pageNumber}`,
        ownerScope,
        documentId: ids.document,
        pageNumber: item.pageNumber,
        textSnippet: moneyEvidenceLabel(fact.kind),
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      }),
    );
    return {
      id: `${ids.money}:${index}`,
      ownerScope,
      documentId: ids.document,
      kind: administrativeMoneyKind(fact.kind),
      amountCents: fact.amountCents,
      currency: fact.currency,
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      evidenceIds: factEvidenceIds,
      lineageParentIds: [],
      status: "PROPOSED" as const,
      createdAt,
    };
  });

  const administrativeDomain = buildAdministrativeDomain({
    ownerScope,
    documentId: ids.document,
    createdAt,
    familyId: technicalReview.candidate.familyId,
    identifiedSubject: Boolean(identifiedSubject),
    partyEvidenceIds,
    partyRefId: ids.subject,
    moneyFacts: moneyProjectionFacts,
    hasReferences: references.length > 0,
    hasDates: printedDateFacts.length > 0,
  });
  const issueDate = printedDateFacts.find(
    (fact) => fact.kind === "PRINTED_ISSUE_DATE",
  )?.calendarDate;
  const signatureDate = printedDateFacts.find(
    (fact) => fact.kind === "PRINTED_SIGNATURE_DATE",
  )?.calendarDate;

  const authority = workspace.authorities.find(
    (item) => item.id === ids.authority,
  );
  if (
    authority &&
    (authority.administrationType !== "AEAT" ||
      authority.nameNormalized !==
        "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA" ||
      authority.officialDomain !== "sede.agenciatributaria.gob.es")
  ) {
    throw invalidInput();
  }
  validateEphemeralAnalysisExtensions(analysis);
  if (!authority) {
    workspace.authorities.push({
      id: ids.authority,
      ownerScope,
      administrationType: "AEAT",
      nameRaw: "Agencia Estatal de Administración Tributaria",
      nameNormalized: "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
      officialDomain: "sede.agenciatributaria.gob.es",
    });
  }
  workspace.packages.push({
    id: ids.package,
    ownerScope,
    fileIds: [ids.file],
    sourceChannel: "MANUAL_UPLOAD",
    processingStatus: "NEEDS_REVIEW",
    securityScanStatus: "NOT_AVAILABLE",
    uploadedAt: createdAt,
  });
  workspace.files.push({
    id: ids.file,
    packageId: ids.package,
    ownerScope,
    role: "PRIMARY",
    mimeType: "application/pdf",
    fileSize: technicalReview.byteLength,
    pageCount: technicalReview.pageCount,
    sha256: technicalReview.sha256,
    contentFingerprint: technicalReview.sha256,
    sourceContentRetention: "NOT_RETAINED",
    uploadedAt: createdAt,
  });
  workspace.references.push(...references);
  workspace.evidence.push(...evidence);
  workspace.documents.push({
    id: ids.document,
    packageId: ids.package,
    fileId: ids.file,
    ownerScope,
    documentType: "AEAT_ENFORCEMENT_ORDER",
    titleRaw: "Providencia de apremio AEAT",
    titleNormalized: "PROVIDENCIA DE APREMIO AEAT",
    authorityId: ids.authority,
    ...(issueDate ? { issueDate } : {}),
    ...(signatureDate ? { signatureDate } : {}),
    notificationDates: {},
    ...(identifiedSubject
      ? {
          subjectParty: {
            displayName: identifiedSubject.printedName,
            taxIdNormalized: identifiedSubject.printedTaxId,
            matchesBusinessProfile: "UNKNOWN" as const,
          },
        }
      : {}),
    status: "UNKNOWN",
    urgency: "REVIEW",
    extractionVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    analysisStatus: "NEEDS_REVIEW",
    humanReviewStatus: "PENDING",
    authenticityStatus: "NOT_CHECKED",
    partIds: [],
    referenceIds: references.map((item) => item.id),
    debtIds: [],
    caseIds: [],
    analysisSnapshotIds: [ids.snapshot],
    createdAt,
    updatedAt: createdAt,
  });
  workspace.analysisSnapshots.push({
    id: ids.snapshot,
    ownerScope,
    documentId: ids.document,
    version: 1,
    extractorVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    rulesVersion: technicalReview.engineVersion ?? "unavailable",
    structuredData: {
      schemaVersion: 1,
      documentType: "AEAT_ENFORCEMENT_ORDER",
      administrativeDomain,
      paymentOptionIds: [],
      unknownFields,
      validationCodes: [
        "AUTHENTICITY_NOT_CHECKED",
        "HUMAN_REVIEW_REQUIRED",
        "NO_OPERATIONAL_EFFECT",
      ],
      factSummary: [],
      calculatedSummary: [],
      inferenceSummary: [],
      userConfirmedSummary: [],
      documentFields: {
        title: "Providencia de apremio AEAT",
        ...(issueDate ? { issueDate } : {}),
      },
    },
    plainLanguageExplanation: [
      "Datos impresos extraídos y pendientes de revisión humana.",
      "El documento original y su texto no se conservan.",
    ],
    validationWarnings: [
      "La autenticidad no se ha comprobado.",
      "No se ha creado deuda, pago, plazo, gasto ni asiento.",
    ],
    evidenceIds: [...evidenceIds],
    confidenceBand: "HIGH",
    requiresHumanReview: true,
    createdAt,
    createdBySystem: true,
  });
  workspace.revision += 1;
  workspace.updatedAt = createdAt;

  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    ownerScope,
  );
  if (!validation.valid) throw invalidInput();
  return freezeResult({
    status: "APPLIED",
    documentId: ids.document,
    workspace,
  });
}

/**
 * Conserva los hechos impresos de una concesión como ficha revisable. Cada
 * cuota se guarda como opción documental: no se activa un plan, no se marca
 * como pagada y no se crea deuda, gasto, vencimiento legal ni asiento.
 */
export function appendAeatDeferralStructuredReviewV1(
  value: AppendAeatEnforcementStructuredReviewInputV1,
): AppendAeatDeferralStructuredReviewResultV1 {
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
    analysis.ephemeralEnforcementMoneyFacts !== null ||
    analysis.ephemeralEnforcementExplicitFields !== null ||
    analysis.ephemeralEnforcementPartyFacts !== null ||
    analysis.ephemeralDeferralGrantFacts === null ||
    analysis.ephemeralOffsetAgreementFacts !== null ||
    analysis.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
    analysis.requiresHumanReview !== true ||
    analysis.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
  ) {
    throw invalidInput();
  }
  validateEphemeralAnalysisExtensions(analysis);
  const technicalReview = parseTechnicalReview(
    analysis.technicalReview,
    "DEFERRAL",
  );
  let facts: AeatDeferralGrantFactsResultV1;
  try {
    facts = parseAeatDeferralGrantFactsContractV1(
      analysis.ephemeralDeferralGrantFacts,
      technicalReview.pageCount,
    );
  } catch {
    throw invalidInput();
  }
  if (
    facts.documentType !== "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT" ||
    facts.debtSchedules.length === 0 ||
    (facts.outcome !== "FACTS_AVAILABLE" && facts.outcome !== "AMBIGUOUS")
  ) {
    throw new FiscalNotificationStructuredReviewV1Error(
      "NO_STRUCTURED_FACTS",
    );
  }
  const workspace = parseWorkspace(input.workspace, ownerScope, createdAt);
  const existingFiles = workspace.files.filter(
    (file) => file.sha256 === technicalReview.sha256,
  );
  if (existingFiles.length > 0) {
    if (existingFiles.length !== 1) throw invalidInput();
    const existingDocuments = workspace.documents.filter(
      (document) => document.fileId === existingFiles[0]!.id,
    );
    if (existingDocuments.length !== 1) throw invalidInput();
    return freezeResult({
      status: "EXISTING",
      documentId: existingDocuments[0]!.id,
      workspace,
    });
  }

  const ids = idsFor(reviewUuid);
  const evidence: FieldEvidence[] = [];
  const evidenceIds = new Set<string>();
  const addEvidence = (entry: FieldEvidence): string => {
    if (evidenceIds.has(entry.id)) throw invalidInput();
    evidenceIds.add(entry.id);
    evidence.push(entry);
    return entry.id;
  };
  const textEvidence = (
    id: string,
    label: string,
    fact: AeatDeferralTextFactV1,
  ): string =>
    addEvidence({
      id,
      ownerScope,
      documentId: ids.document,
      pageNumber: firstPage(fact.pageNumbers),
      textSnippet: label,
      rawValue: fact.printedValue,
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
  const moneyEvidence = (
    id: string,
    label: string,
    fact: AeatDeferralMoneyFactV1,
  ): string =>
    addEvidence({
      id,
      ownerScope,
      documentId: ids.document,
      pageNumber: firstPage(fact.pageNumbers),
      textSnippet: label,
      rawValue: fact.printedValue,
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
  const dateEvidence = (
    id: string,
    label: string,
    fact: AeatDeferralPrintedDateFactV1,
  ): string =>
    addEvidence({
      id,
      ownerScope,
      documentId: ids.document,
      pageNumber: firstPage(fact.pageNumbers),
      textSnippet: label,
      rawValue: fact.printedValue,
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });

  const references = [] as FiscalNotificationsWorkspace["references"];
  if (facts.header.expediente) {
    const occurrenceId = textEvidence(
      `${ids.evidence}:expediente`,
      "Número de expediente",
      facts.header.expediente,
    );
    references.push({
      id: `${ids.reference}:expediente`,
      ownerScope,
      referenceType: "EXPEDIENT_NUMBER",
      rawValue: facts.header.expediente.printedValue,
      normalizedValue: normalizeReference(facts.header.expediente.printedValue),
      issuer: "AEAT",
      scope: "DOCUMENT",
      documentId: ids.document,
      isPrimary: true,
      confidence: "EXACT",
      confirmationStatus: "PENDING",
      extractionMethod: "RULE",
      occurrenceIds: [occurrenceId],
      createdAt,
    });
  }

  const unknownFields: UnknownExtractedField[] = [];
  const addUnknownText = (
    labelRaw: string,
    label: string,
    fact: AeatDeferralTextFactV1,
    suffix: string,
  ): void => {
    const evidenceId = textEvidence(
      `${ids.evidence}:${suffix}`,
      label,
      fact,
    );
    unknownFields.push({
      labelRaw,
      valueRaw: fact.printedValue,
      page: firstPage(fact.pageNumbers),
      evidenceId,
      confidence: "EXACT",
    });
  };
  const addUnknownDate = (
    labelRaw: string,
    label: string,
    fact: AeatDeferralPrintedDateFactV1,
    suffix: string,
  ): void => {
    const evidenceId = dateEvidence(
      `${ids.evidence}:${suffix}`,
      label,
      fact,
    );
    unknownFields.push({
      labelRaw,
      valueRaw: fact.printedValue,
      page: firstPage(fact.pageNumbers),
      evidenceId,
      confidence: "EXACT",
    });
  };
  const addUnknownMoney = (
    labelRaw: string,
    label: string,
    fact: AeatDeferralMoneyFactV1,
    suffix: string,
  ): void => {
    const evidenceId = moneyEvidence(
      `${ids.evidence}:${suffix}`,
      label,
      fact,
    );
    unknownFields.push({
      labelRaw,
      valueRaw: fact.printedValue,
      page: firstPage(fact.pageNumbers),
      evidenceId,
      confidence: "EXACT",
    });
  };
  if (facts.header.paymentAccount) {
    addUnknownText(
      "PRINTED_PAYMENT_ACCOUNT",
      "Cuenta de pago impresa",
      facts.header.paymentAccount,
      "payment-account",
    );
  }

  const paymentOptions: PaymentOption[] = [];
  for (
    let scheduleIndex = 0;
    scheduleIndex < facts.debtSchedules.length;
    scheduleIndex += 1
  ) {
    const schedule = facts.debtSchedules[scheduleIndex]!;
    const liquidationEvidenceId = textEvidence(
      `${ids.evidence}:liquidation:${scheduleIndex}`,
      "Clave de liquidación",
      schedule.liquidationKey,
    );
    references.push({
      id: `${ids.reference}:liquidation:${scheduleIndex}`,
      ownerScope,
      referenceType: "LIQUIDATION_KEY",
      rawValue: schedule.liquidationKey.printedValue,
      normalizedValue: normalizeReference(schedule.liquidationKey.printedValue),
      issuer: "AEAT",
      scope: "DOCUMENT",
      documentId: ids.document,
      isPrimary: references.length === 0,
      confidence: "EXACT",
      confirmationStatus: "PENDING",
      extractionMethod: "RULE",
      occurrenceIds: [liquidationEvidenceId],
      createdAt,
    });
    if (schedule.concept) {
      addUnknownText(
        "PRINTED_DEBT_CONCEPT",
        "Concepto impreso",
        schedule.concept,
        `concept:${scheduleIndex}`,
      );
    }
    if (schedule.interestStartDate) {
      addUnknownDate(
        "PRINTED_INTEREST_START_DATE",
        "Fecha de intereses impresa",
        schedule.interestStartDate,
        `interest-date:${scheduleIndex}`,
      );
    }
    if (schedule.listedDebtAmount) {
      addUnknownMoney(
        "PRINTED_LISTED_DEBT_AMOUNT",
        "Importe de deuda impreso",
        schedule.listedDebtAmount,
        `listed-debt:${scheduleIndex}`,
      );
    }
    for (
      let installmentIndex = 0;
      installmentIndex < schedule.installments.length;
      installmentIndex += 1
    ) {
      const installment = schedule.installments[installmentIndex]!;
      const prefix = `${scheduleIndex}:${installmentIndex}`;
      const totalEvidenceId = moneyEvidence(
        `${ids.evidence}:installment-total:${prefix}`,
        "Importe de cuota impreso",
        installment.installmentTotal,
      );
      const dueDateEvidenceId = dateEvidence(
        `${ids.evidence}:installment-date:${prefix}`,
        "Vencimiento impreso",
        installment.dueDate,
      );
      const components: MoneyComponent[] = [];
      if (installment.layout === "COMPONENT_BREAKDOWN") {
        const principalEvidenceId = moneyEvidence(
          `${ids.evidence}:installment-principal:${prefix}`,
          "Principal de cuota impreso",
          installment.principal,
        );
        const surchargeEvidenceId = moneyEvidence(
          `${ids.evidence}:installment-surcharge:${prefix}`,
          "Recargo de cuota impreso",
          installment.enforcementSurcharge,
        );
        const interestEvidenceId = moneyEvidence(
          `${ids.evidence}:installment-interest:${prefix}`,
          "Intereses de cuota impresos",
          installment.interest,
        );
        components.push(
          {
            type: "PRINCIPAL",
            amountCents: installment.principal.amountCents,
            assertionType: "EXPLICIT_IN_DOCUMENT",
            evidenceIds: [principalEvidenceId],
          },
          {
            type: "OTHER",
            amountCents: installment.enforcementSurcharge.amountCents,
            assertionType: "EXPLICIT_IN_DOCUMENT",
            evidenceIds: [surchargeEvidenceId],
          },
          {
            type: "INTEREST",
            amountCents: installment.interest.amountCents,
            assertionType: "EXPLICIT_IN_DOCUMENT",
            evidenceIds: [interestEvidenceId],
          },
        );
      } else {
        components.push({
          type: "AMOUNT_TO_PAY",
          amountCents: installment.installmentTotal.amountCents,
          assertionType: "EXPLICIT_IN_DOCUMENT",
          evidenceIds: [totalEvidenceId],
        });
      }
      paymentOptions.push({
        id: `${ids.document}:payment-option:${prefix}`,
        ownerScope,
        documentId: ids.document,
        title: `Cuota impresa ${installmentIndex + 1} · liquidación ${scheduleIndex + 1}`,
        eligibilityCondition:
          "Figura en la concesión analizada; pendiente de revisión del usuario.",
        components,
        totalCents: installment.installmentTotal.amountCents,
        deadline: installment.dueDate.calendarDate,
        deadlineStatus: "DOCUMENT_STATED",
        evidenceIds: [
          totalEvidenceId,
          dueDateEvidenceId,
          ...components.flatMap((component) => component.evidenceIds),
        ].filter((item, index, values) => values.indexOf(item) === index),
      });
    }
  }

  const subjectEvidenceIds: string[] = [];
  if (facts.header.subjectName) {
    subjectEvidenceIds.push(
      textEvidence(
        `${ids.evidence}:subject-name`,
        "Nombre del obligado impreso",
        facts.header.subjectName,
      ),
    );
  }
  if (facts.header.subjectTaxId) {
    subjectEvidenceIds.push(
      textEvidence(
        `${ids.evidence}:subject-tax-id`,
        "NIF del obligado impreso",
        facts.header.subjectTaxId,
      ),
    );
  }
  const grantedMoneyFacts: Array<
    AdministrativeDomainProjection["moneyFacts"][number]
  > = [];
  if (facts.header.grantedTotal) {
    const grantedEvidenceId = moneyEvidence(
      `${ids.evidence}:granted-total`,
      "Importe concedido impreso",
      facts.header.grantedTotal,
    );
    grantedMoneyFacts.push({
      id: `${ids.money}:granted-total`,
      ownerScope,
      documentId: ids.document,
      kind: "DOCUMENT_TOTAL",
      amountCents: facts.header.grantedTotal.amountCents,
      currency: "EUR",
      assertionType: "EXPLICIT_IN_DOCUMENT",
      evidenceIds: [grantedEvidenceId],
      lineageParentIds: [],
      status: "PROPOSED",
      createdAt,
    });
  }
  const administrativeDomain = buildAdministrativeDomain({
    ownerScope,
    documentId: ids.document,
    createdAt,
    familyId: technicalReview.candidate.familyId,
    identifiedSubject: Boolean(
      facts.header.subjectName || facts.header.subjectTaxId,
    ),
    assertTaxDebtorRole: false,
    partyEvidenceIds: subjectEvidenceIds,
    partyRefId: ids.subject,
    moneyFacts: grantedMoneyFacts,
    hasReferences: references.length > 0,
    hasDates: paymentOptions.length > 0,
  });

  const authority = workspace.authorities.find(
    (item) => item.id === ids.authority,
  );
  if (
    authority &&
    (authority.administrationType !== "AEAT" ||
      authority.nameNormalized !==
        "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA" ||
      authority.officialDomain !== "sede.agenciatributaria.gob.es")
  ) {
    throw invalidInput();
  }
  if (!authority) {
    workspace.authorities.push({
      id: ids.authority,
      ownerScope,
      administrationType: "AEAT",
      nameRaw: "Agencia Estatal de Administración Tributaria",
      nameNormalized: "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
      officialDomain: "sede.agenciatributaria.gob.es",
    });
  }
  workspace.packages.push({
    id: ids.package,
    ownerScope,
    fileIds: [ids.file],
    sourceChannel: "MANUAL_UPLOAD",
    processingStatus: "NEEDS_REVIEW",
    securityScanStatus: "NOT_AVAILABLE",
    uploadedAt: createdAt,
  });
  workspace.files.push({
    id: ids.file,
    packageId: ids.package,
    ownerScope,
    role: "PRIMARY",
    mimeType: "application/pdf",
    fileSize: technicalReview.byteLength,
    pageCount: technicalReview.pageCount,
    sha256: technicalReview.sha256,
    contentFingerprint: technicalReview.sha256,
    sourceContentRetention: "NOT_RETAINED",
    uploadedAt: createdAt,
  });
  workspace.references.push(...references);
  workspace.evidence.push(...evidence);
  workspace.paymentOptions.push(...paymentOptions);
  workspace.documents.push({
    id: ids.document,
    packageId: ids.package,
    fileId: ids.file,
    ownerScope,
    documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
    titleRaw: "Concesión de aplazamiento o fraccionamiento AEAT",
    titleNormalized: "CONCESION DE APLAZAMIENTO O FRACCIONAMIENTO AEAT",
    authorityId: ids.authority,
    notificationDates: {},
    ...(facts.header.subjectName || facts.header.subjectTaxId
      ? {
          subjectParty: {
            ...(facts.header.subjectName
              ? { displayName: facts.header.subjectName.printedValue }
              : {}),
            ...(facts.header.subjectTaxId
              ? { taxIdNormalized: facts.header.subjectTaxId.printedValue }
              : {}),
            matchesBusinessProfile: "UNKNOWN" as const,
          },
        }
      : {}),
    status: "UNKNOWN",
    urgency: "REVIEW",
    extractionVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    analysisStatus: "NEEDS_REVIEW",
    humanReviewStatus: "PENDING",
    authenticityStatus: "NOT_CHECKED",
    partIds: [],
    referenceIds: references.map((item) => item.id),
    debtIds: [],
    caseIds: [],
    analysisSnapshotIds: [ids.snapshot],
    createdAt,
    updatedAt: createdAt,
  });
  workspace.analysisSnapshots.push({
    id: ids.snapshot,
    ownerScope,
    documentId: ids.document,
    version: 1,
    extractorVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    rulesVersion: technicalReview.engineVersion ?? "unavailable",
    structuredData: {
      schemaVersion: 1,
      documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
      administrativeDomain,
      paymentOptionIds: paymentOptions.map((item) => item.id),
      unknownFields,
      validationCodes: [
        "AUTHENTICITY_NOT_CHECKED",
        "HUMAN_REVIEW_REQUIRED",
        "PRINTED_DUE_DATES_NO_AUTOMATIC_EFFECT",
        "NO_OPERATIONAL_EFFECT",
        ...(facts.outcome === "AMBIGUOUS"
          ? ["PRINTED_VALUES_REQUIRE_REVIEW"]
          : []),
      ],
      factSummary: [],
      calculatedSummary: [],
      inferenceSummary: [],
      userConfirmedSummary: [],
      documentFields: {
        title: "Concesión de aplazamiento o fraccionamiento AEAT",
      },
    },
    plainLanguageExplanation: [
      "Cuotas, importes y vencimientos impresos extraídos y pendientes de revisión humana.",
      "El documento original y su texto no se conservan.",
    ],
    validationWarnings: [
      "La autenticidad no se ha comprobado.",
      "No se ha activado un plan ni se ha creado deuda, pago, gasto, plazo legal o asiento.",
    ],
    evidenceIds: [...evidenceIds],
    confidenceBand: facts.outcome === "FACTS_AVAILABLE" ? "HIGH" : "MEDIUM",
    requiresHumanReview: true,
    createdAt,
    createdBySystem: true,
  });
  workspace.revision += 1;
  workspace.updatedAt = createdAt;

  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    ownerScope,
  );
  if (!validation.valid) throw invalidInput();
  return freezeResult({
    status: "APPLIED",
    documentId: ids.document,
    workspace,
  });
}

/**
 * Conserva los datos impresos de un acuerdo de compensación como una ficha
 * revisable. Los créditos y deudas quedan identificados por sus referencias,
 * pero no se materializa una deuda, pago, gasto, vencimiento ni asiento.
 */
export function appendAeatOffsetStructuredReviewV1(
  value: AppendAeatEnforcementStructuredReviewInputV1,
): AppendAeatOffsetStructuredReviewResultV1 {
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
    analysis.ephemeralEnforcementMoneyFacts !== null ||
    analysis.ephemeralEnforcementExplicitFields !== null ||
    analysis.ephemeralEnforcementPartyFacts !== null ||
    analysis.ephemeralDeferralGrantFacts !== null ||
    analysis.ephemeralOffsetAgreementFacts === null ||
    analysis.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
    analysis.requiresHumanReview !== true ||
    analysis.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
  ) {
    throw invalidInput();
  }
  validateEphemeralAnalysisExtensions(analysis);
  const technicalReview = parseTechnicalReview(
    analysis.technicalReview,
    "OFFSET",
  );
  let facts: AeatOffsetAgreementFactsResultV1;
  try {
    facts = parseAeatOffsetAgreementFactsContractV1(
      analysis.ephemeralOffsetAgreementFacts,
      technicalReview.pageCount,
    );
  } catch {
    throw invalidInput();
  }
  if (
    facts.documentType !== "AEAT_OFFSET_AGREEMENT" ||
    facts.agreementMode === null ||
    (facts.credits.length === 0 && facts.debts.length === 0) ||
    (facts.outcome !== "FACTS_AVAILABLE" && facts.outcome !== "AMBIGUOUS")
  ) {
    throw new FiscalNotificationStructuredReviewV1Error(
      "NO_STRUCTURED_FACTS",
    );
  }
  const expectedMoneyFacts = facts.credits.length * 4 +
    facts.debts.reduce(
      (count, debt) => count + (debt.delayInterest ? 7 : 6),
      0,
    );
  if (expectedMoneyFacts > FISCAL_NOTIFICATION_INPUT_LIMITS.maxProjectionFacts) {
    throw invalidInput();
  }

  const workspace = parseWorkspace(input.workspace, ownerScope, createdAt);
  const existingFiles = workspace.files.filter(
    (file) => file.sha256 === technicalReview.sha256,
  );
  if (existingFiles.length > 0) {
    if (existingFiles.length !== 1) throw invalidInput();
    const existingDocuments = workspace.documents.filter(
      (document) => document.fileId === existingFiles[0]!.id,
    );
    if (existingDocuments.length !== 1) throw invalidInput();
    return freezeResult({
      status: "EXISTING",
      documentId: existingDocuments[0]!.id,
      workspace,
    });
  }

  const ids = idsFor(reviewUuid);
  const evidence: FieldEvidence[] = [];
  const evidenceIds = new Set<string>();
  const addEvidence = (entry: FieldEvidence): string => {
    if (evidenceIds.has(entry.id)) throw invalidInput();
    evidenceIds.add(entry.id);
    evidence.push(entry);
    return entry.id;
  };
  const textEvidence = (
    id: string,
    label: string,
    fact: AeatOffsetTextFactV1,
  ): string =>
    addEvidence({
      id,
      ownerScope,
      documentId: ids.document,
      pageNumber: firstPage(fact.pageNumbers),
      textSnippet: label,
      rawValue: fact.printedValue,
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
  const moneyEvidence = (
    id: string,
    label: string,
    fact: AeatOffsetMoneyFactV1,
  ): string =>
    addEvidence({
      id,
      ownerScope,
      documentId: ids.document,
      pageNumber: firstPage(fact.pageNumbers),
      textSnippet: label,
      rawValue: fact.printedValue,
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
  const dateEvidence = (
    id: string,
    label: string,
    fact: AeatOffsetPrintedDateFactV1,
  ): string =>
    addEvidence({
      id,
      ownerScope,
      documentId: ids.document,
      pageNumber: firstPage(fact.pageNumbers),
      textSnippet: label,
      rawValue: fact.printedValue,
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });

  const references = [] as FiscalNotificationsWorkspace["references"];
  const unknownFields: UnknownExtractedField[] = [];
  const moneyFacts: AdministrativeDomainProjection["moneyFacts"][number][] = [];
  const addReference = (input: {
    id: string;
    referenceType: ExternalReferenceType;
    fact: AeatOffsetTextFactV1;
    evidenceLabel: string;
    isPrimary: boolean;
  }): string => {
    const occurrenceId = textEvidence(
      `${ids.evidence}:${input.id}`,
      input.evidenceLabel,
      input.fact,
    );
    const referenceId = `${ids.reference}:${input.id}`;
    references.push({
      id: referenceId,
      ownerScope,
      referenceType: input.referenceType,
      rawValue: input.fact.printedValue,
      normalizedValue: normalizeReference(input.fact.printedValue),
      issuer: "AEAT",
      scope: "DOCUMENT",
      documentId: ids.document,
      isPrimary: input.isPrimary,
      confidence: "EXACT",
      confirmationStatus: "PENDING",
      extractionMethod: "RULE",
      occurrenceIds: [occurrenceId],
      createdAt,
    });
    return referenceId;
  };
  const addUnknownText = (
    labelRaw: string,
    label: string,
    fact: AeatOffsetTextFactV1,
    suffix: string,
  ): void => {
    const evidenceId = textEvidence(
      `${ids.evidence}:${suffix}`,
      label,
      fact,
    );
    unknownFields.push({
      labelRaw,
      valueRaw: fact.printedValue,
      page: firstPage(fact.pageNumbers),
      evidenceId,
      confidence: "EXACT",
    });
  };
  const addUnknownDate = (
    labelRaw: string,
    label: string,
    fact: AeatOffsetPrintedDateFactV1,
    suffix: string,
  ): void => {
    const evidenceId = dateEvidence(
      `${ids.evidence}:${suffix}`,
      label,
      fact,
    );
    unknownFields.push({
      labelRaw,
      valueRaw: fact.printedValue,
      page: firstPage(fact.pageNumbers),
      evidenceId,
      confidence: "EXACT",
    });
  };
  const addMoney = (input: {
    suffix: string;
    kind: AdministrativeMoneyKind;
    label: string;
    fact: AeatOffsetMoneyFactV1;
    sourceActRefId: string;
  }): void => {
    const evidenceId = moneyEvidence(
      `${ids.evidence}:${input.suffix}`,
      input.label,
      input.fact,
    );
    moneyFacts.push({
      id: `${ids.money}:${input.suffix}`,
      ownerScope,
      documentId: ids.document,
      kind: input.kind,
      amountCents: input.fact.amountCents,
      currency: "EUR",
      assertionType: "EXPLICIT_IN_DOCUMENT",
      evidenceIds: [evidenceId],
      sourceActRefId: input.sourceActRefId,
      lineageParentIds: [],
      status: "PROPOSED",
      createdAt,
    });
  };

  if (facts.header.agreementNumber) {
    addReference({
      id: "agreement-number",
      referenceType: "PROCEDURE_NUMBER",
      fact: facts.header.agreementNumber,
      evidenceLabel: "Número de acuerdo",
      isPrimary: true,
    });
  }
  if (facts.header.requestDate) {
    addUnknownDate(
      "PRINTED_OFFSET_REQUEST_DATE",
      "Fecha de solicitud impresa",
      facts.header.requestDate,
      "request-date",
    );
  }
  if (facts.header.signatureDate) {
    addUnknownDate(
      "PRINTED_SIGNATURE_DATE",
      "Fecha de firma impresa",
      facts.header.signatureDate,
      "signature-date",
    );
  }

  for (let index = 0; index < facts.credits.length; index += 1) {
    const credit = facts.credits[index]!;
    const prefix = `credit:${index}`;
    const referenceId = addReference({
      id: `${prefix}:reference`,
      referenceType: "DOCUMENT_REFERENCE",
      fact: credit.reference,
      evidenceLabel: "Referencia del crédito",
      isPrimary: references.length === 0,
    });
    addUnknownText(
      "PRINTED_OFFSET_CREDIT_DESCRIPTION",
      "Descripción del crédito impresa",
      credit.description,
      `${prefix}:description`,
    );
    addUnknownDate(
      "PRINTED_OFFSET_CREDIT_RECOGNITION_DATE",
      "Fecha de reconocimiento del crédito impresa",
      credit.recognitionDate,
      `${prefix}:recognition-date`,
    );
    addMoney({
      suffix: `${prefix}:amount`,
      kind: "REFUND_CREDIT",
      label: "Importe del crédito impreso",
      fact: credit.creditAmount,
      sourceActRefId: referenceId,
    });
    addMoney({
      suffix: `${prefix}:interest`,
      kind: "LATE_PAYMENT_INTEREST",
      label: "Interés de demora del crédito impreso",
      fact: credit.delayInterest,
      sourceActRefId: referenceId,
    });
    addMoney({
      suffix: `${prefix}:total`,
      kind: "CREDIT_TOTAL",
      label: "Total del crédito impreso",
      fact: credit.totalCredit,
      sourceActRefId: referenceId,
    });
    addMoney({
      suffix: `${prefix}:offset-applied`,
      kind: "OFFSET_APPLIED",
      label: "Compensación aplicada al crédito impresa",
      fact: credit.compensatedAmount,
      sourceActRefId: referenceId,
    });
  }

  for (let index = 0; index < facts.debts.length; index += 1) {
    const debt = facts.debts[index]!;
    const prefix = `debt:${index}`;
    const referenceId = addReference({
      id: `${prefix}:liquidation`,
      referenceType: "LIQUIDATION_KEY",
      fact: debt.liquidationKey,
      evidenceLabel: "Clave de liquidación",
      isPrimary: references.length === 0,
    });
    addUnknownText(
      "PRINTED_OFFSET_DEBT_DESCRIPTION",
      "Descripción de la deuda impresa",
      debt.description,
      `${prefix}:description`,
    );
    addUnknownDate(
      "PRINTED_OFFSET_EFFECT_DATE",
      "Fecha de efectos impresa",
      debt.effectDate,
      `${prefix}:effect-date`,
    );
    addUnknownText(
      "PRINTED_OFFSET_EFFECT_CODE",
      "Código de efecto impreso",
      debt.effectCode,
      `${prefix}:effect-code`,
    );
    const effectMeaningEvidenceId = addEvidence({
      id: `${ids.evidence}:${prefix}:effect-meaning`,
      ownerScope,
      documentId: ids.document,
      pageNumber: firstPage(debt.effectStatementPageNumbers),
      textSnippet: "Efecto identificado por regla cerrada",
      rawValue: debt.effectMeaning,
      extractionMethod: "RULE",
      confidence: "HIGH",
      assertionType: "INFERRED",
    });
    unknownFields.push({
      labelRaw: "OFFSET_EFFECT_MEANING",
      valueRaw: offsetEffectMeaningLabel(debt.effectMeaning),
      page: firstPage(debt.effectStatementPageNumbers),
      evidenceId: effectMeaningEvidenceId,
      confidence: "HIGH",
    });
    addMoney({
      suffix: `${prefix}:principal`,
      kind: "OUTSTANDING_PRINCIPAL",
      label: "Principal pendiente impreso",
      fact: debt.principalPending,
      sourceActRefId: referenceId,
    });
    addMoney({
      suffix: `${prefix}:surcharge`,
      kind: "EXECUTIVE_SURCHARGE_PRINTED",
      label: "Recargo ejecutivo impreso",
      fact: debt.enforcementSurcharge,
      sourceActRefId: referenceId,
    });
    if (debt.delayInterest) {
      addMoney({
        suffix: `${prefix}:interest`,
        kind: "LATE_PAYMENT_INTEREST",
        label: "Interés de demora impreso",
        fact: debt.delayInterest,
        sourceActRefId: referenceId,
      });
    }
    addMoney({
      suffix: `${prefix}:payments`,
      kind: "PAYMENT_ON_ACCOUNT",
      label: "Ingresos a cuenta impresos",
      fact: debt.paymentsOnAccount,
      sourceActRefId: referenceId,
    });
    addMoney({
      suffix: `${prefix}:total-before-offset`,
      kind: "TOTAL_BEFORE_OFFSET",
      label: "Total antes de compensar impreso",
      fact: debt.totalBeforeOffset,
      sourceActRefId: referenceId,
    });
    addMoney({
      suffix: `${prefix}:offset-applied`,
      kind: "OFFSET_APPLIED",
      label: "Compensación aplicada a la deuda impresa",
      fact: debt.compensatedAmount,
      sourceActRefId: referenceId,
    });
    addMoney({
      suffix: `${prefix}:remaining`,
      kind: "REMAINING_AFTER_OFFSET",
      label: "Pendiente después de compensar impreso",
      fact: debt.remainingAfterOffset,
      sourceActRefId: referenceId,
    });
  }

  const subjectEvidenceIds: string[] = [];
  if (facts.header.subjectName) {
    subjectEvidenceIds.push(
      textEvidence(
        `${ids.evidence}:subject-name`,
        "Nombre del obligado impreso",
        facts.header.subjectName,
      ),
    );
  }
  if (facts.header.subjectTaxId) {
    subjectEvidenceIds.push(
      textEvidence(
        `${ids.evidence}:subject-tax-id`,
        "NIF del obligado impreso",
        facts.header.subjectTaxId,
      ),
    );
  }
  const administrativeDomain = buildAdministrativeDomain({
    ownerScope,
    documentId: ids.document,
    createdAt,
    familyId: technicalReview.candidate.familyId,
    identifiedSubject: Boolean(
      facts.header.subjectName || facts.header.subjectTaxId,
    ),
    assertTaxDebtorRole: false,
    partyEvidenceIds: subjectEvidenceIds,
    partyRefId: ids.subject,
    moneyFacts,
    hasReferences: references.length > 0,
    hasDates: unknownFields.some((field) =>
      field.labelRaw.includes("DATE"),
    ),
  });

  const authority = workspace.authorities.find(
    (item) => item.id === ids.authority,
  );
  if (
    authority &&
    (authority.administrationType !== "AEAT" ||
      authority.nameNormalized !==
        "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA" ||
      authority.officialDomain !== "sede.agenciatributaria.gob.es")
  ) {
    throw invalidInput();
  }
  if (!authority) {
    workspace.authorities.push({
      id: ids.authority,
      ownerScope,
      administrationType: "AEAT",
      nameRaw: "Agencia Estatal de Administración Tributaria",
      nameNormalized: "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
      officialDomain: "sede.agenciatributaria.gob.es",
    });
  }
  workspace.packages.push({
    id: ids.package,
    ownerScope,
    fileIds: [ids.file],
    sourceChannel: "MANUAL_UPLOAD",
    processingStatus: "NEEDS_REVIEW",
    securityScanStatus: "NOT_AVAILABLE",
    uploadedAt: createdAt,
  });
  workspace.files.push({
    id: ids.file,
    packageId: ids.package,
    ownerScope,
    role: "PRIMARY",
    mimeType: "application/pdf",
    fileSize: technicalReview.byteLength,
    pageCount: technicalReview.pageCount,
    sha256: technicalReview.sha256,
    contentFingerprint: technicalReview.sha256,
    sourceContentRetention: "NOT_RETAINED",
    uploadedAt: createdAt,
  });
  workspace.references.push(...references);
  workspace.evidence.push(...evidence);
  workspace.documents.push({
    id: ids.document,
    packageId: ids.package,
    fileId: ids.file,
    ownerScope,
    documentType: "AEAT_OFFSET_AGREEMENT",
    documentSubtype: facts.agreementMode,
    titleRaw:
      facts.agreementMode === "REQUESTED"
        ? "Acuerdo de compensación solicitado AEAT"
        : "Acuerdo de compensación de oficio AEAT",
    titleNormalized:
      facts.agreementMode === "REQUESTED"
        ? "ACUERDO DE COMPENSACION SOLICITADO AEAT"
        : "ACUERDO DE COMPENSACION DE OFICIO AEAT",
    authorityId: ids.authority,
    ...(facts.header.signatureDate
      ? {
          issueDate: facts.header.signatureDate.calendarDate,
          signatureDate: facts.header.signatureDate.calendarDate,
        }
      : {}),
    notificationDates: {},
    ...(facts.header.subjectName || facts.header.subjectTaxId
      ? {
          subjectParty: {
            ...(facts.header.subjectName
              ? { displayName: facts.header.subjectName.printedValue }
              : {}),
            ...(facts.header.subjectTaxId
              ? { taxIdNormalized: facts.header.subjectTaxId.printedValue }
              : {}),
            matchesBusinessProfile: "UNKNOWN" as const,
          },
        }
      : {}),
    status: "UNKNOWN",
    urgency: "REVIEW",
    extractionVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    analysisStatus: "NEEDS_REVIEW",
    humanReviewStatus: "PENDING",
    authenticityStatus: "NOT_CHECKED",
    partIds: [],
    referenceIds: references.map((item) => item.id),
    debtIds: [],
    caseIds: [],
    analysisSnapshotIds: [ids.snapshot],
    createdAt,
    updatedAt: createdAt,
  });
  workspace.analysisSnapshots.push({
    id: ids.snapshot,
    ownerScope,
    documentId: ids.document,
    version: 1,
    extractorVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    rulesVersion: technicalReview.engineVersion ?? "unavailable",
    structuredData: {
      schemaVersion: 1,
      documentType: "AEAT_OFFSET_AGREEMENT",
      administrativeDomain,
      paymentOptionIds: [],
      unknownFields,
      validationCodes: [
        "AUTHENTICITY_NOT_CHECKED",
        "HUMAN_REVIEW_REQUIRED",
        "PRINTED_OFFSET_VALUES_NOT_RECALCULATED",
        "PRINTED_EFFECT_TEXT_ONLY",
        "NO_OPERATIONAL_EFFECT",
        ...(facts.outcome === "AMBIGUOUS"
          ? ["PRINTED_VALUES_REQUIRE_REVIEW"]
          : []),
      ],
      factSummary: [],
      calculatedSummary: [],
      inferenceSummary: [],
      userConfirmedSummary: [],
      documentFields: {
        title:
          facts.agreementMode === "REQUESTED"
            ? "Acuerdo de compensación solicitado AEAT"
            : "Acuerdo de compensación de oficio AEAT",
        ...(facts.header.signatureDate
          ? { issueDate: facts.header.signatureDate.calendarDate }
          : {}),
      },
    },
    plainLanguageExplanation: [
      "Créditos, deudas, referencias, fechas, importes y efectos impresos extraídos para revisión.",
      "El documento original y su texto no se conservan.",
    ],
    validationWarnings: [
      "La autenticidad no se ha comprobado.",
      "No se ha creado, modificado ni extinguido una deuda, pago, gasto, plazo legal o asiento.",
    ],
    evidenceIds: [...evidenceIds].slice(
      0,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds,
    ),
    confidenceBand: facts.outcome === "FACTS_AVAILABLE" ? "HIGH" : "MEDIUM",
    requiresHumanReview: true,
    createdAt,
    createdBySystem: true,
  });
  workspace.revision += 1;
  workspace.updatedAt = createdAt;

  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    ownerScope,
  );
  if (!validation.valid) throw invalidInput();
  return freezeResult({
    status: "APPLIED",
    documentId: ids.document,
    workspace,
  });
}

function buildAdministrativeDomain(input: {
  ownerScope: string;
  documentId: string;
  createdAt: string;
  familyId: string;
  identifiedSubject: boolean;
  assertTaxDebtorRole?: boolean;
  partyEvidenceIds: readonly string[];
  partyRefId: string;
  moneyFacts: AdministrativeDomainProjection["moneyFacts"];
  hasReferences: boolean;
  hasDates: boolean;
}): AdministrativeDomainProjection {
  const missingFieldIds = [
    ...(input.identifiedSubject ? [] : ["subject.identification"]),
    ...(input.moneyFacts.length > 0 ? [] : ["money.printed"]),
    ...(input.hasReferences ? [] : ["reference.printed"]),
    ...(input.hasDates ? [] : ["date.printed"]),
  ];
  const candidate = {
    schemaVersion: 1 as const,
    ownerScope: input.ownerScope,
    documentId: input.documentId,
    extractorId: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_ID_V1,
    extractorVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    createdAt: input.createdAt,
    familyId: input.familyId,
    status: "REVIEW_REQUIRED" as const,
    roleAssertions:
      input.identifiedSubject && (input.assertTaxDebtorRole ?? true)
      ? [
          {
            id: `${input.documentId}:role:payment-obligor`,
            ownerScope: input.ownerScope,
            documentId: input.documentId,
            partyRefId: input.partyRefId,
            role: "TAX_DEBTOR" as const,
            assertionType: "EXPLICIT_IN_DOCUMENT" as const,
            confidence: 1,
            evidenceIds: [...input.partyEvidenceIds],
            createdAt: input.createdAt,
          },
        ]
      : [],
    moneyFacts: input.moneyFacts,
    missingFieldIds,
    alternativeFamilyIds: [],
    validationIssues: [],
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
    requiresHumanReview: true as const,
  };
  const validation = validateAdministrativeDomainProjection(
    candidate,
    input.ownerScope,
    input.documentId,
  );
  if (!validation.valid || !validation.projection) throw invalidInput();
  return validation.projection;
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
  let clone: FiscalNotificationsWorkspace;
  try {
    clone = structuredClone(value) as FiscalNotificationsWorkspace;
  } catch {
    throw invalidInput();
  }
  if (
    Date.parse(createdAt) < Date.parse(clone.updatedAt) ||
    !Number.isSafeInteger(clone.revision) ||
    clone.revision >= Number.MAX_SAFE_INTEGER
  ) {
    throw invalidInput();
  }
  return clone;
}

function parseTechnicalReview(
  value: unknown,
  family: "ENFORCEMENT" | "DEFERRAL" | "OFFSET" = "ENFORCEMENT",
): {
  pageCount: number;
  byteLength: number;
  sha256: string;
  engineVersion: FiscalNotificationLocalReviewResult["engineVersion"];
  candidate: FiscalNotificationLocalReviewResult["candidates"][number];
} {
  const root = snapshotRecord(value, TECHNICAL_REVIEW_KEYS);
  if (
    !root ||
    root.schemaVersion !== 1 ||
    root.flowVersion !== "1.0.0" ||
    root.status !== "REVIEW_REQUIRED" ||
    root.reason !== "SUPPORTED_FAMILY_CANDIDATE" ||
    root.engineId !== "fiscal-notification-family-candidate-engine" ||
    (root.engineVersion !== "1.3.0" &&
      root.engineVersion !== "1.4.0" &&
      root.engineVersion !== "1.5.0") ||
    root.selectedFamilyId !== null ||
    root.providerCalled !== false ||
    root.requiresHumanReview !== true ||
    root.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    root.retainedSourceContent !== "NONE" ||
    !Number.isSafeInteger(root.pageCount) ||
    Number(root.pageCount) < 1 ||
    Number(root.pageCount) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages ||
    !Number.isSafeInteger(root.byteLength) ||
    Number(root.byteLength) < 1 ||
    Number(root.byteLength) > MAX_SOURCE_BYTES ||
    typeof root.sha256 !== "string" ||
    !SHA256.test(root.sha256)
  ) {
    throw invalidInput();
  }
  const candidates = snapshotArray(root.candidates, 1);
  const candidate = snapshotRecord(candidates?.[0], CANDIDATE_KEYS);
  const expected =
    family === "ENFORCEMENT"
      ? {
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          documentType: "AEAT_ENFORCEMENT_ORDER",
          handlerId: "aeat-enforcement-order-candidate",
          handlerVersions: ["1.0.0"],
          requiredAnchorIds: ENFORCEMENT_REQUIRED_ANCHOR_IDS,
        }
      : family === "DEFERRAL"
        ? {
            familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE",
            documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
            handlerId: "aeat-deferral-grant-candidate",
            handlerVersions: ["1.0.0"],
            requiredAnchorIds: DEFERRAL_REQUIRED_ANCHOR_IDS,
          }
        : {
            familyId: "AEAT_OFFSET_AGREEMENT_CANDIDATE",
            documentType: "AEAT_OFFSET_AGREEMENT",
            handlerId: "aeat-offset-agreement-candidate",
            handlerVersions: ["1.0.0", "1.1.0"],
            requiredAnchorIds: [
              OFFSET_LEGACY_REQUIRED_ANCHOR_IDS,
              OFFSET_STRUCTURAL_REQUIRED_ANCHOR_IDS,
            ],
          };
  if (
    !candidate ||
    candidate.familyId !== expected.familyId ||
    candidate.recognitionPolicyVersion !== "1.3.0" ||
    (candidate.segmentationVersion !== "1.0.0" &&
      candidate.segmentationVersion !== "1.1.0") ||
    candidate.documentType !== expected.documentType ||
    candidate.authoritySignal !== "AEAT_UNVERIFIED" ||
    candidate.handlerId !== expected.handlerId ||
    typeof candidate.handlerVersion !== "string" ||
    !expected.handlerVersions.some(
      (version) => version === candidate.handlerVersion,
    ) ||
    candidate.signalStatus !== "COMPLETE_REQUIRED_ANCHORS" ||
    candidate.requiresHumanReview !== true ||
    !validateTechnicalCandidateArrays(
      candidate,
      root.pageCount as number,
      expected.requiredAnchorIds,
    )
  ) {
    throw invalidInput();
  }
  return {
    pageCount: root.pageCount as number,
    byteLength: root.byteLength as number,
    sha256: root.sha256,
    engineVersion: root.engineVersion as "1.3.0" | "1.4.0" | "1.5.0",
    candidate:
      candidate as unknown as FiscalNotificationLocalReviewResult["candidates"][number],
  };
}

function parseMoneyFacts(
  value: unknown,
  maxPageNumber: number,
): AeatEnforcementMoneyFactsResult {
  const root = snapshotRecord(value, MONEY_ROOT_KEYS);
  if (
    !root ||
    root.schemaVersion !== 1 ||
    root.engineId !== "aeat-enforcement-money-facts" ||
    (root.engineVersion !== "1.0.0" &&
      root.engineVersion !== "1.1.0" &&
      root.engineVersion !== "1.2.0") ||
    root.documentType !== "AEAT_ENFORCEMENT_ORDER" ||
    (root.status !== "REVIEW_REQUIRED" &&
      root.status !== "INFORMATION_PENDING") ||
    ![
      "FACTS_AVAILABLE",
      "INFORMATION_PENDING",
      "AMBIGUOUS",
      "PROCESSING_BLOCKED",
    ].includes(root.outcome as string) ||
    root.selectedPaymentAmountKind !== null ||
    root.semanticPolicy !== "EXPLICIT_DOCUMENT_FACTS_ONLY" ||
    root.legalRuleStatus !== "NOT_APPLIED" ||
    root.requiresHumanReview !== true ||
    root.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    root.retainedSourceContent !== "NONE"
  ) {
    throw invalidInput();
  }
  const factInputs = snapshotArray(root.facts, 4);
  const issueInputs = snapshotArray(root.issues, 32);
  if (!factInputs || !issueInputs) throw invalidInput();
  const facts = factInputs.map((entry) => {
    const fact = snapshotRecord(entry, MONEY_FACT_KEYS);
    if (
      !fact ||
      !MONEY_KINDS.has(fact.kind as AeatEnforcementMoneyFactKind) ||
      !Number.isSafeInteger(fact.amountCents) ||
      Number(fact.amountCents) < 0 ||
      Number(fact.amountCents) > MAX_AMOUNT_CENTS ||
      (fact.currency !== "EUR" && fact.currency !== "UNKNOWN") ||
      fact.reviewStatus !== "REVIEW_REQUIRED"
    ) {
      throw invalidInput();
    }
    const evidenceInputs = snapshotArray(fact.evidence, maxPageNumber);
    if (!evidenceInputs || evidenceInputs.length === 0) throw invalidInput();
    const evidence = evidenceInputs.map((evidenceValue) => {
      const item = snapshotRecord(evidenceValue, MONEY_EVIDENCE_KEYS);
      if (
        !item ||
        !Number.isSafeInteger(item.pageNumber) ||
        Number(item.pageNumber) < 1 ||
        Number(item.pageNumber) > maxPageNumber ||
        item.label !==
          MONEY_EVIDENCE_LABELS[
            fact.kind as AeatEnforcementMoneyFactKind
          ] ||
        item.extractionMethod !== "RULE" ||
        item.assertionType !== "EXPLICIT_IN_DOCUMENT"
      ) {
        throw invalidInput();
      }
      return Object.freeze({
        pageNumber: item.pageNumber as number,
        label: item.label as AeatEnforcementMoneyFact["evidence"][number]["label"],
        extractionMethod: "RULE" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      });
    });
    return Object.freeze({
      kind: fact.kind as AeatEnforcementMoneyFactKind,
      amountCents: fact.amountCents as number,
      currency: fact.currency as "EUR" | "UNKNOWN",
      evidence: Object.freeze(evidence),
      reviewStatus: "REVIEW_REQUIRED" as const,
    });
  });
  if (new Set(facts.map((fact) => fact.kind)).size !== facts.length) {
    throw invalidInput();
  }
  for (const entry of issueInputs) {
    const issue = snapshotRecord(entry, MONEY_ISSUE_KEYS);
    const pageNumbers = snapshotArray(issue?.pageNumbers, maxPageNumber);
    if (
      !issue ||
      !MONEY_ISSUE_CODES.has(issue.code as string) ||
      (issue.kind !== null && !MONEY_KINDS.has(issue.kind as never)) ||
      !pageNumbers ||
      pageNumbers.some(
        (pageNumber) =>
          !Number.isSafeInteger(pageNumber) ||
          Number(pageNumber) < 1 ||
          Number(pageNumber) > maxPageNumber,
      )
    ) {
      throw invalidInput();
    }
  }
  if (
    (root.outcome === "FACTS_AVAILABLE" && facts.length === 0) ||
    (root.outcome !== "FACTS_AVAILABLE" && facts.length > 0)
  ) {
    throw invalidInput();
  }
  return Object.freeze({
    schemaVersion: 1,
    engineId: "aeat-enforcement-money-facts",
    engineVersion: root.engineVersion as "1.0.0" | "1.1.0" | "1.2.0",
    documentType: "AEAT_ENFORCEMENT_ORDER",
    status: root.status as "REVIEW_REQUIRED" | "INFORMATION_PENDING",
    outcome: root.outcome as AeatEnforcementMoneyFactsResult["outcome"],
    facts: Object.freeze(facts),
    issues: Object.freeze([]),
    selectedPaymentAmountKind: null,
    semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY",
    legalRuleStatus: "NOT_APPLIED",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function administrativeMoneyKind(
  kind: AeatEnforcementMoneyFactKind,
): AdministrativeMoneyKind {
  switch (kind) {
    case "OUTSTANDING_PRINCIPAL":
      return "OUTSTANDING_PRINCIPAL";
    case "ORDINARY_ENFORCEMENT_SURCHARGE":
      return "EXECUTIVE_SURCHARGE_20";
    case "PAYMENT_ON_ACCOUNT":
      return "PAYMENT_ON_ACCOUNT";
    case "DOCUMENT_TOTAL":
      return "DOCUMENT_TOTAL";
  }
}

function validateTechnicalCandidateArrays(
  candidate: Record<string, unknown>,
  maxPageNumber: number,
  requiredAnchorIds:
    | ReadonlySet<string>
    | readonly ReadonlySet<string>[],
): boolean {
  const matchedAnchors = snapshotArray(candidate.matchedAnchors, 32);
  const missingRequired = snapshotArray(candidate.missingRequiredAnchorIds, 32);
  const conflicting = snapshotArray(candidate.conflictingAnchorIds, 32);
  if (
    !matchedAnchors ||
    !missingRequired ||
    missingRequired.length !== 0 ||
    !conflicting ||
    conflicting.length !== 0
  ) {
    return false;
  }
  const matchedAnchorIds = new Set<string>();
  const validAnchors = matchedAnchors.every((entry) => {
    const anchor = snapshotRecord(entry, ANCHOR_KEYS);
    const pageNumbers = snapshotArray(anchor?.pageNumbers, maxPageNumber);
    if (typeof anchor?.anchorId === "string") {
      if (matchedAnchorIds.has(anchor.anchorId)) return false;
      matchedAnchorIds.add(anchor.anchorId);
    }
    return Boolean(
      anchor &&
        typeof anchor.anchorId === "string" &&
        pageNumbers &&
        pageNumbers.length > 0 &&
        pageNumbers.every(
          (pageNumber) =>
            Number.isSafeInteger(pageNumber) &&
            Number(pageNumber) >= 1 &&
            Number(pageNumber) <= maxPageNumber,
        ),
    );
  });
  const alternatives = Array.isArray(requiredAnchorIds)
    ? requiredAnchorIds
    : [requiredAnchorIds];
  return validAnchors && alternatives.some((required) =>
    [...required].every((anchorId) => matchedAnchorIds.has(anchorId)),
  );
}

function firstPage(pageNumbers: readonly number[]): number {
  const pageNumber = pageNumbers[0];
  if (!Number.isSafeInteger(pageNumber) || Number(pageNumber) < 1) {
    throw invalidInput();
  }
  return pageNumber;
}

function referenceEvidenceLabel(fact: AeatEnforcementReferenceFactV2): string {
  return fact.kind === "LIQUIDATION_KEY"
    ? "Clave de liquidación"
    : fact.kind === "DOCUMENT_REFERENCE"
      ? "Referencia del documento"
      : fact.kind === "PAYMENT_JUSTIFICANTE"
        ? "Justificante de pago"
        : fact.kind === "CSV"
          ? "Código seguro de verificación"
          : "VTO impreso";
}

function printedDateEvidenceLabel(
  fact: AeatEnforcementPrintedDateFactV2,
): string {
  return fact.kind === "PRINTED_ISSUE_DATE"
    ? "Fecha de emisión impresa"
    : fact.kind === "PRINTED_SIGNATURE_DATE"
      ? "Fecha de firma impresa"
      : "Fin del período voluntario impreso";
}

function moneyEvidenceLabel(kind: AeatEnforcementMoneyFactKind): string {
  return kind === "OUTSTANDING_PRINCIPAL"
    ? "Principal pendiente impreso"
    : kind === "ORDINARY_ENFORCEMENT_SURCHARGE"
      ? "Recargo de apremio ordinario impreso"
      : kind === "PAYMENT_ON_ACCOUNT"
        ? "Ingreso a cuenta impreso"
        : "Importe total impreso";
}

function offsetEffectMeaningLabel(
  meaning: AeatOffsetAgreementFactsResultV1["debts"][number]["effectMeaning"],
): string {
  switch (meaning) {
    case "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD":
      return "Deuda totalmente extinguida en período voluntario";
    case "PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT":
      return "Deuda parcialmente extinguida en período ejecutivo";
    case "TOTAL_EXTINGUISHED_IN_ENFORCEMENT":
      return "Deuda totalmente extinguida en período ejecutivo";
    case "PRINTED_CODE_UNMAPPED":
      return "Código de efecto sin equivalencia verificada";
  }
}

function normalizeReference(value: string): string {
  return value.toLocaleUpperCase("es").replace(/[\t \u00a0]+/gu, "");
}

function idsFor(uuid: string) {
  return Object.freeze({
    authority: "authority:aeat",
    package: `package:${uuid}`,
    file: `file:${uuid}`,
    document: `document:${uuid}`,
    subject: `subject:${uuid}`,
    snapshot: `analysis:${uuid}`,
    evidence: `evidence:${uuid}`,
    reference: `reference:${uuid}`,
    money: `money:${uuid}`,
  });
}

function parseReviewId(value: unknown): string {
  assertBoundedId(value, "reviewId");
  const match = REVIEW_ID.exec(value as string);
  if (!match?.[1]) throw invalidInput();
  return match[1];
}

function parseIsoTimestamp(value: unknown): string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) {
    throw invalidInput();
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw invalidInput();
  }
  return value;
}

function validateEphemeralAnalysisExtensions(
  analysis: Record<string, unknown>,
): void {
  try {
    if (Object.hasOwn(analysis, "ephemeralVerticalSliceReview")) {
      parseFiscalNotificationVerticalSliceReviewV1(
        analysis.ephemeralVerticalSliceReview,
      );
    }
    if (Object.hasOwn(analysis, "textAcquisition")) {
      const acquisition = snapshotRecord(
        analysis.textAcquisition,
        new Set(["mode", "averageConfidence"]),
      );
      if (
        !acquisition ||
        (acquisition.mode !== "PDF_TEXT_LAYER" &&
          acquisition.mode !== "LOCAL_OCR") ||
        (acquisition.averageConfidence !== null &&
          (typeof acquisition.averageConfidence !== "number" ||
            !Number.isFinite(acquisition.averageConfidence) ||
            acquisition.averageConfidence < 0 ||
            acquisition.averageConfidence > 1))
      ) {
        throw invalidInput();
      }
    }
  } catch {
    throw invalidInput();
  }
}

function snapshotRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowedKeys.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function snapshotArray(value: unknown, max: number): unknown[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  try {
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result.push(descriptor.value);
    }
    return Reflect.ownKeys(value).length === value.length + 1 ? result : null;
  } catch {
    return null;
  }
}

function freezeResult(input: {
  status: "APPLIED" | "EXISTING";
  documentId: string;
  workspace: FiscalNotificationsWorkspace;
}): AppendAeatEnforcementStructuredReviewResultV1 {
  deepFreeze(input.workspace);
  return Object.freeze({
    status: input.status,
    schemaVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_SCHEMA_VERSION_V1,
    engineId: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_ID_V1,
    engineVersion: FISCAL_NOTIFICATION_STRUCTURED_REVIEW_ENGINE_VERSION_V1,
    documentId: input.documentId,
    workspace: input.workspace,
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

function invalidInput(): FiscalNotificationStructuredReviewV1Error {
  return new FiscalNotificationStructuredReviewV1Error("INVALID_INPUT");
}
