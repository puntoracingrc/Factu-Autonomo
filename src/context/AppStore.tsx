"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppData,
  Customer,
  Document,
  DocumentType,
  Expense,
  Product,
  RectificationInfo,
  Supplier,
  BusinessProfile,
  RecurringExpense,
  UserReminder,
} from "@/lib/types";
import type { CentralInvoiceAuthorityFormIssueIdentity } from "@/lib/central-invoice-authority/form-canary-client";
import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "@/lib/central-invoice-authority/events-app-data-sync";
import type { CentralBusinessEventsAppDataSyncResult } from "@/lib/central-business-authority/events-app-data-sync";
import type { CentralBusinessDrainResult } from "@/lib/central-business-authority/durable-queue";
import type { CentralBusinessConflictRecoveryResult } from "@/lib/central-business-authority/conflict-recovery";
import type { CentralBusinessEventReconciliationResult } from "@/lib/central-business-authority/event-reconciliation";
import type { CentralBusinessEntityType } from "@/lib/central-business-authority/mutation-command";
import type { CentralBusinessNumberedDocumentCreateBrowserResult } from "@/lib/central-business-authority/numbered-document-client";
import {
  applyRecurringExpenseChangeToData,
  deleteExpenseFromData,
  deleteRecurringExpenseFromData,
  syncRecurringExpenses,
  type RecurringExpenseChangeApplyResult,
  type RecurringExpenseDraft,
} from "@/lib/recurring-expenses";
import {
  createCustomerInCollection,
  updateCustomerInCollection,
  upsertCustomerForDocumentInCollection,
  type ClientInput,
} from "@/lib/customers";
import type { Client } from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";
import { normalizeBusinessFiscalProfile } from "@/lib/fiscal-profile";
import { normalizeTaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/profile";
import { normalizeFiscalAdvisoryModelPreferencesV1 } from "@/lib/fiscal-advisory-models/preferences";
import {
  assignNextDocumentNumber,
  assignNextDocumentNumberByType,
  countersFromDocuments,
  DRAFT_INVOICE_NUMBER,
  getDocumentYear,
  getFacturasIncludingRectificativas,
  isDraftInvoiceNumber,
  renumberDocumentsForKindYear,
  shouldUseDraftInvoiceNumber,
} from "@/lib/documents";
import {
  canRectifyInvoice,
  getDeletePolicy,
  originalStatusAfterRectification,
} from "@/lib/rectificativas";
import { normalizeIvaSettings } from "@/lib/iva";
import {
  bumpNumberingAfterAssign,
  configuredLastForKind,
  normalizeNumbering,
  syncNumberingToDocuments,
} from "@/lib/numbering";
import type { DocumentKind } from "@/lib/types";
import {
  canMarkAsCollected,
  canUnmarkAsCollected,
  isCollectedDocument,
  statusAfterUnmarkingCollection,
  withHistoricalCollectionStatus,
} from "@/lib/income";
import {
  canMarkQuoteAsAccepted,
  canMarkQuoteAsRejected,
  canUnmarkQuoteAsAccepted,
  canUnmarkQuoteAsRejected,
  isAcceptedQuote,
  isRejectedQuote,
  statusAfterUnmarkingQuoteAcceptance,
  statusAfterUnmarkingQuoteRejection,
} from "@/lib/quotes";
import {
  buildInvoiceDraftFromQuote,
  canConvertQuoteToInvoice,
  findInvoiceCreatedFromQuote,
} from "@/lib/quote-to-invoice";
import { trackDataDiff } from "@/lib/cloud/incremental";
import { unmarkInvoiceCollection } from "@/lib/receipts";
import {
  runReceiptGenerationCommand,
  type ReceiptGenerationCommandResult,
} from "@/lib/receipt-generation-command";
import {
  inspectPersistedData,
  loadData,
  readPersistedDataSnapshot,
  saveData,
  touchAppData,
} from "@/lib/storage";
import {
  commitLatestAppDataDurably,
  commitAppDataDurablyWithStorageRecovery,
  durableStorageBaselineAfterSave,
  fixedExpenseBundleIds,
  persistAppDataAgainstDurableBaseline,
  prepareFixedExpenseBundle,
  type AppDataDurabilityResult,
  type AppDataTransition,
  type DurableStorageBaseline,
  type FixedExpenseBundleValue,
} from "@/lib/app-data-durability";
import {
  commitCloudSnapshotDurably,
  type CloudSnapshotReplacementValue,
} from "@/lib/cloud/device-repair";
import { adoptPersistedSnapshotIfCurrent } from "@/lib/cloud/persisted-snapshot-adoption";
import { markFactuFeatureUsed } from "@/lib/factu/feature-usage";
import {
  createUserReminderWithIdentity,
  deleteUserReminderFromCollection,
  updateUserReminderInCollection,
  type UserReminderDraft,
} from "@/lib/user-reminder-mutations";
import {
  buildScannedExpenseDurableTransition,
  type ScannedExpenseDurableValue,
} from "@/lib/scanned-expense-durability";
import { normalizeDocumentPhrases } from "@/lib/document-phrases";
import { normalizeDocumentPaymentMethods } from "@/lib/document-payment-methods";
import { normalizeDocumentTemplate } from "@/lib/document-templates";
import { normalizeDocumentUnits } from "@/lib/document-units";
import { normalizeAppPreferences } from "@/lib/app-preferences";
import { normalizeAdvisorContact } from "@/lib/advisor-contact";
import {
  SUPPLIER_AUTO_LINK_SCORE,
  supplierSimilarityScore,
  upsertSupplierForExpense,
  type StoredSupplierForExpenseResolution,
  type SupplierForExpenseInput,
} from "@/lib/suppliers";
import { hasAuthenticatedVerifactuAttestation } from "@/lib/verifactu/attestation";
import {
  applyGenericDocumentUpdate,
  attachRegisteredVerifactuToSnapshots,
  deriveDocumentLifecycle,
  DocumentIntegrityError,
  isDocumentIntegrityLocked,
  issueDocument as issueDocumentWithIntegrity,
  markDocumentPaid as markDocumentPaidWithIntegrity,
  markDocumentSent as markDocumentSentWithIntegrity,
} from "@/lib/document-integrity";
import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
import { buildCanonicalDocumentForProtectedEffect } from "@/lib/document-integrity/pdf-source";
import {
  assertRectificationEmissionAllowed,
  canonicalRectificationItems,
  canonicalRectificationReference,
  hasPendingRectificationDraft,
  materializeRectificationDocument,
  profileForRectificationSource,
  requireUniqueRectificationOriginal,
  preserveRectificationOriginalReference,
  resolveCanonicalRectificationSource,
} from "@/lib/document-integrity/rectification-issuance";
import { editableQuoteWithLocalStatus } from "@/lib/document-integrity/quote-status";
import { validateDocumentEmission } from "@/lib/invoice-compliance";
import { todayISO } from "@/lib/calculations";
import {
  applyCustomerMergeToDocument,
  mergeCustomerRecords,
  type MergeCustomersOptions,
} from "@/lib/document-integrity/customer-merge";
import {
  applyDocumentLinkUpdate,
  type DocumentLinkUpdate,
} from "@/lib/document-links";
import { repairDocumentCustomerSnapshot } from "@/lib/document-customer-repair";
import {
  normalizeProductCatalogItem,
  purchaseProductKey,
} from "@/lib/purchase-products";
import {
  renameProductFamilyInAppData,
  type ProductFamilyRenameResult,
} from "@/lib/product-family-markups";
import {
  applyProductCatalogStructureOperation,
  mergeProductRecordsInAppData,
  type ProductCatalogStructureOperation,
  type ProductCatalogStructureResult,
} from "@/lib/product-catalog-structure";
import {
  deleteCustomerMasterFromData,
  deleteSupplierMasterFromData,
} from "@/lib/master-record-deletion";
import {
  runLegacyImportRepairCommand,
  type DurableLegacyImportRepairResult,
} from "@/lib/document-integrity/legacy-import-repair-command";
import {
  runBackupRestoreCommand,
  type BackupRestoreValue,
} from "@/lib/backup-restore-command";
import type { LegacyImportRepairPreview } from "@/lib/document-integrity/legacy-import-attestation";
import {
  runAppIssuedDocumentRecoveryCommand,
  runAppIssuedDocumentRecoveryRollbackCommand,
  type AppIssuedDocumentRecoveryPreview,
  type AppIssuedDocumentRecoveryRollbackPreview,
  type DurableAppIssuedDocumentRecoveryResult,
  type DurableAppIssuedDocumentRecoveryRollbackResult,
} from "@/lib/document-integrity/app-issued-recovery-command";
import {
  runTestDocumentRetirementCommand,
  runTestDocumentRetirementRollbackCommand,
  type DurableTestDocumentRetirementResult,
  type DurableTestDocumentRetirementRollbackResult,
} from "@/lib/document-integrity/test-document-retirement-command";
import type {
  TestDocumentRetirementBackupEvidenceV1,
  TestDocumentRetirementPreview,
  TestDocumentRetirementRollbackPreview,
} from "@/lib/document-integrity/test-document-retirement";
import type { FiscalNotificationLocalAnalysisResult } from "@/lib/fiscal-notifications/local-review-flow";
import {
  runSaveFiscalNotificationStructuredReviewCommandV1,
  type DurableFiscalNotificationStructuredReviewSaveResultV1,
} from "@/lib/fiscal-notifications/structured-review-save-command.v1";
import { runFiscalNotificationCommandAgainstLatestPersistedV1 } from "@/lib/fiscal-notifications/persisted-command.v1";
import {
  runFiscalNotificationDriveArchiveCommandV1,
  type DurableFiscalNotificationDriveArchiveResultV1,
} from "@/lib/fiscal-notifications/drive-original-archive-command.v1";
import type { FiscalNotificationOriginalArchiveReceiptV1 } from "@/lib/fiscal-notifications/drive-original-archive.v1";
import {
  runDeleteFiscalNotificationDocumentCommandV1,
  type DurableFiscalNotificationDocumentDeletionResultV1,
} from "@/lib/fiscal-notifications/document-deletion-command.v1";
import {
  runDeleteAllFiscalNotificationDocumentsCommandV1,
  type DurableDeleteAllFiscalNotificationDocumentsResultV1,
} from "@/lib/fiscal-notifications/delete-all-documents-command.v1";
import {
  runRepairFiscalNotificationEmptyHistoryCommandV1,
  type DurableFiscalNotificationEmptyHistoryRepairResultV1,
} from "@/lib/fiscal-notifications/empty-history-repair.v1";
import { reportAppError } from "@/lib/monitoring/client";
import {
  isCloudEnabled,
  isCloudSyncTemporarilyPaused,
} from "@/lib/supabase/config";

interface ReplaceDataOptions {
  fromRemote?: boolean;
}

export const CLOUD_SNAPSHOT_INCOMPLETE_WRITE_BLOCK_REASON =
  "cloud_snapshot_incomplete";

export interface AppWriteBlock {
  source: "cloud_sync_preflight" | "cloud_sync_review";
  message: string;
  recoveryHref: string;
  recoveryLabel: string;
}

const CLOUD_SYNC_PREFLIGHT_WRITE_BLOCK: AppWriteBlock = {
  source: "cloud_sync_preflight",
  message:
    "Comprobando que este dispositivo está al día con la nube antes de permitir cambios…",
  recoveryHref: "/cuenta",
  recoveryLabel: "Abrir Cuenta",
};

function initialCloudSyncWriteBlock(): AppWriteBlock | null {
  return isCloudEnabled() && !isCloudSyncTemporarilyPaused()
    ? CLOUD_SYNC_PREFLIGHT_WRITE_BLOCK
    : null;
}

type RecurringExpenseChangeBlockedReason = Extract<
  RecurringExpenseChangeApplyResult,
  { status: "blocked" }
>["reason"];

type DurableRecurringExpenseChangeResult =
  | AppDataDurabilityResult<
      Extract<RecurringExpenseChangeApplyResult, { status: "applied" }>
    >
  | { status: "blocked"; reason: RecurringExpenseChangeBlockedReason };

export type GenerateReceiptForInvoiceResult = ReceiptGenerationCommandResult;

function reportFiscalNotificationStructuredReviewSaveFailure(
  result: DurableFiscalNotificationStructuredReviewSaveResultV1,
): void {
  if (result.status !== "blocked") return;

  void reportAppError({
    severity: "error",
    area: "fiscal_notifications",
    code: `structured_review_save_${result.safeCode.toLowerCase()}`,
    message: "No se pudo guardar una ficha estructurada de notificaciones.",
    metadata: {
      stage: result.stage,
      safeCode: result.safeCode,
      reason: result.reason ?? null,
      warningCount: result.warningCodes.length,
    },
  });
}

interface AppStoreValue {
  data: AppData;
  ready: boolean;
  writeBlock: AppWriteBlock | null;
  setExternalWriteBlock: (block: AppWriteBlock) => void;
  clearExternalWriteBlock: (source: AppWriteBlock["source"]) => void;
  replaceData: (data: AppData, options?: ReplaceDataOptions) => void;
  replaceCloudSnapshotDurably: (
    data: AppData,
    expected: AppData,
  ) => AppDataDurabilityResult<CloudSnapshotReplacementValue>;
  adoptPersistedCloudSnapshot: (
    data: AppData,
    expectedCurrent: AppData,
  ) => boolean;
  getCurrentData: () => AppData;
  replaceDataIfCurrent: (data: AppData, expected: AppData) => boolean;
  restoreBackupData: (
    restored: AppData,
    expected: AppData,
    expectedTenantFingerprint?: string,
  ) => AppDataDurabilityResult<BackupRestoreValue>;
  applyImportedLegacyDocumentRepair: (
    preview: LegacyImportRepairPreview,
    expected: AppData,
  ) => DurableLegacyImportRepairResult;
  applyAppIssuedDocumentRecovery: (
    preview: AppIssuedDocumentRecoveryPreview,
    expected: AppData,
  ) => DurableAppIssuedDocumentRecoveryResult;
  rollbackAppIssuedDocumentRecovery: (
    preview: AppIssuedDocumentRecoveryRollbackPreview,
    expected: AppData,
  ) => DurableAppIssuedDocumentRecoveryRollbackResult;
  applyTestDocumentRetirement: (input: {
    preview: TestDocumentRetirementPreview;
    expected: AppData;
    tenantFingerprint: string;
    backup: TestDocumentRetirementBackupEvidenceV1;
    now: string;
  }) => DurableTestDocumentRetirementResult;
  rollbackTestDocumentRetirement: (input: {
    preview: TestDocumentRetirementRollbackPreview;
    expected: AppData;
    tenantFingerprint: string;
    backup: TestDocumentRetirementBackupEvidenceV1;
    now: string;
  }) => DurableTestDocumentRetirementRollbackResult;
  saveFiscalNotificationStructuredReview: (input: {
    expected: AppData;
    ownerScope: string;
    reviewId: string;
    createdAt: string;
    confirmedAt: string;
    analysis: FiscalNotificationLocalAnalysisResult;
  }) => DurableFiscalNotificationStructuredReviewSaveResultV1;
  archiveFiscalNotificationOriginal: (input: {
    expected: AppData;
    ownerScope: string;
    receipt: FiscalNotificationOriginalArchiveReceiptV1;
    archivedAt: string;
  }) => DurableFiscalNotificationDriveArchiveResultV1;
  deleteFiscalNotificationDocument: (input: {
    expected: AppData;
    ownerScope: string;
    documentId: string;
    deletedAt: string;
  }) => DurableFiscalNotificationDocumentDeletionResultV1;
  deleteAllFiscalNotificationDocuments: (input: {
    expected: AppData;
    ownerScope: string;
    deletedAt: string;
  }) => DurableDeleteAllFiscalNotificationDocumentsResultV1;
  repairFiscalNotificationEmptyHistory: (input: {
    expected: AppData;
    ownerScope: string;
    confirmedAt: string;
  }) => DurableFiscalNotificationEmptyHistoryRepairResultV1;
  syncCentralInvoiceAuthorityEvents: (
    expected: AppData,
    options?: { limit?: number | null; receivedAt?: string },
  ) => Promise<AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>>;
  syncCentralBusinessEvents: (
    ownerScope: string,
    options?: { limit?: number },
  ) => Promise<CentralBusinessEventsAppDataSyncResult>;
  reconcileCentralBusinessEvents: (
    ownerScope: string,
    options?: { limit?: number; maxPages?: number },
  ) => Promise<CentralBusinessEventReconciliationResult>;
  adoptCentralBusinessEventsFromServer: (
    ownerScope: string,
    options?: { limit?: number; maxPages?: number },
  ) => Promise<CentralBusinessEventsAppDataSyncResult>;
  resolveCentralBusinessConflictKeepingServer: (input: {
    ownerScope: string;
    entityType: CentralBusinessEntityType;
    entityId: string;
  }) => Promise<CentralBusinessConflictRecoveryResult>;
  commitPreparedAppDataDurably: <T>(
    expected: AppData,
    transition: AppDataTransition<T>,
  ) => AppDataDurabilityResult<T>;
  updateProfile: (profile: BusinessProfile) => void;
  updateProfileDurably: (
    profile: BusinessProfile,
    expected: AppData,
  ) => AppDataDurabilityResult<BusinessProfile>;
  addCentralBusinessNumberedDocumentDurably: (
    expected: AppData,
    entityType: "quote" | "receipt",
    confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
  ) => Promise<AppDataDurabilityResult<Document>>;
  addDocument: (
    doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">,
  ) => Document;
  addDocumentWithCentralIdentity: (
    doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">,
    identity: CentralInvoiceAuthorityFormIssueIdentity,
    options?: { localDocumentId?: string },
  ) => Document;
  issueDocument: (id: string) => Promise<Document>;
  markDocumentSent: (id: string) => Document | null;
  addRectificativa: (
    originalId: string,
    doc: Omit<
      Document,
      "id" | "number" | "type" | "createdAt" | "updatedAt" | "rectification"
    > & { rectification: RectificationInfo },
  ) => Promise<Document | null>;
  updateDocument: (doc: Document) => Promise<Document>;
  repairDocumentCustomer: (
    documentId: string,
    customerId: string,
  ) => Document | null;
  updateDocumentLink: (update: DocumentLinkUpdate) => void;
  markAsCollected: (id: string) => void;
  unmarkAsCollected: (id: string) => void;
  generateReceiptForInvoice: (
    invoiceId: string,
  ) => GenerateReceiptForInvoiceResult;
  markQuoteAsAccepted: (id: string) => void;
  unmarkQuoteAsAccepted: (id: string) => void;
  markQuoteAsRejected: (id: string) => void;
  unmarkQuoteAsRejected: (id: string) => void;
  convertQuoteToInvoice: (id: string) => Document | null;
  deleteDocument: (id: string) => boolean;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  addExpenseDurably: (
    expense: Omit<Expense, "id" | "createdAt">,
    identity: { id: string; now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<Expense>;
  updateExpense: (expense: Expense) => void;
  updateExpenseDurably: (
    expense: Expense,
    expected: AppData,
  ) => AppDataDurabilityResult<Expense>;
  deleteExpense: (id: string) => void;
  deleteExpenseDurably: (
    id: string,
    identity: { excludedAt: string },
    expected: AppData,
  ) => AppDataDurabilityResult<string>;
  saveScannedExpenseDurably: (
    expense: Omit<Expense, "id" | "createdAt"> | Expense,
    options: {
      expected: AppData;
      operationId: string;
      now?: string;
      supplier?: Omit<Supplier, "id" | "createdAt">;
    },
  ) => AppDataDurabilityResult<ScannedExpenseDurableValue>;
  saveFixedExpenseWithRecurringTemplate: (
    expense: Omit<Expense, "id" | "createdAt"> | Expense,
    item: RecurringExpenseDraft,
    options: {
      expected: AppData;
      operationId: string;
      now?: string;
      referenceDate?: string;
      supplier?: Omit<Supplier, "id" | "createdAt">;
    },
  ) => AppDataDurabilityResult<FixedExpenseBundleValue>;
  addProduct: (
    product: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ) => Product;
  addProductDurably: (
    product: Omit<Product, "id" | "createdAt" | "updatedAt">,
    identity: { id: string; now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<Product>;
  updateProductDurably: (
    product: Product,
    identity: { now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<Product>;
  updateProduct: (product: Product) => void;
  renameProductFamily: (
    sourceFamily: string,
    targetFamily: string,
  ) => ProductFamilyRenameResult;
  applyProductCatalogStructure: (
    operation: ProductCatalogStructureOperation,
  ) => ProductCatalogStructureResult;
  deleteProduct: (id: string) => void;
  deleteProductDurably: (
    id: string,
    expected: AppData,
  ) => AppDataDurabilityResult<string>;
  mergeProducts: (keepId: string, removeIds: string[]) => void;
  addRecurringExpense: (
    item: RecurringExpenseDraft,
    expected: AppData,
  ) => AppDataDurabilityResult<RecurringExpense>;
  setRecurringExpenseEnabled: (
    id: string,
    enabled: boolean,
    expected: AppData,
  ) => AppDataDurabilityResult<RecurringExpense>;
  applyRecurringExpenseChange: (
    id: string,
    item: RecurringExpenseDraft,
    effectiveDate: string,
    approval: {
      precondition: string;
      referenceDate: string;
      expected: AppData;
    },
  ) => DurableRecurringExpenseChangeResult;
  deleteRecurringExpense: (
    id: string,
    expected: AppData,
  ) => AppDataDurabilityResult<string>;
  addUserReminder: (item: UserReminderDraft) => UserReminder;
  addUserReminderDurably: (
    item: UserReminderDraft,
    identity: { id: string; now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<UserReminder>;
  updateUserReminder: (item: UserReminder) => void;
  updateUserReminderDurably: (
    item: UserReminder,
    identity: { now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<UserReminder>;
  completeUserReminder: (id: string) => void;
  reopenUserReminder: (id: string) => void;
  deleteUserReminder: (id: string) => void;
  deleteUserReminderDurably: (
    id: string,
    expected: AppData,
  ) => AppDataDurabilityResult<string>;
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => Supplier;
  addSupplierDurably: (
    supplier: Omit<Supplier, "id" | "createdAt">,
    identity: { id: string; now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<Supplier>;
  ensureExpenseSupplier: (
    input: SupplierForExpenseInput,
  ) => StoredSupplierForExpenseResolution;
  updateSupplier: (supplier: Supplier) => void;
  updateSupplierDurably: (
    supplier: Supplier,
    expected: AppData,
  ) => AppDataDurabilityResult<Supplier>;
  deleteSupplier: (id: string) => void;
  deleteSupplierDurably: (
    id: string,
    expected: AppData,
  ) => AppDataDurabilityResult<string>;
  mergeSuppliers: (keepId: string, removeIds: string[]) => void;
  mergeCustomers: (
    keepId: string,
    removeIds: string[],
    options?: MergeCustomersOptions,
  ) => void;
  addCustomer: (
    customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
  ) => { ok: true; customer: Customer } | { ok: false; error: string };
  addCustomerDurably: (
    customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
    identity: { id: string; now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<Customer>;
  updateCustomerDurably: (
    customer: Customer,
    identity: { now: string },
    expected: AppData,
  ) => AppDataDurabilityResult<Customer>;
  updateCustomer: (
    customer: Customer,
  ) => { ok: true; customer: Customer } | { ok: false; error: string };
  deleteCustomer: (id: string) => void;
  deleteCustomerDurably: (
    id: string,
    expected: AppData,
  ) => AppDataDurabilityResult<string>;
  upsertCustomerForDocument: (
    input: ClientInput,
    selectedCustomerId: string | null,
  ) =>
    | { ok: true; customerId: string; client: Client }
    | { ok: false; error: string };
  getDocumentsByType: (type: DocumentType) => Document[];
  registerVerifactuForDocument: (
    doc: Document,
    chainOverride?: AppData["verifactuChain"],
    profileOverride?: BusinessProfile,
  ) => Promise<Document>;
}

function normalizeProfileForAppStore(
  profile: BusinessProfile,
): BusinessProfile {
  return {
    ...profile,
    advisorContact: normalizeAdvisorContact(profile.advisorContact),
    iva: normalizeIvaSettings(profile.iva),
    numbering: normalizeNumbering(profile.numbering),
    documentPhrases: normalizeDocumentPhrases(profile.documentPhrases),
    documentPaymentMethods: normalizeDocumentPaymentMethods(
      profile.documentPaymentMethods,
    ),
    documentTemplate: normalizeDocumentTemplate(profile.documentTemplate),
    documentUnits: normalizeDocumentUnits(profile.documentUnits),
    appPreferences: normalizeAppPreferences(profile.appPreferences),
    fiscalProfile: normalizeBusinessFiscalProfile(profile.fiscalProfile),
    taxModelDiagnostic: normalizeTaxModelDiagnosticSession(
      profile.taxModelDiagnostic,
    ),
    fiscalAdvisoryModelPreferences:
      normalizeFiscalAdvisoryModelPreferencesV1(
        profile.fiscalAdvisoryModelPreferences,
      ),
  };
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function newId(): string {
  return crypto.randomUUID();
}

function createProductWithIdentity(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
  identity: { id: string; now: string },
): Product {
  return normalizeProductCatalogItem({
    ...product,
    id: identity.id,
    key: product.key || purchaseProductKey(product.name),
    createdAt: identity.now,
    updatedAt: identity.now,
  });
}

function findUniqueDocumentById(
  documents: Document[],
  id: string,
): Document | undefined {
  const matching = documents.filter((document) => document.id === id);
  return matching.length === 1 ? matching[0] : undefined;
}

function documentKindForType(type: DocumentType): DocumentKind {
  return type === "factura"
    ? "factura"
    : type === "presupuesto"
      ? "presupuesto"
      : "recibo";
}

interface FinalInvoiceIdentityAssignment {
  kind: DocumentKind;
  year: number;
  sequence: number;
}

function assignFinalInvoiceIdentityIfNeeded(
  doc: Document,
  documents: Document[],
  numbering: BusinessProfile["numbering"],
): { doc: Document; assignment?: FinalInvoiceIdentityAssignment } {
  if (!isDraftInvoiceNumber(doc)) {
    return { doc };
  }

  const issueDate = todayISO();
  const year = new Date(issueDate).getFullYear();
  const kind: DocumentKind = doc.rectification
    ? "factura_rectificativa"
    : "factura";
  const { number, sequence } = assignNextDocumentNumber(
    documents.filter((item) => item.id !== doc.id),
    kind,
    year,
    configuredLastForKind(numbering, kind, year),
    numbering,
  );

  return {
    doc: {
      ...doc,
      date: issueDate,
      number,
    },
    assignment: { kind, year, sequence },
  };
}

function applyEmittedRectificationToOriginal(
  documents: Document[],
  rectificativa: Document,
  updatedAt: string,
): Document[] {
  if (!rectificativa.rectification || rectificativa.status === "borrador") {
    return documents;
  }

  const originalId = rectificativa.rectification.originalDocumentId;
  return documents.map((doc) => {
    if (doc.id !== originalId) return doc;
    if (doc.rectifiedById && doc.rectifiedById !== rectificativa.id) {
      return doc;
    }
    return {
      ...doc,
      status: originalStatusAfterRectification(
        rectificativa.rectification!.type,
      ),
      rectifiedById: rectificativa.id,
      updatedAt,
    };
  });
}

function saveEditableDocument(
  current: Document,
  next: Document,
  profile: BusinessProfile,
  updatedAt: string,
): Document {
  if (current.type === "presupuesto" || next.type === "presupuesto") {
    if (
      deriveDocumentLifecycle(current) !== "draft" ||
      isDocumentIntegrityLocked(current)
    ) {
      throw new DocumentIntegrityError("DOCUMENT_LOCKED");
    }
    return editableQuoteWithLocalStatus(next, updatedAt);
  }

  if (
    deriveDocumentLifecycle(current) !== "draft" ||
    next.status === "borrador"
  ) {
    return applyGenericDocumentUpdate(current, next, updatedAt);
  }

  const requestedStatus = next.status;
  assertDocumentEmissionValid(next, profile);
  const draft = applyGenericDocumentUpdate(
    current,
    {
      ...next,
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
    },
    updatedAt,
  );
  return issueDraftDocumentWithStatus(
    draft,
    requestedStatus,
    profile,
    updatedAt,
  );
}

function assertDocumentEmissionValid(
  document: Document,
  profile: BusinessProfile,
): void {
  const candidate =
    document.status === "borrador"
      ? { ...document, status: "enviado" as const }
      : document;
  const validation = validateDocumentEmission(
    candidate,
    profile,
    candidate.type,
  );
  if (!validation.ok) {
    throw new DocumentIntegrityError(
      "DOCUMENT_EMISSION_INVALID",
      validation.message,
    );
  }
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const initialWriteBlock = useRef<AppWriteBlock | null>(
    initialCloudSyncWriteBlock(),
  );
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const dataRef = useRef<AppData>(EMPTY_DATA);
  const [writeBlock, setWriteBlock] = useState<AppWriteBlock | null>(
    initialWriteBlock.current,
  );
  const writeBlockRef = useRef<AppWriteBlock | null>(
    initialWriteBlock.current,
  );
  const [ready, setReady] = useState(false);
  const skipNextSave = useRef(true);
  const durablyPersistedDataRef = useRef<AppData | null>(null);
  const lastKnownDurableDataRef = useRef<AppData>(EMPTY_DATA);
  const durableStorageBaselineRef = useRef<DurableStorageBaseline>({
    status: "known",
    data: EMPTY_DATA,
  });

  const setAppData = useCallback(
    (
      updater: AppData | ((prev: AppData) => AppData),
      options?: { skipDirty?: boolean; bypassWriteBlock?: boolean },
    ) => {
      if (durableStorageBaselineRef.current.status === "indeterminate") {
        return dataRef.current;
      }
      if (writeBlockRef.current && !options?.bypassWriteBlock) {
        return dataRef.current;
      }
      const prev = dataRef.current;
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next === prev) return prev;
      const touched = touchAppData(next);
      const resolved = options?.skipDirty
        ? touched
        : trackDataDiff(prev, touched);
      dataRef.current = resolved;
      setData(resolved);
      return resolved;
    },
    [],
  );

  const blockedDurableResult = useCallback(
    <T,>(): AppDataDurabilityResult<T> => ({
      status: "blocked",
      reason: CLOUD_SNAPSHOT_INCOMPLETE_WRITE_BLOCK_REASON,
    }),
    [],
  );

  const blockedSaveResult = useCallback(
    () =>
      ({
        status: "blocked",
        reason: CLOUD_SNAPSHOT_INCOMPLETE_WRITE_BLOCK_REASON,
      }) as const,
    [],
  );

  const setExternalWriteBlock = useCallback((block: AppWriteBlock) => {
    writeBlockRef.current = block;
    setWriteBlock(block);
  }, []);

  const clearExternalWriteBlock = useCallback(
    (source: AppWriteBlock["source"]) => {
      if (writeBlockRef.current?.source !== source) return;
      writeBlockRef.current = null;
      setWriteBlock(null);
    },
    [],
  );

  const commitDurableAppData = useCallback(
    <T,>(
      expected: AppData,
      build: (previous: AppData) => { data: AppData; value: T },
    ): AppDataDurabilityResult<T> => {
      if (writeBlockRef.current) return blockedDurableResult();
      const result = commitAppDataDurablyWithStorageRecovery({
        expected,
        storageBaseline: durableStorageBaselineRef.current,
        lastKnownStorageBaseline: lastKnownDurableDataRef.current,
        getCurrent: () => dataRef.current,
        build,
        persist: (candidate, storageExpected) =>
          saveData(candidate, { expected: storageExpected }),
        inspectPersisted: inspectPersistedData,
        readPersisted: readPersistedDataSnapshot,
      });
      if (result.status === "indeterminate") {
        durableStorageBaselineRef.current = result;
      }
      if (result.status !== "applied") return result;

      durableStorageBaselineRef.current = {
        status: "known",
        data: result.data,
      };
      lastKnownDurableDataRef.current = result.data;
      durablyPersistedDataRef.current = result.data;
      dataRef.current = result.data;
      setData(result.data);
      return result;
    },
    [blockedDurableResult],
  );

  const commitLatestDurableAppData = useCallback(
    <T,>(
      _expected: AppData,
      build: (previous: AppData) => { data: AppData; value: T },
    ): AppDataDurabilityResult<T> => {
      if (writeBlockRef.current) return blockedDurableResult();
      const result = commitLatestAppDataDurably({
        storageBaseline: durableStorageBaselineRef.current,
        getCurrent: () => dataRef.current,
        build,
        persist: (candidate) => saveData(candidate),
      });
      if (result.status === "indeterminate") {
        durableStorageBaselineRef.current = result;
      }
      if (result.status !== "applied") return result;

      durableStorageBaselineRef.current = {
        status: "known",
        data: result.data,
      };
      lastKnownDurableDataRef.current = result.data;
      durablyPersistedDataRef.current = result.data;
      dataRef.current = result.data;
      setData(result.data);
      return result;
    },
    [blockedDurableResult],
  );

  const commitPreparedAppDataDurably = useCallback(
    <T,>(
      expected: AppData,
      transition: AppDataTransition<T>,
    ): AppDataDurabilityResult<T> =>
      commitDurableAppData(expected, () => transition),
    [commitDurableAppData],
  );

  useEffect(() => {
    const persisted = loadData();
    durableStorageBaselineRef.current = { status: "known", data: persisted };
    lastKnownDurableDataRef.current = persisted;
    const loaded = syncRecurringExpenses(persisted);
    dataRef.current = loaded;
    setData(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (durableStorageBaselineRef.current.status === "indeterminate") return;
    if (durablyPersistedDataRef.current === data) {
      durablyPersistedDataRef.current = null;
      skipNextSave.current = false;
      return;
    }
    durablyPersistedDataRef.current = null;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const result = persistAppDataAgainstDurableBaseline({
      data,
      storageBaseline: durableStorageBaselineRef.current,
      persist: (candidate, expected) => saveData(candidate, { expected }),
    });
    if (result.status === "applied") {
      lastKnownDurableDataRef.current = data;
    }
    durableStorageBaselineRef.current = durableStorageBaselineAfterSave(
      data,
      result,
    );
  }, [data, ready]);

  const replaceData = useCallback(
    (next: AppData, options?: ReplaceDataOptions) => {
      if (durableStorageBaselineRef.current.status === "indeterminate") {
        return;
      }
      if (options?.fromRemote) {
        skipNextSave.current = false;
        dataRef.current = next;
        setData(next);
        const result = saveData(next);
        if (result.status === "applied") {
          lastKnownDurableDataRef.current = next;
        }
        durableStorageBaselineRef.current = durableStorageBaselineAfterSave(
          next,
          result,
        );
        return;
      }
      setAppData(next, { skipDirty: false });
    },
    [setAppData],
  );

  const getCurrentData = useCallback(() => dataRef.current, []);

  const adoptPersistedCloudSnapshot = useCallback(
    (candidate: AppData, expectedCurrent: AppData): boolean =>
      adoptPersistedSnapshotIfCurrent({
        candidate,
        expectedCurrent,
        getCurrent: () => dataRef.current,
        currentMatchesDurableBaseline: () =>
          durableStorageBaselineRef.current.status === "known" &&
          durableStorageBaselineRef.current.data === expectedCurrent,
        persistedMatches: (expected) =>
          inspectPersistedData(expected).status === "applied",
        publishMemoryOnly: (next) => {
          durableStorageBaselineRef.current = { status: "known", data: next };
          lastKnownDurableDataRef.current = next;
          durablyPersistedDataRef.current = next;
          dataRef.current = next;
          setData(next);
        },
      }),
    [],
  );

  const replaceCloudSnapshotDurably = useCallback(
    (replacement: AppData, expected: AppData) => {
      const result = commitCloudSnapshotDurably({
        expected,
        replacement,
        storageBaseline: durableStorageBaselineRef.current,
        getCurrent: () => dataRef.current,
        persist: (candidate, storageExpected) =>
          saveData(candidate, { expected: storageExpected }),
      });
      if (result.status === "indeterminate") {
        durableStorageBaselineRef.current = result;
      }
      if (result.status !== "applied") return result;

      durableStorageBaselineRef.current = {
        status: "known",
        data: result.data,
      };
      lastKnownDurableDataRef.current = result.data;
      durablyPersistedDataRef.current = result.data;
      dataRef.current = result.data;
      setData(result.data);
      return result;
    },
    [],
  );

  const replaceDataIfCurrent = useCallback(
    (next: AppData, expected: AppData): boolean => {
      if (durableStorageBaselineRef.current.status === "indeterminate") {
        return false;
      }
      if (writeBlockRef.current) return false;
      if (dataRef.current !== expected) return false;
      setAppData(next, { skipDirty: false });
      return true;
    },
    [setAppData],
  );

  const restoreBackupData = useCallback(
    (
      restored: AppData,
      expected: AppData,
      expectedTenantFingerprint?: string,
    ) =>
      runBackupRestoreCommand({
        restored,
        expected,
        expectedTenantFingerprint,
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const applyImportedLegacyDocumentRepair = useCallback(
    (
      preview: LegacyImportRepairPreview,
      expected: AppData,
    ): DurableLegacyImportRepairResult =>
      runLegacyImportRepairCommand({
        expected,
        preview,
        now: new Date().toISOString(),
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const applyAppIssuedDocumentRecovery = useCallback(
    (
      preview: AppIssuedDocumentRecoveryPreview,
      expected: AppData,
    ): DurableAppIssuedDocumentRecoveryResult =>
      runAppIssuedDocumentRecoveryCommand({
        expected,
        preview,
        now: new Date().toISOString(),
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const rollbackAppIssuedDocumentRecovery = useCallback(
    (
      preview: AppIssuedDocumentRecoveryRollbackPreview,
      expected: AppData,
    ): DurableAppIssuedDocumentRecoveryRollbackResult =>
      runAppIssuedDocumentRecoveryRollbackCommand({
        expected,
        preview,
        now: new Date().toISOString(),
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const applyTestDocumentRetirement = useCallback(
    (input: {
      preview: TestDocumentRetirementPreview;
      expected: AppData;
      tenantFingerprint: string;
      backup: TestDocumentRetirementBackupEvidenceV1;
      now: string;
    }): DurableTestDocumentRetirementResult =>
      runTestDocumentRetirementCommand({
        ...input,
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const rollbackTestDocumentRetirement = useCallback(
    (input: {
      preview: TestDocumentRetirementRollbackPreview;
      expected: AppData;
      tenantFingerprint: string;
      backup: TestDocumentRetirementBackupEvidenceV1;
      now: string;
    }): DurableTestDocumentRetirementRollbackResult =>
      runTestDocumentRetirementRollbackCommand({
        ...input,
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const saveFiscalNotificationStructuredReview = useCallback(
    (input: {
      expected: AppData;
      ownerScope: string;
      reviewId: string;
      createdAt: string;
      confirmedAt: string;
      analysis: FiscalNotificationLocalAnalysisResult;
    }): DurableFiscalNotificationStructuredReviewSaveResultV1 => {
      const result =
        runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationStructuredReviewSaveResultV1>(
          {
            fallback: dataRef.current,
            storageBaseline: durableStorageBaselineRef.current,
            lastKnownPersisted: lastKnownDurableDataRef.current,
            readPersisted: readPersistedDataSnapshot,
            persist: (candidate, expected) =>
              writeBlockRef.current
                ? blockedSaveResult()
                : saveData(candidate, {
                    expected,
                    fiscalNotificationsBaseAwareProjection: true,
                  }),
            blocked: (reason) => ({
              status: "blocked",
              stage: "COMMIT",
              safeCode: "DURABILITY_CONFLICT",
              warningCodes: Object.freeze([]),
              reason,
            }),
            run: (expected, commit) =>
              runSaveFiscalNotificationStructuredReviewCommandV1({
                ...input,
                expected,
                commit,
              }),
          },
        );
      if (
        result.status === "blocked" &&
        result.reason === "storage_state_unknown"
      ) {
        durableStorageBaselineRef.current = {
          status: "indeterminate",
          reason: "storage_state_unknown",
        };
      }
      if (
        result.status === "applied" ||
        result.status === "applied_with_warnings"
      ) {
        durableStorageBaselineRef.current = {
          status: "known",
          data: result.data,
        };
        lastKnownDurableDataRef.current = result.data;
        durablyPersistedDataRef.current = result.data;
        dataRef.current = result.data;
        setData(result.data);
      }
      reportFiscalNotificationStructuredReviewSaveFailure(result);
      return result;
    },
    [blockedSaveResult],
  );

  const archiveFiscalNotificationOriginal = useCallback(
    (input: {
      expected: AppData;
      ownerScope: string;
      receipt: FiscalNotificationOriginalArchiveReceiptV1;
      archivedAt: string;
    }): DurableFiscalNotificationDriveArchiveResultV1 =>
      runFiscalNotificationDriveArchiveCommandV1({
        ...input,
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const deleteFiscalNotificationDocument = useCallback(
    (input: {
      expected: AppData;
      ownerScope: string;
      documentId: string;
      deletedAt: string;
    }): DurableFiscalNotificationDocumentDeletionResultV1 => {
      const result =
        runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationDocumentDeletionResultV1>(
          {
            fallback: dataRef.current,
            storageBaseline: durableStorageBaselineRef.current,
            lastKnownPersisted: lastKnownDurableDataRef.current,
            readPersisted: readPersistedDataSnapshot,
            persist: (candidate, expected) =>
              writeBlockRef.current
                ? blockedSaveResult()
                : saveData(candidate, {
                    expected,
                    fiscalNotificationsBaseAwareProjection: true,
                  }),
            blocked: (reason) =>
              reason === "storage_state_unknown"
                ? { status: "indeterminate", reason }
                : { status: "blocked", reason },
            run: (expected, commit) =>
              runDeleteFiscalNotificationDocumentCommandV1({
                ...input,
                expected,
                commit,
              }),
          },
        );
      if (result.status === "indeterminate") {
        durableStorageBaselineRef.current = result;
      }
      if (result.status === "applied") {
        durableStorageBaselineRef.current = {
          status: "known",
          data: result.data,
        };
        lastKnownDurableDataRef.current = result.data;
        durablyPersistedDataRef.current = result.data;
        dataRef.current = result.data;
        setData(result.data);
      }
      return result;
    },
    [blockedSaveResult],
  );

  const deleteAllFiscalNotificationDocuments = useCallback(
    (input: {
      expected: AppData;
      ownerScope: string;
      deletedAt: string;
    }): DurableDeleteAllFiscalNotificationDocumentsResultV1 => {
      const result =
        runFiscalNotificationCommandAgainstLatestPersistedV1<DurableDeleteAllFiscalNotificationDocumentsResultV1>(
          {
            fallback: dataRef.current,
            storageBaseline: durableStorageBaselineRef.current,
            lastKnownPersisted: lastKnownDurableDataRef.current,
            readPersisted: readPersistedDataSnapshot,
            persist: (candidate, expected) =>
              writeBlockRef.current
                ? blockedSaveResult()
                : saveData(candidate, {
                    expected,
                    fiscalNotificationsBaseAwareProjection: true,
                  }),
            blocked: (reason) =>
              reason === "storage_state_unknown"
                ? { status: "indeterminate", reason }
                : { status: "blocked", reason },
            run: (expected, commit) =>
              runDeleteAllFiscalNotificationDocumentsCommandV1({
                ...input,
                expected,
                commit,
              }),
          },
        );
      if (result.status === "indeterminate") {
        durableStorageBaselineRef.current = result;
      }
      if (result.status === "applied") {
        durableStorageBaselineRef.current = {
          status: "known",
          data: result.data,
        };
        lastKnownDurableDataRef.current = result.data;
        durablyPersistedDataRef.current = result.data;
        dataRef.current = result.data;
        setData(result.data);
      }
      return result;
    },
    [blockedSaveResult],
  );

  const repairFiscalNotificationEmptyHistory = useCallback(
    (input: {
      expected: AppData;
      ownerScope: string;
      confirmedAt: string;
    }): DurableFiscalNotificationEmptyHistoryRepairResultV1 =>
      runRepairFiscalNotificationEmptyHistoryCommandV1({
        ...input,
        commit: commitDurableAppData,
      }),
    [commitDurableAppData],
  );

  const syncCentralInvoiceAuthorityEvents = useCallback(
    async (
      _expected: AppData,
      options: { limit?: number | null; receivedAt?: string } = {},
    ): Promise<
      AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>
    > => {
      const {
        buildCentralInvoiceAuthorityEventsAppDataTransition,
        pullCentralInvoiceAuthorityEventsForAppData,
        selectCentralInvoiceAuthorityEventsSyncBaseline,
      } = await import(
        "@/lib/central-invoice-authority/events-app-data-sync"
      );
      const { runCentralInvoiceAuthorityClientOperation } = await import(
        "@/lib/central-invoice-authority/client-operation-lock"
      );

      return runCentralInvoiceAuthorityClientOperation(async () => {
        const memory = dataRef.current;
        const baseline = selectCentralInvoiceAuthorityEventsSyncBaseline({
          memory,
          persisted: readPersistedDataSnapshot(),
          persistedMatchesMemory:
            inspectPersistedData(memory).status === "applied",
        });
        if (!baseline) {
          return {
            status: "blocked",
            reason: "stale_precondition",
          } as const;
        }
        if (baseline !== memory) {
          durableStorageBaselineRef.current = {
            status: "known",
            data: baseline,
          };
          lastKnownDurableDataRef.current = baseline;
          durablyPersistedDataRef.current = baseline;
          dataRef.current = baseline;
          setData(baseline);
        }

        const pulled = await pullCentralInvoiceAuthorityEventsForAppData({
          data: baseline,
          limit: options.limit,
          receivedAt: options.receivedAt,
        });
        return commitDurableAppData(baseline, (previous) =>
          buildCentralInvoiceAuthorityEventsAppDataTransition({
            data: previous,
            pulled,
          }),
        );
      });
    },
    [commitDurableAppData],
  );

  const pullCentralBusinessEvents = useCallback(
    async (
      ownerScope: string,
      options: { limit?: number } = {},
    ): Promise<CentralBusinessEventsAppDataSyncResult> => {
      const {
        selectCentralBusinessEventsSyncBaseline,
        syncCentralBusinessEventsIntoAppData,
      } = await import(
        "@/lib/central-business-authority/events-app-data-sync"
      );
      const memory = dataRef.current;
      const baseline = selectCentralBusinessEventsSyncBaseline({
        memory,
        persisted: readPersistedDataSnapshot(),
        persistedMatchesMemory:
          inspectPersistedData(memory).status === "applied",
      });
      if (!baseline) {
        return {
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_APP_DATA_BASELINE_AMBIGUOUS",
          message:
            "La copia visible y la copia guardada no tienen un orden verificable. Recarga antes de modificar datos centrales.",
          retryable: false,
          nextSequence: 0,
        };
      }
      if (baseline !== memory) {
        durableStorageBaselineRef.current = {
          status: "known",
          data: baseline,
        };
        lastKnownDurableDataRef.current = baseline;
        durablyPersistedDataRef.current = baseline;
        dataRef.current = baseline;
        setData(baseline);
      }
      return syncCentralBusinessEventsIntoAppData(
        { ownerScope, limit: options.limit },
        {
          getCurrentData: () => baseline,
          commit: (expected, build) => commitDurableAppData(expected, build),
        },
      );
    },
    [commitDurableAppData],
  );

  const syncCentralBusinessEvents = useCallback(
    async (
      ownerScope: string,
      options: { limit?: number } = {},
    ): Promise<CentralBusinessEventsAppDataSyncResult> => {
      let drained: CentralBusinessDrainResult;
      try {
        const {
          drainCentralBusinessDurableQueue,
          withCentralBusinessQueueLock,
        } = await import("@/lib/central-business-authority/durable-queue");
        const { mutateCentralBusinessFromBrowser } =
          await import("@/lib/central-business-authority/mutation-client");
        const { mutateCentralBusinessBatchFromBrowser } =
          await import("@/lib/central-business-authority/batch-mutation-client");
        drained = await withCentralBusinessQueueLock(ownerScope, () =>
          drainCentralBusinessDurableQueue({
            ownerScope,
            mutate: mutateCentralBusinessFromBrowser,
            mutateBatch: mutateCentralBusinessBatchFromBrowser,
          }),
        );
      } catch {
        return {
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_QUEUE_STATE_FAILED",
          message:
            "No se pudo verificar la cola central guardada en este dispositivo.",
          retryable: false,
          nextSequence: 0,
        };
      }
      if (drained.stoppedBy !== "empty") {
        await pullCentralBusinessEvents(ownerScope, options);
        return {
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code:
            drained.stoppedBy === "retryable"
              ? "CENTRAL_BUSINESS_PENDING_RETRY"
              : "CENTRAL_BUSINESS_PENDING_REVIEW",
          message:
            drained.stoppedBy === "retryable"
              ? "La cola central sigue pendiente por un fallo transitorio."
              : "La cola central requiere revisión antes de descargar cambios.",
          retryable: drained.stoppedBy === "retryable",
          nextSequence: drained.state.lastAppliedEventSequence,
        };
      }

      return pullCentralBusinessEvents(ownerScope, options);
    },
    [pullCentralBusinessEvents],
  );

  const reconcileCentralBusinessEvents = useCallback(
    async (
      ownerScope: string,
      options: { limit?: number; maxPages?: number } = {},
    ): Promise<CentralBusinessEventReconciliationResult> => {
      const { reconcileCentralBusinessEventHistory } = await import(
        "@/lib/central-business-authority/event-reconciliation"
      );
      const {
        loadCentralBusinessDurableQueue,
        rewindCentralBusinessEventCursorForReconciliation,
        withCentralBusinessQueueLock,
      } = await import(
        "@/lib/central-business-authority/durable-queue"
      );

      return reconcileCentralBusinessEventHistory(
        { maxPages: options.maxPages },
        {
          rewind: () =>
            withCentralBusinessQueueLock(ownerScope, () =>
              rewindCentralBusinessEventCursorForReconciliation({
                ownerScope,
              }),
            ),
          hasPendingOperations: () =>
            loadCentralBusinessDurableQueue(ownerScope).operations.length > 0,
          syncPage: () =>
            pullCentralBusinessEvents(ownerScope, {
              limit: options.limit ?? 500,
            }),
        },
      );
    },
    [pullCentralBusinessEvents],
  );

  const adoptCentralBusinessEventsFromServer = useCallback(
    async (
      ownerScope: string,
      options: { limit?: number; maxPages?: number } = {},
    ): Promise<CentralBusinessEventsAppDataSyncResult> => {
      const {
        adoptCentralBusinessEventsFromServerIntoAppData,
        selectCentralBusinessServerAdoptionBaseline,
      } = await import(
        "@/lib/central-business-authority/events-app-data-sync"
      );
      const memory = dataRef.current;
      const baseline = selectCentralBusinessServerAdoptionBaseline({
        memory,
        persisted: readPersistedDataSnapshot(),
        persistedMatchesMemory:
          inspectPersistedData(memory).status === "applied",
      });
      if (!baseline) {
        return {
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_APP_DATA_BASELINE_AMBIGUOUS",
          message:
            "La copia visible y la copia guardada no tienen un orden verificable. Recarga antes de adoptar la copia central.",
          retryable: false,
          nextSequence: 0,
        };
      }
      if (baseline !== memory) {
        durableStorageBaselineRef.current = {
          status: "known",
          data: baseline,
        };
        lastKnownDurableDataRef.current = baseline;
        durablyPersistedDataRef.current = baseline;
        dataRef.current = baseline;
        setData(baseline);
      }
      return adoptCentralBusinessEventsFromServerIntoAppData(
        {
          ownerScope,
          limit: options.limit,
          maxPages: options.maxPages,
        },
        {
          getCurrentData: () => baseline,
          commit: (expected, build) =>
            commitDurableAppData(expected, build),
        },
      );
    },
    [commitDurableAppData],
  );

  const resolveCentralBusinessConflictKeepingServer = useCallback(
    async (input: {
      ownerScope: string;
      entityType: CentralBusinessEntityType;
      entityId: string;
    }): Promise<CentralBusinessConflictRecoveryResult> => {
      const { resolveCentralBusinessConflictKeepingServer: resolve } =
        await import(
          "@/lib/central-business-authority/conflict-recovery"
        );
      return resolve(input, {
        syncServerEvents: () =>
          pullCentralBusinessEvents(input.ownerScope, { limit: 100 }),
      });
    },
    [pullCentralBusinessEvents],
  );

  const updateProfile = useCallback(
    (profile: BusinessProfile) => {
      setAppData((prev) => ({
        ...prev,
        profile: normalizeProfileForAppStore(profile),
      }));
    },
    [setAppData],
  );

  const updateProfileDurably = useCallback(
    (
      profile: BusinessProfile,
      expected: AppData,
    ): AppDataDurabilityResult<BusinessProfile> =>
      commitDurableAppData(expected, (previous) => {
        const normalized = normalizeProfileForAppStore(profile);
        return {
          data: { ...previous, profile: normalized },
          value: normalized,
        };
      }),
    [commitDurableAppData],
  );

  const addCentralBusinessNumberedDocumentDurably = useCallback(
    async (
      expected: AppData,
      entityType: "quote" | "receipt",
      confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
    ): Promise<AppDataDurabilityResult<Document>> => {
      const { buildCentralBusinessNumberedDocumentLocalCommit } =
        await import(
          "@/lib/central-business-authority/numbered-document-local-commit"
        );
      return commitDurableAppData(expected, (previous) => {
        const transition = buildCentralBusinessNumberedDocumentLocalCommit(
          previous,
          entityType,
          confirmation,
        );
        return {
          data: transition.data,
          value: transition.value,
        };
      });
    },
    [commitDurableAppData],
  );

  const addDocument = useCallback(
    (
      doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">,
    ): Document => {
      let created: Document | null = null;
      setAppData((prev) => {
        const year = new Date(doc.date).getFullYear();
        const kind = documentKindForType(doc.type);
        const numbering = prev.profile.numbering;
        const usesDraftNumber = shouldUseDraftInvoiceNumber(doc);
        const assigned = usesDraftNumber
          ? { number: DRAFT_INVOICE_NUMBER, sequence: null }
          : assignNextDocumentNumberByType(
              prev.documents,
              doc.type,
              year,
              configuredLastForKind(numbering, kind, year),
              numbering,
            );
        const now = new Date().toISOString();
        const createdDraft: Document = {
          ...doc,
          status: doc.status === "borrador" ? doc.status : "borrador",
          id: newId(),
          number: assigned.number,
          createdAt: now,
          updatedAt: now,
        };
        created =
          doc.status === "borrador"
            ? createdDraft
            : saveEditableDocument(
                createdDraft,
                { ...createdDraft, status: doc.status },
                prev.profile,
                now,
              );
        const nextDocuments = [...prev.documents, created];
        return {
          ...prev,
          profile:
            assigned.sequence === null
              ? prev.profile
              : {
                  ...prev.profile,
                  numbering: bumpNumberingAfterAssign(
                    prev.profile.numbering,
                    kind,
                    year,
                    assigned.sequence,
                  ),
                },
          documents: nextDocuments,
          counters: countersFromDocuments(nextDocuments, year, numbering),
        };
      });
      if (!created) throw new Error("No se pudo crear el documento");
      return created;
    },
    [setAppData],
  );

  const addDocumentWithCentralIdentity = useCallback(
    (
      doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">,
      identity: CentralInvoiceAuthorityFormIssueIdentity,
      options: { localDocumentId?: string } = {},
    ): Document => {
      if (doc.type !== "factura" || doc.status === "borrador") {
        throw new Error(
          "La identidad central solo se aplica al emitir facturas.",
        );
      }
      if (
        (doc.rectification && identity.kind !== "factura_rectificativa") ||
        (!doc.rectification && identity.kind !== "factura")
      ) {
        throw new Error(
          "La identidad central no coincide con la serie del documento.",
        );
      }

      const expected = dataRef.current;
      const result = commitDurableAppData(expected, (prev) => {
        const now = new Date().toISOString();
        const centralInvoiceAuthority: Document["centralInvoiceAuthority"] = {
          schemaVersion: 1,
          source: "central_invoice_authority",
          serverDocumentId: identity.serverDocumentId,
          identityId: identity.identityId,
          outboxEventId: identity.outboxEventId,
          eventType:
            identity.kind === "factura_rectificativa"
              ? "rectification_issued"
              : "invoice_issued",
          fullNumber: identity.fullNumber,
          sequence: identity.sequence,
          documentVersion: identity.documentVersion,
          receivedAt: now,
        };
        if (doc.rectification) {
          const storedOriginal = requireUniqueRectificationOriginal(
            prev.documents,
            doc.rectification.originalDocumentId,
          );
          const { original, profile: rectificationProfile } =
            resolveCanonicalRectificationSource(storedOriginal, prev.profile);
          if (!canRectifyInvoice(original)) {
            throw new Error(
              "La factura original no admite una rectificativa central.",
            );
          }
          if (hasPendingRectificationDraft(prev.documents, original.id)) {
            throw new Error(
              "La factura original ya tiene una rectificativa pendiente.",
            );
          }

          const rectification = canonicalRectificationReference(
            original,
            doc.rectification,
          );
          const source: Document = {
            ...doc,
            status: doc.status,
            id: options.localDocumentId ?? newId(),
            number: identity.fullNumber,
            items: canonicalRectificationItems(
              original,
              doc.items,
              rectification.type,
            ),
            rectification,
            centralInvoiceAuthority,
            createdAt: now,
            updatedAt: now,
          };
          assertRectificationEmissionAllowed(source, prev.documents);
          assertDocumentEmissionValid(source, rectificationProfile);

          const created = materializeRectificationDocument(
            source,
            rectificationProfile,
            now,
          );
          const nextDocuments = applyEmittedRectificationToOriginal(
            [...prev.documents, created],
            created,
            now,
          );

          return {
            data: {
              ...prev,
              profile: {
                ...prev.profile,
                numbering: bumpNumberingAfterAssign(
                  prev.profile.numbering,
                  identity.kind,
                  identity.fiscalYear,
                  identity.sequence,
                ),
              },
              documents: nextDocuments,
              counters: countersFromDocuments(
                nextDocuments,
                identity.fiscalYear,
                prev.profile.numbering,
              ),
            },
            value: created,
          };
        }

        const createdDraft: Document = {
          ...doc,
          status: "borrador",
          id: options.localDocumentId ?? newId(),
          number: identity.fullNumber,
          centralInvoiceAuthority,
          createdAt: now,
          updatedAt: now,
        };
        const created = saveEditableDocument(
          createdDraft,
          { ...createdDraft, status: doc.status },
          prev.profile,
          now,
        );
        const nextDocuments = [...prev.documents, created];
        return {
          data: {
            ...prev,
            profile: {
              ...prev.profile,
              numbering: bumpNumberingAfterAssign(
                prev.profile.numbering,
                identity.kind,
                identity.fiscalYear,
                identity.sequence,
              ),
            },
            documents: nextDocuments,
            counters: countersFromDocuments(
              nextDocuments,
              identity.fiscalYear,
              prev.profile.numbering,
            ),
          },
          value: created,
        };
      });
      if (result.status !== "applied") {
        throw new Error(
          "La identidad fiscal central se emitio, pero el guardado local no pudo confirmarse.",
        );
      }
      return result.value;
    },
    [commitDurableAppData],
  );

  const updateDocument = useCallback(
    async (doc: Document): Promise<Document> => {
      let saved: Document | null = null;
      const now = new Date().toISOString();
      setAppData((prev) => {
        const current = findUniqueDocumentById(prev.documents, doc.id);
        if (!current) throw new Error("Documento no encontrado o ID duplicado");

        const canonicalDocument = preserveRectificationOriginalReference(
          current,
          doc,
          prev.documents,
          prev.profile,
        );
        const emissionProfile = profileForRectificationSource(
          canonicalDocument,
          prev.documents,
          prev.profile,
        );
        const shouldIssue =
          deriveDocumentLifecycle(current) === "draft" &&
          canonicalDocument.status !== "borrador";
        const prepared = shouldIssue
          ? assignFinalInvoiceIdentityIfNeeded(
              canonicalDocument,
              prev.documents,
              prev.profile.numbering,
            )
          : { doc: canonicalDocument };
        if (shouldIssue) {
          assertRectificationEmissionAllowed(prepared.doc, prev.documents);
        }
        saved = saveEditableDocument(
          current,
          prepared.doc,
          emissionProfile,
          now,
        );
        const nextDocuments = applyEmittedRectificationToOriginal(
          prev.documents.map((item) => (item.id === doc.id ? saved! : item)),
          saved,
          now,
        );
        return {
          ...prev,
          profile: prepared.assignment
            ? {
                ...prev.profile,
                numbering: bumpNumberingAfterAssign(
                  prev.profile.numbering,
                  prepared.assignment.kind,
                  prepared.assignment.year,
                  prepared.assignment.sequence,
                ),
              }
            : prev.profile,
          documents: nextDocuments,
        };
      });
      if (!saved) throw new Error("Documento no encontrado");
      return saved;
    },
    [setAppData],
  );

  const repairDocumentCustomer = useCallback(
    (documentId: string, customerId: string): Document | null => {
      let repaired: Document | null = null;
      const now = new Date().toISOString();
      setAppData((prev) => {
        const document = findUniqueDocumentById(prev.documents, documentId);
        const customer = prev.customers.find((item) => item.id === customerId);
        if (!document || !customer) return prev;

        repaired = repairDocumentCustomerSnapshot(
          document,
          customer,
          prev.profile,
          now,
        );

        return {
          ...prev,
          documents: prev.documents.map((item) =>
            item.id === documentId ? repaired! : item,
          ),
        };
      });

      return repaired;
    },
    [setAppData],
  );

  const updateDocumentLink = useCallback(
    (update: DocumentLinkUpdate) => {
      setAppData((prev) => ({
        ...prev,
        documents: applyDocumentLinkUpdate(prev.documents, update),
      }));
    },
    [setAppData],
  );

  const issueDocument = useCallback(
    async (id: string): Promise<Document> => {
      let issued: Document | null = null;
      const now = new Date().toISOString();
      setAppData((prev) => {
        const current = findUniqueDocumentById(prev.documents, id);
        if (!current) throw new Error("Documento no encontrado o ID duplicado");

        const canonicalDocument = preserveRectificationOriginalReference(
          current,
          current,
          prev.documents,
          prev.profile,
        );
        const emissionProfile = profileForRectificationSource(
          canonicalDocument,
          prev.documents,
          prev.profile,
        );
        const prepared = assignFinalInvoiceIdentityIfNeeded(
          canonicalDocument,
          prev.documents,
          prev.profile.numbering,
        );
        assertRectificationEmissionAllowed(prepared.doc, prev.documents);
        assertDocumentEmissionValid(prepared.doc, emissionProfile);
        issued = issueDocumentWithIntegrity(prepared.doc, emissionProfile, now);
        const nextDocuments = applyEmittedRectificationToOriginal(
          prev.documents.map((doc) => (doc.id === id ? issued! : doc)),
          issued,
          now,
        );
        return {
          ...prev,
          profile: prepared.assignment
            ? {
                ...prev.profile,
                numbering: bumpNumberingAfterAssign(
                  prev.profile.numbering,
                  prepared.assignment.kind,
                  prepared.assignment.year,
                  prepared.assignment.sequence,
                ),
              }
            : prev.profile,
          documents: nextDocuments,
        };
      });
      if (!issued) throw new Error("Documento no encontrado");
      return issued;
    },
    [setAppData],
  );

  const markDocumentSent = useCallback(
    (id: string): Document | null => {
      let sent: Document | null = null;
      setAppData((prev) => {
        const current = findUniqueDocumentById(prev.documents, id);
        if (!current) return prev;

        const now = new Date().toISOString();
        sent =
          current.type === "presupuesto"
            ? editableQuoteWithLocalStatus(
                {
                  ...current,
                  status: "enviado",
                  deliveryStatus: "sent",
                  sentAt: current.sentAt ?? now,
                },
                now,
              )
            : markDocumentSentWithIntegrity(current);

        return {
          ...prev,
          documents: prev.documents.map((doc) => (doc.id === id ? sent! : doc)),
        };
      });

      return sent;
    },
    [setAppData],
  );

  const markAsCollected = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = findUniqueDocumentById(prev.documents, id);
        if (!doc || !canMarkAsCollected(doc) || isCollectedDocument(doc)) {
          return prev;
        }

        const now = new Date().toISOString();
        const historical = withHistoricalCollectionStatus(
          doc,
          "collected",
          now,
        );
        const paid =
          historical === doc
            ? markDocumentPaidWithIntegrity(doc, now)
            : historical;

        return {
          ...prev,
          documents: prev.documents.map((d) => (d.id === id ? paid : d)),
        };
      });
    },
    [setAppData],
  );

  const generateReceiptForInvoice = useCallback(
    (invoiceId: string): GenerateReceiptForInvoiceResult => {
      const expected = dataRef.current;
      return runReceiptGenerationCommand({
        expected,
        invoiceId,
        now: new Date().toISOString(),
        createId: newId,
        commit: (baseline, build) => commitDurableAppData(baseline, build),
      });
    },
    [commitDurableAppData],
  );

  const unmarkAsCollected = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = findUniqueDocumentById(prev.documents, id);
        if (!doc || !canUnmarkAsCollected(doc)) return prev;

        const now = new Date().toISOString();
        const historical = withHistoricalCollectionStatus(doc, "pending", now);
        if (historical !== doc) {
          return {
            ...prev,
            documents: prev.documents.map((d) =>
              d.id === id ? historical : d,
            ),
          };
        }
        const newStatus = statusAfterUnmarkingCollection(doc);
        const numbering = prev.profile.numbering;

        if (doc.type === "factura") {
          const result = unmarkInvoiceCollection(
            prev.documents,
            doc.id,
            newStatus,
            now,
            numbering,
          );

          if (result.removedReceiptId) {
            return {
              ...prev,
              profile: {
                ...prev.profile,
                numbering: syncNumberingToDocuments(
                  numbering,
                  result.documents,
                ),
              },
              documents: result.documents,
              counters: countersFromDocuments(
                result.documents,
                result.renumberYear,
                numbering,
              ),
            };
          }

          return { ...prev, documents: result.documents };
        }

        return {
          ...prev,
          documents: prev.documents.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: newStatus,
                  paymentStatus:
                    newStatus === "vencido" ? "overdue" : "pending",
                  paidAt: undefined,
                  updatedAt: now,
                }
              : d,
          ),
        };
      });
    },
    [setAppData],
  );

  const markQuoteAsAccepted = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = findUniqueDocumentById(prev.documents, id);
        if (!doc || !canMarkQuoteAsAccepted(doc) || isAcceptedQuote(doc)) {
          return prev;
        }

        const now = new Date().toISOString();
        const accepted = editableQuoteWithLocalStatus(
          {
            ...doc,
            status: "aceptado",
            acceptanceStatus: "accepted",
            acceptedAt: doc.acceptedAt ?? now,
          },
          now,
        );
        return {
          ...prev,
          documents: prev.documents.map((d) => (d.id === id ? accepted : d)),
        };
      });
    },
    [setAppData],
  );

  const unmarkQuoteAsAccepted = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = findUniqueDocumentById(prev.documents, id);
        if (!doc || !canUnmarkQuoteAsAccepted(doc)) return prev;

        const now = new Date().toISOString();
        const next = editableQuoteWithLocalStatus(
          {
            ...doc,
            status: statusAfterUnmarkingQuoteAcceptance(),
            acceptanceStatus: "pending",
            acceptedAt: undefined,
          },
          now,
        );
        return {
          ...prev,
          documents: prev.documents.map((d) => (d.id === id ? next : d)),
        };
      });
    },
    [setAppData],
  );

  const markQuoteAsRejected = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = findUniqueDocumentById(prev.documents, id);
        if (!doc || !canMarkQuoteAsRejected(doc) || isRejectedQuote(doc)) {
          return prev;
        }

        const now = new Date().toISOString();
        const rejected = editableQuoteWithLocalStatus(
          {
            ...doc,
            status: "rechazado",
            acceptanceStatus: "rejected",
            acceptedAt: undefined,
          },
          now,
        );
        return {
          ...prev,
          documents: prev.documents.map((d) => (d.id === id ? rejected : d)),
        };
      });
    },
    [setAppData],
  );

  const unmarkQuoteAsRejected = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = findUniqueDocumentById(prev.documents, id);
        if (!doc || !canUnmarkQuoteAsRejected(doc)) return prev;

        const now = new Date().toISOString();
        const next = editableQuoteWithLocalStatus(
          {
            ...doc,
            status: statusAfterUnmarkingQuoteRejection(),
            acceptanceStatus: "pending",
          },
          now,
        );
        return {
          ...prev,
          documents: prev.documents.map((d) => (d.id === id ? next : d)),
        };
      });
    },
    [setAppData],
  );

  const convertQuoteToInvoice = useCallback(
    (id: string): Document | null => {
      let result: Document | null = null;

      setAppData((prev) => {
        const existing = findInvoiceCreatedFromQuote(prev.documents, id);
        if (existing) {
          result = existing;
          return prev;
        }

        const quote = findUniqueDocumentById(prev.documents, id);
        if (!quote || !canConvertQuoteToInvoice(quote)) return prev;

        let canonicalQuote: Document;
        try {
          canonicalQuote = buildCanonicalDocumentForProtectedEffect(
            quote,
            prev.profile,
          );
        } catch {
          return prev;
        }
        if (canonicalQuote.type !== "presupuesto") return prev;

        const draft = buildInvoiceDraftFromQuote(canonicalQuote);
        const year = new Date(draft.date).getFullYear();
        const numbering = prev.profile.numbering;
        const now = new Date().toISOString();
        const created: Document = {
          ...draft,
          id: newId(),
          number: DRAFT_INVOICE_NUMBER,
          createdAt: now,
          updatedAt: now,
        };
        const nextDocuments = [...prev.documents, created];
        result = created;

        return {
          ...prev,
          documents: nextDocuments,
          counters: countersFromDocuments(nextDocuments, year, numbering),
        };
      });

      return result;
    },
    [setAppData],
  );

  const addRectificativa = useCallback(
    async (
      originalId: string,
      doc: Omit<
        Document,
        "id" | "number" | "type" | "createdAt" | "updatedAt" | "rectification"
      > & { rectification: RectificationInfo },
    ): Promise<Document | null> => {
      const id = newId();
      const now = new Date().toISOString();
      let created: Document | null = null;
      setAppData((prev) => {
        let resolvedSource: ReturnType<
          typeof resolveCanonicalRectificationSource
        >;
        try {
          const storedOriginal = requireUniqueRectificationOriginal(
            prev.documents,
            originalId,
          );
          resolvedSource = resolveCanonicalRectificationSource(
            storedOriginal,
            prev.profile,
          );
        } catch {
          return prev;
        }
        const { original, profile: rectificationProfile } = resolvedSource;
        if (!canRectifyInvoice(original)) return prev;
        const existingDraft = hasPendingRectificationDraft(
          prev.documents,
          original.id,
        );
        if (existingDraft) return prev;

        const year = new Date(doc.date).getFullYear();
        const numbering = prev.profile.numbering;
        const requestedStatus = doc.status;
        const isDraft = requestedStatus === "borrador";
        const assigned = isDraft
          ? { number: DRAFT_INVOICE_NUMBER, sequence: null }
          : {
              ...assignNextDocumentNumber(
                prev.documents,
                "factura_rectificativa",
                year,
                configuredLastForKind(numbering, "factura_rectificativa", year),
                numbering,
              ),
            };
        const rectification: RectificationInfo =
          canonicalRectificationReference(original, doc.rectification);
        const source: Document = {
          ...doc,
          type: "factura",
          id,
          number: assigned.number,
          items: canonicalRectificationItems(
            original,
            doc.items,
            rectification.type,
          ),
          rectification,
          createdAt: now,
          updatedAt: now,
        };
        assertRectificationEmissionAllowed(source, prev.documents);
        if (!isDraft) {
          assertDocumentEmissionValid(source, rectificationProfile);
        }
        const rectificativa = materializeRectificationDocument(
          source,
          rectificationProfile,
          now,
        );

        const nextDocuments = applyEmittedRectificationToOriginal(
          [...prev.documents, rectificativa],
          rectificativa,
          now,
        );
        created = rectificativa;

        return {
          ...prev,
          profile:
            assigned.sequence === null
              ? prev.profile
              : {
                  ...prev.profile,
                  numbering: bumpNumberingAfterAssign(
                    prev.profile.numbering,
                    "factura_rectificativa",
                    year,
                    assigned.sequence,
                  ),
                },
          documents: nextDocuments,
          counters: countersFromDocuments(nextDocuments, year, numbering),
        };
      });
      return created;
    },
    [setAppData],
  );

  const deleteDocument = useCallback(
    (id: string): boolean => {
      let deleted = false;
      setAppData((prev) => {
        const target = findUniqueDocumentById(prev.documents, id);
        if (!target || !getDeletePolicy(target).allowed) return prev;

        deleted = true;
        const numbering = prev.profile.numbering;
        const year = getDocumentYear(target, numbering);
        const kind = target.rectification
          ? "factura_rectificativa"
          : target.type === "factura"
            ? "factura"
            : target.type === "presupuesto"
              ? "presupuesto"
              : "recibo";
        const remaining = prev.documents.filter((d) => d.id !== id);
        const renumbered = renumberDocumentsForKindYear(
          remaining,
          kind,
          year,
          numbering,
        );

        return {
          ...prev,
          profile: {
            ...prev.profile,
            numbering: syncNumberingToDocuments(numbering, renumbered),
          },
          documents: renumbered,
          counters: countersFromDocuments(renumbered, year, numbering),
        };
      });
      return deleted;
    },
    [setAppData],
  );

  const addExpense = useCallback(
    (expense: Omit<Expense, "id" | "createdAt">) => {
      setAppData((prev) => ({
        ...prev,
        expenses: [
          ...prev.expenses,
          { ...expense, id: newId(), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [setAppData],
  );

  const addExpenseDurably = useCallback(
    (
      expense: Omit<Expense, "id" | "createdAt">,
      identity: { id: string; now: string },
      expected: AppData,
    ): AppDataDurabilityResult<Expense> =>
      commitDurableAppData(expected, (previous) => {
        if (previous.expenses.some((entry) => entry.id === identity.id)) {
          throw new Error("EXPENSE_IDENTIFIER_COLLISION");
        }
        const created: Expense = {
          ...expense,
          id: identity.id,
          createdAt: identity.now,
        };
        return {
          data: { ...previous, expenses: [...previous.expenses, created] },
          value: created,
        };
      }),
    [commitDurableAppData],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const excludedAt = new Date().toISOString();
      setAppData((prev) => deleteExpenseFromData(prev, id, excludedAt));
    },
    [setAppData],
  );

  const deleteExpenseDurably = useCallback(
    (
      id: string,
      identity: { excludedAt: string },
      expected: AppData,
    ): AppDataDurabilityResult<string> =>
      commitDurableAppData(expected, (previous) => {
        if (!previous.expenses.some((entry) => entry.id === id)) {
          throw new Error("EXPENSE_NOT_FOUND");
        }
        return {
          data: deleteExpenseFromData(previous, id, identity.excludedAt),
          value: id,
        };
      }),
    [commitDurableAppData],
  );

  const updateExpense = useCallback(
    (expense: Expense) => {
      setAppData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((entry) =>
          entry.id === expense.id ? expense : entry,
        ),
      }));
    },
    [setAppData],
  );

  const updateExpenseDurably = useCallback(
    (
      expense: Expense,
      expected: AppData,
    ): AppDataDurabilityResult<Expense> =>
      commitDurableAppData(expected, (previous) => {
        const matches = previous.expenses.filter(
          (entry) => entry.id === expense.id,
        );
        if (matches.length === 0) throw new Error("EXPENSE_NOT_FOUND");
        if (matches.length !== 1) {
          throw new Error("EXPENSE_IDENTIFIER_COLLISION");
        }
        return {
          data: {
            ...previous,
            expenses: previous.expenses.map((entry) =>
              entry.id === expense.id ? expense : entry,
            ),
          },
          value: expense,
        };
      }),
    [commitDurableAppData],
  );

  const saveScannedExpenseDurably = useCallback(
    (
      expense: Omit<Expense, "id" | "createdAt"> | Expense,
      options: {
        expected: AppData;
        operationId: string;
        now?: string;
        supplier?: Omit<Supplier, "id" | "createdAt">;
      },
    ): AppDataDurabilityResult<ScannedExpenseDurableValue> =>
      commitLatestDurableAppData(options.expected, (previous) =>
        buildScannedExpenseDurableTransition({
          data: previous,
          expense,
          operationId: options.operationId,
          now: options.now ?? new Date().toISOString(),
          supplier: options.supplier,
        }),
      ),
    [commitLatestDurableAppData],
  );

  const saveFixedExpenseWithRecurringTemplate = useCallback(
    (
      expense: Omit<Expense, "id" | "createdAt"> | Expense,
      item: RecurringExpenseDraft,
      options: {
        expected: AppData;
        operationId: string;
        now?: string;
        referenceDate?: string;
        supplier?: Omit<Supplier, "id" | "createdAt">;
      },
    ): AppDataDurabilityResult<FixedExpenseBundleValue> => {
      const now = options.now ?? new Date().toISOString();
      const ids = fixedExpenseBundleIds(options.operationId);
      const command = {
        expense,
        recurringExpense: item,
        supplier: options.supplier,
        ids,
      };
      const current = dataRef.current;
      let inspected: ReturnType<typeof prepareFixedExpenseBundle>;
      try {
        inspected = prepareFixedExpenseBundle(current, command, {
          now,
          referenceDate: options.referenceDate,
        });
      } catch {
        return { status: "blocked", reason: "transition_failed" };
      }

      if (inspected.status === "blocked") return inspected;

      return commitLatestDurableAppData(options.expected, (previous) => {
        const prepared = prepareFixedExpenseBundle(previous, command, {
          now,
          referenceDate: options.referenceDate,
        });
        if (prepared.status === "blocked") {
          throw new Error(`FIXED_EXPENSE_${prepared.reason}`);
        }
        return prepared.status === "already_applied"
          ? { data: previous, value: prepared.value }
          : prepared.transition;
      });
    },
    [commitLatestDurableAppData],
  );

  const addProduct = useCallback(
    (product: Omit<Product, "id" | "createdAt" | "updatedAt">): Product => {
      const now = new Date().toISOString();
      const created = createProductWithIdentity(product, {
        id: newId(),
        now,
      });
      setAppData((prev) => ({
        ...prev,
        products: [...prev.products, created],
      }));
      return created;
    },
    [setAppData],
  );

  const addProductDurably = useCallback(
    (
      product: Omit<Product, "id" | "createdAt" | "updatedAt">,
      identity: { id: string; now: string },
      expected: AppData,
    ): AppDataDurabilityResult<Product> =>
      commitDurableAppData(expected, (previous) => {
        const created = createProductWithIdentity(product, identity);
        return {
          data: { ...previous, products: [...previous.products, created] },
          value: created,
        };
      }),
    [commitDurableAppData],
  );

  const updateProduct = useCallback(
    (product: Product) => {
      const updated = normalizeProductCatalogItem({
        ...product,
        updatedAt: new Date().toISOString(),
      });
      setAppData((prev) => ({
        ...prev,
        products: prev.products.map((entry) =>
          entry.id === product.id ? updated : entry,
        ),
      }));
    },
    [setAppData],
  );

  const updateProductDurably = useCallback(
    (
      product: Product,
      identity: { now: string },
      expected: AppData,
    ): AppDataDurabilityResult<Product> =>
      commitDurableAppData(expected, (previous) => {
        if (!previous.products.some((entry) => entry.id === product.id)) {
          throw new Error("PRODUCT_NOT_FOUND");
        }
        const updated = normalizeProductCatalogItem({
          ...product,
          updatedAt: identity.now,
        });
        return {
          data: {
            ...previous,
            products: previous.products.map((entry) =>
              entry.id === product.id ? updated : entry,
            ),
          },
          value: updated,
        };
      }),
    [commitDurableAppData],
  );

  const renameProductFamily = useCallback(
    (sourceFamily: string, targetFamily: string): ProductFamilyRenameResult => {
      const result = renameProductFamilyInAppData(
        dataRef.current,
        sourceFamily,
        targetFamily,
      );
      if (result.ok) setAppData(result.data);
      return result;
    },
    [setAppData],
  );

  const applyProductCatalogStructure = useCallback(
    (
      operation: ProductCatalogStructureOperation,
    ): ProductCatalogStructureResult => {
      const result = applyProductCatalogStructureOperation(
        dataRef.current,
        operation,
      );
      if (result.ok) setAppData(result.data);
      return result;
    },
    [setAppData],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setAppData((prev) => ({
        ...prev,
        products: prev.products.filter((product) => product.id !== id),
      }));
    },
    [setAppData],
  );

  const deleteProductDurably = useCallback(
    (id: string, expected: AppData): AppDataDurabilityResult<string> =>
      commitDurableAppData(expected, (previous) => {
        if (!previous.products.some((product) => product.id === id)) {
          throw new Error("PRODUCT_NOT_FOUND");
        }
        return {
          data: {
            ...previous,
            products: previous.products.filter((product) => product.id !== id),
          },
          value: id,
        };
      }),
    [commitDurableAppData],
  );

  const mergeProducts = useCallback(
    (keepId: string, removeIds: string[]) => {
      setAppData((prev) => {
        const result = mergeProductRecordsInAppData(prev, keepId, removeIds);
        return result.ok ? result.data : prev;
      });
    },
    [setAppData],
  );

  const addRecurringExpense = useCallback(
    (
      item: RecurringExpenseDraft,
      expected: AppData,
    ): AppDataDurabilityResult<RecurringExpense> => {
      const now = new Date().toISOString();
      const created: RecurringExpense = {
        ...item,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      if (expected.recurringExpenses.some((entry) => entry.id === created.id)) {
        return { status: "blocked", reason: "identifier_collision" };
      }
      return commitDurableAppData(expected, (previous) => ({
        data: syncRecurringExpenses({
          ...previous,
          recurringExpenses: [...previous.recurringExpenses, created],
        }),
        value: created,
      }));
    },
    [commitDurableAppData],
  );

  const setRecurringExpenseEnabled = useCallback(
    (
      id: string,
      enabled: boolean,
      expected: AppData,
    ): AppDataDurabilityResult<RecurringExpense> => {
      const now = new Date().toISOString();
      const matches = expected.recurringExpenses.filter(
        (entry) => entry.id === id,
      );
      if (matches.length === 0) {
        return { status: "blocked", reason: "not_found" };
      }
      if (matches.length !== 1) {
        return { status: "blocked", reason: "identifier_collision" };
      }
      const existing = matches[0];
      const updated = { ...existing, enabled, updatedAt: now };
      return commitDurableAppData(expected, (previous) => ({
        data: syncRecurringExpenses({
          ...previous,
          recurringExpenses: previous.recurringExpenses.map((entry) =>
            entry.id === id ? updated : entry,
          ),
        }),
        value: updated,
      }));
    },
    [commitDurableAppData],
  );

  const applyRecurringExpenseChange = useCallback(
    (
      id: string,
      item: RecurringExpenseDraft,
      effectiveDate: string,
      approval: {
        precondition: string;
        referenceDate: string;
        expected: AppData;
      },
    ): DurableRecurringExpenseChangeResult => {
      const now = new Date().toISOString();
      if (dataRef.current !== approval.expected) {
        return { status: "blocked", reason: "stale_preview" };
      }
      const domainResult = applyRecurringExpenseChangeToData(
        approval.expected,
        id,
        item,
        effectiveDate,
        {
          now,
          newId,
          referenceDate: approval.referenceDate,
          expectedPrecondition: approval.precondition,
        },
      );
      if (domainResult.status === "blocked") {
        return { status: "blocked", reason: domainResult.reason };
      }
      return commitDurableAppData(approval.expected, () => ({
        data: domainResult.data,
        value: domainResult,
      }));
    },
    [commitDurableAppData],
  );

  const deleteRecurringExpense = useCallback(
    (id: string, expected: AppData): AppDataDurabilityResult<string> => {
      const matches = expected.recurringExpenses.filter(
        (entry) => entry.id === id,
      );
      if (matches.length === 0) {
        return { status: "blocked", reason: "not_found" };
      }
      if (matches.length !== 1) {
        return { status: "blocked", reason: "identifier_collision" };
      }
      return commitDurableAppData(expected, (previous) => ({
        data: deleteRecurringExpenseFromData(previous, id),
        value: id,
      }));
    },
    [commitDurableAppData],
  );

  const addUserReminder = useCallback(
    (item: UserReminderDraft): UserReminder => {
      const now = new Date().toISOString();
      const created = createUserReminderWithIdentity(item, {
        id: newId(),
        now,
      });
      setAppData((prev) => ({
        ...prev,
        userReminders: [...prev.userReminders, created],
      }));
      markFactuFeatureUsed("user_reminders");
      return created;
    },
    [setAppData],
  );

  const addUserReminderDurably = useCallback(
    (
      item: UserReminderDraft,
      identity: { id: string; now: string },
      expected: AppData,
    ): AppDataDurabilityResult<UserReminder> =>
      commitDurableAppData(expected, (previous) => {
        if (
          previous.userReminders.some((reminder) => reminder.id === identity.id)
        ) {
          throw new Error("USER_REMINDER_IDENTIFIER_COLLISION");
        }
        const created = createUserReminderWithIdentity(item, identity);
        return {
          data: {
            ...previous,
            userReminders: [...previous.userReminders, created],
          },
          value: created,
        };
      }),
    [commitDurableAppData],
  );

  const updateUserReminder = useCallback(
    (item: UserReminder) => {
      setAppData((prev) => {
        const result = updateUserReminderInCollection(
          prev.userReminders,
          item,
          new Date().toISOString(),
        );
        return result.ok ? { ...prev, userReminders: result.reminders } : prev;
      });
    },
    [setAppData],
  );

  const updateUserReminderDurably = useCallback(
    (
      item: UserReminder,
      identity: { now: string },
      expected: AppData,
    ): AppDataDurabilityResult<UserReminder> =>
      commitDurableAppData(expected, (previous) => {
        const result = updateUserReminderInCollection(
          previous.userReminders,
          item,
          identity.now,
        );
        if (!result.ok) {
          throw new Error(`USER_REMINDER_${result.reason.toUpperCase()}`);
        }
        return {
          data: { ...previous, userReminders: result.reminders },
          value: result.reminder,
        };
      }),
    [commitDurableAppData],
  );

  const completeUserReminder = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setAppData((prev) => ({
        ...prev,
        userReminders: prev.userReminders.map((entry) =>
          entry.id === id
            ? { ...entry, completed: true, completedAt: now, updatedAt: now }
            : entry,
        ),
      }));
    },
    [setAppData],
  );

  const reopenUserReminder = useCallback(
    (id: string) => {
      setAppData((prev) => ({
        ...prev,
        userReminders: prev.userReminders.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                completed: false,
                completedAt: undefined,
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      }));
    },
    [setAppData],
  );

  const deleteUserReminder = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const result = deleteUserReminderFromCollection(prev.userReminders, id);
        return result.ok ? { ...prev, userReminders: result.reminders } : prev;
      });
    },
    [setAppData],
  );

  const deleteUserReminderDurably = useCallback(
    (id: string, expected: AppData): AppDataDurabilityResult<string> =>
      commitDurableAppData(expected, (previous) => {
        const result = deleteUserReminderFromCollection(
          previous.userReminders,
          id,
        );
        if (!result.ok) {
          throw new Error(`USER_REMINDER_${result.reason.toUpperCase()}`);
        }
        return {
          data: { ...previous, userReminders: result.reminders },
          value: id,
        };
      }),
    [commitDurableAppData],
  );

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, "id" | "createdAt">): Supplier => {
      const created: Supplier = {
        ...supplier,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setAppData((prev) => ({
        ...prev,
        suppliers: [...prev.suppliers, created],
      }));
      return created;
    },
    [setAppData],
  );

  const addSupplierDurably = useCallback(
    (
      supplier: Omit<Supplier, "id" | "createdAt">,
      identity: { id: string; now: string },
      expected: AppData,
    ): AppDataDurabilityResult<Supplier> =>
      commitDurableAppData(expected, (previous) => {
        if (previous.suppliers.some((entry) => entry.id === identity.id)) {
          throw new Error("SUPPLIER_IDENTIFIER_COLLISION");
        }
        const created: Supplier = {
          ...supplier,
          id: identity.id,
          createdAt: identity.now,
        };
        return {
          data: { ...previous, suppliers: [...previous.suppliers, created] },
          value: created,
        };
      }),
    [commitDurableAppData],
  );

  const ensureExpenseSupplier = useCallback(
    (input: SupplierForExpenseInput): StoredSupplierForExpenseResolution => {
      let resolution: StoredSupplierForExpenseResolution | undefined;

      setAppData((prev) => {
        const result = upsertSupplierForExpense(prev.suppliers, input, {
          createId: newId,
          now: () => new Date().toISOString(),
        });
        const { suppliers, ...storedResolution } = result;
        resolution = storedResolution;

        return suppliers === prev.suppliers
          ? prev
          : {
              ...prev,
              suppliers,
            };
      });

      if (!resolution) {
        throw new Error("No se pudo resolver el proveedor del gasto");
      }
      return resolution;
    },
    [setAppData],
  );

  const deleteSupplier = useCallback(
    (id: string) => {
      setAppData((prev) => deleteSupplierMasterFromData(prev, id));
    },
    [setAppData],
  );

  const deleteSupplierDurably = useCallback(
    (id: string, expected: AppData): AppDataDurabilityResult<string> =>
      commitDurableAppData(expected, (previous) => {
        if (!previous.suppliers.some((supplier) => supplier.id === id)) {
          throw new Error("SUPPLIER_NOT_FOUND");
        }
        return {
          data: deleteSupplierMasterFromData(previous, id),
          value: id,
        };
      }),
    [commitDurableAppData],
  );

  const updateSupplier = useCallback(
    (supplier: Supplier) => {
      setAppData((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((entry) =>
          entry.id === supplier.id ? supplier : entry,
        ),
        expenses: prev.expenses.map((expense) =>
          expense.supplierId === supplier.id
            ? { ...expense, supplierName: supplier.name }
            : expense,
        ),
      }));
    },
    [setAppData],
  );

  const updateSupplierDurably = useCallback(
    (
      supplier: Supplier,
      expected: AppData,
    ): AppDataDurabilityResult<Supplier> =>
      commitDurableAppData(expected, (previous) => {
        if (!previous.suppliers.some((entry) => entry.id === supplier.id)) {
          throw new Error("SUPPLIER_NOT_FOUND");
        }
        return {
          data: {
            ...previous,
            suppliers: previous.suppliers.map((entry) =>
              entry.id === supplier.id ? supplier : entry,
            ),
            expenses: previous.expenses.map((expense) =>
              expense.supplierId === supplier.id
                ? { ...expense, supplierName: supplier.name }
                : expense,
            ),
          },
          value: supplier,
        };
      }),
    [commitDurableAppData],
  );

  const mergeSuppliers = useCallback(
    (keepId: string, removeIds: string[]) => {
      const uniqueRemoveIds = [...new Set(removeIds)].filter(
        (id) => id !== keepId,
      );
      if (uniqueRemoveIds.length === 0) return;

      setAppData((prev) => {
        const keep = prev.suppliers.find((supplier) => supplier.id === keepId);
        if (!keep) return prev;

        const removed = prev.suppliers.filter((supplier) =>
          uniqueRemoveIds.includes(supplier.id),
        );
        const removedNames = removed.map((supplier) => supplier.name);
        const enrichedKeep: Supplier = {
          ...keep,
          nif: keep.nif ?? removed.find((supplier) => supplier.nif)?.nif,
          email:
            keep.email ?? removed.find((supplier) => supplier.email)?.email,
          phone:
            keep.phone ?? removed.find((supplier) => supplier.phone)?.phone,
          website:
            keep.website ??
            removed.find((supplier) => supplier.website)?.website,
          streetType:
            keep.streetType ??
            removed.find((supplier) => supplier.streetType)?.streetType,
          address:
            keep.address ??
            removed.find((supplier) => supplier.address)?.address,
          city: keep.city ?? removed.find((supplier) => supplier.city)?.city,
          postalCode:
            keep.postalCode ??
            removed.find((supplier) => supplier.postalCode)?.postalCode,
          notes:
            keep.notes ?? removed.find((supplier) => supplier.notes)?.notes,
          category:
            keep.category ??
            removed.find((supplier) => supplier.category)?.category,
        };

        return {
          ...prev,
          suppliers: prev.suppliers
            .filter((supplier) => !uniqueRemoveIds.includes(supplier.id))
            .map((supplier) =>
              supplier.id === keepId ? enrichedKeep : supplier,
            ),
          expenses: prev.expenses.map((expense) => {
            if (
              expense.supplierId &&
              uniqueRemoveIds.includes(expense.supplierId)
            ) {
              return {
                ...expense,
                supplierId: keepId,
                supplierName: enrichedKeep.name,
              };
            }

            if (
              removedNames.some(
                (name) =>
                  supplierSimilarityScore(expense.supplierName, name) >=
                  SUPPLIER_AUTO_LINK_SCORE,
              )
            ) {
              return {
                ...expense,
                supplierId: keepId,
                supplierName: enrichedKeep.name,
              };
            }

            return expense;
          }),
        };
      });
    },
    [setAppData],
  );

  const addCustomer = useCallback(
    (
      customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
    ): { ok: true; customer: Customer } | { ok: false; error: string } => {
      const now = new Date().toISOString();
      const id = newId();
      let result:
        { ok: true; customer: Customer } | { ok: false; error: string } = {
        ok: false,
        error: "No se pudo guardar el cliente",
      };
      setAppData((prev) => {
        const write = createCustomerInCollection(
          prev.customers,
          customer,
          id,
          now,
        );
        if (!write.ok) {
          result = write;
          return prev;
        }
        result = { ok: true, customer: write.customer };
        return { ...prev, customers: write.customers };
      });
      return result;
    },
    [setAppData],
  );

  const addCustomerDurably = useCallback(
    (
      customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
      identity: { id: string; now: string },
      expected: AppData,
    ): AppDataDurabilityResult<Customer> =>
      commitDurableAppData(expected, (previous) => {
        const write = createCustomerInCollection(
          previous.customers,
          customer,
          identity.id,
          identity.now,
        );
        if (!write.ok) throw new Error(write.error);
        return {
          data: { ...previous, customers: write.customers },
          value: write.customer,
        };
      }),
    [commitDurableAppData],
  );

  const updateCustomer = useCallback(
    (
      customer: Customer,
    ): { ok: true; customer: Customer } | { ok: false; error: string } => {
      const now = new Date().toISOString();
      let result:
        { ok: true; customer: Customer } | { ok: false; error: string } = {
        ok: false,
        error: "No se pudo guardar el cliente",
      };
      setAppData((prev) => {
        const write = updateCustomerInCollection(prev.customers, customer, now);
        if (!write.ok) {
          result = write;
          return prev;
        }
        result = { ok: true, customer: write.customer };
        return { ...prev, customers: write.customers };
      });
      return result;
    },
    [setAppData],
  );

  const updateCustomerDurably = useCallback(
    (
      customer: Customer,
      identity: { now: string },
      expected: AppData,
    ): AppDataDurabilityResult<Customer> =>
      commitDurableAppData(expected, (previous) => {
        const write = updateCustomerInCollection(
          previous.customers,
          customer,
          identity.now,
        );
        if (!write.ok) throw new Error(write.error);
        return {
          data: { ...previous, customers: write.customers },
          value: write.customer,
        };
      }),
    [commitDurableAppData],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      setAppData((prev) => deleteCustomerMasterFromData(prev, id));
    },
    [setAppData],
  );

  const deleteCustomerDurably = useCallback(
    (id: string, expected: AppData): AppDataDurabilityResult<string> =>
      commitDurableAppData(expected, (previous) => {
        if (!previous.customers.some((customer) => customer.id === id)) {
          throw new Error("CUSTOMER_NOT_FOUND");
        }
        return {
          data: deleteCustomerMasterFromData(previous, id),
          value: id,
        };
      }),
    [commitDurableAppData],
  );

  const mergeCustomers = useCallback(
    (keepId: string, removeIds: string[], options?: MergeCustomersOptions) => {
      const uniqueRemoveIds = [...new Set(removeIds)].filter(
        (id) => id !== keepId,
      );
      if (uniqueRemoveIds.length === 0) return;

      setAppData((prev) => {
        const merge = mergeCustomerRecords(
          prev.customers,
          keepId,
          uniqueRemoveIds,
        );
        if (!merge) return prev;

        return {
          ...prev,
          customers: merge.customers,
          documents: prev.documents.map((document) =>
            applyCustomerMergeToDocument(
              document,
              merge.keep,
              merge.removed,
              options,
            ),
          ),
        };
      });
    },
    [setAppData],
  );

  const upsertCustomerForDocument = useCallback(
    (
      input: ClientInput,
      selectedCustomerId: string | null,
    ):
      | { ok: true; customerId: string; client: Client }
      | { ok: false; error: string } => {
      const id = newId();
      const now = new Date().toISOString();
      let result:
        | { ok: true; customerId: string; client: Client }
        | { ok: false; error: string } = {
        ok: false,
        error: "No se pudo guardar el cliente",
      };
      setAppData((prev) => {
        const write = upsertCustomerForDocumentInCollection(
          prev.customers,
          input,
          selectedCustomerId,
          id,
          now,
        );
        if (!write.ok) {
          result = write;
          return prev;
        }
        result = {
          ok: true,
          customerId: write.customerId,
          client: write.client,
        };
        return { ...prev, customers: write.customers };
      });
      return result;
    },
    [setAppData],
  );

  const getDocumentsByType = useCallback(
    (type: DocumentType) => {
      if (type === "factura") {
        return getFacturasIncludingRectificativas(data.documents);
      }
      return data.documents.filter((d) => d.type === type);
    },
    [data.documents],
  );

  const registerVerifactuForDocument = useCallback(
    async (
      doc: Document,
      chainOverride?: AppData["verifactuChain"],
      profileOverride?: BusinessProfile,
    ): Promise<Document> => {
      // El perfil ya se aplicó al documento canónico antes de esta frontera.
      // Conservamos el argumento para que una rectificativa nunca pierda su
      // contexto histórico cuando exista una atestación real verificable.
      void profileOverride;
      if (!hasAuthenticatedVerifactuAttestation(doc)) {
        throw new Error(
          "El cliente no puede confirmar un registro Veri*Factu sin una atestación autenticada del servidor.",
        );
      }

      const sealed = attachRegisteredVerifactuToSnapshots(doc);
      setAppData((prev) => ({
        ...prev,
        verifactuChain:
          chainOverride === undefined ? prev.verifactuChain : chainOverride,
        documents: prev.documents.map((d) => (d.id === sealed.id ? sealed : d)),
      }));

      return sealed;
    },
    [setAppData],
  );

  const value = useMemo(
    () => ({
      data,
      ready,
      writeBlock,
      setExternalWriteBlock,
      clearExternalWriteBlock,
      replaceData,
      replaceCloudSnapshotDurably,
      adoptPersistedCloudSnapshot,
      getCurrentData,
      replaceDataIfCurrent,
      restoreBackupData,
      applyImportedLegacyDocumentRepair,
      applyAppIssuedDocumentRecovery,
      rollbackAppIssuedDocumentRecovery,
      applyTestDocumentRetirement,
      rollbackTestDocumentRetirement,
      saveFiscalNotificationStructuredReview,
      archiveFiscalNotificationOriginal,
      deleteFiscalNotificationDocument,
      deleteAllFiscalNotificationDocuments,
      repairFiscalNotificationEmptyHistory,
      syncCentralInvoiceAuthorityEvents,
      syncCentralBusinessEvents,
      reconcileCentralBusinessEvents,
      adoptCentralBusinessEventsFromServer,
      resolveCentralBusinessConflictKeepingServer,
      commitPreparedAppDataDurably,
      updateProfile,
      updateProfileDurably,
      addCentralBusinessNumberedDocumentDurably,
      addDocument,
      addDocumentWithCentralIdentity,
      issueDocument,
      markDocumentSent,
      addRectificativa,
      updateDocument,
      repairDocumentCustomer,
      updateDocumentLink,
      markAsCollected,
      unmarkAsCollected,
      generateReceiptForInvoice,
      markQuoteAsAccepted,
      unmarkQuoteAsAccepted,
      markQuoteAsRejected,
      unmarkQuoteAsRejected,
      convertQuoteToInvoice,
      deleteDocument,
      addExpense,
      addExpenseDurably,
      updateExpense,
      updateExpenseDurably,
      deleteExpense,
      deleteExpenseDurably,
      saveScannedExpenseDurably,
      saveFixedExpenseWithRecurringTemplate,
      addProduct,
      addProductDurably,
      updateProductDurably,
      updateProduct,
      renameProductFamily,
      applyProductCatalogStructure,
      deleteProduct,
      deleteProductDurably,
      mergeProducts,
      addRecurringExpense,
      setRecurringExpenseEnabled,
      applyRecurringExpenseChange,
      deleteRecurringExpense,
      addUserReminder,
      addUserReminderDurably,
      updateUserReminder,
      updateUserReminderDurably,
      completeUserReminder,
      reopenUserReminder,
      deleteUserReminder,
      deleteUserReminderDurably,
      addSupplier,
      addSupplierDurably,
      ensureExpenseSupplier,
      updateSupplier,
      updateSupplierDurably,
      deleteSupplier,
      deleteSupplierDurably,
      mergeSuppliers,
      mergeCustomers,
      addCustomer,
      addCustomerDurably,
      updateCustomerDurably,
      updateCustomer,
      deleteCustomer,
      deleteCustomerDurably,
      upsertCustomerForDocument,
      getDocumentsByType,
      registerVerifactuForDocument,
    }),
    [
      data,
      ready,
      writeBlock,
      setExternalWriteBlock,
      clearExternalWriteBlock,
      replaceData,
      replaceCloudSnapshotDurably,
      adoptPersistedCloudSnapshot,
      getCurrentData,
      replaceDataIfCurrent,
      restoreBackupData,
      applyImportedLegacyDocumentRepair,
      applyAppIssuedDocumentRecovery,
      rollbackAppIssuedDocumentRecovery,
      applyTestDocumentRetirement,
      rollbackTestDocumentRetirement,
      saveFiscalNotificationStructuredReview,
      archiveFiscalNotificationOriginal,
      deleteFiscalNotificationDocument,
      deleteAllFiscalNotificationDocuments,
      repairFiscalNotificationEmptyHistory,
      syncCentralInvoiceAuthorityEvents,
      syncCentralBusinessEvents,
      reconcileCentralBusinessEvents,
      adoptCentralBusinessEventsFromServer,
      resolveCentralBusinessConflictKeepingServer,
      commitPreparedAppDataDurably,
      updateProfile,
      updateProfileDurably,
      addCentralBusinessNumberedDocumentDurably,
      addDocument,
      addDocumentWithCentralIdentity,
      issueDocument,
      markDocumentSent,
      addRectificativa,
      updateDocument,
      repairDocumentCustomer,
      updateDocumentLink,
      markAsCollected,
      unmarkAsCollected,
      generateReceiptForInvoice,
      markQuoteAsAccepted,
      unmarkQuoteAsAccepted,
      markQuoteAsRejected,
      unmarkQuoteAsRejected,
      convertQuoteToInvoice,
      deleteDocument,
      addExpense,
      addExpenseDurably,
      updateExpense,
      updateExpenseDurably,
      deleteExpense,
      deleteExpenseDurably,
      saveScannedExpenseDurably,
      saveFixedExpenseWithRecurringTemplate,
      addProduct,
      addProductDurably,
      updateProductDurably,
      updateProduct,
      renameProductFamily,
      applyProductCatalogStructure,
      deleteProduct,
      deleteProductDurably,
      mergeProducts,
      addRecurringExpense,
      setRecurringExpenseEnabled,
      applyRecurringExpenseChange,
      deleteRecurringExpense,
      addUserReminder,
      addUserReminderDurably,
      updateUserReminder,
      updateUserReminderDurably,
      completeUserReminder,
      reopenUserReminder,
      deleteUserReminder,
      deleteUserReminderDurably,
      addSupplier,
      addSupplierDurably,
      ensureExpenseSupplier,
      updateSupplier,
      updateSupplierDurably,
      deleteSupplier,
      deleteSupplierDurably,
      mergeSuppliers,
      mergeCustomers,
      addCustomer,
      addCustomerDurably,
      updateCustomerDurably,
      updateCustomer,
      deleteCustomer,
      deleteCustomerDurably,
      upsertCustomerForDocument,
      getDocumentsByType,
      registerVerifactuForDocument,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx)
    throw new Error("useAppStore debe usarse dentro de AppStoreProvider");
  return ctx;
}
