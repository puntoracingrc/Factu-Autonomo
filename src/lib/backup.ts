import { APP_BRAND_NAME } from "./brand";
import { normalizeLoadedData } from "./storage";
import type { AppData } from "./types";

export const BACKUP_FILE_PREFIX = "factu-autonomo-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = "factura-autonomo";
export const BACKUP_SOURCE = "local";
export const BACKUP_WARNING =
  "Copia local generada en el navegador. Puede contener datos personales o fiscales; guárdala de forma segura. No se sube a ningún servidor ni restaura datos automáticamente.";

export interface BackupMetadata {
  app: typeof BACKUP_APP_ID;
  exportVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  source: typeof BACKUP_SOURCE;
  warning: string;
}

export interface BackupPayload {
  metadata: BackupMetadata;
  data: AppData;
}

export type BackupDownloadResult =
  | { ok: true; filename: string }
  | { ok: false; error: string };

export interface BackupImportPreviewCandidate {
  fileName: string;
  mimeType?: string;
  byteLength: number;
  rawText: string;
}

export interface BackupImportPreview {
  fileName: string;
  exportedAt: string;
  exportVersion: number;
  source: string;
  counts: {
    customers: number;
    documents: number;
    quotes: number;
    invoices: number;
    issuedInvoices: number;
    paidInvoices: number;
    expenses: number;
    suppliers: number;
  };
  hasIssuerProfile: boolean;
  warnings: string[];
}

export type BackupImportPreviewResult =
  | { ok: true; preview: BackupImportPreview }
  | { ok: false; error: string };

export interface BackupRestoreDraft {
  preview: BackupImportPreview;
  data: AppData;
}

export type BackupRestoreDraftResult =
  | { ok: true; draft: BackupRestoreDraft }
  | { ok: false; error: string };

export interface BackupRestoreReadiness {
  draftReady: boolean;
  currentBackupReady: boolean;
  confirmedReplacement: boolean;
  confirmedCurrentBackup: boolean;
}

interface DownloadBackupOptions {
  now?: () => Date;
}

const UNSAFE_BACKUP_KEY_PATTERN =
  /(?:secret|token|password|authorization|api[_-]?key|access[_-]?key|private[_-]?key|vercel|supabase)/i;
const DANGEROUS_BACKUP_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const FORBIDDEN_BACKUP_EXTENSIONS = new Set([
  "zip",
  "pdf",
  "xml",
  "html",
  "htm",
  "js",
  "csv",
]);
const MAX_BACKUP_PREVIEW_BYTES = 5 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeBackupValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeBackupValue(entry));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !UNSAFE_BACKUP_KEY_PATTERN.test(key))
      .map(([key, entry]) => [key, sanitizeBackupValue(entry)]),
  );
}

function cleanBackupFileName(fileName: string): string {
  return fileName.trim().replace(/[\\/]+/g, "_");
}

function backupFileExtension(fileName: string): string {
  const cleanName = cleanBackupFileName(fileName).toLowerCase();
  const dot = cleanName.lastIndexOf(".");
  return dot > -1 ? cleanName.slice(dot + 1) : "";
}

function hasSuspiciousBackupFileName(fileName: string): boolean {
  const trimmed = fileName.trim();
  const cleanName = cleanBackupFileName(fileName);
  if (!trimmed || cleanName !== trimmed) return true;
  if (cleanName.includes("..")) return true;
  if (/[\x00-\x1f]/.test(cleanName)) return true;
  return /(?:^|[._-])(?:env|passwd|private|key)(?:[._-]|$)/i.test(cleanName);
}

function findUnsafeBackupKey(value: unknown): "dangerous" | "secret" | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = findUnsafeBackupKey(entry);
      if (result) return result;
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (DANGEROUS_BACKUP_KEYS.has(key)) return "dangerous";
    if (UNSAFE_BACKUP_KEY_PATTERN.test(key)) return "secret";
    const result = findUnsafeBackupKey(entry);
    if (result) return result;
  }

  return null;
}

function parseValidatedBackupPayload(
  candidate: BackupImportPreviewCandidate,
):
  | {
      ok: true;
      fileName: string;
      metadata: Record<string, unknown>;
      data: Record<string, unknown>;
    }
  | { ok: false; error: string } {
  const fileName = cleanBackupFileName(candidate.fileName);
  const extension = backupFileExtension(fileName);
  const mimeType = (candidate.mimeType ?? "").trim().toLowerCase();

  if (hasSuspiciousBackupFileName(candidate.fileName)) {
    return { ok: false, error: "El nombre del archivo no es válido." };
  }

  if (FORBIDDEN_BACKUP_EXTENSIONS.has(extension) || extension !== "json") {
    return { ok: false, error: "Selecciona una copia en formato JSON." };
  }

  if (mimeType && mimeType !== "application/json") {
    return { ok: false, error: "El tipo de archivo no parece JSON." };
  }

  if (
    !Number.isSafeInteger(candidate.byteLength) ||
    candidate.byteLength < 0 ||
    candidate.byteLength > MAX_BACKUP_PREVIEW_BYTES
  ) {
    return { ok: false, error: "El archivo es demasiado grande para revisarlo." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.rawText);
  } catch {
    return { ok: false, error: "No se pudo leer el JSON de la copia." };
  }

  const unsafeKey = findUnsafeBackupKey(parsed);
  if (unsafeKey === "dangerous") {
    return { ok: false, error: "La copia contiene campos no permitidos." };
  }
  if (unsafeKey === "secret") {
    return { ok: false, error: "La copia contiene campos privados no permitidos." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "La copia no tiene una estructura válida." };
  }

  const metadata = parsed.metadata;
  const data = parsed.data;
  if (!isRecord(metadata) || !isRecord(data)) {
    return { ok: false, error: "La copia no incluye metadata y datos válidos." };
  }

  if (metadata.app !== BACKUP_APP_ID) {
    return { ok: false, error: `La copia no parece ser de ${APP_BRAND_NAME}.` };
  }

  return { ok: true, fileName, metadata, data };
}

function normalizeBackupDataForImport(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
): BackupRestoreDraftResult {
  const exportVersion = Number(metadata.exportVersion);
  const exportedAt =
    typeof metadata.exportedAt === "string" ? metadata.exportedAt : "";
  const source = typeof metadata.source === "string" ? metadata.source : "";

  if (!Number.isFinite(exportVersion) || exportVersion < 1 || !exportedAt) {
    return { ok: false, error: "La metadata de la copia no es válida." };
  }

  if (Number.isNaN(Date.parse(exportedAt))) {
    return { ok: false, error: "La fecha de exportación no es válida." };
  }

  if (
    !isRecord(data.profile) ||
    !Array.isArray(data.customers) ||
    !Array.isArray(data.documents)
  ) {
    return {
      ok: false,
      error: "Los datos de la copia no tienen la forma esperada.",
    };
  }

  let normalized: AppData;
  try {
    normalized = normalizeLoadedData(data);
  } catch {
    return { ok: false, error: "La copia no se puede normalizar con seguridad." };
  }

  const invoices = normalized.documents.filter(
    (document) => document.type === "factura",
  );
  const preview: BackupImportPreview = {
    fileName: "",
    exportedAt,
    exportVersion,
    source,
    counts: {
      customers: normalized.customers.length,
      documents: normalized.documents.length,
      quotes: normalized.documents.filter(
        (document) => document.type === "presupuesto",
      ).length,
      invoices: invoices.length,
      issuedInvoices: invoices.filter(
        (document) =>
          document.documentLifecycle === "issued" ||
          ["enviado", "pagado", "vencido", "rectificada"].includes(
            document.status,
          ),
      ).length,
      paidInvoices: invoices.filter(
        (document) =>
          document.status === "pagado" || document.paymentStatus === "paid",
      ).length,
      expenses: normalized.expenses.length,
      suppliers: normalized.suppliers.length,
    },
    hasIssuerProfile: Boolean(
      normalized.profile.name.trim() ||
        normalized.profile.nif.trim() ||
        normalized.profile.email.trim(),
    ),
    warnings: [
      "La restauración reemplazaría los datos locales actuales.",
      "Descarga una copia actual antes de restaurar.",
      "No se ha aplicado ningún cambio todavía.",
    ],
  };

  return { ok: true, draft: { preview, data: normalized } };
}

export function createBackupData(data: AppData): AppData {
  const localData = { ...data };
  delete localData.meta;
  return sanitizeBackupValue(localData) as AppData;
}

export function createBackupPayload(
  data: AppData,
  exportedAt = new Date().toISOString(),
): BackupPayload {
  return {
    metadata: {
      app: BACKUP_APP_ID,
      exportVersion: BACKUP_VERSION,
      exportedAt,
      source: BACKUP_SOURCE,
      warning: BACKUP_WARNING,
    },
    data: createBackupData(data),
  };
}

export function createBackupFilename(
  exportedAt = new Date().toISOString(),
): string {
  const stamp = exportedAt.slice(0, 10);
  return `${BACKUP_FILE_PREFIX}-${stamp}.json`;
}

export function buildBackupImportPreview(
  candidate: BackupImportPreviewCandidate,
): BackupImportPreviewResult {
  const payload = parseValidatedBackupPayload(candidate);
  if (!payload.ok) return payload;

  const draft = normalizeBackupDataForImport(payload.metadata, payload.data);
  if (!draft.ok) return draft;

  return {
    ok: true,
    preview: {
      ...draft.draft.preview,
      fileName: payload.fileName,
    },
  };
}

export function buildBackupRestoreDraft(
  candidate: BackupImportPreviewCandidate,
): BackupRestoreDraftResult {
  const payload = parseValidatedBackupPayload(candidate);
  if (!payload.ok) return payload;

  const draft = normalizeBackupDataForImport(payload.metadata, payload.data);
  if (!draft.ok) return draft;

  return {
    ok: true,
    draft: {
      ...draft.draft,
      preview: {
        ...draft.draft.preview,
        fileName: payload.fileName,
      },
    },
  };
}

export function getBackupRestoreBlocker(
  readiness: BackupRestoreReadiness,
): string | null {
  if (!readiness.draftReady) {
    return "Primero revisa una copia válida.";
  }
  if (!readiness.currentBackupReady) {
    return "Descarga antes una copia de seguridad actual.";
  }
  if (!readiness.confirmedReplacement) {
    return "Confirma que entiendes que se reemplazarán los datos locales.";
  }
  if (!readiness.confirmedCurrentBackup) {
    return "Confirma que has descargado una copia actual.";
  }
  return null;
}

export function parseBackupJson(raw: unknown): AppData | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "El archivo no es válido" };
  }

  const payload = raw as Partial<AppData> & {
    data?: Partial<AppData>;
    metadata?: Partial<BackupMetadata>;
    version?: number;
  };
  const backupData =
    payload.data && typeof payload.data === "object" ? payload.data : payload;

  if (!backupData.profile && !backupData.documents && !backupData.customers) {
    return { error: `No parece una copia de ${APP_BRAND_NAME}` };
  }

  return normalizeLoadedData(backupData);
}

export function createBackupBlob(
  data: AppData,
  exportedAt = new Date().toISOString(),
): Blob {
  const payload = createBackupPayload(data, exportedAt);
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

export function downloadBackup(
  data: AppData,
  options: DownloadBackupOptions = {},
): BackupDownloadResult {
  const exportedAt = (options.now?.() ?? new Date()).toISOString();
  const filename = createBackupFilename(exportedAt);

  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return {
      ok: false,
      error: "La descarga no está disponible en este navegador.",
    };
  }

  let url: string | null = null;

  try {
    const blob = createBackupBlob(data, exportedAt);
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.click();
    return { ok: true, filename };
  } catch {
    return {
      ok: false,
      error: "No se pudo preparar la copia de seguridad.",
    };
  } finally {
    if (url && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
  }
}

export async function readBackupFile(file: File): Promise<AppData | { error: string }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    return parseBackupJson(parsed);
  } catch {
    return { error: "No se pudo leer el archivo. Comprueba que sea JSON." };
  }
}
