import { describe, expect, it } from "vitest";
import { runExclusiveSyncOperation } from "./sync-operation";

describe("exclusive sync operation", () => {
  it("rechaza una segunda operación mientras la primera sigue activa", async () => {
    const lock = { current: false };
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = runExclusiveSyncOperation(lock, async () => {
      await pending;
      return "subido";
    });

    await expect(
      runExclusiveSyncOperation(lock, async () => "duplicado"),
    ).resolves.toEqual({ started: false });
    release();
    await expect(first).resolves.toEqual({ started: true, value: "subido" });
    expect(lock.current).toBe(false);
  });

  it("libera el bloqueo tras un fallo y permite reintentar", async () => {
    const lock = { current: false };

    await expect(
      runExclusiveSyncOperation(lock, async () => {
        throw new Error("fallo transitorio");
      }),
    ).rejects.toThrow("fallo transitorio");

    expect(lock.current).toBe(false);
    await expect(
      runExclusiveSyncOperation(lock, async () => "reintento correcto"),
    ).resolves.toEqual({ started: true, value: "reintento correcto" });
  });
});
