import { describe, expect, it } from "vitest";
import {
  collectFiscalCalendarModelPageLinks,
  extractFiscalCalendarModelCodes,
  isCanonicalFiscalCalendarModelPageLink,
  segmentFiscalCalendarModelReferences,
  type FiscalCalendarModelPageLink,
} from "./model-reference-links";

function link(code: string, historical = false): FiscalCalendarModelPageLink {
  return {
    code,
    href: `/canonical-focus-${code}`,
    historical,
  };
}

describe("referencias a modelos en texto de calendario", () => {
  it("acepta únicamente el href canónico exacto del catálogo", () => {
    expect(
      isCanonicalFiscalCalendarModelPageLink({
        code: "303",
        href: "/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-303",
        historical: false,
      }),
    ).toBe(true);
    for (const href of [
      "/consultor-fiscal/modelos?focus=303#modelo-303",
      "/consultor-fiscal/modelos?foco=303&origen=calendario#modelo-303",
      "/consultor-fiscal/modelos?origen=calendario&foco=303&extra=1#modelo-303",
      "/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-130",
      "/consultor-fiscal/modelos/303?origen=calendario",
      "https://calendar.invalid/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-303",
    ]) {
      expect(
        isCanonicalFiscalCalendarModelPageLink({
          code: "303",
          href,
          historical: false,
        }),
        href,
      ).toBe(false);
    }
  });

  it("extrae códigos solo con contexto fiscal explícito", () => {
    expect(
      extractFiscalCalendarModelCodes(
        "Segundo trimestre 2026. Autoliquidación: 303, 130 y 349",
      ),
    ).toEqual(["303", "130", "349"]);
    expect(extractFiscalCalendarModelCodes("Modelos 01C, A22 y 037")).toEqual([
      "01C",
      "A22",
      "037",
    ]);
    expect(
      extractFiscalCalendarModelCodes("20 de julio de 2026, artículo 303"),
    ).toEqual([]);
  });

  it("acota cada lista al contexto adyacente y evita falsos positivos posteriores", () => {
    expect(
      extractFiscalCalendarModelCodes(
        "Modelo 303. Vence el 20 de julio de 2026; artículo 130.",
      ),
    ).toEqual(["303"]);
    expect(
      extractFiscalCalendarModelCodes(
        "Recordatorio: artículo 130. Referencia interna: 349.",
      ),
    ).toEqual([]);
    expect(
      extractFiscalCalendarModelCodes(
        "Modelos 303, 130 y 349. Ejercicio 2026 y artículo 037.",
      ),
    ).toEqual(["303", "130", "349"]);
  });

  it("solo acepta etiquetas fiscales acotadas antes de dos puntos", () => {
    expect(
      extractFiscalCalendarModelCodes(
        "Declaración recapitulativa de operaciones: 349 y 303",
      ),
    ).toEqual(["349", "303"]);
    expect(
      extractFiscalCalendarModelCodes(
        "Autoliquidación: 130 / 303. Nota informativa: 037",
      ),
    ).toEqual(["130", "303"]);
  });

  it("reconoce las listas estructuradas publicadas en los feeds AEAT", () => {
    const text = [
      "Junio 2026. Grandes empresas: 111, 115, 117, 123, 124, 126, 128, 216, 230",
      "Segundo trimestre 2026: 136, 210",
      "Estimación directa: 130",
      "Estimación objetiva: 131",
      "Régimen general: 202",
      "Régimen de consolidación fiscal: 222",
      "Junio 2026: 170, 196",
      "Año 2025. Entidades cuyo período coincida con el natural: 221, 282 y 283",
      "Segundo trimestre 2026: 232, 235, 281 y 379",
      "Grupo de entidades, modelo individual: 322",
      "Grupo de entidades, modelo agregado: 353",
      "Ventanilla única: 369",
      "Solicitud de reembolso: 364",
      "Modelos 036, 102, 200, 206, 220, 242, 303, 308, 309, 341, 349, 360, 361, 362, 380 y 381",
    ].join("\n");

    expect(extractFiscalCalendarModelCodes(text)).toEqual([
      "111",
      "115",
      "117",
      "123",
      "124",
      "126",
      "128",
      "216",
      "230",
      "136",
      "210",
      "130",
      "131",
      "202",
      "222",
      "170",
      "196",
      "221",
      "282",
      "283",
      "232",
      "235",
      "281",
      "379",
      "322",
      "353",
      "369",
      "364",
      "036",
      "102",
      "200",
      "206",
      "220",
      "242",
      "303",
      "308",
      "309",
      "341",
      "349",
      "360",
      "361",
      "362",
      "380",
      "381",
    ]);
  });

  it("no confunde fechas, ejercicios o artículos con modelos", () => {
    expect(
      extractFiscalCalendarModelCodes(
        "Fecha: 20/07/2026. Ejercicio 2026. Artículo 130. Hora: 20:30.",
      ),
    ).toEqual([]);
  });

  it("acepta etiquetas largas y operaciones censales acotadas", () => {
    expect(
      extractFiscalCalendarModelCodes(
        [
          "Solicitud de reembolso de las cuotas tributarias soportadas relativas a una organización internacional y a los Estados parte en el tratado correspondiente: 364",
          "Registro de devolución mensual: 036",
          "Renuncia a la llevanza electrónica de los libros registro: 036",
        ].join("\n"),
      ),
    ).toEqual(["364", "036"]);
  });

  it("enlaza solo códigos presentes en el mapa canónico", () => {
    const links = new Map([
      ["303", link("303")],
      ["037", link("037", true)],
    ]);
    const segments = segmentFiscalCalendarModelReferences(
      "Modelos 303, 999 y 037",
      links,
    );

    expect(segments.filter((segment) => segment.modelPage)).toEqual([
      { text: "303", modelPage: link("303") },
      { text: "037", modelPage: link("037", true) },
    ]);
    expect(segments.map((segment) => segment.text).join("")).toBe(
      "Modelos 303, 999 y 037",
    );
  });

  it("conserva texto plano cuando no hay destinos publicados", () => {
    expect(
      segmentFiscalCalendarModelReferences(
        "Declaración recapitulativa: 349",
        new Map(),
      ),
    ).toEqual([{ text: "Declaración recapitulativa: 349", modelPage: null }]);
  });

  it("deduplica candidatos repetidos sin alterar sus apariciones al segmentar", () => {
    const text = "Modelo 303. Autoliquidación: 303";
    expect(extractFiscalCalendarModelCodes(text)).toEqual(["303"]);
    expect(
      segmentFiscalCalendarModelReferences(
        text,
        new Map([["303", link("303")]]),
      ).filter((segment) => segment.modelPage),
    ).toHaveLength(2);
  });

  it("recoge una vez cada destino canónico y falla cerrado", () => {
    const events = [
      { title: "Modelo 303", description: "Declaración: 349 y 999" },
      { title: "IVA", description: "Modelo 303" },
    ];
    const result = collectFiscalCalendarModelPageLinks(events, (code) => {
      if (code === "303") {
        return {
          code,
          href: "/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-303",
          historical: false,
        };
      }
      if (code === "349") {
        return {
          code,
          href: "/consultor-fiscal/modelos/349",
          historical: false,
        };
      }
      return null;
    });

    expect(result).toEqual([
      {
        code: "303",
        href: "/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-303",
        historical: false,
      },
    ]);
  });

  it("ignora resolvers que lanzan o devuelven un código distinto", () => {
    const event = { title: "Modelos 303 y 037", description: "" };
    expect(
      collectFiscalCalendarModelPageLinks([event], (code) => {
        if (code === "303") throw new Error("resolver failure");
        return {
          code: "303",
          href: "/consultor-fiscal/modelos?origen=calendario&foco=037#modelo-037",
          historical: true,
        };
      }),
    ).toEqual([]);
  });

  it("acota el número de resoluciones ante texto externo adversarial", () => {
    const codes = Array.from({ length: 600 }, (_, index) =>
      String(index + 100).padStart(3, "0"),
    );
    let calls = 0;
    collectFiscalCalendarModelPageLinks(
      [{ title: "Modelos " + codes.join(", "), description: "" }],
      () => {
        calls += 1;
        return null;
      },
    );

    expect(calls).toBe(512);
  });

  it("acota el escaneo adversarial y conserva el resto como texto plano", () => {
    const prefix = "x".repeat(20_000);
    const text = `${prefix} Modelo 303`;
    expect(extractFiscalCalendarModelCodes(text)).toEqual([]);
    expect(
      segmentFiscalCalendarModelReferences(
        text,
        new Map([["303", link("303")]]),
      ),
    ).toEqual([{ text, modelPage: null }]);
  });
});
