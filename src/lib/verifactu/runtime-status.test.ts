import { describe, expect, it, vi } from "vitest";
import {
  loadVerifactuRuntimeState,
  resolveVerifactuConnectionStatus,
} from "./runtime-status";

describe("VeriFactu runtime status", () => {
  it("mantiene un estado de carga explícito sin inferir un modo", () => {
    const connection = resolveVerifactuConnectionStatus(true, {
      phase: "loading",
    });

    expect(connection.badge).toBe("Comprobando");
    expect(`${connection.badge} ${connection.description}`).not.toMatch(
      /modo simulado|envío real|no envía/i,
    );
  });

  it("presenta el contrato unknown como no verificado", () => {
    const connection = resolveVerifactuConnectionStatus(true, {
      phase: "unknown",
    });

    expect(connection.badge).toBe("Estado no verificado");
    expect(`${connection.badge} ${connection.description}`).not.toMatch(
      /modo simulado|envío real|no envía/i,
    );
  });

  it("presenta fallos como no disponibles sin fallback simulado", () => {
    const connection = resolveVerifactuConnectionStatus(true, {
      phase: "unavailable",
    });

    expect(connection.badge).toBe("Estado no disponible");
    expect(`${connection.badge} ${connection.description}`).not.toMatch(
      /modo simulado|envío real|no envía/i,
    );
  });

  it("acepta la respuesta mínima disabled y conserva bearer/no-store", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ submissionMode: "disabled" }),
    );

    await expect(
      loadVerifactuRuntimeState("test-token", fetcher),
    ).resolves.toEqual({ phase: "disabled" });
    expect(fetcher).toHaveBeenCalledWith("/api/verifactu/status", {
      cache: "no-store",
      headers: { Authorization: "Bearer test-token" },
    });
  });

  it("explica el modo disabled sin sugerir simulación ni aceptación", () => {
    const connection = resolveVerifactuConnectionStatus(true, {
      phase: "disabled",
    });

    expect(connection.badge).toBe("Registro desactivado");
    expect(connection.description).toContain("no hay envío a AEAT");
    expect(connection.description).toContain("QR tributario");
    expect(connection.description).toContain("marca de aceptación");
    expect(`${connection.badge} ${connection.description}`).not.toMatch(
      /simulad|registrado|aceptad[oa] por AEAT/i,
    );
  });

  it("no llama a la API sin bearer", async () => {
    const fetcher = vi.fn();

    await expect(loadVerifactuRuntimeState(null, fetcher)).resolves.toEqual({
      phase: "unavailable",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 429])(
    "trata HTTP %s como no disponible",
    async (status) => {
      const fetcher = vi.fn(async () => new Response(null, { status }));

      await expect(
        loadVerifactuRuntimeState("test-token", fetcher),
      ).resolves.toEqual({ phase: "unavailable" });
    },
  );

  it("trata JSON inválido como no disponible", async () => {
    const fetcher = vi.fn(async () =>
      new Response("no es json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      loadVerifactuRuntimeState("test-token", fetcher),
    ).resolves.toEqual({ phase: "unavailable" });
  });

  it("rechaza payloads que intentan publicar un entorno", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ submissionMode: "production" }),
    );

    await expect(
      loadVerifactuRuntimeState("test-token", fetcher),
    ).resolves.toEqual({ phase: "unavailable" });
  });

  it("trata errores de red como no disponibles", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network");
    });

    await expect(
      loadVerifactuRuntimeState("test-token", fetcher),
    ).resolves.toEqual({ phase: "unavailable" });
  });
});
