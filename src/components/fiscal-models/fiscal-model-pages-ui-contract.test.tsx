import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  searchPublicAeatModelReviewPagesV1,
} from "@/lib/fiscal-models/model-pages";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("fiscal model structural review pages UI contract", () => {
  it("renders an accessible bounded local search and all deployed review links", () => {
    const result = searchPublicAeatModelReviewPagesV1({});
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status === "REVIEW_ONLY") {
      expect(result.data).toHaveLength(229);
      expect(result.data.map((page) => page.code)).toEqual(
        expect.arrayContaining(["01", "01C", "036", "037", "130", "349", "A22"]),
      );
      expect(result.data.every((page) => page.href === page.reviewPagePath)).toBe(
        true,
      );
    }
    const catalog = source("./FiscalModelCatalogView.tsx");

    expect(catalog).toContain('role="search"');
    expect(catalog).toContain('aria-labelledby="buscar-modelo-title"');
    expect(catalog).toContain('name="modelo"');
    expect(catalog).toContain("maxLength={3}");
    expect(catalog).toContain(
      'pattern="([0-9]{2,3}|[0-9]{2}[A-Z]|[A-Z][0-9]{2})"',
    );
    expect(catalog).toContain('autoCapitalize="characters"');
    expect(catalog).not.toContain('inputMode="numeric"');
    expect(catalog).toContain("La búsqueda es local");
    expect(catalog).toContain("Información en revisión");
    expect(catalog).toContain("Ficha desplegada · contenido en revisión");
    expect(catalog).toContain("href={page.href}");
    expect(catalog).toContain("Abrir ficha en revisión");
    expect(catalog).toContain("del modelo {page.code}");
    expect(catalog).not.toMatch(/\b(?:AVAILABLE|CURRENT|APPROVED)\b/);
  });

  it("renders exact no-match and invalid-search states without fallback links", () => {
    const missing = searchPublicAeatModelReviewPagesV1({ modelo: "999" });
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

    const invalid = searchPublicAeatModelReviewPagesV1({ modelo: "036 " });
    expect(invalid).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    expect(catalog).toContain("La búsqueda no es válida.");
    expect(catalog).toContain("aria-invalid={blocked}");
    expect(catalog).toContain(
      'aria-errormessage={blocked ? "buscar-modelo-error"',
    );
    expect(catalog).toContain('id="buscar-modelo-error"');
  });

  it("renders 037 as historical and every other structural page as undetermined", () => {
    const historical = resolvePublicAeatModelReviewPageV1({ code: "037" });
    const structural = resolvePublicAeatModelReviewPageV1({ code: "130" });
    expect(historical.status).toBe("REVIEW_ONLY");
    expect(structural.status).toBe("REVIEW_ONLY");
    if (
      historical.status !== "REVIEW_ONLY" ||
      structural.status !== "REVIEW_ONLY"
    ) {
      return;
    }
    const detail = source("./FiscalModelStructuralDetailView.tsx");

    expect(historical.data.historicalNotice).toContain("no vigente");
    expect(historical.data.effectiveTo).toBe("2025-02-02");
    expect(historical.data.lifecycleStatus).toBe("HISTORICAL");
    expect(historical.data.reviewMessage).not.toContain("vigencia");
    expect(structural.data.lifecycleStatus).toBe("UNDETERMINED");
    expect(structural.data.validityStatus).toBe("SOURCE_PENDING");
    expect(detail).toContain("Histórico · no vigente");
    expect(detail).toContain(
      'page.effectiveTo.split("-").reverse().join("/")',
    );
    expect(detail).toContain("Pendiente de verificación");
    expect(detail).toContain("Aplicabilidad detallada: pendiente de revisión");
    expect(detail).toContain("Fuentes oficiales registradas");
    expect(detail).toContain("Revisión fiscal pendiente");
    expect(historical.data.limitations).toContain(
      "No contiene casillas, importes, plazos ni recomendaciones",
    );
    expect(detail).not.toMatch(/sustituid[oa]|reemplazad[oa]/i);
  });

  it("renders only safe official references and no filing action", () => {
    const result = resolvePublicAeatModelReviewPageV1({ code: "303" });
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;
    const detail = source("./FiscalModelStructuralDetailView.tsx");

    expect(result.data.sources.length).toBeGreaterThan(0);
    expect(detail).toContain("href={source.canonicalUrl}");
    expect(detail).toContain('rel="noopener noreferrer"');
    expect(detail).toContain("Abrir fuente oficial informativa");
    expect(detail).toContain(": {source.title}");
    expect(detail).toContain("se abre en una pestaña nueva");
    expect(detail).toContain("inicia ningún trámite");
    expect(detail).not.toMatch(/>\s*(?:Presentar|Firmar|Pagar|Enviar)\s*</i);
  });

  it("keeps mobile, dark-mode, keyboard, and screen-reader safeguards explicit", () => {
    const catalog = source("./FiscalModelCatalogView.tsx");
    const detail = source("./FiscalModelStructuralDetailView.tsx");
    const ui = catalog + "\n" + detail;

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
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status === "REVIEW_ONLY") expect(catalog.data).toHaveLength(229);

    const indexPage = source("../../app/consultor-fiscal/modelos/page.tsx");
    const detailPage = source(
      "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
    );

    expect(indexPage).toContain("await searchParams");
    expect(indexPage).toContain("searchPublicAeatModelReviewPagesV1");
    expect(indexPage).toContain('result.reason !== "INVALID_INPUT"');
    expect(indexPage).toContain("notFound()");
    expect(indexPage).toContain("index: false");

    expect(detailPage).toContain("params: Promise<{ codigo: string }>");
    expect(detailPage).toContain("export const dynamicParams = false");
    expect(detailPage).toContain("generateStaticParams");
    expect(detailPage).toContain("listPublicAeatModelReviewPagesV1");
    expect(detailPage).toContain("resolvePublicAeatModelReviewPageV1");
    expect(detailPage).toContain("catalog.data.length !== 229");
    expect(detailPage).toContain('if (result.status === "BLOCKED") notFound()');
    expect(detailPage).not.toMatch(/\/modelos\/\$\{/);
  });

  it("keeps the production surface isolated from data, engines, and runtime network", () => {
    const production = [
      source("../../lib/fiscal-models/model-pages/public-review-route-manifest.v1.ts"),
      source("../../lib/fiscal-models/model-pages/public-review-catalog.v1.ts"),
      source("./FiscalModelCatalogView.tsx"),
      source("./FiscalModelStructuralDetailView.tsx"),
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
