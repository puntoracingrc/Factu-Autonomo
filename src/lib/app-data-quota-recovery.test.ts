import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commitAppDataDurably, type AppDataDurabilityResult } from "./app-data-durability";
import { commitAppDataWithQuotaRecovery } from "./app-data-quota-recovery";
import { loadData, saveData } from "./storage";
import { EMPTY_DATA, type AppData } from "./types";
import { archiveAndReleaseWorkspaceLocalRecoveryCopies } from "./workspace-history/local-recovery-vault";
import { workspaceRecoveryStorageKeyPrefix, workspaceStorageKeyForUser } from "./workspace-storage";

const OWNER_A = "owner-company-a";
const OWNER_B = "owner-company-b";
const OWNER_OTHER = "owner-unrelated-account";
const ACTIVE_KEY = workspaceStorageKeyForUser(OWNER_A);

class QuotaStorage implements Storage {
  readonly values = new Map<string, string>();
  quota = Infinity;
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    const characters = [...this.values.entries()].reduce(
      (size, [storedKey, raw]) => size + (storedKey === key ? 0 : raw.length),
      value.length,
    );
    if (characters > this.quota) {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    }
    this.values.set(key, value);
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("central invoice cache quota recovery", () => {
  it("preserves both accessible companies' recovery copies and retries the real durable commit", async () => {
    const storage = new QuotaStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);
    const existing: AppData = {
      ...EMPTY_DATA,
      profile: { ...EMPTY_DATA.profile, name: "Company A" },
    };
    expect(saveData(existing, { storageKey: ACTIVE_KEY })).toEqual({ status: "applied" });
    let current = loadData(ACTIVE_KEY);
    const baseline = current;
    const previousRaw = storage.getItem(ACTIVE_KEY)!;
    const oldActiveKey = workspaceStorageKeyForUser(OWNER_B);
    storage.setItem(oldActiveKey, "original company, invoices and pending changes");
    const recoveryA = `${workspaceRecoveryStorageKeyPrefix(OWNER_A)}migration`;
    const recoveryB = `${workspaceRecoveryStorageKeyPrefix(OWNER_B)}migration`;
    const unrelated = `${workspaceRecoveryStorageKeyPrefix(OWNER_OTHER)}migration`;
    storage.setItem(recoveryA, "a".repeat(12000));
    storage.setItem(recoveryB, "b".repeat(12000));
    storage.setItem(unrelated, "unrelated recovery");
    storage.quota = [...storage.values.values()].reduce((sum, raw) => sum + raw.length, 0) - previousRaw.length + 1;
    const preserved = new Map<string, string>();
    const cursor = { afterCreatedAt: "2026-10-07T10:00:00.000Z", afterEventId: "event-new" };
    const incoming: AppData = {
      ...baseline,
      centralInvoiceAuthorityEventsSync: {
        schemaVersion: 1,
        source: "central_invoice_authority_events",
        cursor,
      },
    };
    const attempt = vi.fn(() => {
      const result = commitAppDataDurably({
        expected: baseline,
        getCurrent: () => current,
        trackLegacyChanges: false,
        build: () => ({ data: incoming, value: "central page" }),
        persist: (candidate, expected) => saveData(candidate, { expected, storageKey: ACTIVE_KEY }),
      });
      if (result.status === "blocked") {
        expect(result.reason).toBe("quota_exceeded");
        expect(current).toBe(baseline);
        expect(storage.getItem(ACTIVE_KEY)).toBe(previousRaw);
        expect(current.centralInvoiceAuthorityEventsSync).toBeUndefined();
      } else if (result.status === "applied") current = result.data;
      return result;
    });
    const result = await commitAppDataWithQuotaRecovery({
      attempt,
      isCurrent: () => true,
      ownerScope: OWNER_A,
      storageKey: ACTIVE_KEY,
      recoveryOwnerScopes: [OWNER_A, OWNER_B, OWNER_B],
      storage,
      archive: (input) => archiveAndReleaseWorkspaceLocalRecoveryCopies({
        ...input,
        preserve: async (record) => {
          preserved.set(record.sourceStorageKey, record.raw);
          expect(record.ownerScope).toBe(record.sourceStorageKey === recoveryA ? OWNER_A : OWNER_B);
          expect(record.rawHash).toMatch(/^[0-9a-f]{64}$/);
          return true;
        },
      }),
    });
    expect(result.status).toBe("applied");
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(loadData(ACTIVE_KEY).centralInvoiceAuthorityEventsSync?.cursor).toEqual(cursor);
    expect(preserved.get(recoveryA)).toBe("a".repeat(12000));
    expect(preserved.get(recoveryB)).toBe("b".repeat(12000));
    expect(storage.getItem(oldActiveKey)).toBe("original company, invoices and pending changes");
    expect(storage.getItem(unrelated)).toBe("unrelated recovery");
  });

  it.each<AppDataDurabilityResult<null>>([
    { status: "blocked", reason: "stale_precondition" },
    { status: "blocked", reason: "verification_failed" },
    { status: "indeterminate", reason: "storage_state_unknown" },
    { status: "applied", data: EMPTY_DATA, value: null, replayed: false },
  ])("does not archive or retry a non-quota result: $status $reason", async (first) => {
    const attempt = vi.fn(() => first);
    const archive = vi.fn();
    expect(await commitAppDataWithQuotaRecovery({
      attempt, archive, isCurrent: () => true, ownerScope: OWNER_A, storageKey: ACTIVE_KEY,
    })).toBe(first);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(archive).not.toHaveBeenCalled();
  });

  it("keeps originals and the failure when preservation cannot be verified", async () => {
    const storage = new QuotaStorage();
    const recovery = `${workspaceRecoveryStorageKeyPrefix(OWNER_A)}one`;
    storage.setItem(recovery, "original");
    const first = { status: "blocked", reason: "quota_exceeded" } as const;
    const attempt = vi.fn(() => first);
    expect(await commitAppDataWithQuotaRecovery({
      attempt, ownerScope: OWNER_A, storageKey: ACTIVE_KEY, storage,
      isCurrent: () => true,
      archive: (input) => archiveAndReleaseWorkspaceLocalRecoveryCopies({
        ...input, preserve: async () => false,
      }),
    })).toBe(first);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(storage.getItem(recovery)).toBe("original");
  });

  it("does not retry after the active company changes during archival", async () => {
    let active = true;
    const attempt = vi.fn(() => ({ status: "blocked", reason: "quota_exceeded" }) as const);
    const result = await commitAppDataWithQuotaRecovery({
      attempt, ownerScope: OWNER_A, storageKey: ACTIVE_KEY, storage: new QuotaStorage(),
      isCurrent: () => active,
      archive: async () => {
        active = false;
        return { inspected: 1, preserved: 1, released: 1, releasedCharacters: 10 };
      },
    });
    expect(result).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("bounds retries to one even if the remaining cache still exceeds quota", async () => {
    const attempt = vi.fn(() => ({ status: "blocked", reason: "quota_exceeded" }) as const);
    const archive = vi.fn(async () => ({ inspected: 1, preserved: 1, released: 1, releasedCharacters: 10 }));
    const result = await commitAppDataWithQuotaRecovery({
      attempt, archive, ownerScope: OWNER_A, storageKey: ACTIVE_KEY,
      storage: new QuotaStorage(), isCurrent: () => true,
    });
    expect(result).toEqual({ status: "blocked", reason: "quota_exceeded" });
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(archive).toHaveBeenCalledTimes(1);
  });

  it("wires manual and automatic invoice reads to the same guarded recovery", () => {
    const store = readFileSync(new URL("../context/AppStore.tsx", import.meta.url), "utf8");
    const start = store.indexOf("const syncCentralInvoiceAuthorityEvents = useCallback");
    const block = store.slice(start, store.indexOf("const pullCentralBusinessEvents = useCallback", start));
    expect(block).toContain("commitAppDataWithQuotaRecovery({");
    expect(block).toContain("isCurrent: workspaceIsActive");
    expect(block).toContain("attempt: () => commitCentralAppDataAsync(");
    const persistence = store.slice(store.indexOf("const commitCentralAppDataAsync"), store.indexOf("const commitLatestDurableAppData"));
    expect(persistence).toContain("trackLegacyChanges: false");
    expect(persistence).toContain("commitDurableAppData(expected, build, options)");
    expect(persistence).toContain("options.trackLegacyChanges === false");
    const boundary = readFileSync(new URL("../components/workspace/WorkspaceStorageBoundary.tsx", import.meta.url), "utf8");
    expect(boundary).toContain("companies.map((company) => company.dataOwnerId)");
    const context = readFileSync(new URL("../context/CloudSyncContext.tsx", import.meta.url), "utf8");
    expect(context).toContain("No borres datos ni vuelvas a emitirlas.");
  });
});
