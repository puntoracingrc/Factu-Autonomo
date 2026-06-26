import { describe, expect, it } from "vitest";
import { createLocalStagingDocumentSyncAdapter } from "./sync-adapter";
import { createInMemoryDocumentSyncStore } from "./sync-store";
import { buildDocumentSyncSafeReport } from "./sync-report";

const scope = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
};

describe("local/staging document sync safe report", () => {
  it("reporta drafts, protected y conflicts", () => {
    const adapter = createLocalStagingDocumentSyncAdapter(
      createInMemoryDocumentSyncStore([
        {
          documentId: "SYNTHETIC_ONLY_DRAFT",
          localDocumentId: "SYNTHETIC_ONLY_LOCAL_DRAFT",
          userId: scope.userId,
          scopeId: scope.scopeId,
          version: 1,
          lifecycle: "draft",
          integrityLock: "unlocked",
          statusLegacy: "borrador",
          payloadHash: "hash:draft",
        },
        {
          documentId: "SYNTHETIC_ONLY_PROTECTED",
          localDocumentId: "SYNTHETIC_ONLY_LOCAL_PROTECTED",
          userId: scope.userId,
          scopeId: scope.scopeId,
          version: 3,
          lifecycle: "issued",
          integrityLock: "locked",
          statusLegacy: "enviado",
          payloadHash: "hash:protected",
        },
      ]),
    );

    adapter.apply({
      operationKind: "update_draft",
      documentId: "SYNTHETIC_ONLY_MISSING",
      localDocumentId: "SYNTHETIC_ONLY_MISSING_LOCAL",
      expectedVersion: 1,
      requestedResponseShape: "safe_summary",
      context: { ...scope, userIdSource: "test" },
    });

    const report = buildDocumentSyncSafeReport(adapter, scope);

    expect(report.totalDrafts).toBe(1);
    expect(report.totalProtected).toBe(1);
    expect(report.totalConflicts).toBe(1);
    expect(report.latestVersion).toBe(3);
    expect(report.rejectedReasons.document_not_found).toBe(1);
  });

  it("JSON seguro sin snapshots ni payload amplio", () => {
    const store = createInMemoryDocumentSyncStore([
      {
        documentId: "SYNTHETIC_ONLY_DRAFT",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_DRAFT",
        userId: scope.userId,
        scopeId: scope.scopeId,
        version: 1,
        lifecycle: "draft",
        integrityLock: "unlocked",
        statusLegacy: "borrador",
        payloadHash: "hash:draft",
        snapshotHash: "hash:snapshot",
        pdfSnapshotHash: "hash:pdf",
      },
    ]);

    const serialized = JSON.stringify(buildDocumentSyncSafeReport(store, scope));

    expect(serialized).toContain("snapshotHashPresent");
    expect(serialized).not.toContain(`${["document", "Snapshot"].join("")}":`);
    expect(serialized).not.toContain(`${["pdf", "Snapshot"].join("")}":`);
    expect(serialized).not.toContain("payload amplio");
    expect(serialized).not.toContain(["service", "_role"].join(""));
  });

  it("no usa Supabase, red ni fs en runtime observable", () => {
    const runtime = `${buildDocumentSyncSafeReport.toString()}`;

    expect(runtime).not.toContain(["@", "supabase"].join(""));
    expect(runtime).not.toContain(["fe", "tch"].join(""));
    expect(runtime).not.toContain("axios");
    expect(runtime).not.toContain(["node:", "fs"].join(""));
  });
});
