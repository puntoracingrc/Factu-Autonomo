import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_NAV_ITEMS,
  MOBILE_MORE_NAV_ITEMS,
  MOBILE_PRIMARY_NAV_ITEMS,
  findActiveAppNavItem,
} from "@/components/layout/app-navigation";
import { config as middlewareConfig } from "@/middleware";
import { APP_ROUTES_WITH_MANUAL } from "@/lib/manual/coverage";
import { resolveManualSlug } from "@/lib/manual/route-help";
import { getManualSection } from "@/lib/manual/sections";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function productionTypeScriptUnder(relativeDirectory: string): string {
  const root = fileURLToPath(new URL(relativeDirectory, import.meta.url));
  const paths: string[] = [];

  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts")
      ) {
        paths.push(path);
      }
    }
  }

  visit(root);
  return paths
    .sort()
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
}

describe("superficie visible de Consultor fiscal", () => {
  const page = source("../../app/consultor-fiscal/page.tsx");
  const analyzer = source("./ExpenseDeductibilityAnalyzer.tsx");
  const fiscalProfile = source("./FiscalProfileSetupCard.tsx");
  const questions = source("./ConditionalQuestions.tsx");
  const result = source("./EvaluationResultPanel.tsx");
  const consentNotice = source("../legal/AiProcessingConsentNotice.tsx");
  const sharedCard = source("../ui/Card.tsx");
  const sharedField = source("../ui/Field.tsx");

  it("publica el título, Beta y un flujo fiscal progresivo", () => {
    expect(page).toContain("<ExpenseDeductibilityAnalyzer");
    expect(page).toContain("aiFallbackEnabled={isFiscalAiFallbackEnabled()}");
    expect(page).toContain('title: "Consultor fiscal"');
    expect(analyzer).toContain('title="Analizador de gastos deducibles"');
    expect(analyzer).toMatch(/<ShieldCheck[\s\S]*?Beta/);
    expect(sharedCard).toContain("<h1");

    const entrySurface = `${analyzer}\n${fiscalProfile}`;
    for (const label of [
      "Gasto registrado",
      "Tipo de contribuyente",
      "Territorio fiscal",
      "Régimen de IRPF",
      "Régimen de IVA",
      "Actividades económicas e IAE",
      "Concepto del gasto",
      "Fecha",
      "Proveedor",
      "Base imponible",
      "IVA",
      "Total",
      "Medio de pago",
      "Tipo de justificante",
      "Analizar gasto",
    ]) {
      expect(entrySurface, label).toContain(label);
    }
    expect(fiscalProfile).toContain("Importar certificado censal");
    expect(fiscalProfile).toContain("Rellenar manualmente");
    expect(fiscalProfile).toContain("Continuar sin completar");
    expect(analyzer).toContain("También quiero calcular cuánto podría deducirme");
    expect(sharedField).toContain("<label");
    expect(analyzer).toContain("md:grid-cols-2");
    expect(analyzer).toContain("contextNote=");
    expect(consentNotice.match(/contextNote \? <p>\{contextNote\}<\/p>/g))
      .toHaveLength(1);
    expect(analyzer).toContain('<option value="">Entrada manual</option>');
    expect(fiscalProfile).toContain(
      '<option value="UNKNOWN">No lo sé todavía</option>',
    );
  });

  it("conserva respuestas y vuelve a evaluar las preguntas dinámicas", () => {
    expect(analyzer).toContain("validated.requiredQuestions");
    expect(analyzer).toContain("visibleQuestionCatalog.length > 0");
    expect(analyzer).toContain("isQuestionVisible(question, answers)");
    expect(analyzer).toContain("<ConditionalQuestions");
    expect(analyzer).toContain("setAnswers(next)");
    expect(analyzer).toContain("void analyze(next)");
    expect(analyzer).toContain("setQuestionCatalog((current)");
    expect(analyzer).toContain("requestSequence.current += 1");
    expect(analyzer).toContain("setQuestionCatalog([])");
    expect(analyzer).toContain("setResult(null)");
    expect(analyzer).toContain("previousProfileVatExempt");
    expect(analyzer).toContain("projectExistingExpenseToForm");
    expect(analyzer).toContain("selectedExpenseBlocked");
    expect(analyzer).toContain("onDraftChange={changeDraft}");
    expect(questions).toContain("Tus respuestas se conservan");
    expect(questions).toContain("Actualizar análisis");
    expect(questions).toContain("Volver a los datos del gasto");
    expect(questions).toContain('type="button"');
    expect(questions).toContain("aria-busy={loading}");
    expect(questions.match(/disabled=\{loading\}/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("presenta estados, IRPF e IVA separados y mantiene la aplicación bloqueada", () => {
    for (const status of [
      "Análisis completado",
      "Falta información",
      "Necesita revisión",
      "Sin regla compatible",
      "Caso no implementado",
    ]) {
      expect(result, status).toContain(status);
    }
    expect(result).toContain("result.directTax");
    expect(result).toContain("result.indirectTax");
    expect(result).toContain("Importe no determinado");
    expect(result).toContain("Porcentaje pendiente de revisión");
    expect(result).toContain("Documentación necesaria");
    expect(result).toContain("Fuentes oficiales");
    expect(result).toContain("Regla v{result.matchedRuleVersion}");
    expect(result).toContain("Ver traza de cálculo auditable");
    expect(result).toMatch(
      /<button[\s\S]*?type="button"[\s\S]*?disabled[\s\S]*?Aplicar propuesta \(próximamente\)/,
    );
    expect(result).toContain("Debes revisar y confirmar expresamente el resultado");
    expect(result).toContain("Esta fase no crea");
    expect(result).toContain("Propuesta de IA pendiente de revisión");
    expect(result).toContain("Revisión humana obligatoria");
    expect(result).toContain("No se pudo validar una propuesta de IA");
  });

  it("expone semántica accesible que no depende únicamente del color", () => {
    expect(analyzer).toContain('role="alert"');
    expect(questions).toContain('aria-labelledby="preguntas-condicionales"');
    expect(questions).toContain("<fieldset");
    expect(questions).toContain("<legend");
    expect(questions).toContain('type="radio"');
    expect(result).toContain('aria-labelledby="resultado-fiscal"');
    expect(result).toContain('aria-live="polite"');
    expect(result).toContain('role="status"');
    expect(result).toContain("no depende únicamente del color");
    expect(result).toContain("VERDE ·");
    expect(result).toContain("AMARILLO ·");
    expect(result).toContain("ROJO ·");
    expect(result).toContain("SIN DETERMINAR ·");
    expect(result).toContain('rel="noreferrer"');
  });
});

describe("navegación, ayuda y perímetro privado", () => {
  it("registra Asesoría fiscal en escritorio, Más móvil y rutas anidadas", () => {
    expect(
      APP_NAV_ITEMS.find(
        (item) => item.href === "/consultor-fiscal/diagnostico",
      ),
    ).toMatchObject({
      label: "Asesoría fiscal",
      shortLabel: "Asesoría",
      activeBase: "/consultor-fiscal",
    });
    expect(
      MOBILE_MORE_NAV_ITEMS.some(
        (item) => item.href === "/consultor-fiscal/diagnostico",
      ),
    ).toBe(true);
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some(
        (item) => item.href === "/consultor-fiscal/diagnostico",
      ),
    ).toBe(false);
    expect(
      findActiveAppNavItem(
        "/consultor-fiscal/analisis",
        APP_NAV_ITEMS,
      )?.href,
    ).toBe("/consultor-fiscal/diagnostico");
  });

  it("mantiene ayuda contextual específica y documenta límites operativos", () => {
    expect(APP_ROUTES_WITH_MANUAL).toContain("/consultor-fiscal");
    expect(resolveManualSlug("/consultor-fiscal")).toBe("consultor-fiscal");
    expect(resolveManualSlug("/consultor-fiscal/analisis?from=menu")).toBe(
      "consultor-fiscal",
    );

    const manual = getManualSection("consultor-fiscal");
    expect(manual?.title).toBe("Consultor fiscal");
    const manualCopy = [
      ...(manual?.intro ?? []),
      ...(manual?.steps.flatMap((step) => [
        step.title,
        ...step.paragraphs,
        step.tip ?? "",
      ]) ?? []),
    ].join(" ");
    expect(manualCopy).toContain("reglas locales, versionadas y auditables");
    expect(manualCopy).toContain("ejecuta primero reglas locales");
    expect(manualCopy).toContain("Propuesta de IA pendiente de revisión");
    expect(manualCopy).toContain("nunca crea asientos");
    expect(manualCopy).toContain("Caso no implementado");
    expect(manualCopy).toContain("IRPF e IVA se muestran por separado");
    expect(manualCopy).toContain("Aplicar propuesta");
    expect(manualCopy).toContain("deshabilitado");
  });

  it("incluye la página en el middleware privado con no-store y noindex", () => {
    expect(middlewareConfig.matcher).toContain("/consultor-fiscal/:path*");
    expect(middlewareConfig.matcher).toContain(
      "/ayuda/consultor-fiscal/:path*",
    );
    const middleware = source("../../middleware.ts");
    expect(middleware).toContain('"Cache-Control": "no-store, max-age=0"');
    expect(middleware).toContain('"CDN-Cache-Control": "no-store"');
    expect(middleware).toContain(
      '"X-Robots-Tag": "noindex, nofollow, noarchive"',
    );
  });
});

describe("contratos estáticos de servidor y seguridad", () => {
  const route = source(
    "../../app/api/expense-deductibility/evaluate/route.ts",
  );
  const analyzer = source("./ExpenseDeductibilityAnalyzer.tsx");
  const fiscalProfile = source("./FiscalProfileSetupCard.tsx");
  const taxEngine = productionTypeScriptUnder("../../lib/tax-engine/");

  it("mantiene el endpoint acotado, limitado, privado y con error interno saneado", () => {
    const rateLimitIndex = route.indexOf("checkRateLimit(");
    const bodyReadIndex = route.indexOf("readJsonBody(request");
    const localEngineIndex = route.indexOf("const localResult = evaluateExpense(");
    const authIndex = route.indexOf("const user = await getUserFromBearer(");
    const providerIndex = route.indexOf("runFiscalAiFallbackAfterLocal({");

    expect(route.match(/export async function (GET|POST|PUT|PATCH|DELETE)/g)).toEqual(
      ["export async function POST"],
    );
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(bodyReadIndex).toBeGreaterThan(rateLimitIndex);
    expect(route).toContain('namespace: "expense_deductibility_evaluate"');
    expect(route).toContain("limit: 60");
    expect(route).toContain("maxBytes: 64 * 1024");
    expect(route).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(route).toContain('"X-Robots-Tag": "noindex, nofollow, noarchive"');
    expect(route).toContain("parseEvaluationRequest(body.data)");
    expect(localEngineIndex).toBeGreaterThan(bodyReadIndex);
    expect(authIndex).toBeGreaterThan(localEngineIndex);
    expect(providerIndex).toBeGreaterThan(authIndex);
    expect(route).toContain("getUserFromBearer");
    expect(route).toContain('namespace: "expense_deductibility_ai_fallback"');
    expect(route).toContain("AI_PROCESSING_CONSENT_VERSION");
    expect(route).toContain('console.error("expense_deductibility_evaluation_failed")');
    expect(route).not.toContain("console.error(error");
    expect(route).not.toContain("tenantId");
  });

  it("adapta el gasto canónico, llama solo al endpoint local y no escribe entidades", () => {
    expect(analyzer.match(/\bfetch\s*\(/g)).toHaveLength(1);
    expect(analyzer).toContain(
      'fetch("/api/expense-deductibility/evaluate"',
    );
    expect(analyzer).not.toMatch(
      /\b(?:addExpense|updateExpense|localStorage|sessionStorage|tenantId|userId|OPENAI_API_KEY)\b/,
    );
    expect(analyzer).toContain("getSupabaseClientAsync");
    expect(analyzer).toContain("headers.Authorization");
    expect(analyzer).toContain("X-AI-Consent-Version");
    expect(analyzer).toContain("new AbortController()");
    expect(analyzer).toContain("let allowAiFallback = false");
    expect(analyzer).toContain(
      "La autenticación del fallback nunca debe impedir el motor local",
    );
    expect(analyzer).not.toMatch(/api\.openai\.com|\/v1\/responses/);
    expect(analyzer).toContain('import { useAppStore } from "@/context/AppStore"');
    expect(analyzer).toContain("adaptExistingExpenseForEvaluation");
    expect(analyzer).toContain("selectedExpenseId");
    expect(analyzer).toContain("data.profile.vatExempt");
    expect(analyzer).toContain("buildTaxContextFromBusinessProfile");
    expect(analyzer).toContain("FiscalProfileSetupCard");
    expect(fiscalProfile).toContain("readCensusDocumentText");
    expect(fiscalProfile).toContain("reconcileCensusIdentity");
    expect(fiscalProfile).toContain("No se guarda el archivo");
  });

  it("el núcleo fiscal no depende de React, Next, Supabase, red ni tenant", () => {
    expect(taxEngine).not.toMatch(
      /from\s+["'](?:react|next(?:\/|["'])|@\/lib\/(?:supabase|storage|taxes))/,
    );
    expect(taxEngine).not.toMatch(
      /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(|\b(?:openai|anthropic)\b/i,
    );
    expect(taxEngine).not.toMatch(/\b(?:tenantId|userId)\b/);
  });

  it("mantiene los cuatro documentos operativos y sus exclusiones", () => {
    const readme = source("../../../docs/consultor-fiscal/README.md");
    const plan = source(
      "../../../docs/consultor-fiscal/implementation-plan.md",
    );
    const legalSources = source(
      "../../../docs/consultor-fiscal/legal-sources.md",
    );
    const addingRule = source(
      "../../../docs/consultor-fiscal/adding-a-rule.md",
    );

    expect(readme).toContain("No incluye OCR, embeddings, asientos contables");
    expect(readme).toContain("EvaluationSnapshot");
    expect(readme).toContain("Responses API con JSON Schema estricto");
    expect(readme).toContain("CONSULTOR_FISCAL_AI_FALLBACK_ENABLED");
    expect(plan).toContain("Fallback de IA controlado");
    expect(legalSources).toContain("BOE");
    expect(legalSources).toContain("AEAT");
    expect(legalSources).toContain("DGT");
    expect(addingRule).toContain("Añadir y mantener una regla fiscal");
    expect(addingRule).toContain("PENDING_REVIEW");
    expect(addingRule).toContain("RETIRED");
  });
});
