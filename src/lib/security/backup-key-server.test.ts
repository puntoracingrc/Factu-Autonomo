import { afterEach, describe, expect, it, vi } from "vitest";
import { deriveUserBackupKey } from "./backup-key-server";

const MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

describe("backup key derivation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("deriva claves estables y distintas por usuario", () => {
    vi.stubEnv("BACKUP_ENCRYPTION_ACTIVE_VERSION", "1");
    vi.stubEnv("BACKUP_ENCRYPTION_KEY_V1", MASTER_KEY);

    const first = deriveUserBackupKey("user-a");
    const repeated = deriveUserBackupKey("user-a");
    const other = deriveUserBackupKey("user-b");

    expect(first).toEqual(repeated);
    expect(first.ok).toBe(true);
    expect(other.ok).toBe(true);
    if (first.ok && other.ok) {
      expect(Buffer.from(first.keyBase64, "base64")).toHaveLength(32);
      expect(first.keyBase64).not.toBe(other.keyBase64);
    }
  });

  it("conserva versiones antiguas para restaurar copias", () => {
    vi.stubEnv("BACKUP_ENCRYPTION_ACTIVE_VERSION", "2");
    vi.stubEnv("BACKUP_ENCRYPTION_KEY_V1", MASTER_KEY);
    vi.stubEnv(
      "BACKUP_ENCRYPTION_KEY_V2",
      Buffer.alloc(32, 9).toString("base64"),
    );

    expect(deriveUserBackupKey("user-a").ok).toBe(true);
    const old = deriveUserBackupKey("user-a", "1");
    expect(old).toMatchObject({ ok: true, version: 1 });
  });

  it("falla cerrado ante versión o clave inválidas", () => {
    vi.stubEnv("BACKUP_ENCRYPTION_ACTIVE_VERSION", "1");
    vi.stubEnv("BACKUP_ENCRYPTION_KEY_V1", "not-a-32-byte-key");

    expect(deriveUserBackupKey("user-a")).toEqual({
      ok: false,
      error: "not_configured",
    });
    expect(deriveUserBackupKey("user-a", "0")).toEqual({
      ok: false,
      error: "invalid_version",
    });
  });
});
