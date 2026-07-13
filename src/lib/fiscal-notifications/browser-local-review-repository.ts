"use client";

import {
  FISCAL_NOTIFICATION_SAFE_REVIEW_STORAGE_KEY_PREFIX,
  createFiscalNotificationLocalReviewRepository,
  type FiscalNotificationLocalReviewRepository,
  type FiscalNotificationReviewExclusiveLock,
  type FiscalNotificationReviewStorageLike,
} from "./local-review-repository";

interface BrowserLockLike {
  readonly name: string;
  readonly mode: "exclusive" | "shared";
}

interface BrowserLockManagerLike {
  request<T>(
    name: string,
    options: Readonly<{ mode: "exclusive"; ifAvailable: true }>,
    callback: (lock: BrowserLockLike | null) => Promise<T>,
  ): Promise<T>;
}

interface BrowserStorageChangeEvent {
  readonly key: string | null;
  readonly storageArea: unknown;
}

interface FiscalNotificationBrowserReviewRuntime {
  readonly storage: FiscalNotificationReviewStorageLike | null;
  readonly lockManager: BrowserLockManagerLike | null;
  readonly addStorageListener:
    | ((listener: (event: BrowserStorageChangeEvent) => void) => () => void)
    | null;
}

export interface FiscalNotificationBrowserLocalReviewStore {
  readonly repository: FiscalNotificationLocalReviewRepository;
  subscribeToExternalChanges(listener: () => void): () => void;
}

const CANONICAL_OWNER_SCOPE = /^user:[A-Za-z0-9_-]{1,128}$/u;

export function createBrowserFiscalNotificationLocalReviewStore(
  ownerScope: unknown,
): FiscalNotificationBrowserLocalReviewStore {
  return createBrowserStoreWithRuntime(ownerScope, resolveBrowserRuntime());
}

function createBrowserStoreWithRuntime(
  ownerScope: unknown,
  runtime: FiscalNotificationBrowserReviewRuntime,
): FiscalNotificationBrowserLocalReviewStore {
  const repository = createFiscalNotificationLocalReviewRepository({
    ownerScope,
    storage: runtime.storage,
    lock: runtime.lockManager
      ? createExclusiveLockAdapter(runtime.lockManager)
      : null,
  });
  const ownerKey =
    typeof ownerScope === "string" && CANONICAL_OWNER_SCOPE.test(ownerScope)
      ? `${FISCAL_NOTIFICATION_SAFE_REVIEW_STORAGE_KEY_PREFIX}${ownerScope}`
      : null;

  return Object.freeze({
    repository,
    subscribeToExternalChanges(listener: () => void): () => void {
      if (
        !ownerKey ||
        !runtime.storage ||
        !runtime.addStorageListener ||
        typeof listener !== "function"
      ) {
        return () => undefined;
      }
      return runtime.addStorageListener((event) => {
        if (
          event.storageArea !== runtime.storage ||
          (event.key !== ownerKey && event.key !== null)
        ) {
          return;
        }
        try {
          listener();
        } catch {
          // A storage event must never expose data through a global error.
        }
      });
    },
  });
}

function createExclusiveLockAdapter(
  manager: BrowserLockManagerLike,
): FiscalNotificationReviewExclusiveLock {
  return Object.freeze({
    async runExclusive<T>(
      name: string,
      task: () => Promise<T>,
    ): Promise<T> {
      let entered = false;
      const result = await manager.request(
        name,
        { mode: "exclusive", ifAvailable: true },
        async (lock) => {
          if (
            entered ||
            !lock ||
            lock.name !== name ||
            lock.mode !== "exclusive"
          ) {
            throw new Error("FISCAL_NOTIFICATION_REVIEW_LOCK_UNAVAILABLE");
          }
          entered = true;
          return task();
        },
      );
      if (!entered) {
        throw new Error("FISCAL_NOTIFICATION_REVIEW_LOCK_UNAVAILABLE");
      }
      return result;
    },
  });
}

function resolveBrowserRuntime(): FiscalNotificationBrowserReviewRuntime {
  if (typeof window === "undefined") {
    return Object.freeze({
      storage: null,
      lockManager: null,
      addStorageListener: null,
    });
  }

  let storage: FiscalNotificationReviewStorageLike | null = null;
  let lockManager: BrowserLockManagerLike | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  try {
    const candidate = window.navigator?.locks;
    if (candidate && typeof candidate.request === "function") {
      lockManager = candidate as unknown as BrowserLockManagerLike;
    }
  } catch {
    lockManager = null;
  }

  const addStorageListener = storage
    ? (listener: (event: BrowserStorageChangeEvent) => void) => {
        const handler = (event: StorageEvent) => {
          listener({ key: event.key, storageArea: event.storageArea });
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
      }
    : null;

  return Object.freeze({ storage, lockManager, addStorageListener });
}

export const FISCAL_NOTIFICATION_BROWSER_REVIEW_TEST_SEAM =
  process.env.NODE_ENV === "test"
    ? Object.freeze({ createBrowserStoreWithRuntime })
    : null;
