import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  FISCAL_NOTIFICATION_BROWSER_REVIEW_TEST_SEAM,
  createBrowserFiscalNotificationLocalReviewStore,
} from "./browser-local-review-repository";
import type { FiscalNotificationReviewStorageLike } from "./local-review-repository";

const OWNER_A = "user:00000000-0000-4000-8000-000000000001";
const OWNER_B = "user:00000000-0000-4000-8000-000000000002";

class MemoryStorage implements FiscalNotificationReviewStorageLike {
  readonly values = new Map<string, string>();
  readonly getItem = vi.fn((key: string) => this.values.get(key) ?? null);
  readonly setItem = vi.fn((key: string, value: string) => {
    this.values.set(key, value);
  });
  readonly removeItem = vi.fn((key: string) => {
    this.values.delete(key);
  });
}

class ImmediateLockManager {
  readonly requests: Array<{
    name: string;
    options: Readonly<{ mode: "exclusive"; ifAvailable: true }>;
  }> = [];

  async request<T>(
    name: string,
    options: Readonly<{ mode: "exclusive"; ifAvailable: true }>,
    callback: (
      lock: { name: string; mode: "exclusive" | "shared" } | null,
    ) => Promise<T>,
  ): Promise<T> {
    this.requests.push({ name, options });
    return callback({ name, mode: "exclusive" });
  }
}

class NonBlockingSerialLockManager extends ImmediateLockManager {
  private readonly busy = new Set<string>();

  override async request<T>(
    name: string,
    options: Readonly<{ mode: "exclusive"; ifAvailable: true }>,
    callback: (
      lock: { name: string; mode: "exclusive" | "shared" } | null,
    ) => Promise<T>,
  ): Promise<T> {
    this.requests.push({ name, options });
    if (this.busy.has(name)) return callback(null);
    this.busy.add(name);
    try {
      await Promise.resolve();
      return await callback({ name, mode: "exclusive" });
    } finally {
      this.busy.delete(name);
    }
  }
}

function safeResult() {
  return {
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    reason: "SUPPORTED_FAMILY_CANDIDATE",
    engineId: "fiscal-notification-family-candidate-engine",
    engineVersion: "1.0.0",
    pageCount: 1,
    byteLength: 2_048,
    sha256: "a".repeat(64),
    candidates: [
      {
        familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
        documentType: "AEAT_ENFORCEMENT_ORDER",
        authoritySignal: "AEAT_UNVERIFIED",
        handlerId: "aeat-enforcement-order-candidate",
        handlerVersion: "1.0.0",
        signalStatus: "COMPLETE_REQUIRED_ANCHORS",
        matchedAnchors: [
          { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [1] },
          { anchorId: "ENFORCEMENT_ORDER_TITLE", pageNumbers: [1] },
          {
            anchorId: "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
            pageNumbers: [1],
          },
          {
            anchorId: "ENFORCEMENT_DEBT_AMOUNT_SECTION",
            pageNumbers: [1],
          },
          { anchorId: "STRUCTURAL_FIRST_PAGE_HEADER", pageNumbers: [1] },
        ],
        missingRequiredAnchorIds: [],
        conflictingAnchorIds: [],
        requiresHumanReview: true,
      },
    ],
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  };
}

function appendInput(reviewSuffix = "000000000001") {
  return {
    expectedRevision: 0,
    reviewId: `review:00000000-0000-4000-8000-${reviewSuffix}`,
    createdAt: "2026-07-13T07:30:00.000Z",
    result: safeResult(),
  };
}

function seam() {
  if (!FISCAL_NOTIFICATION_BROWSER_REVIEW_TEST_SEAM) {
    throw new Error("Browser review test seam is unavailable");
  }
  return FISCAL_NOTIFICATION_BROWSER_REVIEW_TEST_SEAM;
}

describe("fiscal notification browser local review repository", () => {
  it("is safe to import and instantiate during SSR", async () => {
    const store = createBrowserFiscalNotificationLocalReviewStore(OWNER_A);
    expect(store.repository.load()).toEqual({
      status: "blocked",
      reason: "STORAGE_UNAVAILABLE",
    });
    await expect(store.repository.append(appendInput())).resolves.toEqual({
      status: "blocked",
      reason: "STORAGE_UNAVAILABLE",
    });
  });

  it("uses the real Web Locks contract with exact non-blocking exclusive options", async () => {
    const storage = new MemoryStorage();
    const lockManager = new ImmediateLockManager();
    const store = seam().createBrowserStoreWithRuntime(OWNER_A, {
      storage,
      lockManager,
      addStorageListener: null,
    });

    await expect(store.repository.append(appendInput())).resolves.toMatchObject({
      status: "applied",
    });
    expect(lockManager.requests).toEqual([
      {
        name: expect.stringContaining(OWNER_A),
        options: { mode: "exclusive", ifAvailable: true },
      },
    ]);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("fails closed without storage, Web Locks, or a granted exact lock", async () => {
    const storage = new MemoryStorage();
    const noLock = seam().createBrowserStoreWithRuntime(OWNER_A, {
      storage,
      lockManager: null,
      addStorageListener: null,
    });
    expect(noLock.repository.load()).toMatchObject({ status: "empty" });
    await expect(noLock.repository.append(appendInput())).resolves.toEqual({
      status: "blocked",
      reason: "LOCK_UNAVAILABLE",
    });

    for (const lock of [
      null,
      { name: "foreign-lock", mode: "exclusive" as const },
      { name: "unused", mode: "shared" as const },
    ]) {
      const manager = {
        request: async <T,>(
          name: string,
          _options: Readonly<{ mode: "exclusive"; ifAvailable: true }>,
          callback: (
            granted: { name: string; mode: "exclusive" | "shared" } | null,
          ) => Promise<T>,
        ) =>
          callback(
            lock?.name === "unused" ? { ...lock, name } : lock,
          ),
      };
      const denied = seam().createBrowserStoreWithRuntime(OWNER_A, {
        storage: new MemoryStorage(),
        lockManager: manager,
        addStorageListener: null,
      });
      await expect(denied.repository.append(appendInput())).resolves.toEqual({
        status: "blocked",
        reason: "LOCK_UNAVAILABLE",
      });
    }
  });

  it("never reports success when the lock manager rejects after the write", async () => {
    const storage = new MemoryStorage();
    const manager = {
      request: async <T,>(
        name: string,
        _options: Readonly<{ mode: "exclusive"; ifAvailable: true }>,
        callback: (
          lock: { name: string; mode: "exclusive" | "shared" } | null,
        ) => Promise<T>,
      ): Promise<T> => {
        await callback({ name, mode: "exclusive" });
        throw new Error("PRIVATE_LOCK_AFTER_TASK_SENTINEL");
      },
    };
    const store = seam().createBrowserStoreWithRuntime(OWNER_A, {
      storage,
      lockManager: manager,
      addStorageListener: null,
    });

    await expect(store.repository.append(appendInput())).resolves.toEqual({
      status: "indeterminate",
      reason: "STORAGE_STATE_UNKNOWN",
    });
  });

  it("coordinates two store instances without a last-write-wins success", async () => {
    const storage = new MemoryStorage();
    const lockManager = new NonBlockingSerialLockManager();
    const first = seam().createBrowserStoreWithRuntime(OWNER_A, {
      storage,
      lockManager,
      addStorageListener: null,
    });
    const second = seam().createBrowserStoreWithRuntime(OWNER_A, {
      storage,
      lockManager,
      addStorageListener: null,
    });

    const results = await Promise.all([
      first.repository.append(appendInput("000000000010")),
      second.repository.append(appendInput("000000000011")),
    ]);
    expect(results.filter((result) => result.status === "applied")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "blocked")).toHaveLength(
      1,
    );
    expect(results.find((result) => result.status === "blocked")).toEqual({
      status: "blocked",
      reason: "LOCK_UNAVAILABLE",
    });
    const loaded = first.repository.load();
    expect(loaded.status === "blocked" ? -1 : loaded.snapshot.reviews.length).toBe(
      1,
    );
  });

  it("subscribes only to the exact owner key and never consumes event payloads", () => {
    const storage = new MemoryStorage();
    let storageListener:
      | ((event: { key: string | null; storageArea: unknown }) => void)
      | null = null;
    const remove = vi.fn();
    const store = seam().createBrowserStoreWithRuntime(OWNER_A, {
      storage,
      lockManager: new ImmediateLockManager(),
      addStorageListener: (listener) => {
        storageListener = listener;
        return remove;
      },
    });
    const refresh = vi.fn();
    const unsubscribe = store.subscribeToExternalChanges(refresh);
    const emit = storageListener as unknown as (event: {
      key: string | null;
      storageArea: unknown;
      newValue?: string;
    }) => void;

    emit({
      key: `factu:fiscal-notifications:safe-reviews:v1:${OWNER_B}`,
      storageArea: storage,
      newValue: "PRIVATE_FOREIGN_RAW_SENTINEL",
    });
    emit({
      key: `factu:fiscal-notifications:safe-reviews:v1:${OWNER_A}`,
      storageArea: new MemoryStorage(),
      newValue: "PRIVATE_OTHER_STORAGE_SENTINEL",
    });
    expect(refresh).not.toHaveBeenCalled();

    emit({
      key: `factu:fiscal-notifications:safe-reviews:v1:${OWNER_A}`,
      storageArea: storage,
      newValue: "PRIVATE_OWNER_RAW_SENTINEL",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    emit({
      key: null,
      storageArea: storage,
      newValue: "PRIVATE_CLEAR_RAW_SENTINEL",
    });
    expect(refresh).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("contains no network, fallback mutex, payload logging, or random generator", () => {
    const source = readFileSync(
      new URL("./browser-local-review-repository.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('{ mode: "exclusive", ifAvailable: true }');
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|Math\.random|console\.|newValue|indexedDB|sessionStorage/,
    );
    expect(source).not.toMatch(/new\s+(?:Map|Set)\s*</);
  });
});
