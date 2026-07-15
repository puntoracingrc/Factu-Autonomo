import { describe, expect, it } from "vitest";

import {
  extractFiscalWatchModelHints,
  MAX_FISCAL_WATCH_MODEL_HINTS,
} from "./model-hints.mjs";

function change(overrides = {}) {
  return {
    title: "Novedad tributaria sintética",
    before: null,
    after: null,
    ...overrides,
  };
}

describe("fiscal watch explicit model hints", () => {
  it("extrae menciones singulares y listas explícitas sin completar códigos", () => {
    const hints = extractFiscalWatchModelHints([
      change({ title: "Novedades del Modelo 303" }),
      change({ after: { title: "Modelos 130, 131 y 390", excerpt: "" } }),
      change({
        after: {
          title: "Formularios A22, A23 y A24",
          excerpt: "Formulario 035 y modelo 01c",
        },
      }),
    ]);

    expect(hints).toEqual({
      codes: ["01C", "035", "130", "131", "303", "390", "A22", "A23", "A24"],
      truncated: false,
    });
    expect(Object.isFrozen(hints)).toBe(true);
    expect(Object.isFrozen(hints.codes)).toBe(true);
  });

  it("conserva menciones anteriores y posteriores como candidatas de revisión", () => {
    expect(
      extractFiscalWatchModelHints([
        change({
          before: { title: "Modelo 347", excerpt: "" },
          after: { title: "Modelo 349", excerpt: "" },
        }),
      ]),
    ).toEqual({ codes: ["347", "349"], truncated: false });
  });

  it("señala un código explícito nuevo aunque aún no esté en nuestro catálogo", () => {
    expect(
      extractFiscalWatchModelHints([
        change({ title: "Presentación del nuevo Modelo 999" }),
      ]),
    ).toEqual({ codes: ["999"], truncated: false });
  });

  it("ignora años, artículos, importes, procedimientos y números aislados", () => {
    const hints = extractFiscalWatchModelHints([
      change({
        title: "Cambios para 2025 y 2026 en el artículo 58",
        after: {
          title: "Procedimiento G304",
          excerpt:
            "El 19 % se aplica durante 30 días. Los formularios de 2026 no cambian. Modelo 1234 no válido.",
        },
      }),
    ]);

    expect(hints).toEqual({ codes: [], truncated: false });
  });

  it("no interpreta rangos ni extiende una referencia singular", () => {
    const hints = extractFiscalWatchModelHints([
      change({ title: "Modelo 303 y artículo 58" }),
      change({ title: "Modelos 100 a 199" }),
    ]);

    expect(hints).toEqual({ codes: ["100", "303"], truncated: false });
  });

  it("deduplica, ordena y acota un documento oficial anómalo", () => {
    const changes = Array.from(
      { length: MAX_FISCAL_WATCH_MODEL_HINTS + 5 },
      (_value, index) => change({ title: `Modelo ${100 + index}` }),
    );
    const hints = extractFiscalWatchModelHints(changes);

    expect(hints.codes).toHaveLength(MAX_FISCAL_WATCH_MODEL_HINTS);
    expect(hints.truncated).toBe(true);
    expect(new Set(hints.codes).size).toBe(hints.codes.length);
  });
});
