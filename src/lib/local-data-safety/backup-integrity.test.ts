import { describe, expect, it } from "vitest";
import {
  buildLocalDataBackupIntegrityDigest,
  canonicalizeLocalDataBackupForHash,
  verifyLocalDataBackupIntegrity,
} from "./backup-integrity";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D3_BACKUP_INTEGRITY_HASH_V1

function appData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_doc_1",
        kind: "invoice",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        updatedAt: "ignored-a",
      },
    ],
    customers: [{ id: "SYNTHETIC_ONLY_customer_1", name: "Synthetic Customer" }],
    counters: { invoice: 1 },
  };
}

describe("local data backup integrity", () => {
  it("creates deterministic canonical data and digest", () => {
    const first = appData();
    const second = appData();
    second.documents![0].updatedAt = "ignored-b";

    expect(canonicalizeLocalDataBackupForHash(first)).toBe(
      canonicalizeLocalDataBackupForHash(second),
    );

    const digest = buildLocalDataBackupIntegrityDigest(
      first,
      "2026-06-27T00:00:00.000Z",
    );
    expect(digest.marker).toBe("PHASE2D3_BACKUP_INTEGRITY_HASH_V1");
    expect(digest.value).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyLocalDataBackupIntegrity(second, digest)).toBe(true);
  });

  it("detects a material local data change", () => {
    const digest = buildLocalDataBackupIntegrityDigest(
      appData(),
      "2026-06-27T00:00:00.000Z",
    );
    const changed = appData();
    changed.documents![0].status = "emitida";

    expect(verifyLocalDataBackupIntegrity(changed, digest)).toBe(false);
  });
});
