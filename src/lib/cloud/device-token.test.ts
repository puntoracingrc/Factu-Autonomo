import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetLocalCloudDeviceToken,
  getOrCreateLocalCloudDeviceToken,
  isValidCloudDeviceToken,
} from "./device-token";

describe("cloud device token", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    });
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
        .mockReturnValueOnce("22222222-2222-4222-8222-222222222222"),
    });
  });

  it("reuses a valid local token", () => {
    values.set("factura-autonomo-cloud-device-token-v1", "x".repeat(64));
    expect(getOrCreateLocalCloudDeviceToken()).toBe("x".repeat(64));
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("replaces missing or oversized values with a random token", () => {
    values.set("factura-autonomo-cloud-device-token-v1", "x".repeat(300));
    const token = getOrCreateLocalCloudDeviceToken();
    expect(token).toBe(
      "11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222",
    );
    expect(isValidCloudDeviceToken(token)).toBe(true);
  });

  it("forgets the local token after retiring this device", () => {
    values.set("factura-autonomo-cloud-device-token-v1", "x".repeat(64));
    forgetLocalCloudDeviceToken();
    expect(
      values.get("factura-autonomo-cloud-device-token-v1"),
    ).toBeUndefined();
  });
});
