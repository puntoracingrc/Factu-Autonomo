import { normalizeLoadedData } from "./storage";
import type { AppData } from "./types";

export const BACKUP_FILE_PREFIX = "factura-autonomo-copia";
export const BACKUP_VERSION = 1;

export function parseBackupJson(raw: unknown): AppData | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "El archivo no es válido" };
  }

  const payload = raw as Partial<AppData> & { version?: number };
  if (!payload.profile && !payload.documents && !payload.customers) {
    return { error: "No parece una copia de Factura Autónomo" };
  }

  return normalizeLoadedData(payload);
}

export function createBackupBlob(data: AppData): Blob {
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

export function downloadBackup(data: AppData): void {
  const blob = createBackupBlob(data);
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${BACKUP_FILE_PREFIX}-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
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
