import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildLocalStorageResilienceSafeReport,
  classifyStoredAppDataParseResult,
  createDisabledLocalStorageResilienceAdapter,
  createInMemoryLocalStorageResilienceAdapter,
  createInMemoryLocalStorageResilienceAuditEventStore,
  evaluateBackupBeforeWritePolicy,
  planLocalStorageResilienceOperation,
} from "../src/lib/local-storage-resilience";

// PHASE2E10_STORAGE_RESILIENCE_ACCEPTANCE_V1

const moduleRoot = path.resolve(new URL("../src/lib/local-storage-resilience", import.meta.url).pathname);

function runtimeSources(): string {
  return fs
    .readdirSync(moduleRoot)
    .filter((fileName) => fileName.endsWith(".ts") && !fileName.endsWith(".test.ts"))
    .map((fileName) => fs.readFileSync(path.join(moduleRoot, fileName), "utf8"))
    .join("\n");
}

describe("PHASE2E10_STORAGE_RESILIENCE_ACCEPTANCE_V1", () => {
  it("blocks disabled adapter read/write/delete", () => {
    const adapter = createDisabledLocalStorageResilienceAdapter();

    expect(adapter.getItem("SYNTHETIC_ONLY_APP_DATA").decision).toBe("blocked");
    expect(adapter.setItem("SYNTHETIC_ONLY_APP_DATA", "value").decision).toBe("blocked");
    expect(adapter.removeItem("SYNTHETIC_ONLY_APP_DATA").decision).toBe("blocked");
  });

  it("uses in-memory adapter only with synthetic keys", () => {
    const adapter = createInMemoryLocalStorageResilienceAdapter();

    expect(adapter.setItem("SYNTHETIC_ONLY_APP_DATA", "{\"safe\":true}").decision).toBe("allowed_in_memory");
    expect(adapter.getItem("SYNTHETIC_ONLY_APP_DATA").value).toBe("{\"safe\":true}");
    expect(adapter.setItem("real-key", "value").decision).toBe("blocked");
  });

  it("requires backup-before-write for write dry-runs", () => {
    const plan = planLocalStorageResilienceOperation({
      operation: "write",
      mode: "in_memory",
      key: "SYNTHETIC_ONLY_APP_DATA",
    });

    expect(plan.decision).toBe("blocked");
    expect(plan.backupBeforeWriteRequired).toBe(true);
    expect(plan.blockers).toContain("BACKUP_BEFORE_WRITE_REQUIRED");
  });

  it("classifies invalid JSON and legacy shapes without applying recovery", () => {
    expect(classifyStoredAppDataParseResult({ raw: "{" }).decision).toBe("blocked_corrupted");
    expect(classifyStoredAppDataParseResult({ value: { invoices: [] } }).decision).toBe("manual_review_required");
  });

  it("builds safe reports and audit events without payloads", () => {
    const operationPlan = planLocalStorageResilienceOperation({ operation: "write", mode: "in_memory" });
    const report = buildLocalStorageResilienceSafeReport({
      adapterSummary: createDisabledLocalStorageResilienceAdapter().summary(),
      operationPlans: [operationPlan],
      backupPolicy: evaluateBackupBeforeWritePolicy(),
    });
    const auditEvents = createInMemoryLocalStorageResilienceAuditEventStore();
    auditEvents.record({ type: "storage_fake_write_planned" });

    expect(report.containsPayload).toBe(false);
    expect(report.realStorageTouched).toBe(false);
    expect(auditEvents.summary().containsPayload).toBe(false);
    expect(auditEvents.summary().persisted).toBe(false);
  });

  it("keeps runtime module away from real browser storage, filesystem, Supabase, network and UI", () => {
    const source = runtimeSources();

    expect(source).not.toMatch(/\bwindow\s*\./);
    expect(source).not.toMatch(/\blocalStorage\s*\./);
    expect(source).not.toMatch(/\bsessionStorage\b/);
    expect(source).not.toMatch(/\bindexedDB\b/);
    expect(source).not.toMatch(/\bFileReader\b|showOpenFilePicker|\bBlob\b|createObjectURL/);
    expect(source).not.toMatch(/from\s+["']node:fs["']|from\s+["']fs["']|fs\./);
    expect(source).not.toMatch(/@supabase|createClient\(/i);
    expect(source).not.toMatch(/\bfetch\s*\(|axios|node:http|node:https/);
    expect(source).not.toMatch(/next\/link|next\/navigation|useRouter|src\/components|src\/app/);
  });
});
