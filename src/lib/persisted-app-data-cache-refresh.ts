import {
  DEMO_WORKSPACE_STORAGE_KEY,
  isDemoWorkspaceMode,
} from "./demo-workspace";

const APP_DATA_STORAGE_KEY = "factura-autonomo-data";

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const pendingRefreshes = new Map<
  string,
  { generation: number; cancel: () => void }
>();
let refreshGeneration = 0;

export function schedulePersistedAppDataCacheRefresh(
  suppliedStorageKey?: string,
  suppliedRaw?: string | null,
): void {
  if (typeof window === "undefined" || typeof Worker === "undefined") return;

  let storageKey: string;
  let raw: string | null;
  try {
    storageKey =
      suppliedStorageKey ??
      (isDemoWorkspaceMode()
        ? DEMO_WORKSPACE_STORAGE_KEY
        : APP_DATA_STORAGE_KEY);
    raw =
      suppliedRaw === undefined
        ? localStorage.getItem(storageKey)
        : suppliedRaw;
  } catch {
    return;
  }
  if (raw === null) return;

  pendingRefreshes.get(storageKey)?.cancel();
  refreshGeneration += 1;
  const generation = refreshGeneration;
  const idleWindow = window as IdleWindow;
  let cancelled = false;
  let worker: Worker | null = null;

  const run = () => {
    if (cancelled) return;
    if (pendingRefreshes.get(storageKey)?.generation !== generation) return;
    try {
      worker = new Worker(
        new URL(
          "../workers/persisted-app-data-cache.worker.ts",
          import.meta.url,
        ),
        { type: "module" },
      );
    } catch {
      pendingRefreshes.delete(storageKey);
      return;
    }

    const finish = () => {
      worker?.terminate();
      worker = null;
      if (pendingRefreshes.get(storageKey)?.generation === generation) {
        pendingRefreshes.delete(storageKey);
      }
    };
    worker.onmessage = finish;
    worker.onerror = finish;
    worker.postMessage({ storageKey, raw });
  };

  let cancel: () => void;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(run, { timeout: 2_000 });
    cancel = () => {
      cancelled = true;
      idleWindow.cancelIdleCallback?.(handle);
      worker?.terminate();
      worker = null;
    };
  } else {
    const handle = setTimeout(run, 100);
    cancel = () => {
      cancelled = true;
      clearTimeout(handle);
      worker?.terminate();
      worker = null;
    };
  }

  pendingRefreshes.set(storageKey, { generation, cancel });
}
