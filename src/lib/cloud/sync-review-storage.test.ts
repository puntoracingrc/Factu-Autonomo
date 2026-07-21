import { afterEach, describe, expect, it, vi } from "vitest";
import { FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE } from "./sync-errors";
import {
  canAdoptResolvedCloudSnapshot,
  cloudSyncReviewKey,
  resolveCloudSyncReviewFromPersistedSnapshot,
  subscribeCloudSyncReviewIssue,
} from "./sync-review-storage";
import { EMPTY_DATA, type AppData } from "../types";

describe("cloud sync review cross-tab storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("propaga bloqueo y resolución solo a pestañas de la misma cuenta", () => {
    const handlers = new Set<(event: StorageEvent) => void>();
    vi.stubGlobal("window", {
      addEventListener: (type: string, handler: (event: StorageEvent) => void) => {
        if (type === "storage") handlers.add(handler);
      },
      removeEventListener: (
        type: string,
        handler: (event: StorageEvent) => void,
      ) => {
        if (type === "storage") handlers.delete(handler);
      },
    });
    const firstTab = vi.fn();
    const secondTab = vi.fn();
    const otherAccount = vi.fn();
    const unsubscribers = [
      subscribeCloudSyncReviewIssue("user-a", firstTab),
      subscribeCloudSyncReviewIssue("user-a", secondTab),
      subscribeCloudSyncReviewIssue("user-b", otherAccount),
    ];

    const emit = (key: string, newValue: string | null) => {
      for (const handler of handlers) {
        handler({ key, newValue } as StorageEvent);
      }
    };
    emit(
      cloudSyncReviewKey("user-a"),
      FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE,
    );
    emit(cloudSyncReviewKey("user-a"), null);

    expect(firstTab).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ automaticRetryBlocked: true }),
    );
    expect(firstTab).toHaveBeenNthCalledWith(2, null);
    expect(secondTab).toHaveBeenCalledTimes(2);
    expect(otherAccount).not.toHaveBeenCalled();

    for (const unsubscribe of unsubscribers) unsubscribe();
    expect(handlers.size).toBe(0);
  });

  it("solo adopta una resolución durable sin cola ni timestamp pendiente", () => {
    const synced = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-07-21T20:00:00.000Z",
        lastSyncedAt: "2026-07-21T20:00:00.000Z",
      },
    };

    expect(canAdoptResolvedCloudSnapshot(synced, false)).toBe(true);
    expect(canAdoptResolvedCloudSnapshot(synced, true)).toBe(false);
    expect(
      canAdoptResolvedCloudSnapshot(
        {
          ...synced,
          meta: {
            ...synced.meta,
            lastModified: "2026-07-21T20:01:00.000Z",
          },
        },
        false,
      ),
    ).toBe(false);
  });

  it("mantiene el issue si otra pestaña escribe antes de la adopción", () => {
    const repaired = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-07-21T20:00:00.000Z",
        lastSyncedAt: "2026-07-21T20:00:00.000Z",
      },
    };
    const concurrent = {
      ...repaired,
      meta: {
        ...repaired.meta,
        lastModified: "2026-07-21T20:01:00.000Z",
      },
    };
    let persisted: AppData = concurrent;
    const clearIssue = vi.fn();
    const markSynced = vi.fn();

    expect(
      resolveCloudSyncReviewFromPersistedSnapshot({
        snapshot: repaired,
        hasPendingFlag: false,
        adopt: (snapshot) => {
          if (persisted !== snapshot) return false;
          persisted = snapshot;
          return true;
        },
        commitResolution: () => {
          clearIssue();
          markSynced();
        },
      }),
    ).toBe(false);
    expect(persisted).toBe(concurrent);
    expect(clearIssue).not.toHaveBeenCalled();
    expect(markSynced).not.toHaveBeenCalled();
  });
});
