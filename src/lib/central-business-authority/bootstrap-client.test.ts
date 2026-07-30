import { describe, expect, it, vi } from "vitest";

import { EMPTY_DATA } from "@/lib/types";

import {
  buildCentralBusinessBootstrapBrowserSnapshot,
  centralBusinessBootstrapSnapshotSignature,
  commitCentralBusinessBootstrapFromBrowser,
  previewCentralBusinessBootstrapFromBrowser,
} from "./bootstrap-client";

const digest = "a".repeat(64);
const entities = [
  {
    entityType: "customer" as const,
    entityId: "customer-a",
    payload: { id: "customer-a", name: "Cliente sintetico" },
  },
];
const preview = {
  schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1" as const,
  snapshotDigest: digest,
  centralStateDigest: "b".repeat(64),
  previewDigest: "c".repeat(64),
  summary: {
    local: 1,
    centralActive: 0,
    centralDeleted: 0,
    create: 1,
    identical: 0,
    conflict: 0,
    centralOnly: 0,
  },
  entries: [
    {
      entityType: "customer" as const,
      entityId: "customer-a",
      status: "create" as const,
      centralVersion: null,
      centralDeleted: false,
    },
  ],
  canCommit: true,
};

function dependencies(fetchImpl: typeof fetch) {
  return {
    fetchImpl,
    getAccessToken: async () => "access-token",
    getDeviceToken: () => "device-token",
  };
}

describe("central business bootstrap browser client", () => {
  it("construye un snapshot estable solo con maestros soportados", () => {
    const data = {
      ...EMPTY_DATA,
      customers: [{ id: "customer-b", name: "B", optional: undefined }],
      suppliers: [{ id: "supplier-a", name: "Proveedor" }],
      products: [{ id: "product-a", name: "Producto", price: 2 }],
      userReminders: [
        {
          id: "reminder-a",
          text: "Aviso",
          link: { kind: "none" },
          target: "self",
          completed: false,
          createdAt: "2026-07-30T08:00:00.000Z",
          updatedAt: "2026-07-30T08:00:00.000Z",
        },
      ],
    } as unknown as typeof EMPTY_DATA;

    const first = buildCentralBusinessBootstrapBrowserSnapshot(data);
    const second = buildCentralBusinessBootstrapBrowserSnapshot(data);

    expect(first.map((entry) => `${entry.entityType}:${entry.entityId}`)).toEqual(
      [
        "customer:customer-b",
        "product:product-a",
        "supplier:supplier-a",
        "user_reminder:reminder-a",
      ],
    );
    expect(first[0].payload).not.toHaveProperty("optional");
    expect(centralBusinessBootstrapSnapshotSignature(first)).toBe(
      centralBusinessBootstrapSnapshotSignature(second),
    );
  });

  it("envia la vista previa con sesion y dispositivo y valida la respuesta", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      capturedInit = init;
      return new Response(
        JSON.stringify({
          ok: true,
          schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_ROUTE_V1",
          preview,
        }),
        { status: 200 },
      );
    });

    const result = await previewCentralBusinessBootstrapFromBrowser(
      entities,
      dependencies(fetchImpl),
    );

    expect(result).toEqual({
      ok: true,
      schema: "CENTRAL_BUSINESS_BOOTSTRAP_CLIENT_V1",
      preview,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-business-authority/bootstrap-preview",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ entities }),
      }),
    );
    const headers = capturedInit?.headers;
    expect(new Headers(headers).get("authorization")).toBe(
      "Bearer access-token",
    );
    expect(new Headers(headers).get("x-factu-device-token")).toBe(
      "device-token",
    );
  });

  it("confirma con la precondicion exacta y conserva la respuesta idempotente", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      capturedInit = init;
      return new Response(
        JSON.stringify({
          ok: true,
          schema: "CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_ROUTE_V1",
          result: {
            status: "replayed",
            createdCount: 1,
            identicalCount: 0,
            firstEventSequence: 10,
            lastEventSequence: 10,
          },
        }),
        { status: 200 },
      );
    });

    const result = await commitCentralBusinessBootstrapFromBrowser(
      {
        entities,
        preview,
        idempotencyKey: "CENTRAL_BUSINESS_BOOTSTRAP:synthetic-0001",
      },
      dependencies(fetchImpl),
    );

    expect(result).toMatchObject({
      ok: true,
      result: { status: "replayed", createdCount: 1 },
    });
    expect(JSON.parse(String(capturedInit?.body))).toMatchObject({
      confirmation: "COMMIT_CENTRAL_BUSINESS_BOOTSTRAP_V1",
      snapshotDigest: preview.snapshotDigest,
      previewDigest: preview.previewDigest,
    });
  });

  it("falla cerrado ante una respuesta incompleta o sin credenciales", async () => {
    await expect(
      previewCentralBusinessBootstrapFromBrowser(entities, {
        fetchImpl: vi.fn(async () => new Response("{}", { status: 200 })),
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_BOOTSTRAP_INVALID_RESPONSE",
    });

    await expect(
      previewCentralBusinessBootstrapFromBrowser(entities, {
        getAccessToken: async () => null,
        getDeviceToken: () => null,
      }),
    ).resolves.toMatchObject({
      ok: false,
      status: 401,
      code: "CENTRAL_BUSINESS_BOOTSTRAP_SESSION_REQUIRED",
    });
  });
});
