import { describe, expect, it } from "vitest";

import {
  formatStorageBytes,
  readDeviceStorageDiagnostics,
  utf8StorageBytes,
} from "./device-storage-diagnostics";

describe("device storage diagnostics", () => {
  it("mide la copia activa en bytes UTF-8", async () => {
    const result = await readDeviceStorageDiagnostics("empresa-real", {
      storage: {
        getItem: (key) => (key === "empresa-real" ? "año" : null),
      },
      estimate: async () => ({ usage: 5_242_880, quota: 104_857_600 }),
    });

    expect(result).toEqual({
      activeWorkspaceBytes: utf8StorageBytes("año"),
      originUsageBytes: 5_242_880,
      originQuotaBytes: 104_857_600,
    });
  });

  it("mide una copia comprimida ASCII sin expandir otro buffer grande", () => {
    const compressed = "factu-gzip-v1:YWJjZA==";
    expect(utf8StorageBytes(compressed)).toBe(compressed.length);
  });

  it("no confunde un fallo de medicion con perdida de datos", async () => {
    const result = await readDeviceStorageDiagnostics("empresa", {
      storage: { getItem: () => "copia-durable" },
      estimate: async () => {
        throw new Error("estimate unavailable");
      },
    });

    expect(result.activeWorkspaceBytes).toBeGreaterThan(0);
    expect(result.originUsageBytes).toBeNull();
    expect(result.originQuotaBytes).toBeNull();
  });

  it("formatea tamaños sin mostrar falsa precision", () => {
    expect(formatStorageBytes(null)).toBe("No disponible");
    expect(formatStorageBytes(0)).toBe("0 B");
    expect(formatStorageBytes(1_536)).toBe("1,5 KB");
    expect(formatStorageBytes(5 * 1_024 * 1_024)).toBe("5 MB");
  });
});
