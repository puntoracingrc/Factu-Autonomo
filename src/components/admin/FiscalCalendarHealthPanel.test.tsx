import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./FiscalCalendarHealthPanel.tsx", import.meta.url),
  "utf8",
);

describe("FiscalCalendarHealthPanel UI contract", () => {
  it("representa los cinco feeds con una identidad fija y no confía en etiquetas externas", () => {
    expect(source).toContain('{ category: "renta", label: "Renta" }');
    expect(source).toContain(
      '{ category: "renta_sociedades", label: "Renta y Sociedades" }',
    );
    expect(source).toContain(
      '{ category: "sociedades", label: "Sociedades" }',
    );
    expect(source).toContain('{ category: "iva", label: "IVA" }');
    expect(source).toContain('category: "declaraciones_informativas"');
    expect(source).toContain("diagnostics.map");
    expect(source).toContain("data-feed-category");
  });

  it("distingue rojo, ámbar y verde con modo oscuro y semántica de estado", () => {
    expect(source).toContain("border-red-300 bg-red-50");
    expect(source).toContain("dark:border-red-800 dark:bg-red-950/35");
    expect(source).toContain("border-amber-300 bg-amber-50");
    expect(source).toContain("dark:border-amber-800 dark:bg-amber-950/35");
    expect(source).toContain("border-emerald-300 bg-emerald-50");
    expect(source).toContain("dark:border-emerald-800 dark:bg-emerald-950/35");
    expect(source).toContain('role={level === "action" ? "alert" : "status"}');
    expect(source).toContain("data-health-level");
  });

  it("falla visualmente cerrado cuando falta o está incompleto el diagnóstico", () => {
    expect(source).toContain('health ? safeLevel(health.level) : "action"');
    expect(source).toContain(
      'feed && code !== "PROBE_INCOMPLETE" ? safeLevel(feed.level) : "action"',
    );
    expect(source).toContain(
      'health.checkedFeeds === EXPECTED_FEEDS.length',
    );
    expect(source).toContain(
      'diagnostic.feed !== null && diagnostic.code !== "PROBE_INCOMPLETE"',
    );
    expect(source).toContain(
      "No se puede confirmar el estado de las cinco fuentes del calendario.",
    );
    expect(source).toContain(
      'PROBE_INCOMPLETE: "Comprobación incompleta"',
    );
  });

  it("explica correctamente que un rango vacío no equivale a una avería", () => {
    expect(source).toContain("feed completo de cada fuente");
    expect(source).toContain("rango de fechas elegido por un usuario");
    expect(source).toContain(
      'NO_UPCOMING_EVENTS: "Sin próximos eventos publicados"',
    );
    expect(source).toContain(
      'EMPTY_FEED: "El feed completo está vacío"',
    );
  });

  it("es responsive, evita overflow y sanea cualquier aviso antes de mostrarlo", () => {
    expect(source).toContain("min-w-0 overflow-hidden");
    expect(source).toContain("grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5");
    expect(source).toContain("xl:grid-cols-2");
    expect(source).toContain("break-words");
    expect(source).toContain("SENSITIVE_NOTICE_PATTERN");
    expect(source).toContain("const displayedNotice = safeNotice(notice)");
    expect(source).not.toMatch(/dangerouslySetInnerHTML|innerHTML\s*=/);
  });
});
