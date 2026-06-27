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

interface DownloadBackupOptions {
  now?: () => Date;
}

const UNSAFE_BACKUP_KEY_PATTERN =
  /(?:secret|token|password|authorization|api[_-]?key|access[_-]?key|private[_-]?key|vercel|supabase)/i;

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
    return { error: "No parece una copia de Factura Autónomo" };
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
