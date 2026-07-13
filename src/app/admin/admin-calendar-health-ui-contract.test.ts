import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("integración del monitor fiscal en Admin", () => {
  it("consulta el endpoint una sola vez por carga del panel operativo", () => {
    expect(
      source.match(/"\/api\/admin\/fiscal-calendar-health"/g),
    ).toHaveLength(1);
    expect(source).toContain(
      'fetchAdminResponse("/api/admin/fiscal-calendar-health", { headers })',
    );
    expect(source).toContain("calendarHealthResponse");
    expect(source).toContain("setCalendarHealthNotice");
  });

  it("no crea un falso aviso si el monitor aún no se ha consultado", () => {
    expect(source).toContain(
      '(calendarHealth !== null && calendarHealth.level !== "ok")',
    );
    expect(source).toContain("calendarHealthProbeFailed ||");
  });

  it("marca el sistema y muestra el panel aunque falle el endpoint", () => {
    expect(source).toContain('signals.sistema = {');
    expect(source).toContain('"fiscal-calendar-probe-failed"');
    expect(source).toContain("calendarHealthProbeFailed || !nextCalendarHealth");
    expect(source).toContain("const calendarHealthProbeFailed = !calendarHealthResponse?.ok");
    expect(source).toContain('!loading && section === "sistema"');
    expect(source).toContain("<FiscalCalendarHealthPanel");
    expect(source).toContain("notice={calendarHealthNotice}");
  });

  it("cierra la carga aunque falle el transporte de una API admin", () => {
    expect(source).toContain("async function fetchAdminResponse");
    expect(source).toContain("return await fetch(input, init)");
    expect(source).toContain("return null");
    expect(source).toContain(
      "No se pudieron cargar todos los datos de administración.",
    );
  });

  it("usa un identificador estable que no depende de la hora de refresco", () => {
    expect(source).toContain(
      '`${feed.category}:${feed.level}:${feed.code}:${feed.eventCount ?? "unknown"}:${feed.upcomingEventCount ?? "unknown"}`',
    );
    const signalBlock = source.slice(
      source.indexOf("if (\n    calendarHealthProbeFailed"),
      source.indexOf("\n\n  if (health)"),
    );
    expect(signalBlock).not.toContain("generatedAt");
  });
});
