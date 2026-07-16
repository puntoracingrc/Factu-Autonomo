import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const viewSource = readSource("./FiscalNotificationGuideView.tsx");
const detailSource = readSource("./FiscalNotificationGuideDetail.tsx");
const combinedSource = `${viewSource}\n${detailSource}`;

describe("FiscalNotificationGuideView UI contract", () => {
  it("is an independent local catalog with accessible search and addressable cards", () => {
    expect(viewSource).toContain('role="search"');
    expect(viewSource).toContain('type="search"');
    expect(viewSource).toContain('aria-live="polite"');
    expect(viewSource).toContain("searchFiscalNotificationGuideV1(");
    expect(viewSource).toContain("?guia=${encodeURIComponent(entry.familyId)}");
    expect(viewSource).toContain("#guia-notificaciones");
    expect(viewSource).toContain(
      "FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.length",
    );
    expect(viewSource).toContain("automaticGuideCount");
    expect(viewSource).toContain("manualGuideCount");
    expect(viewSource).toContain("Consulta independiente del analizador");
  });

  it("fails closed for an unknown family and never substitutes a nearby card", () => {
    expect(viewSource).toContain(
      'selection.status === "UNKNOWN_OR_INVALID"',
    );
    expect(viewSource).toContain("Ficha no disponible");
    expect(viewSource).toContain(
      "No se ha aproximado ni sustituido por otra ficha",
    );
  });

  it("states the document-first policy, pending review and prohibited automation", () => {
    expect(detailSource).toContain("El documento concreto manda");
    expect(detailSource).toContain(
      "Una fuente general no completa información ausente",
    );
    expect(detailSource).toContain("Revisión jurídica pendiente");
    expect(detailSource).toContain("Relación solo sugerida");
    expect(detailSource).toContain(
      "nunca se confirma automáticamente",
    );
    expect(detailSource).toContain(
      "no crea, paga, compensa, aplaza, recurre, desembarga ni",
    );
  });

  it("shows a concise progressive explanation before technical detail", () => {
    expect(detailSource).toContain("Lo importante en 30 segundos");
    expect(detailSource).toContain("Qué significa");
    expect(detailSource).toContain("Por qué suele llegar");
    expect(detailSource).toContain("Qué conviene hacer");
    expect(detailSource).toContain("Entenderlo un poco mejor");
    expect(detailSource).toContain("Estado técnico de esta ficha");
    expect(viewSource).toContain("Lectura automática · revisión obligatoria");
    expect(viewSource).toContain("Guía disponible · revisión manual");
    expect(viewSource).toContain("sin lectura automática");
    expect(viewSource).not.toContain("con selección y revisión manual");
    expect(viewSource).not.toContain("En preparación");
    expect(detailSource).toContain(
      "Fuentes oficiales en las que se basa el analizador",
    );
    expect(detailSource).toMatch(
      /no\s+se consulta internet durante el escaneo/u,
    );
    expect(viewSource).toContain("Te lo explicamos; tú decides qué hacer");
  });

  it("does not add persistence, runtime fetching, AI or fiscal side effects", () => {
    expect(combinedSource).not.toMatch(/\bfetch\s*\(/);
    expect(combinedSource).not.toMatch(/localStorage|sessionStorage|indexedDB/i);
    expect(combinedSource).not.toMatch(/openai|anthropic|gemini|chatgpt/i);
    expect(combinedSource).not.toMatch(
      /createDebt|createExpense|createJournal|markAsPaid|confirmPayment/i,
    );
    expect(combinedSource).not.toContain("@/lib/fiscal-models");
  });
});
