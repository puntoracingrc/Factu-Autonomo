import { APP_BRAND_NAME } from "./brand";
import { sha256Hex } from "./document-integrity/snapshot-hash";
import { normalizeLoadedData } from "./storage";
import type { AppData } from "./types";

export const BACKUP_FILE_PREFIX = "factu-autonomo-backup";
export const BACKUP_VERSION = 1;
export const PORTABLE_BACKUP_VERSION = 2;
export const BACKUP_APP_ID = "factura-autonomo";
export const BACKUP_SOURCE = "local";
export const BACKUP_WARNING =
  "Copia local generada en el navegador. Puede contener datos personales o fiscales; guárdala de forma segura. No restaura datos automáticamente. No incluye los datos y ajustes de Rentabilidad Real guardados solo en este navegador.";
export const BACKUP_SCOPE_NOTICE =
  "Incluye el perfil, documentos, gastos, recurrencias, fichas maestras, el expediente fiscal estructurado —sin PDF original— y el historial auditable de retiros explícitos de Factu. No incluye los datos y ajustes de Rentabilidad Real guardados solo en este navegador.";

export interface BackupMetadata {
  app: typeof BACKUP_APP_ID;
  exportVersion: number;
  exportedAt: string;
  source: typeof BACKUP_SOURCE;
  warning: string;
}

export interface BackupPayload {
  metadata: BackupMetadata;
  data: AppData;
}

interface PortableBackupPayloadV2 {
  metadata: BackupMetadata & { exportVersion: typeof PORTABLE_BACKUP_VERSION };
  format: typeof PORTABLE_BACKUP_FORMAT;
  data: unknown;
  assets: Record<string, string>;
}

export type BackupDownloadResult =
  | {
      ok: true;
      filename: string;
      contentSha256: string;
      byteLength: number;
      disposition: "browser_download_requested";
    }
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
  confirmedReplacement: boolean;
}

interface DownloadBackupOptions {
  now?: () => Date;
  purpose?: "manual" | "pre_restore" | "pre_test_retirement";
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
export const MAX_BACKUP_PREVIEW_BYTES = 25 * 1024 * 1024;
const PORTABLE_BACKUP_FORMAT = "factu-portable-assets-v1";
const PORTABLE_ASSET_REFERENCE_KEY = "$factuAssetRef";
const PORTABLE_BACKUP_ERROR =
  "La copia portable contiene referencias de assets no válidas.";
const DATA_URL_PATTERN = /^data:[^,]*,/i;
const SHA256_ASSET_ID_PATTERN = /^sha256:[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function portableAssetId(value: string): string {
  return `sha256:${sha256Hex(value)}`;
}

function encodePortableBackupData(data: AppData): {
  data: unknown;
  assets: Record<string, string>;
} {
  const assets: Record<string, string> = Object.create(null) as Record<
    string,
    string
  >;
  const assetIdsByValue = new Map<string, string>();

  function encode(value: unknown): unknown {
    if (typeof value === "string" && DATA_URL_PATTERN.test(value)) {
      const knownId = assetIdsByValue.get(value);
      if (knownId) return { [PORTABLE_ASSET_REFERENCE_KEY]: knownId };

      const assetId = portableAssetId(value);
      const collidingValue = assets[assetId];
      if (collidingValue !== undefined && collidingValue !== value) {
        throw new Error("portable_asset_hash_collision");
      }
      assets[assetId] = value;
      assetIdsByValue.set(value, assetId);
      return { [PORTABLE_ASSET_REFERENCE_KEY]: assetId };
    }

    if (Array.isArray(value)) return value.map((entry) => encode(entry));
    if (!isRecord(value)) return value;

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, encode(entry)]),
    );
  }

  return { data: encode(createBackupData(data)), assets };
}

function decodePortableBackupData(
  payload: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  if (
    payload.format !== PORTABLE_BACKUP_FORMAT ||
    !isRecord(payload.data) ||
    !isRecord(payload.assets)
  ) {
    return { ok: false, error: PORTABLE_BACKUP_ERROR };
  }

  const assets = payload.assets;
  for (const [assetId, value] of Object.entries(assets)) {
    if (
      !SHA256_ASSET_ID_PATTERN.test(assetId) ||
      typeof value !== "string" ||
      !DATA_URL_PATTERN.test(value) ||
      portableAssetId(value) !== assetId
    ) {
      return { ok: false, error: PORTABLE_BACKUP_ERROR };
    }
  }

  const referencedAssetIds = new Set<string>();
  let invalidReference = false;

  function decode(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => decode(entry));
    if (!isRecord(value)) return value;

    if (Object.hasOwn(value, PORTABLE_ASSET_REFERENCE_KEY)) {
      const keys = Object.keys(value);
      const assetId = value[PORTABLE_ASSET_REFERENCE_KEY];
      if (
        keys.length !== 1 ||
        typeof assetId !== "string" ||
        !Object.hasOwn(assets, assetId)
      ) {
        invalidReference = true;
        return null;
      }
      referencedAssetIds.add(assetId);
      return assets[assetId];
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, decode(entry)]),
    );
  }

  const decoded = decode(payload.data);
  if (
    invalidReference ||
    !isRecord(decoded) ||
    referencedAssetIds.size !== Object.keys(assets).length
  ) {
    return { ok: false, error: PORTABLE_BACKUP_ERROR };
  }

  return { ok: true, data: decoded };
}

function backupDataFromPayload(
  payload: Record<string, unknown>,
  metadata: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const exportVersion = Number(metadata.exportVersion);
  if (exportVersion === BACKUP_VERSION) {
    return isRecord(payload.data)
      ? { ok: true, data: payload.data }
      : { ok: false, error: "La copia no incluye metadata y datos válidos." };
  }
  if (exportVersion === PORTABLE_BACKUP_VERSION) {
    return decodePortableBackupData(payload);
  }
  return { ok: false, error: "La versión de la copia no es compatible." };
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
  if (!isRecord(metadata)) {
    return { ok: false, error: "La copia no incluye metadata y datos válidos." };
  }

  if (metadata.app !== BACKUP_APP_ID) {
    return { ok: false, error: `La copia no parece ser de ${APP_BRAND_NAME}.` };
  }

  const decoded = backupDataFromPayload(parsed, metadata);
  if (!decoded.ok) return decoded;

  return { ok: true, fileName, metadata, data: decoded.data };
}

function normalizeBackupDataForImport(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
): BackupRestoreDraftResult {
  const exportVersion = Number(metadata.exportVersion);
  const exportedAt =
    typeof metadata.exportedAt === "string" ? metadata.exportedAt : "";
  const source = typeof metadata.source === "string" ? metadata.source : "";

  if (
    (exportVersion !== BACKUP_VERSION &&
      exportVersion !== PORTABLE_BACKUP_VERSION) ||
    !exportedAt
  ) {
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
      "Al confirmar, Factu solicitará automáticamente una copia del estado actual antes de restaurar.",
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

function createPortableBackupPayload(
  data: AppData,
  exportedAt: string,
): PortableBackupPayloadV2 {
  const encoded = encodePortableBackupData(data);
  return {
    metadata: {
      app: BACKUP_APP_ID,
      exportVersion: PORTABLE_BACKUP_VERSION,
      exportedAt,
      source: BACKUP_SOURCE,
      warning: BACKUP_WARNING,
    },
    format: PORTABLE_BACKUP_FORMAT,
    data: encoded.data,
    assets: encoded.assets,
  };
}

export function createBackupFilename(
  exportedAt = new Date().toISOString(),
  purpose: "manual" | "pre_restore" | "pre_test_retirement" = "manual",
): string {
  const stamp =
    purpose !== "manual"
      ? exportedAt.slice(0, 19).replaceAll(":", "-").replace("T", "-")
      : exportedAt.slice(0, 10);
  const purposeSuffix =
    purpose === "pre_restore"
      ? "-antes-restaurar"
      : purpose === "pre_test_retirement"
        ? "-antes-retirar-pruebas"
        : "";
  return `${BACKUP_FILE_PREFIX}${purposeSuffix}-${stamp}.json`;
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
  if (!readiness.confirmedReplacement) {
    return "Confirma que entiendes que se reemplazarán los datos locales.";
  }
  return null;
}

export function parseBackupJson(raw: unknown): AppData | { error: string } {
  if (!isRecord(raw)) {
    return { error: "El archivo no es válido" };
  }

  let backupData: Record<string, unknown>;
  if (isRecord(raw.metadata)) {
    if (raw.metadata.app !== BACKUP_APP_ID) {
      return { error: `No parece una copia de ${APP_BRAND_NAME}` };
    }
    const decoded = backupDataFromPayload(raw, raw.metadata);
    if (!decoded.ok) return { error: decoded.error };
    backupData = decoded.data;
  } else {
    backupData = isRecord(raw.data) ? raw.data : raw;
  }

  if (!backupData.profile && !backupData.documents && !backupData.customers) {
    return { error: `No parece una copia de ${APP_BRAND_NAME}` };
  }

  return normalizeLoadedData(backupData);
}

export function createBackupBlob(
  data: AppData,
  exportedAt = new Date().toISOString(),
): Blob {
  return createBackupArtifact(data, exportedAt).blob;
}

function createBackupArtifact(
  data: AppData,
  exportedAt: string,
): { blob: Blob; contentSha256: string; byteLength: number } {
  const json = JSON.stringify(createPortableBackupPayload(data, exportedAt));
  const blob = new Blob([json], {
    type: "application/json",
  });
  if (blob.size > MAX_BACKUP_PREVIEW_BYTES) {
    throw new Error("portable_backup_too_large");
  }
  return {
    blob,
    contentSha256: `sha256:${sha256Hex(json)}`,
    byteLength: blob.size,
  };
}

export function downloadBackup(
  data: AppData,
  options: DownloadBackupOptions = {},
): BackupDownloadResult {
  const exportedAt = (options.now?.() ?? new Date()).toISOString();
  const filename = createBackupFilename(exportedAt, options.purpose);

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
    const artifact = createBackupArtifact(data, exportedAt);
    const { blob } = artifact;
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.click();
    return {
      ok: true,
      filename,
      contentSha256: artifact.contentSha256,
      byteLength: artifact.byteLength,
      disposition: "browser_download_requested",
    };
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
