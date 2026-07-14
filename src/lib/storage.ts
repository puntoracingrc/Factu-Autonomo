import { migrateCustomer } from "./customers";
import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";
import { normalizeQuoteDocument } from "./quotes";
import { normalizeUserReminder } from "./reminder-team";
import { countersFromDocuments } from "./documents";
import { normalizeIvaSettings } from "./iva";
import { normalizeIrpfPercent } from "./taxes";
import { normalizeVatExempt } from "./vat-regime";
import { normalizeNumbering } from "./numbering";
import { normalizeDocumentPhrases } from "./document-phrases";
import { normalizeDocumentPaymentMethods } from "./document-payment-methods";
import { normalizeDocumentUnits } from "./document-units";
import { normalizeDocumentTemplate } from "./document-templates";
import { normalizeGooglePlacesSettings } from "./google-places";
import { normalizeVerifactuSettings } from "./verifactu/eligibility";
import { normalizeQuoteValidityDays } from "./quote-validity";
import { normalizeProductCatalogItem } from "./purchase-products";
import { normalizeProductFamilyMarkupSettings } from "./product-family-markups";
import { normalizeAppPreferences } from "./app-preferences";
import { normalizeBusinessFiscalProfile } from "./fiscal-profile";
import { normalizeSupplierNif, supplierCompareKey } from "./suppliers";
import { normalizeRecurringExpense } from "./recurring-expenses";
import {
  enforceAppliedTestDocumentRetirements,
  normalizeTestDocumentRetirementBatches,
} from "./test-document-retirement-persistence";
import {
  mergePendingChanges,
  snapshotIntegrityMetadataChange,
} from "./cloud/diff";
import {
  buildDocumentPdfSnapshot,
  buildDocumentSnapshotSeal,
  deriveDocumentLifecycle,
  deriveIntegrityLock,
  deriveLegacySnapshotForReadOnly,
  inspectDocumentSnapshotsIntegrity,
  projectCanonicalSnapshotOntoDocument,
  stableStringifySnapshot,
  withDocumentSnapshotIntegritySignal,
} from "./document-integrity";
import { withDocumentRelationshipIntegritySignals } from "./document-integrity/relationships";
import { inspectAppIssuedDocumentRecovery } from "./document-integrity/app-issued-recovery";
import { hasAppIssuedRecoveryProtectionClaim } from "./document-integrity/app-issued-recovery-protection";
import {
  detectLegacyImportSource,
  inspectUsableHistoricalDocumentEvidence,
  projectLegacyImportSnapshotOntoDocument,
} from "./document-integrity/legacy-import-attestation";
import {
  DEMO_WORKSPACE_STORAGE_KEY,
  createDemoWorkspaceData,
  isDemoWorkspaceMode,
} from "./demo-workspace";
import type {
  AppData,
  BusinessProfile,
  Document,
  DocumentType,
  Expense,
  Supplier,
  SyncChange,
  UserReminder,
  WorkspaceIntegrityQuarantineEntry,
} from "./types";
import { DEFAULT_PROFILE, EMPTY_DATA } from "./types";

function migrateProfile(profile?: Partial<BusinessProfile>): BusinessProfile {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    commercialName: profile?.commercialName?.trim() ?? "",
    vatId: profile?.vatId?.trim().toUpperCase() ?? "",
    province: profile?.province?.trim() ?? "",
    country: profile?.country?.trim() ?? DEFAULT_PROFILE.country,
    website: profile?.website?.trim() ?? "",
    iva: normalizeIvaSettings(profile?.iva),
    irpfPercent: normalizeIrpfPercent(profile?.irpfPercent),
    vatExempt: normalizeVatExempt(profile?.vatExempt),
    fiscalProfile: normalizeBusinessFiscalProfile(profile?.fiscalProfile),
    quoteValidityDays: normalizeQuoteValidityDays(profile?.quoteValidityDays),
    numbering: normalizeNumbering(profile?.numbering),
    verifactu: normalizeVerifactuSettings(profile?.verifactu),
    documentPhrases: normalizeDocumentPhrases(profile?.documentPhrases),
    documentPaymentMethods: normalizeDocumentPaymentMethods(
      profile?.documentPaymentMethods,
    ),
    documentUnits: normalizeDocumentUnits(profile?.documentUnits),
    documentTemplate: normalizeDocumentTemplate(profile?.documentTemplate),
    productFamilyMarkups: normalizeProductFamilyMarkupSettings(
      profile?.productFamilyMarkups,
    ),
    googlePlaces: normalizeGooglePlacesSettings(profile?.googlePlaces),
    appPreferences: normalizeAppPreferences(profile?.appPreferences),
  };
}

const STORAGE_KEY = "factura-autonomo-data";
const COMPRESSED_STORAGE_PREFIX = "factu-gzip-v1:";
const STORAGE_COMPRESSION_THRESHOLD = 750_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function serializeStoredData(data: AppData): string {
  const serialized = JSON.stringify(data);
  if (serialized.length < STORAGE_COMPRESSION_THRESHOLD) return serialized;

  const compressed = gzipSync(strToU8(serialized), { level: 6 });
  return `${COMPRESSED_STORAGE_PREFIX}${bytesToBase64(compressed)}`;
}

function parseStoredData(raw: string): unknown {
  if (!raw.startsWith(COMPRESSED_STORAGE_PREFIX)) return JSON.parse(raw);

  const encoded = raw.slice(COMPRESSED_STORAGE_PREFIX.length);
  const serialized = strFromU8(gunzipSync(base64ToBytes(encoded)));
  return JSON.parse(serialized);
}

function currentStorageKey(): string {
  return isDemoWorkspaceMode() ? DEMO_WORKSPACE_STORAGE_KEY : STORAGE_KEY;
}

export interface NormalizeLoadedDataOptions {
  legacyBackfillDocumentIds?: ReadonlySet<string>;
}

function hasAcceptedVerifactuStatus(doc: Document): boolean {
  return (
    doc.verifactu?.status === "registered" ||
    doc.verifactu?.status === "test_registered"
  );
}

/**
 * Los clientes antiguos podían persistir un éxito local/simulado sin indicar
 * su procedencia. Se conserva esa evidencia, pero nunca se eleva a confirmación
 * de servidor ni se usa para fabricar a posteriori el snapshot que falta.
 */
function preclassifyLegacyVerifactuDocument(doc: Document): Document {
  if (!hasAcceptedVerifactuStatus(doc)) return doc;

  const classified: Document = doc.verifactuPersistence
    ? doc
    : { ...doc, verifactuPersistence: "legacy_unverified" };

  if (classified.documentSnapshot) return classified;

  return {
    ...classified,
    snapshotIntegrityRequired: true,
  };
}

function blockDocumentAfterMigrationFailure(doc: Document): Document {
  const signaled = withDocumentSnapshotIntegritySignal({
    ...doc,
    snapshotIntegrityRequired: true,
    documentLifecycle:
      doc.documentLifecycle === "canceled" || doc.status === "anulada"
        ? "canceled"
        : "issued",
    integrityLock: "locked",
  });
  const issues = new Set(signaled.snapshotIntegrity?.issues ?? []);
  issues.add("document_snapshot_invalid");
  return {
    ...signaled,
    snapshotIntegrity: {
      status: "blocked",
      issues: [...issues],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function normalizeRecordCollection<T>(input: {
  rawValue: unknown;
  collection: string;
  quarantine: WorkspaceIntegrityQuarantineEntry[];
  isValid: (value: Record<string, unknown>) => boolean;
  normalize: (value: Record<string, unknown>) => T;
}): T[] {
  if (input.rawValue === undefined) return [];
  if (!Array.isArray(input.rawValue)) {
    input.quarantine.push({
      collection: input.collection,
      reason: "malformed_collection",
      rawValue: input.rawValue,
    });
    return [];
  }

  return input.rawValue.flatMap((value, index) => {
    if (!isRecord(value) || !input.isValid(value)) {
      input.quarantine.push({
        collection: input.collection,
        index,
        reason: "malformed_record",
        rawValue: value,
      });
      return [];
    }
    try {
      return [input.normalize(value)];
    } catch {
      input.quarantine.push({
        collection: input.collection,
        index,
        reason: "malformed_record",
        rawValue: value,
      });
      return [];
    }
  });
}

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isNormalizableDocument(value: unknown): value is Document {
  if (!isRecord(value)) return false;
  const client = value.client;
  const items = value.items;
  return Boolean(
    typeof value.id === "string" &&
    value.id.trim() &&
    (value.type === "factura" ||
      value.type === "presupuesto" ||
      value.type === "recibo") &&
    typeof value.number === "string" &&
    value.number.trim() &&
    isIsoDateString(value.date) &&
    isRecord(client) &&
    typeof client.name === "string" &&
    Array.isArray(items) &&
    items.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.description === "string" &&
        typeof item.quantity === "number" &&
        Number.isFinite(item.quantity) &&
        typeof item.unitPrice === "number" &&
        Number.isFinite(item.unitPrice) &&
        typeof item.ivaPercent === "number" &&
        Number.isFinite(item.ivaPercent),
    ) &&
    typeof value.status === "string" &&
    [
      "borrador",
      "enviado",
      "aceptado",
      "rechazado",
      "pagado",
      "vencido",
      "rectificada",
      "anulada",
    ].includes(value.status) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string",
  );
}

function quarantineMalformedDocument(value: unknown, index: number): Document {
  const record = isRecord(value) ? value : {};
  const clientRecord = isRecord(record.client) ? record.client : {};
  const validStatuses = new Set<Document["status"]>([
    "borrador",
    "enviado",
    "aceptado",
    "rechazado",
    "pagado",
    "vencido",
    "rectificada",
    "anulada",
  ]);
  const status = validStatuses.has(record.status as Document["status"])
    ? (record.status as Document["status"])
    : "enviado";
  const type =
    record.type === "presupuesto" || record.type === "recibo"
      ? record.type
      : "factura";
  const items = Array.isArray(record.items)
    ? record.items.flatMap((item, itemIndex) => {
        if (!isRecord(item)) return [];
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const ivaPercent = Number(item.ivaPercent);
        if (
          !Number.isFinite(quantity) ||
          !Number.isFinite(unitPrice) ||
          !Number.isFinite(ivaPercent)
        ) {
          return [];
        }
        return [
          {
            id:
              typeof item.id === "string"
                ? item.id
                : `blocked-line-${index + 1}-${itemIndex + 1}`,
            description:
              typeof item.description === "string"
                ? item.description
                : "Línea no legible",
            quantity,
            unit: typeof item.unit === "string" ? item.unit : undefined,
            unitPrice,
            ivaPercent,
          },
        ];
      })
    : [];
  const fallbackTimestamp = "1970-01-01T00:00:00.000Z";
  const existingQuarantine = isRecord(record.integrityQuarantine)
    ? record.integrityQuarantine
    : null;
  const integrityQuarantine =
    existingQuarantine?.reason === "malformed_document" &&
    Object.prototype.hasOwnProperty.call(existingQuarantine, "rawDocument")
      ? existingQuarantine
      : {
          reason: "malformed_document" as const,
          rawDocument: value,
        };

  return {
    ...record,
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `blocked-invalid-document-${index + 1}`,
    type,
    number:
      typeof record.number === "string" && record.number.trim()
        ? record.number
        : `BLOQUEADO-${index + 1}`,
    date: isIsoDateString(record.date) ? record.date : "1970-01-01",
    client: {
      ...clientRecord,
      name:
        typeof clientRecord.name === "string" && clientRecord.name.trim()
          ? clientRecord.name
          : "Documento no legible",
    },
    items,
    status,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : fallbackTimestamp,
    updatedAt:
      typeof record.updatedAt === "string"
        ? record.updatedAt
        : fallbackTimestamp,
    snapshotIntegrityRequired: true,
    integrityQuarantine,
    documentLifecycle: status === "anulada" ? "canceled" : "issued",
    integrityLock: "locked",
  } as Document;
}

export function normalizeLoadedData(
  parsedInput: Partial<AppData> | unknown,
  options: NormalizeLoadedDataOptions = {},
): AppData {
  const parsed = (isRecord(parsedInput) ? parsedInput : {}) as Partial<AppData>;
  const workspaceIntegrityQuarantine: WorkspaceIntegrityQuarantineEntry[] = [];
  if (!isRecord(parsedInput)) {
    workspaceIntegrityQuarantine.push({
      collection: "workspace",
      reason: "malformed_collection",
      rawValue: parsedInput,
    });
  }
  if (Array.isArray(parsed.workspaceIntegrityQuarantine)) {
    parsed.workspaceIntegrityQuarantine.forEach((entry, index) => {
      if (
        isRecord(entry) &&
        typeof entry.collection === "string" &&
        (entry.reason === "malformed_collection" ||
          entry.reason === "malformed_record") &&
        Object.prototype.hasOwnProperty.call(entry, "rawValue")
      ) {
        workspaceIntegrityQuarantine.push(
          entry as unknown as WorkspaceIntegrityQuarantineEntry,
        );
      } else {
        workspaceIntegrityQuarantine.push({
          collection: "workspaceIntegrityQuarantine",
          index,
          reason: "malformed_record",
          rawValue: entry,
        });
      }
    });
  } else if (parsed.workspaceIntegrityQuarantine !== undefined) {
    workspaceIntegrityQuarantine.push({
      collection: "workspaceIntegrityQuarantine",
      reason: "malformed_collection",
      rawValue: parsed.workspaceIntegrityQuarantine,
    });
  }
  const normalizedRetirementBatches =
    normalizeTestDocumentRetirementBatches(
      parsed.testDocumentRetirementBatches,
    );
  for (const invalid of normalizedRetirementBatches.invalidEntries) {
    workspaceIntegrityQuarantine.push({
      collection: "testDocumentRetirementBatches",
      index: invalid.index >= 0 ? invalid.index : undefined,
      reason:
        invalid.index >= 0 ? "malformed_record" : "malformed_collection",
      rawValue: invalid.rawValue,
    });
  }
  let profile: BusinessProfile;
  if (parsed.profile !== undefined && !isRecord(parsed.profile)) {
    workspaceIntegrityQuarantine.push({
      collection: "profile",
      reason: "malformed_record",
      rawValue: parsed.profile,
    });
    profile = migrateProfile();
  } else {
    try {
      profile = migrateProfile(
        parsed.profile as Partial<BusinessProfile> | undefined,
      );
    } catch {
      workspaceIntegrityQuarantine.push({
        collection: "profile",
        reason: "malformed_record",
        rawValue: parsed.profile,
      });
      profile = migrateProfile();
    }
  }
  const firstIntegrityMigration = parsed.snapshotIntegrityVersion !== 1;
  const migrationTimestamp = new Date().toISOString();
  const migratedDocuments: Document[] = [];
  const rawDocuments: unknown[] = Array.isArray(parsed.documents)
    ? parsed.documents
    : parsed.documents === undefined
      ? []
      : [parsed.documents];
  const normalizedDocuments = rawDocuments.map((document, index) => {
    try {
      if (!isNormalizableDocument(document)) {
        throw new Error("Documento persistido no normalizable");
      }
      // A recovery attestation owns its exact evidence. It must reach the
      // dedicated fail-closed branch below without legacy preclassification.
      const persisted = hasAppIssuedRecoveryProtectionClaim(document)
        ? document
        : preclassifyLegacyVerifactuDocument(document);
      const explicitLegacyImport =
        options.legacyBackfillDocumentIds?.has(persisted.id) === true;
      const knownPersistentImportSource = Boolean(
        detectLegacyImportSource(persisted),
      );
      const mayRunFirstIntegrityBackfill =
        firstIntegrityMigration &&
        !persisted.issuedAt &&
        !knownPersistentImportSource;
      const mayRunFirstSealMigration =
        firstIntegrityMigration && !knownPersistentImportSource;
      const normalized = normalizeQuoteDocument(
        normalizeHistoricalDocument(
          persisted,
          profile,
          explicitLegacyImport || mayRunFirstIntegrityBackfill,
          explicitLegacyImport || mayRunFirstSealMigration,
        ),
      );
      if (!persisted.snapshotSeal && normalized.snapshotSeal) {
        migratedDocuments.push(normalized);
      }
      return normalized;
    } catch {
      // Un registro defectuoso queda visible y bloqueado; nunca invalida el
      // resto del workspace ni se descarta durante la rehidratación.
      return blockDocumentAfterMigrationFailure(
        quarantineMalformedDocument(document, index),
      );
    }
  });
  const documents =
    withDocumentRelationshipIntegritySignals(normalizedDocuments);
  const migrationChanges: SyncChange[] = migratedDocuments.map((document) => ({
    entityType: "document",
    entityId: document.id,
    deleted: false,
    payload: document,
    updatedAt: migrationTimestamp,
  }));
  if (firstIntegrityMigration || migrationChanges.length > 0) {
    migrationChanges.push(snapshotIntegrityMetadataChange(migrationTimestamp));
  }
  const parsedMeta = isRecord(parsed.meta)
    ? (parsed.meta as unknown as NonNullable<AppData["meta"]>)
    : undefined;
  if (parsed.meta !== undefined && !parsedMeta) {
    workspaceIntegrityQuarantine.push({
      collection: "meta",
      reason: "malformed_record",
      rawValue: parsed.meta,
    });
  }
  const pendingChanges = normalizeRecordCollection<SyncChange>({
    rawValue: parsedMeta?.pendingChanges,
    collection: "meta.pendingChanges",
    quarantine: workspaceIntegrityQuarantine,
    isValid: (value) =>
      typeof value.entityType === "string" &&
      typeof value.entityId === "string" &&
      typeof value.deleted === "boolean" &&
      typeof value.updatedAt === "string",
    normalize: (value) => value as unknown as SyncChange,
  });
  const baseMeta = parsedMeta
    ? {
        ...parsedMeta,
        pendingChanges:
          pendingChanges.length > 0 || parsedMeta.pendingChanges
            ? pendingChanges
            : undefined,
      }
    : undefined;
  const meta =
    migrationChanges.length > 0
      ? {
          ...baseMeta,
          lastModified: migrationTimestamp,
          pendingChanges: mergePendingChanges(pendingChanges, migrationChanges),
        }
      : baseMeta;
  const customers = normalizeRecordCollection<AppData["customers"][number]>({
    rawValue: parsed.customers,
    collection: "customers",
    quarantine: workspaceIntegrityQuarantine,
    isValid: (value) =>
      typeof value.id === "string" && typeof value.name === "string",
    normalize: (value) =>
      migrateCustomer(value as unknown as AppData["customers"][number]),
  });
  const recurringExpenses = normalizeRecordCollection<
    AppData["recurringExpenses"][number]
  >({
    rawValue: parsed.recurringExpenses,
    collection: "recurringExpenses",
    quarantine: workspaceIntegrityQuarantine,
    isValid: (value) =>
      typeof value.id === "string" &&
      typeof value.supplierName === "string" &&
      typeof value.description === "string" &&
      typeof value.amount === "number" &&
      typeof value.ivaPercent === "number" &&
      typeof value.startDate === "string" &&
      isRecord(value.duration),
    normalize: (value) =>
      normalizeRecurringExpense(
        value as unknown as AppData["recurringExpenses"][number],
      ),
  });
  const userReminders = normalizeRecordCollection<UserReminder>({
    rawValue: parsed.userReminders,
    collection: "userReminders",
    quarantine: workspaceIntegrityQuarantine,
    isValid: (value) =>
      typeof value.id === "string" &&
      typeof value.text === "string" &&
      isRecord(value.link),
    normalize: (value) =>
      normalizeUserReminder(value as unknown as UserReminder),
  });
  const products = normalizeRecordCollection<AppData["products"][number]>({
    rawValue: parsed.products,
    collection: "products",
    quarantine: workspaceIntegrityQuarantine,
    isValid: (value) =>
      typeof value.id === "string" && typeof value.name === "string",
    normalize: (value) =>
      normalizeProductCatalogItem(
        value as unknown as AppData["products"][number],
      ),
  });
  const suppliers = normalizeRecordCollection<Supplier>({
    rawValue: parsed.suppliers,
    collection: "suppliers",
    quarantine: workspaceIntegrityQuarantine,
    isValid: (value) =>
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      isOptionalString(value.nif),
    normalize: (value) => value as unknown as Supplier,
  });
  const normalizedExpenses = normalizeRecordCollection<Expense>({
    rawValue: parsed.expenses,
    collection: "expenses",
    quarantine: workspaceIntegrityQuarantine,
    isValid: (value) =>
      typeof value.id === "string" &&
      typeof value.date === "string" &&
      typeof value.supplierName === "string" &&
      typeof value.description === "string" &&
      typeof value.amount === "number" &&
      typeof value.ivaPercent === "number",
    normalize: (value) => value as unknown as Expense,
  });
  const expenses = linkLooseExpensesToExistingSuppliers(
    normalizedExpenses,
    suppliers,
  );
  const documentCounters = countersFromDocuments(
    documents,
    profile.numbering.year,
    profile.numbering,
  );
  const parsedCounters: Record<string, unknown> = isRecord(parsed.counters)
    ? parsed.counters
    : {};
  const normalized: AppData = {
    ...EMPTY_DATA,
    ...parsed,
    profile,
    customers,
    recurringExpenses,
    userReminders,
    products,
    suppliers,
    expenses,
    documents,
    testDocumentRetirementBatches: normalizedRetirementBatches.batches,
    snapshotIntegrityVersion: 1,
    workspaceIntegrityQuarantine:
      workspaceIntegrityQuarantine.length > 0
        ? workspaceIntegrityQuarantine
        : undefined,
    counters: {
      factura: Math.max(
        documentCounters.factura,
        Number(parsedCounters.factura) || 0,
      ),
      factura_rectificativa: Math.max(
        documentCounters.factura_rectificativa,
        Number(parsedCounters.factura_rectificativa) || 0,
      ),
      presupuesto: Math.max(
        documentCounters.presupuesto,
        Number(parsedCounters.presupuesto) || 0,
      ),
      recibo: Math.max(
        documentCounters.recibo,
        Number(parsedCounters.recibo) || 0,
      ),
    },
    meta,
  };
  return enforceAppliedTestDocumentRetirements(normalized);
}

function linkLooseExpensesToExistingSuppliers(
  expenses: Expense[],
  suppliers: Supplier[],
): Expense[] {
  if (expenses.length === 0 || suppliers.length === 0) return expenses;

  const suppliersByNif = new Map<string, Supplier>();
  const suppliersByName = new Map<string, Supplier>();
  for (const supplier of suppliers) {
    const nif = normalizeSupplierNif(supplier.nif);
    if (nif && !suppliersByNif.has(nif)) {
      suppliersByNif.set(nif, supplier);
    }

    const name = supplierCompareKey(supplier.name);
    if (name && !suppliersByName.has(name)) {
      suppliersByName.set(name, supplier);
    }
  }

  return expenses.map((expense) => {
    if (expense.supplierId) return expense;

    const supplierNif = normalizeSupplierNif(
      expense.purchaseDocument?.supplierNif,
    );
    const supplier =
      (supplierNif ? suppliersByNif.get(supplierNif) : undefined) ??
      suppliersByName.get(supplierCompareKey(expense.supplierName));

    if (!supplier) return expense;

    return {
      ...expense,
      supplierId: supplier.id,
      supplierName: supplier.name,
    };
  });
}

function shouldBackfillHistoricalSnapshot(doc: Document): boolean {
  if (doc.documentSnapshot) return false;
  if (doc.snapshotIntegrityRequired) return false;
  if (doc.type !== "factura" && doc.type !== "recibo") return false;
  return deriveDocumentLifecycle(doc) !== "draft";
}

function isRecoverableLegacyRectificationDraft(doc: Document): boolean {
  if (!doc.rectification || doc.status !== "borrador") return false;
  if (doc.number.trim().toUpperCase() !== "BORRADOR") return false;
  if (
    doc.verifactu ||
    doc.verifactuPersistence ||
    doc.issuedAt ||
    doc.sentAt ||
    doc.paidAt ||
    doc.acceptedAt ||
    doc.deliveryStatus === "sent" ||
    doc.paymentStatus === "paid" ||
    doc.paymentStatus === "overdue" ||
    doc.acceptanceStatus === "accepted" ||
    doc.acceptanceStatus === "rejected" ||
    doc.documentLifecycle === "canceled" ||
    doc.snapshotSeal ||
    doc.snapshotIntegrityRequired
  ) {
    return false;
  }
  return (
    !doc.documentSnapshot || doc.documentSnapshot.source === "legacy_backfill"
  );
}

function normalizeDocumentIntegrityState(
  doc: Document,
  requirements: Parameters<typeof withDocumentSnapshotIntegritySignal>[1] = {},
): Document {
  const signaled = withDocumentSnapshotIntegritySignal(doc, requirements);
  if (
    signaled.documentSnapshot &&
    signaled.pdfSnapshot &&
    signaled.snapshotSeal &&
    inspectDocumentSnapshotsIntegrity(signaled).ok
  ) {
    return projectCanonicalSnapshotOntoDocument(signaled);
  }
  return signaled;
}

const REVALIDATABLE_LEGACY_ATTESTATION_ISSUES = new Set([
  "document_snapshot_missing",
  "pdf_snapshot_missing",
  "snapshot_seal_missing",
  "legacy_import_attestation_invalid",
  "document_relationship_invalid",
]);

function canRevalidateLegacyAttestationSignal(document: Document): boolean {
  const signal = document.snapshotIntegrity;
  if (!signal) return true;
  return Boolean(
    signal.status === "blocked" &&
    signal.issues.length > 0 &&
    signal.issues.every((issue) =>
      REVALIDATABLE_LEGACY_ATTESTATION_ISSUES.has(issue),
    ),
  );
}

function normalizeHistoricalDocument(
  doc: Document,
  profile: BusinessProfile,
  allowLegacySnapshotBackfill: boolean,
  allowLegacySealMigration: boolean,
): Document {
  if (hasAppIssuedRecoveryProtectionClaim(doc)) {
    const recovery = inspectAppIssuedDocumentRecovery(doc);
    // `rolled_back` sigue siendo una atestación íntegra e inactiva. Se conserva
    // tal cual para que el usuario pueda volver a previsualizar/aplicar; el
    // validador de relaciones mantiene sus efectos financieros bloqueados.
    if (recovery.ok) return doc;

    // Preserve every persisted field byte-semantically. `snapshotIntegrity` is
    // derived/replaceable and is the only slot amended to keep corrupt
    // recovery claims fail-closed. In particular, load never
    // backfills snapshots, PDF settings or seals for this branch.
    return {
      ...doc,
      snapshotIntegrity: {
        status: "blocked",
        issues: [
          ...new Set([
            ...(doc.snapshotIntegrity?.issues ?? []),
            "app_issued_recovery_invalid" as const,
          ]),
        ],
      },
    };
  }

  if (
    allowLegacySnapshotBackfill &&
    allowLegacySealMigration &&
    !doc.snapshotSeal &&
    isRecoverableLegacyRectificationDraft(doc)
  ) {
    return normalizeDocumentIntegrityState({
      ...doc,
      issuer: undefined,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      deliveryStatus: undefined,
      paymentStatus: undefined,
      acceptanceStatus: undefined,
      issuedAt: undefined,
      sentAt: undefined,
      paidAt: undefined,
      acceptedAt: undefined,
    });
  }

  if (doc.legacyImportAttestation) {
    const mayClearRolloutSignal = canRevalidateLegacyAttestationSignal(doc);
    const attestationCandidate: Document = {
      ...doc,
      snapshotIntegrity: mayClearRolloutSignal
        ? undefined
        : doc.snapshotIntegrity,
    };
    const attestation =
      inspectUsableHistoricalDocumentEvidence(attestationCandidate);
    if (attestation.ok) {
      return projectLegacyImportSnapshotOntoDocument(attestationCandidate);
    }
    const signaled = normalizeDocumentIntegrityState({
      ...doc,
      documentLifecycle: deriveDocumentLifecycle(doc),
      integrityLock: "locked",
    });
    return {
      ...signaled,
      snapshotIntegrity: {
        status: "blocked",
        issues: [
          ...new Set([
            ...(doc.snapshotIntegrity?.issues ?? []),
            ...(signaled.snapshotIntegrity?.issues ?? []),
            "legacy_import_attestation_invalid" as const,
          ]),
        ],
      },
    };
  }

  const loadedIntegrity = inspectDocumentSnapshotsIntegrity(doc);
  if (!loadedIntegrity.ok) {
    // Conserva exactamente la evidencia persistida. Cargar detecta una
    // corrupción, pero nunca la hace parecer válida reconstruyéndola.
    return normalizeDocumentIntegrityState({
      ...doc,
      documentLifecycle: deriveDocumentLifecycle(doc),
      integrityLock: deriveIntegrityLock(doc),
    });
  }

  const lifecycle = deriveDocumentLifecycle(doc);
  const integrityLock = deriveIntegrityLock(doc);

  if (doc.documentSnapshot && !doc.pdfSnapshot) {
    const canCompleteLegacyPair =
      allowLegacySnapshotBackfill &&
      doc.documentSnapshot.source === "legacy_backfill" &&
      lifecycle !== "draft";
    if (!canCompleteLegacyPair) {
      return normalizeDocumentIntegrityState(
        {
          ...doc,
          documentLifecycle: lifecycle,
          integrityLock,
          snapshotIntegrityRequired: true,
        },
        {
          requireDocumentSnapshot: true,
          requirePdfSnapshot: true,
          requireSnapshotSeal: !allowLegacySealMigration,
        },
      );
    }

    const pdfSnapshot = buildDocumentPdfSnapshot(
      doc.documentSnapshot,
      profile,
      doc.issuedAt ?? doc.updatedAt,
    );
    return normalizeDocumentIntegrityState({
      ...doc,
      documentLifecycle: lifecycle,
      integrityLock,
      pdfSnapshot,
      snapshotIntegrityRequired: true,
      snapshotSeal: buildDocumentSnapshotSeal(
        doc.id,
        doc.documentSnapshot,
        pdfSnapshot,
      ),
    });
  }

  if (doc.documentSnapshot && doc.pdfSnapshot) {
    if (!doc.snapshotSeal && !allowLegacySealMigration) {
      return normalizeDocumentIntegrityState(
        {
          ...doc,
          documentLifecycle: lifecycle,
          integrityLock,
          snapshotIntegrityRequired: true,
        },
        { requireSnapshotSeal: true },
      );
    }
    return normalizeDocumentIntegrityState({
      ...doc,
      documentLifecycle: lifecycle,
      integrityLock,
      snapshotIntegrityRequired: true,
      snapshotSeal:
        doc.snapshotSeal ??
        buildDocumentSnapshotSeal(
          doc.id,
          doc.documentSnapshot,
          doc.pdfSnapshot,
        ),
    });
  }

  if (!shouldBackfillHistoricalSnapshot(doc)) {
    return normalizeDocumentIntegrityState({
      ...doc,
      documentLifecycle: doc.documentLifecycle ?? lifecycle,
      integrityLock: doc.integrityLock ?? integrityLock,
    });
  }

  if (!allowLegacySnapshotBackfill) {
    return normalizeDocumentIntegrityState(
      {
        ...doc,
        documentLifecycle: lifecycle,
        integrityLock,
        snapshotIntegrityRequired: true,
      },
      {
        requireDocumentSnapshot: true,
        requirePdfSnapshot: true,
        requireSnapshotSeal: true,
      },
    );
  }

  const documentSnapshot = deriveLegacySnapshotForReadOnly(doc, profile);
  const pdfSnapshot = buildDocumentPdfSnapshot(
    documentSnapshot,
    profile,
    doc.issuedAt ?? doc.updatedAt,
  );
  return normalizeDocumentIntegrityState({
    ...doc,
    documentLifecycle: "issued",
    integrityLock: "locked",
    documentSnapshot,
    pdfSnapshot,
    snapshotIntegrityRequired: true,
    snapshotSeal: buildDocumentSnapshotSeal(
      doc.id,
      documentSnapshot,
      pdfSnapshot,
    ),
  });
}

export function touchAppData(data: AppData): AppData {
  const guarded = enforceAppliedTestDocumentRetirements(data);
  return {
    ...guarded,
    meta: {
      ...guarded.meta,
      lastModified: new Date().toISOString(),
    },
  };
}

export function getDataTimestamp(data: AppData): string {
  return data.meta?.lastModified ?? "1970-01-01T00:00:00.000Z";
}

function normalizedDemoWorkspaceData(): AppData {
  const demo = createDemoWorkspaceData();
  return normalizeLoadedData(demo, {
    legacyBackfillDocumentIds: new Set(
      demo.documents.map((document) => document.id),
    ),
  });
}

export function loadData(): AppData {
  if (typeof window === "undefined") return EMPTY_DATA;
  let raw: string | null;
  try {
    raw = localStorage.getItem(currentStorageKey());
  } catch {
    return isDemoWorkspaceMode() ? normalizedDemoWorkspaceData() : EMPTY_DATA;
  }
  if (!raw) {
    return isDemoWorkspaceMode() ? normalizedDemoWorkspaceData() : EMPTY_DATA;
  }

  let parsed: unknown;
  try {
    parsed = parseStoredData(raw);
  } catch {
    const quarantined: AppData = {
      ...EMPTY_DATA,
      workspaceIntegrityQuarantine: [
        {
          collection: "workspace",
          reason: "malformed_collection",
          rawValue: raw,
        },
      ],
    };
    saveData(quarantined);
    return quarantined;
  }

  try {
    const normalized = normalizeLoadedData(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      saveData(normalized);
    }
    return normalized;
  } catch {
    const quarantined: AppData = {
      ...EMPTY_DATA,
      workspaceIntegrityQuarantine: [
        {
          collection: "workspace",
          reason: "malformed_collection",
          rawValue: raw,
        },
      ],
    };
    saveData(quarantined);
    return quarantined;
  }
}

function profileDiffersFromDefault(
  profile: Partial<BusinessProfile> | undefined,
): boolean {
  if (!profile) return false;
  const current = profile as Record<string, unknown>;
  const defaults = DEFAULT_PROFILE as unknown as Record<string, unknown>;
  return Object.keys(current).some(
    (key) => JSON.stringify(current[key]) !== JSON.stringify(defaults[key]),
  );
}

function storedDataHasContent(parsed: Partial<AppData>): boolean {
  return (
    (parsed.documents?.length ?? 0) > 0 ||
    (parsed.customers?.length ?? 0) > 0 ||
    (parsed.expenses?.length ?? 0) > 0 ||
    (parsed.recurringExpenses?.length ?? 0) > 0 ||
    (parsed.userReminders?.length ?? 0) > 0 ||
    (parsed.suppliers?.length ?? 0) > 0 ||
    (parsed.products?.length ?? 0) > 0 ||
    (parsed.testDocumentRetirementBatches?.length ?? 0) > 0 ||
    (parsed.workspaceIntegrityQuarantine?.length ?? 0) > 0 ||
    (parsed.meta?.pendingChanges?.length ?? 0) > 0 ||
    Object.values(parsed.counters ?? {}).some((value) => (value ?? 0) > 0) ||
    Boolean(parsed.verifactuChain) ||
    profileDiffersFromDefault(parsed.profile)
  );
}

function inMemoryDataIsEmpty(data: AppData): boolean {
  return !storedDataHasContent(data);
}

export type SaveDataBlockedReason =
  | "quota_exceeded"
  | "storage_unavailable"
  | "serialization_failed"
  | "protected_existing_data"
  | "stale_precondition"
  | "write_failed"
  | "verification_failed";

export type SaveDataResult =
  | { status: "applied" }
  | { status: "blocked"; reason: SaveDataBlockedReason }
  | { status: "indeterminate"; reason: "storage_state_unknown" };

export interface SaveDataOptions {
  expected?: AppData;
}

function storageWriteFailureReason(error: unknown): SaveDataBlockedReason {
  try {
    const source = error as { name?: unknown; code?: unknown } | null;
    const name = source ? String(source.name ?? "") : "";
    const code = source ? Number(source.code) : Number.NaN;
    if (
      name === "QuotaExceededError" ||
      name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      code === 22 ||
      code === 1014
    ) {
      return "quota_exceeded";
    }
    if (name === "SecurityError" || code === 18) {
      return "storage_unavailable";
    }
  } catch {
    return "write_failed";
  }
  return "write_failed";
}

function restoreStoredRaw(
  storage: Storage,
  storageKey: string,
  beforeRaw: string | null,
  attemptedRaw: string,
): boolean {
  let currentRaw: string | null;
  try {
    currentRaw = storage.getItem(storageKey);
  } catch {
    return false;
  }

  if (currentRaw === beforeRaw) return true;
  if (currentRaw !== attemptedRaw) return false;

  try {
    if (beforeRaw === null) {
      storage.removeItem(storageKey);
    } else {
      storage.setItem(storageKey, beforeRaw);
    }
  } catch {
    return false;
  }

  try {
    return storage.getItem(storageKey) === beforeRaw;
  } catch {
    return false;
  }
}

function storedRawMatchesExpected(
  raw: string | null,
  expected: AppData,
  storageKey: string,
): boolean {
  if (raw === null) {
    if (inMemoryDataIsEmpty(expected)) return true;
    if (storageKey !== DEMO_WORKSPACE_STORAGE_KEY) return false;
    return (
      stableStringifySnapshot(normalizedDemoWorkspaceData()) ===
      stableStringifySnapshot(expected)
    );
  }

  try {
    return (
      stableStringifySnapshot(normalizeLoadedData(parseStoredData(raw))) ===
      stableStringifySnapshot(expected)
    );
  } catch {
    return false;
  }
}

export function saveData(
  data: AppData,
  options: SaveDataOptions = {},
): SaveDataResult {
  if (typeof window === "undefined") {
    return { status: "blocked", reason: "storage_unavailable" };
  }

  let serialized: string;
  try {
    serialized = serializeStoredData(data);
  } catch {
    return { status: "blocked", reason: "serialization_failed" };
  }

  let storage: Storage;
  let storageKey: string;
  let beforeRaw: string | null;
  try {
    storage = localStorage;
    storageKey = currentStorageKey();
    beforeRaw = storage.getItem(storageKey);
  } catch {
    return { status: "blocked", reason: "storage_unavailable" };
  }

  if (
    options.expected &&
    !storedRawMatchesExpected(beforeRaw, options.expected, storageKey)
  ) {
    return { status: "blocked", reason: "stale_precondition" };
  }

  if (beforeRaw && inMemoryDataIsEmpty(data)) {
    try {
      const parsed = parseStoredData(beforeRaw) as Partial<AppData>;
      if (storedDataHasContent(parsed)) {
        return { status: "blocked", reason: "protected_existing_data" };
      }
    } catch {
      return { status: "blocked", reason: "protected_existing_data" };
    }
  }

  if (beforeRaw === serialized) return { status: "applied" };

  // La serialización y la protección anti-vaciado pueden ser costosas. Una
  // segunda lectura inmediatamente antes del write evita pisar un cambio de
  // otra pestaña que ya sea observable. localStorage no ofrece CAS síncrono;
  // cualquier cambio detectado se conserva y se declara indeterminado.
  try {
    if (storage.getItem(storageKey) !== beforeRaw) {
      return { status: "indeterminate", reason: "storage_state_unknown" };
    }
  } catch {
    return { status: "blocked", reason: "storage_unavailable" };
  }

  let writeError: unknown;
  try {
    storage.setItem(storageKey, serialized);
  } catch (error) {
    writeError = error;
  }

  let writtenRaw: string | null | undefined;
  try {
    writtenRaw = storage.getItem(storageKey);
  } catch {
    writtenRaw = undefined;
  }

  if (writeError === undefined && writtenRaw === serialized) {
    return { status: "applied" };
  }

  if (writtenRaw === beforeRaw) {
    return {
      status: "blocked",
      reason:
        writeError === undefined
          ? "verification_failed"
          : storageWriteFailureReason(writeError),
    };
  }

  // Un tercer raw no se puede atribuir con seguridad a esta escritura: puede
  // proceder de otra pestaña. Sobrescribirlo con un rollback ciego perdería
  // datos, así que se conserva y el estado se declara indeterminado.
  if (writtenRaw !== undefined && writtenRaw !== serialized) {
    return { status: "indeterminate", reason: "storage_state_unknown" };
  }

  if (!restoreStoredRaw(storage, storageKey, beforeRaw, serialized)) {
    return { status: "indeterminate", reason: "storage_state_unknown" };
  }

  if (writeError !== undefined) {
    return { status: "blocked", reason: storageWriteFailureReason(writeError) };
  }
  return { status: "blocked", reason: "verification_failed" };
}

/** @deprecated Usar assignNextDocumentNumber desde documents.ts */
export function nextDocumentNumber(
  type: DocumentType,
  counters: AppData["counters"],
  year = new Date().getFullYear(),
): { number: string; counters: AppData["counters"] } {
  const next = counters[type] + 1;
  const prefix = type === "factura" ? "F" : type === "presupuesto" ? "P" : "R";
  return {
    number: `${prefix}-${year}-${String(next).padStart(4, "0")}`,
    counters: { ...counters, [type]: next },
  };
}
