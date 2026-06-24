import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SERVER_DOCUMENT_INGEST_ROUTE_FLAG,
  isServerDocumentIngestRouteEnabled,
  handleServerDocumentIngestForServer,
  type SafeServerDocumentResponse,
  type SupabaseServerDocumentClient,
} from "@/lib/server-documents";
import { handleServerDocumentIngestRoute } from "@/lib/server-documents/route-handler";
import { GET, POST } from "./route";

function request(
  body: string | Record<string, unknown>,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return new Request("http://localhost/api/server-documents/ingest", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function acceptedResponse(
  overrides: Partial<Extract<SafeServerDocumentResponse, { status: "accepted" }>> = {},
): SafeServerDocumentResponse {
  return {
    status: "accepted",
    serverDocumentId: "server-doc-1",
    localDocumentId: "local-doc-1",
    version: 1,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    updatedAt: "2026-06-24T23:30:00.000Z",
    versionId: "version-1",
    ...overrides,
  };
}

function expectNoSensitiveFields(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("payload");
  expect(serialized).not.toContain("documentSnapshot");
  expect(serialized).not.toContain("pdfSnapshot");
  expect(serialized).not.toContain("document_snapshot");
  expect(serialized).not.toContain("pdf_snapshot");
  expect(serialized).not.toContain("xml_payload");
  expect(serialized).not.toContain("response_body");
  expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
}

describe("POST /api/server-documents/ingest", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("queda desactivada si el flag no existe", () => {
    vi.unstubAllEnvs();

    expect(isServerDocumentIngestRouteEnabled()).toBe(false);
  });

  it.each(["false", "1", "yes", "TRUE", " True "])(
    "queda desactivada con flag %s",
    (value) => {
      vi.stubEnv(SERVER_DOCUMENT_INGEST_ROUTE_FLAG, value);

      expect(isServerDocumentIngestRouteEnabled()).toBe(false);
    },
  );

  it("solo se activa explicitamente con flag true en servidor", () => {
    vi.stubEnv(SERVER_DOCUMENT_INGEST_ROUTE_FLAG, "true");

    expect(isServerDocumentIngestRouteEnabled()).toBe(true);
  });

  it("createDraft valido con flag activa en test usa Bearer y devuelve respuesta segura", async () => {
    vi.stubEnv(SERVER_DOCUMENT_INGEST_ROUTE_FLAG, "true");
    const authenticate = vi.fn(async () => ({ id: "token-user" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => ({
      ...acceptedResponse(),
      documentSnapshot: { customer: "secreto" },
      payload: { total: 121 },
      pdfSnapshot: { renderer: "secreto" },
    }) as never);

    const response = await handleServerDocumentIngestRoute(
      request(
        {
          action: "createDraft",
          authenticatedUserId: "body-user",
          entitlement: "pro",
          localDocumentId: "local-doc-1",
          plan: "pro",
          role: "admin",
          status: "active",
          user_id: "body-user",
          userId: "body-user",
        },
        { Authorization: "Bearer token-de-prueba" },
      ),
      {
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(authenticate).toHaveBeenCalledWith("Bearer token-de-prueba");
    expect(handleIngest).toHaveBeenCalledWith(
      expect.objectContaining({
        authSource: { authenticatedUserId: "token-user" },
        body: {
          action: "createDraft",
          localDocumentId: "local-doc-1",
        },
      }),
    );
    expect(body).toEqual(acceptedResponse());
    expectNoSensitiveFields(body);
  });

  it("updateDraft valido con flag activa en test usa expectedVersion y respuesta segura", async () => {
    vi.stubEnv(SERVER_DOCUMENT_INGEST_ROUTE_FLAG, "true");
    const authenticate = vi.fn(async () => ({ id: "token-user" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () =>
      acceptedResponse({
        localDocumentId: "local-doc-2",
        serverDocumentId: "server-doc-2",
        version: 2,
        versionId: "version-2",
      }),
    );

    const response = await handleServerDocumentIngestRoute(
      request(
        {
          action: "updateDraft",
          authenticatedUserId: "body-user",
          expectedVersion: 1,
          payload: { total: 242 },
          plan: "pro",
          role: "admin",
          serverDocumentId: "server-doc-2",
          statusLegacy: "borrador",
          user_id: "body-user",
          userId: "body-user",
        },
        { Authorization: "Bearer token-de-prueba" },
      ),
      {
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(handleIngest).toHaveBeenCalledWith(
      expect.objectContaining({
        authSource: { authenticatedUserId: "token-user" },
        body: {
          action: "updateDraft",
          expectedVersion: 1,
          payload: { total: 242 },
          serverDocumentId: "server-doc-2",
          statusLegacy: "borrador",
        },
      }),
    );
    expect(body).toEqual(
      acceptedResponse({
        localDocumentId: "local-doc-2",
        serverDocumentId: "server-doc-2",
        version: 2,
        versionId: "version-2",
      }),
    );
    expectNoSensitiveFields(body);
  });

  it("updateDraft sin expectedVersion con flag activa devuelve error seguro", async () => {
    vi.stubEnv(SERVER_DOCUMENT_INGEST_ROUTE_FLAG, "true");
    const authenticate = vi.fn(async () => ({ id: "token-user" }) as never);
    const from = vi.fn();
    const getSupabaseClient = vi.fn(
      () => ({ from }) as unknown as SupabaseServerDocumentClient,
    );

    const response = await handleServerDocumentIngestRoute(
      request(
        {
          action: "updateDraft",
          payload: { total: 242 },
          serverDocumentId: "server-doc-2",
          user_id: "body-user",
        },
        { Authorization: "Bearer token-de-prueba" },
      ),
      {
        authenticate,
        getSupabaseClient,
        handleIngest: handleServerDocumentIngestForServer,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "rejected",
      reason: "missing_expected_version",
    });
    expect(authenticate).toHaveBeenCalledWith("Bearer token-de-prueba");
    expect(getSupabaseClient).toHaveBeenCalledOnce();
    expect(from).not.toHaveBeenCalled();
    expectNoSensitiveFields(body);
  });

  it("error de ingest con flag activa no filtra detalles internos", async () => {
    vi.stubEnv(SERVER_DOCUMENT_INGEST_ROUTE_FLAG, "true");
    const authenticate = vi.fn(async () => ({ id: "token-user" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => {
      throw new Error("token secreto o payload completo");
    });

    const response = await handleServerDocumentIngestRoute(
      request(
        {
          action: "createDraft",
          localDocumentId: "local-doc-1",
          payload: { total: 121 },
        },
        { Authorization: "Bearer token-de-prueba" },
      ),
      {
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      status: "rejected",
      reason: "store_error",
    });
    expect(JSON.stringify(body)).not.toContain("token secreto");
    expect(JSON.stringify(body)).not.toContain("payload completo");
    expectNoSensitiveFields(body);
  });

  it("si esta desactivada no autentica, no inicializa Supabase y no llama al ingest", async () => {
    const authenticate = vi.fn(async () => ({ id: "user-a" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => acceptedResponse());

    const response = await handleServerDocumentIngestRoute(
      request({ action: "createDraft" }),
      {
        isEnabled: () => false,
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Ruta no disponible." });
    expect(authenticate).not.toHaveBeenCalled();
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(handleIngest).not.toHaveBeenCalled();
  });

  it("POST exportado tambien queda cerrado por defecto", async () => {
    const response = await POST(request({ action: "createDraft" }));

    expect(response.status).toBe(404);
    expect(await json(response)).toEqual({ error: "Ruta no disponible." });
  });

  it("GET devuelve metodo no permitido sin tocar Supabase", async () => {
    const response = await GET();
    const body = await json(response);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(body).toEqual({ error: "Metodo no permitido." });
  });

  it("metodo no permitido activo devuelve error seguro sin tocar auth, Supabase ni ingest", async () => {
    const authenticate = vi.fn(async () => ({ id: "user-a" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => acceptedResponse());

    const response = await handleServerDocumentIngestRoute(
      request({ action: "createDraft" }, {}, "PUT"),
      {
        isEnabled: () => true,
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(body).toEqual({ error: "Metodo no permitido." });
    expect(authenticate).not.toHaveBeenCalled();
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(handleIngest).not.toHaveBeenCalled();
    expectNoSensitiveFields(body);
  });

  it("content-type invalido devuelve error seguro sin autenticar ni tocar Supabase", async () => {
    const authenticate = vi.fn(async () => ({ id: "user-a" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => acceptedResponse());

    const response = await handleServerDocumentIngestRoute(
      new Request("http://localhost/api/server-documents/ingest", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "createDraft" }),
      }),
      {
        isEnabled: () => true,
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "rejected",
      reason: "invalid_request",
    });
    expect(authenticate).not.toHaveBeenCalled();
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(handleIngest).not.toHaveBeenCalled();
    expectNoSensitiveFields(body);
  });

  it("rechaza JSON invalido sin autenticar ni tocar Supabase cuando esta activa", async () => {
    const authenticate = vi.fn(async () => ({ id: "user-a" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => acceptedResponse());

    const response = await handleServerDocumentIngestRoute(request("{"), {
      isEnabled: () => true,
      authenticate,
      getSupabaseClient,
      handleIngest,
    });
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "rejected",
      reason: "invalid_request",
    });
    expect(authenticate).not.toHaveBeenCalled();
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(handleIngest).not.toHaveBeenCalled();
    expectNoSensitiveFields(body);
  });

  it("rechaza token ausente sin inicializar repositorio", async () => {
    const authenticate = vi.fn(async () => null);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => acceptedResponse());

    const response = await handleServerDocumentIngestRoute(
      request({ action: "createDraft" }),
      {
        isEnabled: () => true,
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      status: "rejected",
      reason: "unauthorized",
    });
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(handleIngest).not.toHaveBeenCalled();
  });

  it("usa el usuario autenticado por Bearer e ignora autoridad enviada en el body", async () => {
    const authenticate = vi.fn(async () => ({ id: "token-user" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => acceptedResponse());

    const response = await handleServerDocumentIngestRoute(
      request(
        {
          action: "createDraft",
          authenticatedUserId: "body-user",
          entitlement: "pro",
          entitlements: ["server-documents"],
          localDocumentId: "local-doc-1",
          plan: "pro",
          role: "admin",
          status: "active",
          user_id: "body-user",
          userId: "body-user",
        },
        { Authorization: "Bearer test-token" },
      ),
      {
        isEnabled: () => true,
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );

    expect(response.status).toBe(200);
    expect(authenticate).toHaveBeenCalledWith("Bearer test-token");
    expect(handleIngest).toHaveBeenCalledWith(
      expect.objectContaining({
        authSource: { authenticatedUserId: "token-user" },
        body: {
          action: "createDraft",
          localDocumentId: "local-doc-1",
        },
      }),
    );
  });

  it("no devuelve payload ni snapshots aunque el handler interno los entregase por error", async () => {
    const authenticate = vi.fn(async () => ({ id: "user-a" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => ({
      ...acceptedResponse(),
      documentSnapshot: { customer: "secreto" },
      payload: { total: 121 },
      pdfSnapshot: { renderer: "secreto" },
    }) as never);

    const response = await handleServerDocumentIngestRoute(
      request({ action: "createDraft" }, { Authorization: "Bearer token" }),
      {
        isEnabled: () => true,
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body).toEqual(acceptedResponse());
    expectNoSensitiveFields(body);
  });

  it("no filtra errores internos del handler", async () => {
    const authenticate = vi.fn(async () => ({ id: "user-a" }) as never);
    const getSupabaseClient = vi.fn(() => ({} as SupabaseServerDocumentClient));
    const handleIngest = vi.fn(async () => {
      throw new Error("database password leaked");
    });

    const response = await handleServerDocumentIngestRoute(
      request({ action: "createDraft" }, { Authorization: "Bearer token" }),
      {
        isEnabled: () => true,
        authenticate,
        getSupabaseClient,
        handleIngest,
      },
    );
    const body = await json(response);

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      status: "rejected",
      reason: "store_error",
    });
    expect(JSON.stringify(body)).not.toContain("database password leaked");
    expectNoSensitiveFields(body);
  });

  it("la ruta y su handler no son cliente ni exponen variables privadas al bundle navegador", () => {
    const source = [
      "src/app/api/server-documents/ingest/route.ts",
      "src/lib/server-documents/route-handler.ts",
    ]
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
