import { describe, expect, it } from "vitest";
import {
  buildLocalDataBackupManifest,
  summarizeLocalDataBackupManifest,
  validateLocalDataBackupManifest,
} from "./backup-manifest";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1

const SYNTHETIC_ONLY_APP_DATA: LocalDataSafetyAppData = {
  documents: [
    {
      id: "SYNTHETIC_ONLY_draft_1",
      kind: "invoice",
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      customerId: "SYNTHETIC_ONLY_customer_1",
    },
    {
      id: "SYNTHETIC_ONLY_issued_1",
      kind: "invoice",
      status: "emitida",
      documentLifecycle: "issued",
      integrityLock: "locked",
      number: "2026-1",
      year: 2026,
      snapshotHash: "hash:snapshot",
      pdfSnapshotHash: "hash:pdf",
      documentSnapshot: { lines: [{ description: "synthetic" }] },
    },
  ],
  customers: [{ id: "SYNTHETIC_ONLY_customer_1", name: "Synthetic Customer" }],
  providers: [{ id: "SYNTHETIC_ONLY_provider_1", name: "Synthetic Provider" }],
  expenses: [{ id: "SYNTHETIC_ONLY_expense_1", name: "Synthetic Expense" }],
  counters: { invoice: 2 },
};

describe("local data backup manifest", () => {
  it("builds a safe manifest with protected refs", () => {
    const manifest = buildLocalDataBackupManifest(SYNTHETIC_ONLY_APP_DATA, {
      generatedAt: "2026-06-27T00:00:00.000Z",
      source: "test_fixture",
      integrityDigest: "digest",
    });

    expect(manifest.marker).toBe("PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1");
    expect(manifest.totals.documents).toBe(2);
    expect(manifest.totals.protectedDocuments).toBe(1);
    expect(manifest.totals.draftDocuments).toBe(1);
    expect(manifest.riskFlags).toContain("protected_issued_document");
    expect(manifest.riskFlags).toContain("counter_state_present");
    expect(manifest.protectedDocumentRefs).toHaveLength(1);
    expect(JSON.stringify(manifest)).not.toContain("lines");
  });

  it("validates and summarizes without full records", () => {
    const manifest = buildLocalDataBackupManifest(SYNTHETIC_ONLY_APP_DATA, {
      generatedAt: "2026-06-27T00:00:00.000Z",
      source: "test_fixture",
    });

    expect(validateLocalDataBackupManifest(manifest)).toBe(manifest);
    const summary = summarizeLocalDataBackupManifest(manifest);

    expect(summary.totals.protectedDocuments).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("SYNTHETIC_ONLY_issued_1");
  });
});
