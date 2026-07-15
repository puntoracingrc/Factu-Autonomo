import { describe, expect, it } from "vitest";
import {
  runExclusiveDriveBackup,
  runExclusiveDriveOperation,
} from "./operation";

describe("exclusive Google Drive backup operation", () => {
  it("evita dos copias simultaneas", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = runExclusiveDriveBackup(async () => {
      await pending;
      return "guardada";
    });

    await expect(
      runExclusiveDriveBackup(async () => "duplicada"),
    ).resolves.toEqual({ started: false });
    release();
    await expect(first).resolves.toEqual({
      started: true,
      value: "guardada",
    });
  });

  it("comparte el bloqueo entre copias y originales fiscales", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const backup = runExclusiveDriveBackup(async () => {
      await pending;
      return "backup";
    });

    await expect(
      runExclusiveDriveOperation(async () => "original"),
    ).resolves.toEqual({ started: false });
    release();
    await expect(backup).resolves.toEqual({
      started: true,
      value: "backup",
    });
  });

  it("libera el bloqueo despues de un fallo", async () => {
    await expect(
      runExclusiveDriveBackup(async () => {
        throw new Error("fallo de Drive");
      }),
    ).rejects.toThrow("fallo de Drive");

    await expect(
      runExclusiveDriveBackup(async () => "reintento"),
    ).resolves.toEqual({ started: true, value: "reintento" });
  });
});
