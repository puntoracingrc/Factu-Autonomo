export interface DeviceStorageDiagnostics {
  activeWorkspaceBytes: number | null;
  originUsageBytes: number | null;
  originQuotaBytes: number | null;
}

interface StorageEstimateLike {
  usage?: number;
  quota?: number;
}

interface DeviceStorageDiagnosticsOptions {
  storage?: Pick<Storage, "getItem"> | null;
  estimate?: (() => Promise<StorageEstimateLike>) | null;
}

function finiteNonNegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function utf8StorageBytes(value: string): number {
  if (value.startsWith("factu-gzip-v1:")) return value.length;
  return new TextEncoder().encode(value).byteLength;
}

export function formatStorageBytes(value: number | null): string {
  if (value === null) return "No disponible";
  if (value < 1_024) return `${Math.round(value)} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let amount = value / 1_024;
  let unitIndex = 0;
  while (amount >= 1_024 && unitIndex < units.length - 1) {
    amount /= 1_024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: amount >= 10 ? 1 : 2,
  }).format(amount)} ${units[unitIndex]}`;
}

export async function readDeviceStorageDiagnostics(
  storageKey: string,
  options: DeviceStorageDiagnosticsOptions = {},
): Promise<DeviceStorageDiagnostics> {
  const storage =
    options.storage === undefined
      ? typeof localStorage === "undefined"
        ? null
        : localStorage
      : options.storage;
  const estimate =
    options.estimate === undefined
      ? typeof navigator === "undefined"
        ? null
        : navigator.storage?.estimate?.bind(navigator.storage) ?? null
      : options.estimate;

  let activeWorkspaceBytes: number | null = null;
  try {
    const raw = storage?.getItem(storageKey) ?? null;
    activeWorkspaceBytes = raw === null ? 0 : utf8StorageBytes(raw);
  } catch {
    activeWorkspaceBytes = null;
  }

  let originUsageBytes: number | null = null;
  let originQuotaBytes: number | null = null;
  try {
    const measured = estimate ? await estimate() : null;
    originUsageBytes = finiteNonNegative(measured?.usage);
    originQuotaBytes = finiteNonNegative(measured?.quota);
  } catch {
    // Algunos navegadores no exponen la estimacion. La copia activa se mide aparte.
  }

  return {
    activeWorkspaceBytes,
    originUsageBytes,
    originQuotaBytes,
  };
}
