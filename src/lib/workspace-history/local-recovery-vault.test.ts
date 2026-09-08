import { describe, expect, it } from "vitest";

import {
  workspaceRecoveryStorageKeyPrefix,
  workspaceStorageKeyForUser,
} from "@/lib/workspace-storage";

import { archiveAndReleaseWorkspaceLocalRecoveryCopies } from "./local-recovery-vault";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const OWNER_A = "owner-account-a";
const OWNER_B = "owner-account-b";

describe("workspace local recovery vault", () => {
  it("releases only verified recovery copies for the active owner", async () => {
    const storage = new MemoryStorage();
    const activeKey = workspaceStorageKeyForUser(OWNER_A);
    const recoveryKey = `${workspaceRecoveryStorageKeyPrefix(OWNER_A)}one`;
    const otherOwnerKey = `${workspaceRecoveryStorageKeyPrefix(OWNER_B)}one`;
    storage.setItem(activeKey, "active");
    storage.setItem(recoveryKey, "recovery-copy");
    storage.setItem(otherOwnerKey, "other-owner-copy");
    const preserved: string[] = [];

    const result = await archiveAndReleaseWorkspaceLocalRecoveryCopies({
      ownerScope: OWNER_A,
      activeStorageKey: activeKey,
      storage,
      now: "2026-09-08T12:00:00.000Z",
      preserve: async (record) => {
        preserved.push(record.raw);
        return true;
      },
    });

    expect(result).toEqual({
      inspected: 1,
      preserved: 1,
      released: 1,
      releasedCharacters: "recovery-copy".length,
    });
    expect(preserved).toEqual(["recovery-copy"]);
    expect(storage.getItem(recoveryKey)).toBeNull();
    expect(storage.getItem(activeKey)).toBe("active");
    expect(storage.getItem(otherOwnerKey)).toBe("other-owner-copy");
  });

  it("keeps the localStorage copy when durable preservation fails", async () => {
    const storage = new MemoryStorage();
    const activeKey = workspaceStorageKeyForUser(OWNER_A);
    const recoveryKey = `${workspaceRecoveryStorageKeyPrefix(OWNER_A)}one`;
    storage.setItem(recoveryKey, "recovery-copy");

    const result = await archiveAndReleaseWorkspaceLocalRecoveryCopies({
      ownerScope: OWNER_A,
      activeStorageKey: activeKey,
      storage,
      preserve: async () => false,
    });

    expect(result).toMatchObject({ preserved: 0, released: 0 });
    expect(storage.getItem(recoveryKey)).toBe("recovery-copy");
  });

  it("does not remove a copy that changes during preservation", async () => {
    const storage = new MemoryStorage();
    const activeKey = workspaceStorageKeyForUser(OWNER_A);
    const recoveryKey = `${workspaceRecoveryStorageKeyPrefix(OWNER_A)}one`;
    storage.setItem(recoveryKey, "before");

    const result = await archiveAndReleaseWorkspaceLocalRecoveryCopies({
      ownerScope: OWNER_A,
      activeStorageKey: activeKey,
      storage,
      preserve: async () => {
        storage.setItem(recoveryKey, "after");
        return true;
      },
    });

    expect(result).toMatchObject({ preserved: 1, released: 0 });
    expect(storage.getItem(recoveryKey)).toBe("after");
  });
});
