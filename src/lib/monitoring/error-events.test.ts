import { describe, expect, it } from "vitest";
import {
  normalizeErrorEventInput,
  sanitizeMonitorMetadata,
  sanitizeMonitorText,
} from "./error-events";

describe("error event sanitization", () => {
  it("oculta textos con tokens o claves", () => {
    expect(sanitizeMonitorText("Authorization: Bearer secreto")).toBe(
      "Mensaje oculto por seguridad",
    );
    expect(sanitizeMonitorText("SUPABASE_SERVICE_ROLE_KEY=abc")).toBe(
      "Mensaje oculto por seguridad",
    );
  });

  it("recorta mensajes largos y metadata", () => {
    expect(sanitizeMonitorText("x".repeat(400))).toHaveLength(280);
    expect(
      sanitizeMonitorMetadata({
        route: "/gastos",
        token: "secret",
        count: 3,
      }),
    ).toEqual({ route: "/gastos", count: 3 });
  });

  it("normaliza entradas para guardar eventos", () => {
    expect(
      normalizeErrorEventInput({
        severity: "warning",
        area: "sync",
        code: "pull_failed",
        message: "No se pudo descargar",
      }),
    ).toMatchObject({
      severity: "warning",
      area: "sync",
      code: "pull_failed",
      message: "No se pudo descargar",
    });
  });
});

