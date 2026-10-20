import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  expenseOriginalStatuses,
  openExpenseOriginal,
  uploadExpenseOriginal,
} from "./client";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { EXPENSE_ORIGINAL_REFRESH_EVENT } from "./types";

const state = vi.hoisted(() => ({
  scope: "company-1",
  token: "token",
  device: "synthetic-device-01234567890123456789",
}));
vi.mock("@/lib/cloud/active-workspace-session", () => ({
  getActiveWorkspaceAccessToken: vi.fn(async () => state.token),
}));
vi.mock("@/lib/workspace-owner-runtime", () => ({
  getActiveWorkspaceOwnerScope: () => state.scope,
  isActiveWorkspaceOwnerScope: (scope: string) => scope === state.scope,
}));
vi.mock("@/lib/cloud/device-token", () => ({
  CLOUD_DEVICE_TOKEN_HEADER: "X-Factu-Device-Token",
  getOrCreateLocalCloudDeviceToken: () => state.device,
}));
const pdf = new TextEncoder().encode("%PDF-1.7\nSynthetic original\n%%EOF");
const sha = createHash("sha256").update(pdf).digest("hex");
describe("expense original client: no persistent bytes and no cross-company result", () => {
  const dispatch = vi.fn(),
    close = vi.fn(),
    replace = vi.fn();
  beforeEach(() => {
    state.scope = "company-1";
    state.token = "token";
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      dispatchEvent: dispatch,
      open: vi.fn(() => ({ opener: {}, close, location: { replace } })),
      setTimeout,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("uploads the chosen File with explicit company/device and no-store, then invalidates metadata only", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ ok: true })),
    );
    vi.stubGlobal("fetch", fetcher);
    const file = new File([pdf], "factura ñ.pdf", { type: "application/pdf" });
    await uploadExpenseOriginal("e1", file, "company-1");
    const [path, options] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/api/expenses/e1/original");
    expect(options.cache).toBe("no-store");
    expect(options.body).toBe(file);
    expect(new Headers(options.headers).get(FACTU_COMPANY_HEADER)).toBe(
      "company-1",
    );
    expect(new Headers(options.headers).get("X-Factu-File-Name")).toBe(
      encodeURIComponent(file.name),
    );
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: EXPENSE_ORIGINAL_REFRESH_EVENT,
      detail: { ownerScope: "company-1" },
    });
  });
  it("rejects a stale scope before starting a request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    state.scope = "company-2";
    await expect(
      uploadExpenseOriginal("e1", new File([pdf], "f.pdf"), "company-1"),
    ).rejects.toThrow(/empresa/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects a company switch during a request without invalidating the new company", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        state.scope = "company-2";
        return new Response("{}");
      }),
    );
    await expect(
      uploadExpenseOriginal("e1", new File([pdf], "f.pdf"), "company-1"),
    ).rejects.toThrow(/empresa cambió/);
    expect(dispatch).not.toHaveBeenCalled();
  });
  it("bounds list requests to batches of 200 and ignores unrelated response IDs", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            originals: { e1: "archived", unrequested: "archived" },
          }),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const statuses = await expenseOriginalStatuses(
      Array.from({ length: 401 }, (_, i) => `e${i}`),
      "company-1",
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(statuses).toEqual({ e1: "archived" });
    for (const [, init] of fetcher.mock.calls as unknown as Array<
      [string, RequestInit]
    >)
      expect(
        JSON.parse(init.body as string).expenseIds.length,
      ).toBeLessThanOrEqual(200);
  });
  it("verifies SHA-256 before opening a memory-only blob and releases it later", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(pdf, {
            headers: {
              "Content-Type": "application/pdf",
              "X-Factu-Source-Sha256": sha,
            },
          }),
      ),
    );
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:synthetic");
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    await openExpenseOriginal("e1", "company-1");
    expect(create).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("blob:synthetic");
    vi.advanceTimersByTime(120_000);
    expect(revoke).toHaveBeenCalledWith("blob:synthetic");
  });
  it("closes the reserved tab without exposing corrupt bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(pdf, {
            headers: {
              "Content-Type": "application/pdf",
              "X-Factu-Source-Sha256": "0".repeat(64),
            },
          }),
      ),
    );
    const create = vi.spyOn(URL, "createObjectURL");
    await expect(openExpenseOriginal("e1")).rejects.toThrow(/verificar/);
    expect(close).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });
});
