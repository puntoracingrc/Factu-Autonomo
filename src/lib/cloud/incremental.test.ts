import { describe, expect, it } from "vitest";
import { EMPTY_DATA } from "../types";
import { hasPendingSyncChanges, markFullySynced } from "./incremental";
import { hasUnsyncedChanges } from "./sync-queue";

describe("incremental sync state", () => {
  it("marca los datos como sincronizados cuando no hay cola", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-06-10T12:00:00.000Z",
        lastSyncedAt: "2026-06-09T12:00:00.000Z",
      },
    };

    const synced = markFullySynced(data, "2026-06-10T12:00:00.000Z");

    expect(hasPendingSyncChanges(synced)).toBe(false);
    expect(hasUnsyncedChanges(synced)).toBe(false);
    expect(synced.meta?.lastSyncedAt).toBe("2026-06-10T12:00:00.000Z");
  });

  it("no toca los datos si aún hay cambios pendientes", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-06-10T12:00:00.000Z",
        pendingChanges: [
          {
            entityType: "profile" as const,
            entityId: "profile",
            action: "upsert" as const,
            deleted: false,
            payload: EMPTY_DATA.profile,
            updatedAt: "2026-06-10T12:00:00.000Z",
          },
        ],
      },
    };

    const synced = markFullySynced(data);
    expect(synced.meta?.pendingChanges?.length).toBe(1);
  });
});
