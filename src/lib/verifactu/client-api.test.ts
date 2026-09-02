import { describe, expect, it, vi } from "vitest";

import { CLOUD_DEVICE_TOKEN_HEADER } from "../cloud/device-token";
import { submitVerifactuToServer } from "./client-api";

describe("VeriFactu browser submission client", () => {
  it("requires both a confirmed session and a registered device", async () => {
    const fetchImpl = vi.fn();

    await expect(
      submitVerifactuToServer({
        localDocumentId: "invoice-1",
        authToken: null,
        dependencies: {
          fetchImpl: fetchImpl as typeof fetch,
          getDeviceToken: () => "device-token",
        },
      }),
    ).resolves.toBeNull();
    await expect(
      submitVerifactuToServer({
        localDocumentId: "invoice-1",
        authToken: "access-token",
        dependencies: {
          fetchImpl: fetchImpl as typeof fetch,
          getDeviceToken: () => null,
        },
      }),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends only the central document reference", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer access-token",
      );
      expect(new Headers(init?.headers).get(CLOUD_DEVICE_TOKEN_HEADER)).toBe(
        "device-token",
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        localDocumentId: "invoice-1",
      });
      return new Response(
        JSON.stringify({
          ok: true,
          status: "accepted",
          recordId: "00000000-0000-4000-8000-000000000001",
          fullNumber: "F-TEST-0001",
          csv: "CSV-TEST",
          qrUrl: "https://prewww2.aeat.es/qr",
        }),
        { status: 200 },
      );
    });

    await expect(
      submitVerifactuToServer({
        localDocumentId: "invoice-1",
        authToken: "access-token",
        dependencies: {
          fetchImpl: fetchImpl as typeof fetch,
          getDeviceToken: () => "device-token",
        },
      }),
    ).resolves.toMatchObject({ ok: true, status: "accepted" });
  });
});
