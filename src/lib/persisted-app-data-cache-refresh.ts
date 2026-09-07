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

export const PERSISTED_CACHE_REFRESH_QUIET_MS = 1_500;
export const PERSISTED_CACHE_REFRESH_IDLE_TIMEOUT_MS = 5_000;

const pendingRefreshes = new Map<
  string,
  { generation: number; raw: string; cancel: () => void }
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

  const pending = pendingRefreshes.get(storageKey);
  if (pending?.raw === raw) return;
  pending?.cancel();
  refreshGeneration += 1;
  const generation = refreshGeneration;
  const idleWindow = window as IdleWindow;
  let cancelled = false;
  let worker: Worker | null = null;
  let idleHandle: number | null = null;

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

  const quietHandle = window.setTimeout(() => {
    if (cancelled) return;
    if (pendingRefreshes.get(storageKey)?.generation !== generation) return;
    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(run, {
        timeout: PERSISTED_CACHE_REFRESH_IDLE_TIMEOUT_MS,
      });
      return;
    }
    run();
  }, PERSISTED_CACHE_REFRESH_QUIET_MS);

  const cancel = () => {
    cancelled = true;
    window.clearTimeout(quietHandle);
    if (idleHandle !== null) {
      idleWindow.cancelIdleCallback?.(idleHandle);
      idleHandle = null;
    }
    worker?.terminate();
    worker = null;
  };

  pendingRefreshes.set(storageKey, { generation, raw, cancel });
}
