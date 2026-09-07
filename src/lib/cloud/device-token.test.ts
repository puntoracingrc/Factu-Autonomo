import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLOUD_DEVICE_TOKEN_STORAGE_KEY,
  claimLegacyLocalCloudDeviceToken,
  cloudDeviceTokenStorageKey,
  forgetLocalCloudDeviceToken,
  getLocalCloudDeviceToken,
  getOrCreateLocalCloudDeviceToken,
  isValidCloudDeviceToken,
} from "./device-token";
import { setActiveWorkspaceOwnerScope } from "../workspace-owner-runtime";

describe("cloud device token", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    setActiveWorkspaceOwnerScope(null);
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

  afterEach(() => {
    setActiveWorkspaceOwnerScope(null);
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

  it("reads an existing token without creating one", () => {
    expect(getLocalCloudDeviceToken()).toBeNull();
    expect(values.size).toBe(0);

    values.set("factura-autonomo-cloud-device-token-v1", "z".repeat(64));
    expect(getLocalCloudDeviceToken()).toBe("z".repeat(64));
  });

  it("mantiene un token distinto para cada cuenta del mismo navegador", () => {
    const tokenA = "a".repeat(64);
    const tokenB = "b".repeat(64);
    values.set(cloudDeviceTokenStorageKey("owner-account-a"), tokenA);
    values.set(cloudDeviceTokenStorageKey("owner-account-b"), tokenB);

    setActiveWorkspaceOwnerScope("owner-account-a");
    expect(getLocalCloudDeviceToken()).toBe(tokenA);
    setActiveWorkspaceOwnerScope("owner-account-b");
    expect(getLocalCloudDeviceToken()).toBe(tokenB);

    forgetLocalCloudDeviceToken();
    expect(values.has(cloudDeviceTokenStorageKey("owner-account-b"))).toBe(false);
    expect(values.get(cloudDeviceTokenStorageKey("owner-account-a"))).toBe(
      tokenA,
    );
  });

  it("solo atribuye el token antiguo tras confirmar el propietario", () => {
    const legacyToken = "l".repeat(64);
    values.set(CLOUD_DEVICE_TOKEN_STORAGE_KEY, legacyToken);

    setActiveWorkspaceOwnerScope("owner-account-a");
    expect(getLocalCloudDeviceToken()).toBeNull();
    expect(claimLegacyLocalCloudDeviceToken("owner-account-a")).toBe(true);
    expect(getLocalCloudDeviceToken()).toBe(legacyToken);
    expect(values.get(CLOUD_DEVICE_TOKEN_STORAGE_KEY)).toBeUndefined();
    expect(values.get(cloudDeviceTokenStorageKey("owner-account-a"))).toBe(
      legacyToken,
    );

    setActiveWorkspaceOwnerScope("owner-account-b");
    expect(getLocalCloudDeviceToken()).toBeNull();
  });
});
