import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import type { AppData, SyncChange } from "@/lib/types";

export type CloudRepairCountKey =
  | "customers"
  | "invoices"
  | "quotes"
  | "receipts"
  | "expenses"
  | "recurringExpenses"
  | "suppliers"
  | "products"
  | "reminders"
  | "fiscalDocuments"
  | "retirementBatches";

export interface CloudRepairCountComparison {
  key: CloudRepairCountKey;
  label: string;
  local: number;
  cloud: number;
  delta: number;
  reduction: boolean;
  protectedReduction: boolean;
}

export interface CloudRepairSnapshotSummary {
  recordedAt: string | null;
  fiscalRevision: number | null;
  fiscalUpdatedAt: string | null;
}

export interface CloudRepairPreview {
  id: string;
  generatedAt: string;
  cloudSource: "entities" | "legacy";
  local: CloudRepairSnapshotSummary;
  cloud: CloudRepairSnapshotSummary;
  counts: CloudRepairCountComparison[];
  exactBusinessStateMatches: boolean;
  hasReductions: boolean;
  hasProtectedReductions: boolean;
}

export interface CloudRepairConfirmation {
  previewId: string;
  reductionsAcknowledged: boolean;
}

export type CloudRepairPreviewPlan =
  | {
      status: "ready";
      preview: CloudRepairPreview;
      localFingerprint: string;
      cloudFingerprint: string;
    }
  | { status: "blocked"; reason: "unclassifiable_snapshot" };

interface SnapshotCounts {
  customers: number;
  invoices: number;
  quotes: number;
  receipts: number;
  expenses: number;
  recurringExpenses: number;
  suppliers: number;
  products: number;
  reminders: number;
  fiscalDocuments: number;
  retirementBatches: number;
}

const COUNT_DEFINITIONS: ReadonlyArray<{
  key: CloudRepairCountKey;
  label: string;
  protected: boolean;
}> = [
  { key: "customers", label: "Clientes", protected: false },
  {
    key: "invoices",
    label: "Facturas y rectificativas",
    protected: true,
  },
  { key: "quotes", label: "Presupuestos", protected: true },
  { key: "receipts", label: "Recibos", protected: true },
  { key: "expenses", label: "Gastos", protected: false },
  { key: "recurringExpenses", label: "Gastos recurrentes", protected: false },
  { key: "suppliers", label: "Proveedores", protected: false },
  { key: "products", label: "Productos", protected: false },
  { key: "reminders", label: "Recordatorios", protected: false },
  {
    key: "fiscalDocuments",
    label: "Documentos de Notificaciones",
    protected: true,
  },
  {
    key: "retirementBatches",
    label: "Retiros documentales auditables",
    protected: true,
  },
];

function validRecordedAt(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return value;
}

function countSnapshot(data: AppData): SnapshotCounts | null {
  const collections = [
    data.customers,
    data.documents,
    data.expenses,
    data.recurringExpenses,
    data.suppliers,
    data.products,
    data.userReminders,
  ];
  if (collections.some((collection) => !Array.isArray(collection))) return null;
  if (
    data.testDocumentRetirementBatches !== undefined &&
    !Array.isArray(data.testDocumentRetirementBatches)
  ) {
    return null;
  }

  const supportedDocumentTypes = new Set(["factura", "presupuesto", "recibo"]);
  if (
    data.documents.some(
      (document) => !supportedDocumentTypes.has(document?.type),
    )
  ) {
    return null;
  }

  const fiscalWorkspace = data.fiscalNotificationsWorkspace;
  if (fiscalWorkspace && !Array.isArray(fiscalWorkspace.documents)) return null;

  return {
    customers: data.customers.length,
    invoices: data.documents.filter((document) => document.type === "factura")
      .length,
    quotes: data.documents.filter((document) => document.type === "presupuesto")
      .length,
    receipts: data.documents.filter((document) => document.type === "recibo")
      .length,
    expenses: data.expenses.length,
    recurringExpenses: data.recurringExpenses.length,
    suppliers: data.suppliers.length,
    products: data.products.length,
    reminders: data.userReminders.length,
    fiscalDocuments: fiscalWorkspace?.documents.length ?? 0,
    retirementBatches: data.testDocumentRetirementBatches?.length ?? 0,
  };
}

function snapshotSummary(
  data: AppData,
  recordedAt: string | null,
): CloudRepairSnapshotSummary {
  const workspace = data.fiscalNotificationsWorkspace;
  return {
    recordedAt: validRecordedAt(recordedAt),
    fiscalRevision:
      workspace && Number.isSafeInteger(workspace.revision)
        ? workspace.revision
        : null,
    fiscalUpdatedAt: validRecordedAt(workspace?.updatedAt),
  };
}

export function cloudRepairSnapshotFingerprint(data: AppData): string {
  const { meta: _volatileSyncMetadata, ...businessState } = data;
  void _volatileSyncMetadata;
  return `sha256:${sha256Hex(stableStringifySnapshot(businessState))}`;
}

export function newestCloudChangeTimestamp(
  changes: readonly SyncChange[],
): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const change of changes) {
    const parsed = Date.parse(change.updatedAt);
    if (!Number.isFinite(parsed) || parsed <= latestMs) continue;
    latest = change.updatedAt;
    latestMs = parsed;
  }
  return latest;
}

export function buildCloudRepairPreviewPlan(input: {
  local: AppData;
  cloud: AppData;
  localRecordedAt: string | null;
  cloudRecordedAt: string | null;
  cloudSource: "entities" | "legacy";
  generatedAt: string;
  expectedFiscalOwnerScope: string | null;
}): CloudRepairPreviewPlan {
  const fiscalOwnerScopes = [
    input.local.fiscalNotificationsWorkspace?.ownerScope,
    input.cloud.fiscalNotificationsWorkspace?.ownerScope,
  ].filter((ownerScope): ownerScope is string => Boolean(ownerScope));
  if (
    fiscalOwnerScopes.length > 0 &&
    (!input.expectedFiscalOwnerScope ||
      fiscalOwnerScopes.some(
        (ownerScope) => ownerScope !== input.expectedFiscalOwnerScope,
      ))
  ) {
    return { status: "blocked", reason: "unclassifiable_snapshot" };
  }
  const localCounts = countSnapshot(input.local);
  const cloudCounts = countSnapshot(input.cloud);
  if (!localCounts || !cloudCounts) {
    return { status: "blocked", reason: "unclassifiable_snapshot" };
  }

  try {
    const localFingerprint = cloudRepairSnapshotFingerprint(input.local);
    const cloudFingerprint = cloudRepairSnapshotFingerprint(input.cloud);
    const counts = COUNT_DEFINITIONS.map((definition) => {
      const local = localCounts[definition.key];
      const cloud = cloudCounts[definition.key];
      const delta = cloud - local;
      return {
        key: definition.key,
        label: definition.label,
        local,
        cloud,
        delta,
        reduction: delta < 0,
        protectedReduction: definition.protected && delta < 0,
      };
    });
    const id = `sha256:${sha256Hex(
      `${localFingerprint}:${cloudFingerprint}:${input.generatedAt}`,
    )}`;

    return {
      status: "ready",
      localFingerprint,
      cloudFingerprint,
      preview: {
        id,
        generatedAt: input.generatedAt,
        cloudSource: input.cloudSource,
        local: snapshotSummary(input.local, input.localRecordedAt),
        cloud: snapshotSummary(input.cloud, input.cloudRecordedAt),
        counts,
        exactBusinessStateMatches: localFingerprint === cloudFingerprint,
        hasReductions: counts.some((entry) => entry.reduction),
        hasProtectedReductions: counts.some(
          (entry) => entry.protectedReduction,
        ),
      },
    };
  } catch {
    return { status: "blocked", reason: "unclassifiable_snapshot" };
  }
}

export function cloudRepairPreviewAllowsConfirmation(
  preview: CloudRepairPreview,
  reductionsAcknowledged: boolean,
): boolean {
  return !preview.hasReductions || reductionsAcknowledged;
}
