import { describe, expect, it } from "vitest";
import {
  buildPreImportRecoverySnapshot,
  summarizePreImportRecoverySnapshot,
  validatePreImportRecoverySnapshot,
} from "./recovery-snapshot";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1

describe("pre-import recovery snapshot", () => {
  it("builds an in-memory copy with manifest and digest", () => {
    const current: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_doc_1",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
        },
      ],
    };

    const snapshot = buildPreImportRecoverySnapshot(current, {
      createdAt: "2026-06-27T00:00:00.000Z",
      reason: "test_fixture",
    });

    current.documents![0].status = "changed-after-snapshot";

    expect(snapshot.marker).toBe("PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1");
    expect(snapshot.appData.documents![0].status).toBe("borrador");
    expect(snapshot.integrityDigest.value).toMatch(/^[a-f0-9]{64}$/);
    expect(validatePreImportRecoverySnapshot(snapshot)).toBe(snapshot);

    const summary = summarizePreImportRecoverySnapshot(snapshot);
    expect(summary.integrityDigestPresent).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("changed-after-snapshot");
  });
});
