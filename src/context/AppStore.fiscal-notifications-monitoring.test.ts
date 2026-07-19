import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./AppStore.tsx", import.meta.url), "utf8");

describe("AppStore fiscal notifications monitoring", () => {
  it("reporta bloqueos de guardado estructurado al log admin sin datos documentales", () => {
    expect(source).toContain('import { reportAppError } from "@/lib/monitoring/client"');
    expect(source).toContain(
      "function reportFiscalNotificationStructuredReviewSaveFailure",
    );
    expect(source).toContain("result.status !== \"blocked\"");
    expect(source).toContain('area: "fiscal_notifications"');
    expect(source).toContain("structured_review_save_");
    expect(source).toContain(
      "No se pudo guardar una ficha estructurada de notificaciones.",
    );
    expect(source).toContain("stage: result.stage");
    expect(source).toContain("safeCode: result.safeCode");
    expect(source).toContain("reason: result.reason ?? null");
    expect(source).toContain("warningCount: result.warningCodes.length");
    expect(source).toContain(
      "reportFiscalNotificationStructuredReviewSaveFailure(result);",
    );
  });

  it("mantiene fuera del evento campos sensibles del documento", () => {
    const helper = source.slice(
      source.indexOf("function reportFiscalNotificationStructuredReviewSaveFailure"),
      source.indexOf("interface AppStoreValue"),
    );

    expect(helper).not.toMatch(/\b(pdf|fileName|text|rawText|nif|taxId)\b/i);
    expect(helper).not.toMatch(/\b(amount|importe|reference|referencia)\b/i);
    expect(helper).not.toContain("analysis");
  });
});
