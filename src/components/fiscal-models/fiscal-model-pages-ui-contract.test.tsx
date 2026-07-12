import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getFiscalModelReviewPageViewV1,
  searchFiscalModelReviewPageViewsV1,
} from "@/lib/fiscal-models/model-pages/review-view-model.v1";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("fiscal model review pages UI contract", () => {
  it("renders an accessible bounded local search and exactly three review links", () => {
    const result = searchFiscalModelReviewPageViewsV1({});
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status === "REVIEW_ONLY") {
      expect(result.data.map((page) => page.reviewPagePath)).toEqual([
        "/consultor-fiscal/modelos/036",
        "/consultor-fiscal/modelos/037",
        "/consultor-fiscal/modelos/303",
      ]);
    }
    const catalog = source("./FiscalModelCatalogView.tsx");

    expect(catalog).toContain('role="search"');
    expect(catalog).toContain('aria-labelledby="buscar-modelo-title"');
    expect(catalog).toContain('name="modelo"');
    expect(catalog).toContain("maxLength={3}");
    expect(catalog).toContain('pattern="[0-9]{3}"');
    expect(catalog).toContain("La búsqueda es local");
    expect(catalog).toContain("Información en revisión");
    expect(catalog).toContain("Enlace automático bloqueado");
    expect(catalog).toContain("href={page.reviewPagePath}");
    expect(catalog).toContain("Abrir ficha en revisión");
    expect(catalog).not.toContain("Modelo 130");
    expect(catalog).not.toContain("Modelo 349");
    expect(catalog).not.toMatch(/\b(?:AVAILABLE|CURRENT)\b/);
  });

  it("renders exact no-match and invalid-search states without fallback links", () => {
    const missing = searchFiscalModelReviewPageViewsV1({ modelo: "130" });
    expect(missing).toMatchObject({
      status: "REVIEW_ONLY",
      match: "NO_MATCH",
      data: [],
    });
    const catalog = source("./FiscalModelCatalogView.tsx");
    expect(catalog).toContain("No hay una ficha registrada para ese código.");
    expect(catalog).toContain(
      "No se crea un resultado aproximado ni se enlaza a otro modelo.",
    );

    const invalid = searchFiscalModelReviewPageViewsV1({ modelo: "036 " });
    expect(invalid).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    expect(catalog).toContain("La búsqueda no es válida.");
    expect(catalog).toContain("aria-invalid={blocked}");
    expect(catalog).toContain(
      'aria-errormessage={blocked ? "buscar-modelo-error"',
    );
    expect(catalog).toContain('id="buscar-modelo-error"');
  });

  it("renders 037 as historical and non-current with visible provenance", () => {
    const result = getFiscalModelReviewPageViewV1({ code: "037" });
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;
    const detail = source("./FiscalModelDetailView.tsx");

    expect(result.data.historicalNotice).toContain("no vigente");
    expect(result.data.effectiveTo).toBe("2025-02-02");
    expect(detail).toContain("Histórico · no vigente");
    expect(detail).toContain('page.effectiveTo.split("-").reverse().join("/")');
    expect(detail).toContain("page.reviewTitle");
    expect(detail).toContain("Procedencia por campo");
    expect(detail).toContain("Fuentes oficiales registradas");
    expect(detail).toContain("Revisión fiscal pendiente");
    expect(result.data.limitations).toContain(
      "No calcula casillas ni importes",
    );
    expect(detail).not.toMatch(/sustituid[oa]|reemplazad[oa]/i);
  });

  it("renders only safe official references and no filing action", () => {
    const result = getFiscalModelReviewPageViewV1({ code: "303" });
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;
    const detail = source("./FiscalModelDetailView.tsx");

    expect(result.data.sources.length).toBeGreaterThan(0);
    expect(detail).toContain("href={source.externalHref}");
    expect(detail).toContain('rel="noopener noreferrer"');
    expect(detail).toContain("Abrir referencia oficial");
    expect(detail).toContain("se abre en una pestaña nueva");
    expect(detail).toContain("Abrirlas no inicia ningún");
    expect(detail).not.toMatch(/>\s*(?:Presentar|Firmar|Pagar|Enviar)\s*</i);
  });

  it("keeps mobile, dark-mode, keyboard, and screen-reader safeguards explicit", () => {
    const catalog = source("./FiscalModelCatalogView.tsx");
    const detail = source("./FiscalModelDetailView.tsx");
    const ui = `${catalog}\n${detail}`;

    expect(ui).toContain("min-w-0");
    expect(ui).toContain("break-words");
    expect(ui).toContain("sm:flex-row");
    expect(ui).toContain("dark:");
    expect(ui).toContain("focus-visible:outline");
    expect(ui).toContain('aria-live="polite"');
    expect(ui).toContain('role="alert"');
    expect(ui).toContain('aria-hidden="true"');
  });

  it("uses Next 15 static params and exact fail-closed routing", () => {
    const indexPage = source("../../app/consultor-fiscal/modelos/page.tsx");
    const detailPage = source(
      "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
    );

    expect(indexPage).toContain("await searchParams");
    expect(indexPage).toContain("searchFiscalModelReviewPageViewsV1");
    expect(indexPage).toContain('result.reason !== "INVALID_INPUT"');
    expect(indexPage).toContain("notFound()");
    expect(indexPage).toContain("index: false");

    expect(detailPage).toContain("params: Promise<{ codigo: string }>");
    expect(detailPage).toContain("export const dynamicParams = false");
    expect(detailPage).toContain("generateStaticParams");
    expect(detailPage).toContain("listFiscalModelReviewPageViewsV1");
    expect(detailPage).toContain("getFiscalModelReviewPageViewV1");
    expect(detailPage).toContain('if (result.status === "BLOCKED") notFound()');
    expect(detailPage).not.toMatch(/\/modelos\/\$\{/);
  });

  it("keeps the new production surface isolated from data, engines, and network", () => {
    const production = [
      source("../../lib/fiscal-models/model-pages/review-view-model.v1.ts"),
      source("./FiscalModelCatalogView.tsx"),
      source("./FiscalModelDetailView.tsx"),
      source("../../app/consultor-fiscal/modelos/page.tsx"),
      source("../../app/consultor-fiscal/modelos/[codigo]/page.tsx"),
    ].join("\n");

    expect(production).not.toMatch(/\bfetch\s*\(|Date\.now|process\.env/);
    expect(production).not.toMatch(
      /localStorage|sessionStorage|supabase|stripe|openai|anthropic/i,
    );
    expect(production).not.toMatch(
      /fiscal-calendar|fiscal-notifications|AppStore|tax-engine|taxes\.ts/i,
    );
    expect(production).not.toMatch(/tenantId|userId|BusinessProfile/);
  });
});
