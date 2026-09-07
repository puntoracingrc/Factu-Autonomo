import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PERSISTED_CACHE_REFRESH_IDLE_TIMEOUT_MS,
  PERSISTED_CACHE_REFRESH_QUIET_MS,
  schedulePersistedAppDataCacheRefresh,
} from "./persisted-app-data-cache-refresh";

interface PostedRefresh {
  storageKey: string;
  raw: string;
}

class WorkerStub {
  static instances: WorkerStub[] = [];

  onmessage: ((event: MessageEvent<{ ok: boolean }>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: PostedRefresh | null = null;
  terminated = false;

  constructor() {
    WorkerStub.instances.push(this);
  }

  postMessage(value: PostedRefresh) {
    this.posted = value;
  }

  terminate() {
    this.terminated = true;
  }
}

describe("persisted app data cache refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WorkerStub.instances = [];
    vi.stubGlobal("Worker", WorkerStub);
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("agrupa una rafaga y procesa solo la copia mas reciente", () => {
    schedulePersistedAppDataCacheRefresh("empresa-rafaga", "version-1");
    vi.advanceTimersByTime(PERSISTED_CACHE_REFRESH_QUIET_MS - 500);
    schedulePersistedAppDataCacheRefresh("empresa-rafaga", "version-2");

    vi.advanceTimersByTime(PERSISTED_CACHE_REFRESH_QUIET_MS - 1);
    expect(WorkerStub.instances).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(WorkerStub.instances).toHaveLength(1);
    expect(WorkerStub.instances[0]?.posted).toEqual({
      storageKey: "empresa-rafaga",
      raw: "version-2",
    });
  });

  it("no aplaza una reconstruccion pendiente si el contenido es identico", () => {
    schedulePersistedAppDataCacheRefresh("empresa-igual", "misma-version");
    vi.advanceTimersByTime(PERSISTED_CACHE_REFRESH_QUIET_MS - 200);
    schedulePersistedAppDataCacheRefresh("empresa-igual", "misma-version");
    vi.advanceTimersByTime(200);

    expect(WorkerStub.instances).toHaveLength(1);
    expect(WorkerStub.instances[0]?.posted?.raw).toBe("misma-version");
  });

  it("espera a que el navegador este libre con un limite acotado", () => {
    const idleCallbacks: Array<() => void> = [];
    const requestIdleCallback = vi.fn(
      (callback: () => void) => {
        idleCallbacks.push(callback);
        return 17;
      },
    );
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
      requestIdleCallback,
      cancelIdleCallback: vi.fn(),
    });

    schedulePersistedAppDataCacheRefresh("empresa-idle", "version-idle");
    vi.advanceTimersByTime(PERSISTED_CACHE_REFRESH_QUIET_MS);

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: PERSISTED_CACHE_REFRESH_IDLE_TIMEOUT_MS,
    });
    expect(WorkerStub.instances).toHaveLength(0);

    const idleCallback = idleCallbacks[0];
    if (!idleCallback) throw new Error("idle callback missing");
    idleCallback();
    expect(WorkerStub.instances).toHaveLength(1);
  });
});
